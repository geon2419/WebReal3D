import { Color } from "@web-real/math";
import type { Material, VertexBufferLayout, RenderContext } from "./Material";
import { ShaderLib } from "../shaders";
import { DirectionalLight } from "../light/DirectionalLight";
import { PointLight } from "../light/PointLight";
import { AmbientLight } from "../light/AmbientLight";
import type { Texture } from "../texture";
import { DummyTextures } from "../texture";

export interface PBRMaterialOptions {
  /** Base color of the material (default: white) */
  color?: [number, number, number] | Color;
  /** Metalness factor 0.0 (dielectric) to 1.0 (metal) (default: 0.0) */
  metalness?: number;
  /** Roughness factor 0.0 (smooth) to 1.0 (rough) (default: 0.5) */
  roughness?: number;
  /** Base color/albedo texture map */
  map?: Texture;
  /** Normal map for surface detail */
  normalMap?: Texture;
  /** Normal map intensity (default: 1.0) */
  normalScale?: number;
  /** Roughness texture (green channel) */
  roughnessMap?: Texture;
  /** Metalness texture (blue channel) */
  metalnessMap?: Texture;
  /** Ambient occlusion map (red channel) */
  aoMap?: Texture;
  /** AO map intensity (default: 1.0) */
  aoMapIntensity?: number;
  /** Emissive color */
  emissive?: [number, number, number] | Color;
  /** Emissive intensity (default: 1.0) */
  emissiveIntensity?: number;
  /** Emissive texture map */
  emissiveMap?: Texture;
  /** Environment map (equirectangular) for reflections */
  envMap?: Texture;
  /** Environment map intensity (default: 1.0) */
  envMapIntensity?: number;
  /** Wireframe rendering mode */
  wireframe?: boolean;
}

/**
 * Physically Based Rendering (PBR) material using metallic-roughness workflow.
 * Implements Cook-Torrance BRDF with GGX distribution and supports up to 4 lights plus ambient.
 *
 * @example
 * ```ts
 * const material = new PBRMaterial({
 *   color: [0.8, 0.2, 0.2],
 *   metalness: 0.0,
 *   roughness: 0.4,
 *   normalMap: myNormalTexture,
 *   envMap: myEnvTexture
 * });
 * ```
 */
export class PBRMaterial implements Material {
  readonly type = "pbr";

  private _color: Color;
  private _metalness: number;
  private _roughness: number;
  private _normalScale: number;
  private _aoMapIntensity: number;
  private _emissive: Color;
  private _emissiveIntensity: number;
  private _envMapIntensity: number;
  wireframe: boolean;

  readonly map?: Texture;
  readonly normalMap?: Texture;
  readonly roughnessMap?: Texture;
  readonly metalnessMap?: Texture;
  readonly aoMap?: Texture;
  readonly emissiveMap?: Texture;
  readonly envMap?: Texture;

  // Getters
  get color(): Color {
    return this._color;
  }

  get metalness(): number {
    return this._metalness;
  }

  get roughness(): number {
    return this._roughness;
  }

  get normalScale(): number {
    return this._normalScale;
  }

  get aoMapIntensity(): number {
    return this._aoMapIntensity;
  }

  get emissive(): Color {
    return this._emissive;
  }

  get emissiveIntensity(): number {
    return this._emissiveIntensity;
  }

  get envMapIntensity(): number {
    return this._envMapIntensity;
  }

  /**
   * Creates a new PBR material with the specified properties.
   * @param options - Material configuration including color, metalness, roughness, and texture maps
   */
  constructor(options: PBRMaterialOptions = {}) {
    this._color = options.color
      ? Color.from(options.color)
      : new Color(1.0, 1.0, 1.0);
    this._metalness = options.metalness ?? 0.0;
    this._roughness = options.roughness ?? 0.5;
    this._normalScale = options.normalScale ?? 1.0;
    this._aoMapIntensity = options.aoMapIntensity ?? 1.0;
    this._emissive = options.emissive
      ? Color.from(options.emissive)
      : new Color(0.0, 0.0, 0.0);
    this._emissiveIntensity = options.emissiveIntensity ?? 1.0;
    this._envMapIntensity = options.envMapIntensity ?? 1.0;
    this.wireframe = options.wireframe ?? false;

    this.map = options.map;
    this.normalMap = options.normalMap;
    this.roughnessMap = options.roughnessMap;
    this.metalnessMap = options.metalnessMap;
    this.aoMap = options.aoMap;
    this.emissiveMap = options.emissiveMap;
    this.envMap = options.envMap;
  }

  /**
   * Sets the base color of the material.
   * @param color - RGB color as Color instance or array
   */
  setColor(color: Color | [number, number, number]): void {
    this._color = Color.from(color);
  }

  /**
   * Sets the metalness factor (0.0 = dielectric, 1.0 = metal).
   * @param value - Metalness value between 0 and 1
   */
  setMetalness(value: number): void {
    if (value < 0 || value > 1) {
      throw new Error("Metalness must be between 0 and 1");
    }
    this._metalness = value;
  }

  /**
   * Sets the roughness factor (0.0 = smooth, 1.0 = rough).
   * @param value - Roughness value between 0 and 1
   */
  setRoughness(value: number): void {
    if (value < 0 || value > 1) {
      throw new Error("Roughness must be between 0 and 1");
    }
    this._roughness = value;
  }

  /**
   * Sets the normal map intensity scale.
   * @param value - Normal scale between 0 and 3
   */
  setNormalScale(value: number): void {
    if (value < 0 || value > 3) {
      throw new Error("Normal scale must be between 0 and 3");
    }
    this._normalScale = value;
  }

  /**
   * Sets the ambient occlusion map intensity.
   * @param value - AO intensity between 0 and 1
   */
  setAoMapIntensity(value: number): void {
    if (value < 0 || value > 1) {
      throw new Error("AO map intensity must be between 0 and 1");
    }
    this._aoMapIntensity = value;
  }

  /**
   * Sets the emissive color of the material.
   * @param color - RGB emissive color as Color instance or array
   */
  setEmissive(color: Color | [number, number, number]): void {
    this._emissive = Color.from(color);
  }

  /**
   * Sets the emissive intensity multiplier.
   * @param value - Emissive intensity (must be non-negative)
   */
  setEmissiveIntensity(value: number): void {
    if (value < 0) {
      throw new Error("Emissive intensity must be non-negative");
    }
    this._emissiveIntensity = value;
  }

  /**
   * Sets the environment map reflection intensity.
   * @param value - Environment map intensity (must be non-negative)
   */
  setEnvMapIntensity(value: number): void {
    if (value < 0) {
      throw new Error("Environment map intensity must be non-negative");
    }
    this._envMapIntensity = value;
  }

  /**
   * Gets the WGSL vertex shader code for PBR rendering.
   * @returns WGSL vertex shader source code
   */
  getVertexShader(): string {
    return ShaderLib.get(this.type).vertex;
  }

  /**
   * Gets the WGSL fragment shader code for PBR rendering.
   * @returns WGSL fragment shader source code
   */
  getFragmentShader(): string {
    return ShaderLib.get(this.type).fragment;
  }

  /**
   * Gets the vertex buffer layout for PBR rendering.
   * @returns Layout with position, normal, UV, tangent, and bitangent attributes
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
   * Gets the uniform buffer size required for this material.
   * Layout:
   * - 0-64: mvpMatrix
   * - 64-128: modelMatrix
   * - 128-192: normalMatrix
   * - 192-208: baseColor (rgb + alpha)
   * - 208-224: pbrParams (metalness, roughness, aoIntensity, normalScale)
   * - 224-240: emissive (rgb + intensity)
   * - 240-256: envParams (envMapIntensity, lightCount, hasEnvMap, unused)
   * - 256-272: cameraPosition
   * - 272-288: ambientLight (rgb + intensity)
   * - 288-480: lights[4] (48 bytes each: position 16 + color 16 + params 16)
   * - 480-512: padding
   * @returns Size in bytes (512 bytes total)
   */
  getUniformBufferSize(): number {
    return 512;
  }

  /**
   * Gets all texture maps with dummy fallbacks for unset textures.
   * @param device - WebGPU device for creating dummy textures
   * @returns Array of 7 textures in order: albedo, normal, roughness, metalness, AO, emissive, environment
   */
  getTextures(device?: GPUDevice): Texture[] {
    if (!device) {
      throw new Error(
        "PBRMaterial.getTextures() requires a GPUDevice parameter"
      );
    }

    const whiteTex = DummyTextures.getWhite(device);
    const normalTex = DummyTextures.getNormal(device);
    const blackTex = DummyTextures.getBlack(device);

    return [
      this.map ?? whiteTex, // binding 2: albedo map
      this.normalMap ?? normalTex, // binding 3: normal map
      this.roughnessMap ?? whiteTex, // binding 4: roughness map (white = 1.0, use uniform)
      this.metalnessMap ?? whiteTex, // binding 5: metalness map (white = 1.0, use uniform)
      this.aoMap ?? whiteTex, // binding 6: ao map (white = 1.0, no occlusion)
      this.emissiveMap ?? blackTex, // binding 7: emissive map (black = no emission)
      this.envMap ?? blackTex, // binding 8: environment map
    ];
  }

  /**
   * Gets the primitive topology based on wireframe mode.
   * @returns "line-list" for wireframe, "triangle-list" for solid rendering
   */
  getPrimitiveTopology(): GPUPrimitiveTopology {
    return this.wireframe ? "line-list" : "triangle-list";
  }

  /**
   * Writes material properties and lighting data to the uniform buffer.
   * @param buffer - DataView of the uniform buffer to write to
   * @param offset - Byte offset to start writing (default: 64)
   * @param context - Rendering context containing camera, lights, and mesh transform
   */
  writeUniformData(
    buffer: DataView,
    offset: number = 64,
    context?: RenderContext
  ): void {
    // Write model matrix at offset 64
    if (context?.mesh) {
      for (let i = 0; i < 16; i++) {
        buffer.setFloat32(
          offset + i * 4,
          context.mesh.worldMatrix.data[i],
          true
        );
      }
    }

    // Write normal matrix at offset 128 (inverse transpose of model matrix)
    if (context?.mesh) {
      const normalMatrix = context.mesh.worldMatrix.inverse().transpose();
      for (let i = 0; i < 16; i++) {
        buffer.setFloat32(offset + 64 + i * 4, normalMatrix.data[i], true);
      }
    }

    // baseColor at offset 192 (vec4f: rgb + alpha)
    buffer.setFloat32(offset + 128, this._color.r, true);
    buffer.setFloat32(offset + 132, this._color.g, true);
    buffer.setFloat32(offset + 136, this._color.b, true);
    buffer.setFloat32(offset + 140, 1.0, true); // alpha

    // pbrParams at offset 208 (vec4f: metalness, roughness, aoIntensity, normalScale)
    buffer.setFloat32(offset + 144, this._metalness, true);
    buffer.setFloat32(offset + 148, this._roughness, true);
    buffer.setFloat32(offset + 152, this._aoMapIntensity, true);
    buffer.setFloat32(offset + 156, this._normalScale, true);

    // emissive at offset 224 (vec4f: rgb + intensity)
    buffer.setFloat32(offset + 160, this._emissive.r, true);
    buffer.setFloat32(offset + 164, this._emissive.g, true);
    buffer.setFloat32(offset + 168, this._emissive.b, true);
    buffer.setFloat32(offset + 172, this._emissiveIntensity, true);

    // envParams at offset 240 (vec4f: envMapIntensity, lightCount, hasEnvMap, unused)
    const hasEnvMap = this.envMap ? 1.0 : 0.0;
    buffer.setFloat32(offset + 176, this._envMapIntensity, true);
    buffer.setFloat32(offset + 184, hasEnvMap, true);
    buffer.setFloat32(offset + 188, 0.0, true); // unused

    // cameraPosition at offset 256
    if (context?.camera) {
      const cameraWorldMatrix = context.camera.worldMatrix.data;
      buffer.setFloat32(offset + 192, cameraWorldMatrix[12], true);
      buffer.setFloat32(offset + 196, cameraWorldMatrix[13], true);
      buffer.setFloat32(offset + 200, cameraWorldMatrix[14], true);
      buffer.setFloat32(offset + 204, 0.0, true); // unused
    }

    // ambientLight at offset 272 (vec4f: rgb + intensity)
    let ambientWritten = false;
    if (context?.lights) {
      for (const light of context.lights) {
        if (light instanceof AmbientLight) {
          buffer.setFloat32(offset + 208, light.color.r, true);
          buffer.setFloat32(offset + 212, light.color.g, true);
          buffer.setFloat32(offset + 216, light.color.b, true);
          buffer.setFloat32(offset + 220, light.intensity, true);
          ambientWritten = true;
          break;
        }
      }
    }
    if (!ambientWritten) {
      // Default ambient: very dim white light
      buffer.setFloat32(offset + 208, 1.0, true);
      buffer.setFloat32(offset + 212, 1.0, true);
      buffer.setFloat32(offset + 216, 1.0, true);
      buffer.setFloat32(offset + 220, 0.03, true);
    }

    // lights[4] at offset 288 (48 bytes each: position 16 + color 16 + params 16)
    // params: x = type (0=directional, 1=point), y = range, z = attenuation type, w = attenuation param
    let lightIndex = 0;
    const maxLights = 4;
    const lightBaseOffset = offset + 224; // 288 from buffer start (64 + 224)

    if (context?.lights) {
      for (const light of context.lights) {
        if (lightIndex >= maxLights) break;
        if (light instanceof AmbientLight) continue; // Skip ambient lights

        const lightOffset = lightBaseOffset + lightIndex * 48;

        if (light instanceof DirectionalLight) {
          // Position (actually direction for directional light)
          buffer.setFloat32(lightOffset, light.direction.x, true);
          buffer.setFloat32(lightOffset + 4, light.direction.y, true);
          buffer.setFloat32(lightOffset + 8, light.direction.z, true);
          buffer.setFloat32(lightOffset + 12, 0.0, true);

          // Color
          buffer.setFloat32(lightOffset + 16, light.color.r, true);
          buffer.setFloat32(lightOffset + 20, light.color.g, true);
          buffer.setFloat32(lightOffset + 24, light.color.b, true);
          buffer.setFloat32(lightOffset + 28, light.intensity, true);

          // Params: type=0 (directional), range, attenType, attenParam
          buffer.setFloat32(lightOffset + 32, 0.0, true); // type: directional
          buffer.setFloat32(lightOffset + 36, 0.0, true); // range (unused)
          buffer.setFloat32(lightOffset + 40, 0.0, true); // attenType (unused)
          buffer.setFloat32(lightOffset + 44, 0.0, true); // attenParam (unused)

          lightIndex++;
        } else if (light instanceof PointLight) {
          // Position (world position)
          light.updateWorldMatrix(true, false);
          buffer.setFloat32(lightOffset, light.worldMatrix.data[12], true);
          buffer.setFloat32(lightOffset + 4, light.worldMatrix.data[13], true);
          buffer.setFloat32(lightOffset + 8, light.worldMatrix.data[14], true);
          buffer.setFloat32(lightOffset + 12, 0.0, true);

          // Color
          buffer.setFloat32(lightOffset + 16, light.color.r, true);
          buffer.setFloat32(lightOffset + 20, light.color.g, true);
          buffer.setFloat32(lightOffset + 24, light.color.b, true);
          buffer.setFloat32(lightOffset + 28, light.intensity, true);

          // Params: type=1 (point), range, attenType, attenParam
          const attenuationFactors = light.getAttenuationFactors();
          buffer.setFloat32(lightOffset + 32, 1.0, true); // type: point
          buffer.setFloat32(lightOffset + 36, attenuationFactors[0], true); // range
          buffer.setFloat32(lightOffset + 40, attenuationFactors[3], true); // attenType
          buffer.setFloat32(lightOffset + 44, attenuationFactors[1], true); // attenParam

          lightIndex++;
        }
      }
    }

    // Write light count at offset 240 + 4 = 244 (envParams.y)
    buffer.setFloat32(offset + 180, lightIndex, true);

    // Zero out remaining light slots
    for (let i = lightIndex; i < maxLights; i++) {
      const lightOffset = lightBaseOffset + i * 48;
      for (let j = 0; j < 12; j++) {
        buffer.setFloat32(lightOffset + j * 4, 0.0, true);
      }
    }
  }
}
