import type { Material, VertexBufferLayout, RenderContext } from "./Material";
import { ShaderLib } from "../shaders";
import { Texture, DEFAULT_SAMPLER_OPTIONS } from "../texture";
import { PointLight } from "../light/PointLight";

export interface ParallaxMaterialOptions {
  albedo: Texture;
  depth: Texture;
  normal?: Texture;
  /** @default 0.05 */
  depthScale?: number;
  /** @default 1.0 */
  normalScale?: number;
  /** @default 32.0 */
  shininess?: number;
  /** @default true */
  generateNormalFromDepth?: boolean;
}

/**
 * Parallax occlusion mapping material for 2.5D depth effects.
 * Requires geometry with UV, normals, tangents, and bitangents.
 *
 * @example
 * ```ts
 * const material = new ParallaxMaterial({
 *   albedo: albedoTexture,
 *   depth: depthTexture,
 *   normal: normalTexture,
 *   depthScale: 0.05,
 *   shininess: 32.0
 * });
 * ```
 */
export class ParallaxMaterial implements Material {
  readonly type = "parallax";
  readonly albedo: Texture;
  readonly depth: Texture;
  readonly normal?: Texture;
  private _depthScale: number;
  private _normalScale: number;
  private _shininess: number;
  readonly generateNormalFromDepth: boolean;
  private static _dummyNormalTexture?: Texture;

  /**
   * Creates a new ParallaxMaterial instance.
   * @param options - Configuration options for the material
   */
  constructor(options: ParallaxMaterialOptions) {
    this.albedo = options.albedo;
    this.depth = options.depth;
    this.normal = options.normal;
    this._depthScale = options.depthScale ?? 0.05;
    this._normalScale = options.normalScale ?? 1.0;
    this._shininess = options.shininess ?? 32.0;
    this.generateNormalFromDepth = options.generateNormalFromDepth ?? true;

    // Validate depth scale range
    if (this._depthScale < 0.01 || this._depthScale > 0.1) {
      console.warn(
        `ParallaxMaterial: depthScale ${this._depthScale} is outside recommended range (0.01-0.1)`
      );
    }

    // Validate normal scale range
    if (this._normalScale < 0.5 || this._normalScale > 2.0) {
      console.warn(
        `ParallaxMaterial: normalScale ${this._normalScale} is outside recommended range (0.5-2.0)`
      );
    }

    // Validate shininess range
    if (this._shininess < 1 || this._shininess > 256) {
      console.warn(
        `ParallaxMaterial: shininess ${this._shininess} is outside recommended range (1-256)`
      );
    }
  }

  /**
   * Gets the depth scale value.
   */
  get depthScale(): number {
    return this._depthScale;
  }

  /**
   * Sets the depth scale value.
   * @param value - Depth scale value (recommended range: 0.01-0.1)
   */
  set depthScale(value: number) {
    if (value < 0.01 || value > 0.15) {
      console.warn(
        `ParallaxMaterial: depthScale ${value} is outside recommended range (0.01-0.15)`
      );
    }
    this._depthScale = value;
  }

  /**
   * Gets the normal scale value.
   */
  get normalScale(): number {
    return this._normalScale;
  }

  /**
   * Sets the normal scale value.
   * @param value - Normal scale value (recommended range: 0.5-2.0)
   */
  set normalScale(value: number) {
    if (value < 0.5 || value > 2.0) {
      console.warn(
        `ParallaxMaterial: normalScale ${value} is outside recommended range (0.5-2.0)`
      );
    }
    this._normalScale = value;
  }

  /**
   * Gets the shininess value.
   */
  get shininess(): number {
    return this._shininess;
  }

  /**
   * Sets the shininess value.
   * @param value - Shininess value (recommended range: 1-256)
   */
  set shininess(value: number) {
    if (value < 1 || value > 256) {
      console.warn(
        `ParallaxMaterial: shininess ${value} is outside recommended range (1-256)`
      );
    }
    this._shininess = value;
  }

  /**
   * Gets the vertex shader code for parallax mapping.
   * @returns WGSL vertex shader code
   */
  getVertexShader(): string {
    return ShaderLib.get(this.type).vertex;
  }

  /**
   * Gets the fragment shader code for parallax mapping.
   * @returns WGSL fragment shader code
   */
  getFragmentShader(): string {
    return ShaderLib.get(this.type).fragment;
  }

  /**
   * Gets the vertex buffer layout for position, normal, uv, tangent, bitangent.
   * @returns Vertex buffer layout with 56-byte stride
   */
  getVertexBufferLayout(): VertexBufferLayout {
    return {
      // position(vec3f) + normal(vec3f) + uv(vec2f) + tangent(vec3f) + bitangent(vec3f) = 14 floats × 4 bytes = 56 bytes
      arrayStride: 56,
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: "float32x3", // position
        },
        {
          shaderLocation: 1,
          offset: 12,
          format: "float32x3", // normal
        },
        {
          shaderLocation: 2,
          offset: 24,
          format: "float32x2", // uv
        },
        {
          shaderLocation: 3,
          offset: 32,
          format: "float32x3", // tangent
        },
        {
          shaderLocation: 4,
          offset: 44,
          format: "float32x3", // bitangent
        },
      ],
    };
  }

  /**
   * Gets the uniform buffer size for MVP, model matrix, camera, material params, and light data.
   * @returns 192 bytes
   */
  getUniformBufferSize(): number {
    return 192;
  }

  /**
   * Gets the primitive topology for rendering triangles.
   * @returns "triangle-list"
   */
  getPrimitiveTopology(): GPUPrimitiveTopology {
    return "triangle-list";
  }

  /**
   * Creates a 1x1 default normal texture with up-facing normal.
   * @param device - WebGPU device for texture creation
   * @returns Dummy normal texture with (0, 0, 1) normal vector
   */
  private static createDummyNormalTexture(device: GPUDevice): Texture {
    if (!this._dummyNormalTexture) {
      // Create a 1x1 texture with a default normal (0, 0, 1) encoded as (128, 128, 255)
      const texture = device.createTexture({
        size: [1, 1, 1],
        format: "rgba8unorm",
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });

      // Write default normal data: (0.5, 0.5, 1.0, 1.0) in normalized space
      // Maps to (0, 0, 1) in tangent space after unpacking in shader
      const data = new Uint8Array([128, 128, 255, 255]);
      device.queue.writeTexture(
        { texture },
        data,
        { bytesPerRow: 4 },
        [1, 1, 1]
      );

      // Create a sampler using default options from Texture
      const sampler = device.createSampler(DEFAULT_SAMPLER_OPTIONS);

      this._dummyNormalTexture = new Texture(
        texture,
        sampler,
        1,
        1,
        "rgba8unorm",
        1
      );
    }
    return this._dummyNormalTexture;
  }

  /**
   * Gets all textures for binding to the shader.
   * @param device - WebGPU device (required if no normal texture provided)
   * @returns Array of [albedo, depth, normal] textures
   */
  getTextures(device?: GPUDevice): Texture[] {
    const normalTexture =
      this.normal ||
      (device ? ParallaxMaterial.createDummyNormalTexture(device) : undefined);

    if (!normalTexture) {
      throw new Error(
        "ParallaxMaterial.getTextures() requires a GPUDevice parameter when no normal texture is provided"
      );
    }

    return [this.albedo, this.depth, normalTexture];
  }

  /**
   * Writes camera position, material parameters, and light data to the uniform buffer.
   * @param buffer - DataView of the uniform buffer
   * @param offset - Byte offset to start writing (default: 64). This represents the absolute position
   *                 where modelMatrix begins. All subsequent writes use relative offsets from this parameter.
   * @param context - Rendering context with camera, scene, and mesh information
   */
  writeUniformData(
    buffer: DataView,
    offset: number = 64,
    context?: RenderContext
  ): void {
    this._writeModelMatrix(buffer, offset, context);
    this._writeCameraPosition(buffer, offset, context);
    this._writeMaterialParams(buffer, offset);

    const light = context?.lights?.[0];
    if (light instanceof PointLight) {
      this._writePointLight(buffer, offset, light);
    } else {
      this._writeDefaultLight(buffer, offset);
    }
  }

  /**
   * Writes model matrix to the uniform buffer.
   * @param buffer - DataView of the uniform buffer
   * @param offset - Base offset (modelMatrix at offset+0)
   * @param context - Rendering context
   */
  private _writeModelMatrix(
    buffer: DataView,
    offset: number,
    context?: RenderContext
  ): void {
    if (!context?.mesh) return;

    for (let i = 0; i < 16; i++) {
      buffer.setFloat32(offset + i * 4, context.mesh.worldMatrix.data[i], true);
    }
  }

  /**
   * Writes camera position to the uniform buffer.
   * @param buffer - DataView of the uniform buffer
   * @param offset - Base offset (cameraPosition at offset+64)
   * @param context - Rendering context
   */
  private _writeCameraPosition(
    buffer: DataView,
    offset: number,
    context?: RenderContext
  ): void {
    if (!context?.camera) return;

    const cameraWorldMatrix = context.camera.worldMatrix.data;
    buffer.setFloat32(offset + 64, cameraWorldMatrix[12], true);
    buffer.setFloat32(offset + 68, cameraWorldMatrix[13], true);
    buffer.setFloat32(offset + 72, cameraWorldMatrix[14], true);
    buffer.setFloat32(offset + 76, 0, true);
  }

  /**
   * Writes material parameters to the uniform buffer.
   * @param buffer - DataView of the uniform buffer
   * @param offset - Base offset (materialParams at offset+80)
   */
  private _writeMaterialParams(buffer: DataView, offset: number): void {
    buffer.setFloat32(offset + 80, this.depthScale, true);
    buffer.setFloat32(offset + 84, this.normalScale, true);
    buffer.setFloat32(offset + 88, this.normal ? 1 : 0, true);
    buffer.setFloat32(offset + 92, this.shininess, true);
  }

  /**
   * Writes point light data to the uniform buffer.
   * @param buffer - DataView of the uniform buffer
   * @param offset - Base offset (light data at offset+96)
   * @param light - Point light instance
   */
  private _writePointLight(
    buffer: DataView,
    offset: number,
    light: PointLight
  ): void {
    light.updateWorldMatrix(true, false);

    // Light position at offset+96
    buffer.setFloat32(offset + 96, light.worldMatrix.data[12], true);
    buffer.setFloat32(offset + 100, light.worldMatrix.data[13], true);
    buffer.setFloat32(offset + 104, light.worldMatrix.data[14], true);
    buffer.setFloat32(offset + 108, 0, true);

    // Light color at offset+112
    buffer.setFloat32(offset + 112, light.color.r, true);
    buffer.setFloat32(offset + 116, light.color.g, true);
    buffer.setFloat32(offset + 120, light.color.b, true);
    buffer.setFloat32(offset + 124, light.intensity, true);
  }

  /**
   * Writes default light data to the uniform buffer.
   * @param buffer - DataView of the uniform buffer
   * @param offset - Base offset (light data at offset+96)
   */
  private _writeDefaultLight(buffer: DataView, offset: number): void {
    // Default light position at offset+96
    buffer.setFloat32(offset + 96, 2, true);
    buffer.setFloat32(offset + 100, 2, true);
    buffer.setFloat32(offset + 104, 3, true);
    buffer.setFloat32(offset + 108, 0, true);

    // Default light color at offset+112
    buffer.setFloat32(offset + 112, 1, true);
    buffer.setFloat32(offset + 116, 1, true);
    buffer.setFloat32(offset + 120, 1, true);
    buffer.setFloat32(offset + 124, 1, true);
  }
}
