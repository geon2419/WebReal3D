/**
 * HDR texture loader for Radiance HDR (.hdr) files.
 *
 * Loads HDR environment maps and converts them to WebGPU textures
 * with float16 or float32 format for use with IBL/PBR rendering.
 *
 * @module HDRLoader
 */

import {
  Texture,
  DEFAULT_SAMPLER_OPTIONS,
  type TextureOptions,
} from "./Texture";
import {
  MipmapGenerator,
  calculateMipLevelCount,
  isRenderableFormat,
} from "./MipmapGenerator";
import {
  parse as parseRGBE,
  type RGBEResult,
  RGBEParserError,
} from "./RGBEParser";
import { toFloat16Array } from "./Float16";

const BYTES_PER_CHANNEL_F16 = 2;
const BYTES_PER_CHANNEL_F32 = 4;
const RGBA_CHANNELS = 4;
const BYTES_PER_PIXEL_F16 = RGBA_CHANNELS * BYTES_PER_CHANNEL_F16; // 8 bytes
const BYTES_PER_PIXEL_F32 = RGBA_CHANNELS * BYTES_PER_CHANNEL_F32; // 16 bytes

export type HDRFormat = "rgba16float" | "rgba32float";

export interface HDRLoaderOptions
  extends Omit<TextureOptions, "format" | "srgb"> {
  /**
   * Output texture format.
   * - `rgba16float`: Half-precision (16-bit), good balance of quality and memory (default)
   * - `rgba32float`: Full precision (32-bit), highest quality but 2x memory
   */
  format?: HDRFormat;
  /**
   * Apply exposure correction from HDR file header.
   * When true, pixel values are multiplied by the exposure value in the file.
   * @default true
   */
  applyExposure?: boolean;
}

export class HDRLoaderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "HDRLoaderError";
  }
}

/**
 * Loader for Radiance HDR (.hdr) files.
 * Converts HDR images to WebGPU textures with proper float encoding
 * for use in physically-based rendering and image-based lighting.
 *
 * @example
 * ```ts
 * // Basic usage
 * const hdrTexture = await HDRLoader.fromURL(device, 'environment.hdr');
 *
 * // With options
 * const hdrTexture = await HDRLoader.fromURL(device, 'environment.hdr', {
 *   format: 'rgba32float',  // Higher precision
 *   generateMipmaps: true,
 *   label: 'Environment Map',
 * });
 *
 * // Use with PMREMGenerator
 * const generator = PMREMGenerator.get(device);
 * const { prefilteredMap, irradianceMap } = await generator.fromEquirectangular(hdrTexture);
 * ```
 */
export class HDRLoader {
  /**
   * Loads an HDR texture from a URL.
   * @param device - The WebGPU device
   * @param url - URL to the .hdr file
   * @param options - Loading options
   * @returns Promise resolving to a Texture instance
   * @throws {HDRLoaderError} If loading or parsing fails
   */
  static async fromURL(
    device: GPUDevice,
    url: string,
    options: HDRLoaderOptions = {}
  ): Promise<Texture> {
    if (!device) {
      throw new HDRLoaderError("GPU device is required");
    }
    if (!url || typeof url !== "string" || url.trim().length === 0) {
      throw new HDRLoaderError("Valid URL string is required");
    }

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new HDRLoaderError(
          `Failed to fetch HDR from ${url}: ${response.status} ${response.statusText}`
        );
      }

      const buffer = await response.arrayBuffer();
      return this.fromBuffer(device, buffer, {
        ...options,
        label: options.label ?? url,
      });
    } catch (error) {
      if (error instanceof HDRLoaderError) {
        throw error;
      }

      if (error instanceof TypeError) {
        throw new HDRLoaderError(
          `Network error while fetching HDR from ${url}: ${error.message}`,
          error
        );
      }

      throw new HDRLoaderError(
        `Unexpected error loading HDR from ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error
      );
    }
  }

  /**
   * Loads an HDR texture from an ArrayBuffer.
   * @param device - The WebGPU device
   * @param buffer - The HDR file data as ArrayBuffer
   * @param options - Loading options
   * @returns Promise resolving to a Texture instance
   * @throws {HDRLoaderError} If parsing fails
   */
  static async fromBuffer(
    device: GPUDevice,
    buffer: ArrayBuffer,
    options: HDRLoaderOptions = {}
  ): Promise<Texture> {
    if (!device) {
      throw new HDRLoaderError("GPU device is required");
    }

    if (!buffer || !(buffer instanceof ArrayBuffer)) {
      throw new HDRLoaderError("Valid ArrayBuffer is required");
    }

    if (buffer.byteLength === 0) {
      throw new HDRLoaderError("ArrayBuffer cannot be empty");
    }

    let parsed: RGBEResult;

    try {
      parsed = parseRGBE(buffer);
    } catch (error) {
      if (error instanceof RGBEParserError) {
        throw new HDRLoaderError(
          `Invalid HDR file format: ${error.message}`,
          error
        );
      }

      throw new HDRLoaderError(
        `Failed to parse HDR data: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error
      );
    }

    const { width, height, data, exposure } = parsed;
    const format: HDRFormat = options.format ?? "rgba16float";
    const applyExposure = options.applyExposure !== false;
    const shouldGenerateMipmaps = options.generateMipmaps !== false;

    if (width <= 0 || height <= 0) {
      throw new HDRLoaderError(
        `Invalid texture dimensions: ${width}x${height}`
      );
    }

    // Check for required GPU features before processing
    if (
      format === "rgba32float" &&
      !device.features.has("float32-filterable")
    ) {
      throw new HDRLoaderError(
        "Device does not support 'float32-filterable' feature required for rgba32float format. " +
          "Use 'rgba16float' format instead or ensure the GPU supports this feature."
      );
    }

    let gpuTexture: GPUTexture | null = null;
    let gpuSampler: GPUSampler | null = null;

    try {
      // Apply exposure correction if enabled and exposure != 1.0
      let processedData = data;
      if (applyExposure && exposure !== 1.0) {
        processedData = applyExposureCorrection(data, exposure);
      }

      // Convert to appropriate format
      let uploadData: Uint16Array | Float32Array;
      let bytesPerPixel: number;

      if (format === "rgba16float") {
        uploadData = toFloat16Array(processedData);
        bytesPerPixel = BYTES_PER_PIXEL_F16;
      } else {
        uploadData = processedData;
        bytesPerPixel = BYTES_PER_PIXEL_F32;
      }

      // Calculate mip levels
      let mipLevelCount = 1;
      if (shouldGenerateMipmaps && isRenderableFormat(format)) {
        mipLevelCount = calculateMipLevelCount(width, height);
      }

      // Create GPU texture
      gpuTexture = device.createTexture({
        label: options.label ?? "HDRTexture",
        size: [width, height, 1],
        format: format as GPUTextureFormat, // Type assertion for WebGPU API compatibility
        mipLevelCount,
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });

      // Upload texture data
      device.queue.writeTexture(
        { texture: gpuTexture },
        uploadData.buffer,
        {
          bytesPerRow: width * bytesPerPixel,
          rowsPerImage: height,
        },
        [width, height, 1]
      );

      // Generate mipmaps if requested
      if (mipLevelCount > 1) {
        const mipmapGenerator = MipmapGenerator.get(device);
        mipmapGenerator.generateMipmap(gpuTexture);
      }

      const samplerOptions: GPUSamplerDescriptor = {
        ...DEFAULT_SAMPLER_OPTIONS,
        // HDR textures typically use clamp-to-edge for environment maps
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
        ...options.sampler,
        label: options.label ? `Sampler: ${options.label}` : undefined,
      };
      gpuSampler = device.createSampler(samplerOptions);

      return new Texture(
        gpuTexture,
        gpuSampler,
        width,
        height,
        format,
        mipLevelCount
      );
    } catch (error) {
      if (gpuTexture) {
        gpuTexture.destroy();
      }

      if (error instanceof HDRLoaderError) {
        throw error;
      }

      throw new HDRLoaderError(
        `Failed to create HDR texture: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error
      );
    }
  }

  /**
   * Checks if a URL points to an HDR file based on extension.
   * @param url - The URL to check
   * @returns True if the URL has an .hdr extension
   */
  static isHDRFile(url: string): boolean {
    if (!url || typeof url !== "string") {
      return false;
    }
    const cleanUrl = url.split("?")[0].split("#")[0]; // Remove query/hash
    return cleanUrl.toLowerCase().endsWith(".hdr");
  }
}

/**
 * Applies exposure correction to HDR data.
 */
function applyExposureCorrection(
  data: Float32Array,
  exposure: number
): Float32Array {
  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i += 4) {
    result[i] = data[i] * exposure; // R
    result[i + 1] = data[i + 1] * exposure; // G
    result[i + 2] = data[i + 2] * exposure; // B
    result[i + 3] = data[i + 3]; // A (unchanged)
  }
  return result;
}
