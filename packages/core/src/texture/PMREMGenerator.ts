import { Texture } from "./Texture";
import {
  CubeTexture,
  CubeFace,
  calculateCubeMipLevelCount,
} from "./CubeTexture";
import { BRDFLut } from "./BRDFLut";
import commonShader from "../shaders/pmrem/common.wgsl?raw";
import equirectToCubeShader from "../shaders/pmrem/equirect-to-cube.wgsl?raw";
import irradianceShader from "../shaders/pmrem/irradiance.wgsl?raw";
import prefilterShader from "../shaders/pmrem/prefilter.wgsl?raw";

/**
 * Configuration options for PMREM generation.
 *
 * @example
 * ```ts
 * const options: PMREMOptions = {
 *   prefilteredSize: 512,
 *   irradianceSize: 64,
 *   format: 'rgba16float',
 *   sampleCount: 2048
 * };
 * ```
 */
export interface PMREMOptions {
  /** Size of the prefiltered environment cubemap (default: 256) */
  prefilteredSize?: number;

  /** Size of the irradiance cubemap (default: 32, smaller is fine for diffuse) */
  irradianceSize?: number;

  /** Texture format (default: 'rgba16float') */
  format?: GPUTextureFormat;

  /** Number of samples for importance sampling (default: 1024) */
  sampleCount?: number;
}

/**
 * Result of PMREM generation containing all textures needed for IBL.
 *
 * @example
 * ```ts
 * const result = await generator.fromEquirectangular(envTexture);
 * const { prefilteredMap, irradianceMap, brdfLUT } = result;
 * ```
 */
export interface PMREMResult {
  /** Prefiltered environment map with roughness-based mip levels */
  prefilteredMap: CubeTexture;

  /** Diffuse irradiance cubemap */
  irradianceMap: CubeTexture;

  /** BRDF integration LUT (shared across all materials) */
  brdfLUT: Texture;
}

/**
 * Generates Pre-filtered Mipmapped Radiance Environment Maps (PMREM) for IBL.
 *
 * This generator converts an equirectangular HDR environment map into:
 * 1. A prefiltered environment cubemap with roughness-based mip levels
 * 2. A diffuse irradiance cubemap
 * 3. A BRDF integration LUT (shared)
 *
 * The output textures are used for physically-based image-based lighting
 * with the split-sum approximation.
 *
 * @example
 * ```ts
 * // Get generator instance (cached per device)
 * const generator = PMREMGenerator.get(device);
 *
 * // Load HDR environment map
 * const envTexture = await Texture.fromURL(device, 'environment.hdr');
 *
 * // Generate PMREM textures
 * const { prefilteredMap, irradianceMap, brdfLUT } =
 *   await generator.fromEquirectangular(envTexture);
 *
 * // Use in PBR material
 * const material = new PBRMaterial({
 *   prefilteredMap,
 *   irradianceMap,
 *   // brdfLUT is automatically used
 * });
 * ```
 */
export class PMREMGenerator {
  private static _cache = new WeakMap<GPUDevice, PMREMGenerator>();

  private _device: GPUDevice;
  private _equirectToCubePipeline: GPURenderPipeline | null = null;
  private _irradiancePipeline: GPURenderPipeline | null = null;
  private _prefilterPipeline: GPURenderPipeline | null = null;
  private _sampler: GPUSampler | null = null;
  private _uniformBuffer: ArrayBuffer | null = null;

  /**
   * Gets or creates a PMREMGenerator instance for the given device.
   * @param device - The WebGPU device
   * @returns The cached or newly created generator
   */
  static get(device: GPUDevice): PMREMGenerator {
    let generator = this._cache.get(device);
    if (!generator) {
      generator = new PMREMGenerator(device);
      this._cache.set(device, generator);
    }
    return generator;
  }

  private constructor(device: GPUDevice) {
    this._device = device;
  }

  /**
   * Generates PMREM textures from an equirectangular environment map.
   *
   * @param envTexture - The source equirectangular environment texture
   * @param options - Generation options
   * @returns Promise resolving to the PMREM result textures
   * @throws {Error} If envTexture is invalid or null
   * @throws {Error} If WebGPU operations fail
   * @performance Typical execution time: ~100-500ms depending on size and GPU
   * @memory Allocates approximately (prefilteredSize² * 6 * mipLevels * 8) bytes
   */
  async fromEquirectangular(
    envTexture: Texture,
    options: PMREMOptions = {}
  ): Promise<PMREMResult> {
    if (!envTexture || !envTexture.gpuTexture) {
      throw new Error(
        "PMREMGenerator: Invalid or null environment texture provided"
      );
    }

    const prefilteredSize = options.prefilteredSize ?? 256;
    const irradianceSize = options.irradianceSize ?? 32;
    const format = options.format ?? "rgba16float";

    if (prefilteredSize <= 0 || irradianceSize <= 0) {
      throw new Error("PMREMGenerator: Texture sizes must be positive");
    }

    if (
      !Number.isInteger(prefilteredSize) ||
      !Number.isInteger(irradianceSize)
    ) {
      throw new Error("PMREMGenerator: Texture sizes must be integers");
    }

    // Initialize pipelines if needed
    try {
      this._ensurePipelines(format);
    } catch (error) {
      throw new Error(
        `PMREMGenerator: Failed to initialize pipelines - ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // Initialize shared uniform buffer for better memory efficiency
    this._uniformBuffer = new ArrayBuffer(16);

    let envCubemap: CubeTexture | null = null;

    try {
      // Convert equirectangular to cubemap
      envCubemap = this._equirectToCubemap(envTexture, prefilteredSize, format);

      // Generate irradiance map (diffuse IBL)
      const irradianceMap = this._generateIrradiance(
        envCubemap,
        irradianceSize,
        format
      );

      // Generate prefiltered map (specular IBL with roughness mips)
      const prefilteredMap = this._generatePrefiltered(
        envCubemap,
        prefilteredSize,
        format
      );

      // Get BRDF LUT (shared)
      const brdfLUT = BRDFLut.get(this._device);

      return {
        prefilteredMap,
        irradianceMap,
        brdfLUT,
      };
    } catch (error) {
      throw new Error(
        `PMREMGenerator: Failed to generate PMREM textures - ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      if (envCubemap) {
        envCubemap.destroy();
      }

      this._uniformBuffer = null;
    }
  }

  /**
   * Initializes render pipelines if not already created.
   * @param format - The texture format for render targets
   * @throws {Error} If pipeline creation fails
   */
  private _ensurePipelines(format: GPUTextureFormat): void {
    if (this._equirectToCubePipeline) return;

    try {
      // Create shared sampler
      this._sampler = this._device.createSampler({
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });

      // Create equirect to cube pipeline
      const equirectModule = this._device.createShaderModule({
        label: "PMREM:EquirectToCube",
        code: EQUIRECT_TO_CUBE_SHADER,
      });

      this._equirectToCubePipeline = this._device.createRenderPipeline({
        label: "PMREM:EquirectToCubePipeline",
        layout: "auto",
        vertex: {
          module: equirectModule,
          entryPoint: "vertexMain",
        },
        fragment: {
          module: equirectModule,
          entryPoint: "fragmentMain",
          targets: [{ format }],
        },
        primitive: {
          topology: "triangle-list",
        },
      });

      // Create irradiance pipeline
      const irradianceModule = this._device.createShaderModule({
        label: "PMREM:Irradiance",
        code: IRRADIANCE_SHADER,
      });

      this._irradiancePipeline = this._device.createRenderPipeline({
        label: "PMREM:IrradiancePipeline",
        layout: "auto",
        vertex: {
          module: irradianceModule,
          entryPoint: "vertexMain",
        },
        fragment: {
          module: irradianceModule,
          entryPoint: "fragmentMain",
          targets: [{ format }],
        },
        primitive: {
          topology: "triangle-list",
        },
      });

      // Create prefilter pipeline
      const prefilterModule = this._device.createShaderModule({
        label: "PMREM:Prefilter",
        code: PREFILTER_SHADER,
      });

      this._prefilterPipeline = this._device.createRenderPipeline({
        label: "PMREM:PrefilterPipeline",
        layout: "auto",
        vertex: {
          module: prefilterModule,
          entryPoint: "vertexMain",
        },
        fragment: {
          module: prefilterModule,
          entryPoint: "fragmentMain",
          targets: [{ format }],
        },
        primitive: {
          topology: "triangle-list",
        },
      });
    } catch (error) {
      this._equirectToCubePipeline = null;
      this._irradiancePipeline = null;
      this._prefilterPipeline = null;
      this._sampler = null;
      throw error;
    }
  }

  /**
   * Converts an equirectangular map to a cubemap.
   * @param envTexture - The source equirectangular texture
   * @param size - The size of each cubemap face
   * @param format - The texture format
   * @returns A new CubeTexture containing the converted environment
   */
  private _equirectToCubemap(
    envTexture: Texture,
    size: number,
    format: GPUTextureFormat
  ): CubeTexture {
    const cubemap = CubeTexture.createEmpty(this._device, size, {
      format,
      mipLevelCount: 1, // No mipmaps for intermediate cubemap
      label: "PMREM:EnvCubemap",
    });

    const uniformBuffer = this._device.createBuffer({
      size: 16, // face index (4 bytes) + padding
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const commandEncoder = this._device.createCommandEncoder();
    const uniformData = new Uint32Array(this._uniformBuffer!);

    for (let face = CubeFace.PositiveX; face <= CubeFace.NegativeZ; face++) {
      const faceEnum = face as CubeFace;

      // Update face index uniform using pre-allocated buffer
      uniformData[0] = face;
      this._device.queue.writeBuffer(uniformBuffer, 0, uniformData);

      const bindGroup = this._device.createBindGroup({
        layout: this._equirectToCubePipeline!.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: this._sampler! },
          { binding: 2, resource: envTexture.gpuTexture.createView() },
        ],
      });

      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: cubemap.getFaceView(faceEnum),
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
          },
        ],
      });

      renderPass.setPipeline(this._equirectToCubePipeline!);
      renderPass.setBindGroup(0, bindGroup);
      renderPass.draw(3);
      renderPass.end();
    }

    this._device.queue.submit([commandEncoder.finish()]);
    uniformBuffer.destroy();

    return cubemap;
  }

  /**
   * Generates a diffuse irradiance map from the environment cubemap.
   * @param envCubemap - The source environment cubemap
   * @param size - The size of each irradiance map face
   * @param format - The texture format
   * @returns A new CubeTexture containing the irradiance map
   */
  private _generateIrradiance(
    envCubemap: CubeTexture,
    size: number,
    format: GPUTextureFormat
  ): CubeTexture {
    const irradianceMap = CubeTexture.createEmpty(this._device, size, {
      format,
      mipLevelCount: 1,
      label: "PMREM:IrradianceMap",
    });

    const uniformBuffer = this._device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const commandEncoder = this._device.createCommandEncoder();
    const uniformData = new Uint32Array(this._uniformBuffer!);

    for (let face = CubeFace.PositiveX; face <= CubeFace.NegativeZ; face++) {
      const faceEnum = face as CubeFace;

      uniformData[0] = face;
      this._device.queue.writeBuffer(uniformBuffer, 0, uniformData);

      const bindGroup = this._device.createBindGroup({
        layout: this._irradiancePipeline!.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniformBuffer } },
          { binding: 1, resource: this._sampler! },
          { binding: 2, resource: envCubemap.cubeView },
        ],
      });

      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: irradianceMap.getFaceView(faceEnum),
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
          },
        ],
      });

      renderPass.setPipeline(this._irradiancePipeline!);
      renderPass.setBindGroup(0, bindGroup);
      renderPass.draw(3);
      renderPass.end();
    }

    this._device.queue.submit([commandEncoder.finish()]);
    uniformBuffer.destroy();

    return irradianceMap;
  }

  /**
   * Generates a prefiltered environment map with roughness-based mip levels.
   * @param envCubemap - The source environment cubemap
   * @param size - The size of the base mip level
   * @param format - The texture format
   * @returns A new CubeTexture with mip levels for different roughness values
   */
  private _generatePrefiltered(
    envCubemap: CubeTexture,
    size: number,
    format: GPUTextureFormat
  ): CubeTexture {
    const mipLevelCount = calculateCubeMipLevelCount(size);
    const prefilteredMap = CubeTexture.createEmpty(this._device, size, {
      format,
      mipLevelCount,
      label: "PMREM:PrefilteredMap",
    });

    const uniformBuffer = this._device.createBuffer({
      size: 16, // face (u32) + roughness (f32) + padding
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const commandEncoder = this._device.createCommandEncoder();

    // Reuse pre-allocated buffer for better performance
    const uniformDataU32 = new Uint32Array(this._uniformBuffer!);
    const uniformDataF32 = new Float32Array(this._uniformBuffer!);

    for (let mip = 0; mip < mipLevelCount; mip++) {
      const roughness = mip / (mipLevelCount - 1);

      for (let face = CubeFace.PositiveX; face <= CubeFace.NegativeZ; face++) {
        const faceEnum = face as CubeFace;

        // Update uniforms: face and roughness
        uniformDataU32[0] = face;
        uniformDataF32[1] = roughness;
        this._device.queue.writeBuffer(uniformBuffer, 0, this._uniformBuffer!);

        const bindGroup = this._device.createBindGroup({
          layout: this._prefilterPipeline!.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: this._sampler! },
            { binding: 2, resource: envCubemap.cubeView },
          ],
        });

        const renderPass = commandEncoder.beginRenderPass({
          colorAttachments: [
            {
              view: prefilteredMap.getFaceView(faceEnum, mip),
              loadOp: "clear",
              storeOp: "store",
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
            },
          ],
        });

        renderPass.setPipeline(this._prefilterPipeline!);
        renderPass.setBindGroup(0, bindGroup);
        renderPass.draw(3);
        renderPass.end();
      }
    }

    this._device.queue.submit([commandEncoder.finish()]);
    uniformBuffer.destroy();

    return prefilteredMap;
  }
}

// Combine common shader with specific shaders
const EQUIRECT_TO_CUBE_SHADER = `${commonShader}\n${equirectToCubeShader}`;
const IRRADIANCE_SHADER = `${commonShader}\n${irradianceShader}`;
const PREFILTER_SHADER = `${commonShader}\n${prefilterShader}`;
