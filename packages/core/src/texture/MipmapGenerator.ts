/**
 * WGSL shader for mipmap generation using fullscreen triangle technique.
 * Uses a single triangle that covers the entire viewport, avoiding the need
 * for vertex buffers. The triangle vertices are generated procedurally
 * based on vertex index.
 */
const MIPMAP_SHADER = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texCoord: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  // Fullscreen triangle positions (covers viewport with single triangle)
  // Vertex 0: (-1, -1), Vertex 1: (-1, 3), Vertex 2: (3, -1)
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(-1.0, 3.0),
    vec2f(3.0, -1.0)
  );

  var output: VertexOutput;
  let p = pos[vertexIndex];
  output.position = vec4f(p, 0.0, 1.0);
  // Convert from clip space [-1, 1] to UV space [0, 1]
  // Note: Y is flipped for correct texture orientation
  output.texCoord = p * vec2f(0.5, -0.5) + vec2f(0.5);
  return output;
}

@group(0) @binding(0) var texSampler: sampler;
@group(0) @binding(1) var tex: texture_2d<f32>;

@fragment
fn fragmentMain(@location(0) texCoord: vec2f) -> @location(0) vec4f {
  return textureSample(tex, texSampler, texCoord);
}
`;

/**
 * Formats that support rendering (can be used as render attachment).
 * These formats can have mipmaps generated via render pass.
 */
const RENDERABLE_FORMATS: Set<GPUTextureFormat> = new Set([
  "rgba8unorm",
  "rgba8unorm-srgb",
  "bgra8unorm",
  "bgra8unorm-srgb",
  "rgba16float",
  "rgba32float",
  "rg16float",
  "rg32float",
  "r16float",
  "r32float",
  "rgb10a2unorm",
]);

/**
 * Calculates the number of mip levels for a texture of given dimensions.
 *
 * @param width - Texture width in pixels
 * @param height - Texture height in pixels
 * @returns The number of mip levels (minimum 1)
 *
 * @example
 * ```typescript
 * calculateMipLevelCount(256, 256); // returns 9 (256 -> 128 -> 64 -> 32 -> 16 -> 8 -> 4 -> 2 -> 1)
 * calculateMipLevelCount(1024, 512); // returns 11
 * calculateMipLevelCount(1, 1); // returns 1
 * ```
 */
export function calculateMipLevelCount(width: number, height: number): number {
  return Math.floor(Math.log2(Math.max(width, height))) + 1;
}

/**
 * Checks if a texture format supports rendering (can be used as render attachment).
 *
 * @param format - The texture format to check
 * @returns true if the format can be rendered to
 */
export function isRenderableFormat(format: GPUTextureFormat): boolean {
  return RENDERABLE_FORMATS.has(format);
}

/**
 * Generates mipmaps for WebGPU textures using render passes.
 *
 * WebGPU doesn't provide automatic mipmap generation like WebGL's generateMipmap().
 * This class implements mipmap generation using a fullscreen triangle render pass
 * that downsamples each mip level from the previous one.
 *
 * Uses a WeakMap-based static cache for device-specific instances to avoid
 * creating multiple generators per device.
 *
 * @example
 * ```typescript
 * // Get or create generator for device (cached automatically)
 * const generator = MipmapGenerator.get(device);
 *
 * // Generate mipmaps for a texture
 * generator.generateMipmap(texture);
 * ```
 */
export class MipmapGenerator {
  private static _cache = new WeakMap<GPUDevice, MipmapGenerator>();

  private _device: GPUDevice;
  private _sampler: GPUSampler;
  private _shaderModule: GPUShaderModule;
  private _bindGroupLayout: GPUBindGroupLayout;
  private _pipelineLayout: GPUPipelineLayout;
  private _pipelines = new Map<GPUTextureFormat, GPURenderPipeline>();

  /**
   * Creates a new MipmapGenerator instance.
   * Prefer using MipmapGenerator.get() for automatic caching.
   *
   * @param device - The WebGPU device
   */
  constructor(device: GPUDevice) {
    this._device = device;

    // Create a linear sampler for downsampling
    this._sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      label: "MipmapGenerator Sampler",
    });

    // Create shader module
    this._shaderModule = device.createShaderModule({
      label: "MipmapGenerator Shader",
      code: MIPMAP_SHADER,
    });

    // Create bind group layout
    this._bindGroupLayout = device.createBindGroupLayout({
      label: "MipmapGenerator BindGroupLayout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      ],
    });

    // Create pipeline layout
    this._pipelineLayout = device.createPipelineLayout({
      label: "MipmapGenerator PipelineLayout",
      bindGroupLayouts: [this._bindGroupLayout],
    });
  }

  /**
   * Gets or creates a MipmapGenerator instance for the given device.
   * Instances are cached per device using a WeakMap, so the generator
   * will be garbage collected when the device is no longer referenced.
   *
   * @param device - The WebGPU device
   * @returns A MipmapGenerator instance for the device
   */
  static get(device: GPUDevice): MipmapGenerator {
    let generator = MipmapGenerator._cache.get(device);
    if (!generator) {
      generator = new MipmapGenerator(device);
      MipmapGenerator._cache.set(device, generator);
    }
    return generator;
  }

  /**
   * Gets or creates a render pipeline for the specified texture format.
   * Pipelines are cached per format.
   *
   * @param format - The texture format
   * @returns A render pipeline configured for the format
   */
  private getPipeline(format: GPUTextureFormat): GPURenderPipeline {
    let pipeline = this._pipelines.get(format);
    if (!pipeline) {
      pipeline = this._device.createRenderPipeline({
        label: `MipmapGenerator Pipeline (${format})`,
        layout: this._pipelineLayout,
        vertex: {
          module: this._shaderModule,
          entryPoint: "vertexMain",
        },
        fragment: {
          module: this._shaderModule,
          entryPoint: "fragmentMain",
          targets: [{ format }],
        },
        primitive: {
          topology: "triangle-list",
        },
      });
      this._pipelines.set(format, pipeline);
    }
    return pipeline;
  }

  /**
   * Generates mipmaps for a texture.
   *
   * The texture must have been created with:
   * - `mipLevelCount > 1`
   * - `GPUTextureUsage.RENDER_ATTACHMENT` usage flag
   * - A renderable format (rgba8unorm, rgba8unorm-srgb, bgra8unorm, bgra8unorm-srgb, etc.)
   *
   * @param texture - The GPUTexture to generate mipmaps for
   *
   * @example
   * ```typescript
   * const texture = device.createTexture({
   *   size: [width, height],
   *   format: 'rgba8unorm',
   *   mipLevelCount: calculateMipLevelCount(width, height),
   *   usage: GPUTextureUsage.TEXTURE_BINDING |
   *          GPUTextureUsage.COPY_DST |
   *          GPUTextureUsage.RENDER_ATTACHMENT,
   * });
   *
   * // Upload base level data...
   *
   * const generator = MipmapGenerator.get(device);
   * generator.generateMipmap(texture);
   * ```
   */
  generateMipmap(texture: GPUTexture): void {
    const format = texture.format;
    const mipLevelCount = texture.mipLevelCount;

    // Validate texture format is renderable
    if (!isRenderableFormat(format)) {
      throw new Error(
        `MipmapGenerator: Cannot generate mipmaps for non-renderable format "${format}". ` +
          `Supported formats: ${[...RENDERABLE_FORMATS].join(", ")}`
      );
    }

    // Validate texture dimension (only 2D textures are supported)
    if (texture.dimension !== "2d") {
      throw new Error(
        `MipmapGenerator: Only 2D textures are supported. ` +
          `Received texture with dimension "${texture.dimension}".`
      );
    }

    // Nothing to do if only one mip level
    if (mipLevelCount <= 1) {
      return;
    }

    const pipeline = this.getPipeline(format);
    const commandEncoder = this._device.createCommandEncoder({
      label: "MipmapGenerator CommandEncoder",
    });

    // Generate each mip level from the previous one
    for (let level = 1; level < mipLevelCount; level++) {
      // Create view of the source (previous) mip level
      const sourceView = texture.createView({
        label: `MipmapGenerator Source View (level ${level - 1})`,
        baseMipLevel: level - 1,
        mipLevelCount: 1,
      });

      // Create view of the destination (current) mip level
      const destinationView = texture.createView({
        label: `MipmapGenerator Destination View (level ${level})`,
        baseMipLevel: level,
        mipLevelCount: 1,
      });

      // Create bind group for this mip level
      const bindGroup = this._device.createBindGroup({
        label: `MipmapGenerator BindGroup (level ${level})`,
        layout: this._bindGroupLayout,
        entries: [
          { binding: 0, resource: this._sampler },
          { binding: 1, resource: sourceView },
        ],
      });

      // Render pass to generate this mip level
      const passEncoder = commandEncoder.beginRenderPass({
        label: `MipmapGenerator RenderPass (level ${level})`,
        colorAttachments: [
          {
            view: destinationView,
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });

      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.draw(3); // Fullscreen triangle (3 vertices)
      passEncoder.end();
    }

    // Submit all mip generation commands
    this._device.queue.submit([commandEncoder.finish()]);
  }
}
