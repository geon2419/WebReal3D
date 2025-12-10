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
import { parse, type RGBEResult, RGBEParserError } from "./RGBEParser";
import { toFloat16Array } from "./Float16";

/**
 * Supported HDR texture formats.
 */
export type HDRFormat = "rgba16float" | "rgba32float";

/**
 * Options for HDR texture loading.
 */
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

/**
 * Error class for HDR loading failures.
 */
export class HDRLoaderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "HDRLoaderError";
  }
}

/**
 * Loader for Radiance HDR (.hdr) files.
 *
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
   *
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
    try {
      // Fetch the HDR file
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
      throw new HDRLoaderError(
        `Failed to load HDR from ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error
      );
    }
  }

  /**
   * Loads an HDR texture from an ArrayBuffer.
   *
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
    // Parse the HDR file
    let parsed: RGBEResult;
    try {
      parsed = parse(buffer);
    } catch (error) {
      if (error instanceof RGBEParserError) {
        throw new HDRLoaderError(`HDR parsing failed: ${error.message}`, error);
      }
      throw new HDRLoaderError(
        `HDR parsing failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error
      );
    }

    const { width, height, data, exposure } = parsed;
    const format: HDRFormat = options.format ?? "rgba16float";
    const applyExposure = options.applyExposure !== false;
    const shouldGenerateMipmaps = options.generateMipmaps !== false;

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
      bytesPerPixel = 8; // 4 channels * 2 bytes
    } else {
      uploadData = processedData;
      bytesPerPixel = 16; // 4 channels * 4 bytes
    }

    // Check for required GPU features
    if (
      format === "rgba32float" &&
      !device.features.has("float32-filterable")
    ) {
      console.warn(
        "[HDRLoader] Device does not support 'float32-filterable' feature. " +
          "Linear filtering may not work correctly with rgba32float format."
      );
    }

    // Calculate mip levels
    let mipLevelCount = 1;
    if (shouldGenerateMipmaps && isRenderableFormat(format)) {
      mipLevelCount = calculateMipLevelCount(width, height);
    }

    // Create GPU texture
    const gpuTexture = device.createTexture({
      label: options.label ?? "HDRTexture",
      size: [width, height, 1],
      format,
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

    // Create sampler
    const samplerOptions: GPUSamplerDescriptor = {
      ...DEFAULT_SAMPLER_OPTIONS,
      // HDR textures typically use clamp-to-edge for environment maps
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      ...options.sampler,
      label: options.label ? `Sampler: ${options.label}` : undefined,
    };
    const gpuSampler = device.createSampler(samplerOptions);

    return new Texture(
      gpuTexture,
      gpuSampler,
      width,
      height,
      format,
      mipLevelCount
    );
  }

  /**
   * Checks if a URL points to an HDR file based on extension.
   *
   * @param url - The URL to check
   * @returns True if the URL has an .hdr extension
   */
  static isHDRFile(url: string): boolean {
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
