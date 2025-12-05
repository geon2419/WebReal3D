import { Color } from "@web-real/math";
import type { Material, VertexBufferLayout } from "./Material";

export interface BlinnPhongMaterialOptions {
  color?: [number, number, number] | Color;
  shininess?: number;
}

export class BlinnPhongMaterial implements Material {
  readonly type = "blinnPhong";
  /** RGBA color (Color instance, 0-1 range) */
  readonly color: Color;
  /** Shininess exponent for specular highlight (higher = sharper) */
  shininess: number;

  constructor(options: BlinnPhongMaterialOptions = {}) {
    this.color = options.color
      ? Color.from(options.color)
      : new Color(1.0, 1.0, 1.0);
    this.shininess = options.shininess ?? 32.0;
  }

  getVertexShader(): string {
    return /* wgsl */ `
struct Uniforms {
  mvpMatrix: mat4x4f,
  modelMatrix: mat4x4f,
  normalMatrix: mat4x4f,      // inverse transpose of model matrix for correct normal transformation
  colorAndShininess: vec4f,
  lightPosition: vec4f,       // xyz = position (point) or direction (directional)
  lightColor: vec4f,          // rgb = color, a = intensity
  cameraPosition: vec4f,
  lightParams: vec4f,         // x = range, y = attenuation param
  lightTypes: vec4f,          // x = light type (0=directional, 1=point), y = attenuation type (0=linear, 1=quadratic, 2=physical)
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) worldPosition: vec3f,
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.mvpMatrix * vec4f(input.position, 1.0);
  // Transform normal to world space using normal matrix (handles non-uniform scaling correctly)
  output.normal = (uniforms.normalMatrix * vec4f(input.normal, 0.0)).xyz;
  // Calculate world position for specular
  output.worldPosition = (uniforms.modelMatrix * vec4f(input.position, 1.0)).xyz;
  return output;
}
`;
  }

  getFragmentShader(): string {
    return /* wgsl */ `
struct Uniforms {
  mvpMatrix: mat4x4f,
  modelMatrix: mat4x4f,
  normalMatrix: mat4x4f,      // inverse transpose of model matrix for correct normal transformation
  colorAndShininess: vec4f,
  lightPosition: vec4f,       // xyz = position (point) or direction (directional)
  lightColor: vec4f,          // rgb = color, a = intensity
  cameraPosition: vec4f,
  lightParams: vec4f,         // x = range, y = attenuation param
  lightTypes: vec4f,          // x = light type (0=directional, 1=point), y = attenuation type (0=linear, 1=quadratic, 2=physical)
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct FragmentInput {
  @location(0) normal: vec3f,
  @location(1) worldPosition: vec3f,
}

fn calculateAttenuation(distance: f32, range: f32, attenuationType: f32, param: f32) -> f32 {
  let normalizedDist = distance / range;
  
  if (attenuationType < 0.5) {
    // Linear: 1 - d/range
    return max(1.0 - normalizedDist, 0.0);
  } else if (attenuationType < 1.5) {
    // Quadratic: (1 - d/range)²
    let linear = max(1.0 - normalizedDist, 0.0);
    return linear * linear;
  } else {
    // Physical: 1 / (1 + (d/range)² * k)
    return 1.0 / (1.0 + normalizedDist * normalizedDist * param);
  }
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
  let normal = normalize(input.normal);
  let viewDir = normalize(uniforms.cameraPosition.xyz - input.worldPosition);
  
  var lightDir: vec3f;
  var attenuation: f32 = 1.0;
  
  let lightType = uniforms.lightTypes.x;
  let attenuationType = uniforms.lightTypes.y;
  
  if (lightType < 0.5) {
    // Directional light: use direction directly (negate for incoming direction)
    lightDir = normalize(-uniforms.lightPosition.xyz);
  } else {
    // Point light: calculate direction from position to fragment
    let lightVec = uniforms.lightPosition.xyz - input.worldPosition;
    let distance = length(lightVec);
    lightDir = normalize(lightVec);
    
    // Calculate attenuation
    let range = uniforms.lightParams.x;
    let param = uniforms.lightParams.y;
    attenuation = calculateAttenuation(distance, range, attenuationType, param);
  }
  
  // Ambient
  let ambient = 0.1;
  
  // Diffuse (Lambertian)
  let NdotL = max(dot(normal, lightDir), 0.0);
  let diffuse = NdotL * uniforms.lightColor.rgb * uniforms.lightColor.a * attenuation;
  
  // Specular (Blinn-Phong)
  let halfVector = normalize(lightDir + viewDir);
  let NdotH = max(dot(normal, halfVector), 0.0);
  let shininess = uniforms.colorAndShininess.a;
  let specular = pow(NdotH, shininess) * uniforms.lightColor.rgb * uniforms.lightColor.a * attenuation;
  
  // Final color
  let materialColor = uniforms.colorAndShininess.rgb;
  let finalColor = materialColor * (ambient + diffuse) + specular;
  
  return vec4f(finalColor, 1.0);
}
`;
  }

  getVertexBufferLayout(): VertexBufferLayout {
    return {
      // position(vec3f) + normal(vec3f) = 6 floats × 4 bytes = 24 bytes
      arrayStride: 24,
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
      ],
    };
  }

  // Layout: mat4x4f mvp (64B) + mat4x4f model (64B) + mat4x4f normalMatrix (64B) + vec4f colorAndShininess (16B) + vec4f lightPosition (16B) + vec4f lightColor (16B) + vec4f cameraPosition (16B) + vec4f lightParams (16B) + vec4f lightTypes (16B) = 288 bytes
  getUniformBufferSize(): number {
    return 288;
  }

  getPrimitiveTopology(): GPUPrimitiveTopology {
    return "triangle-list";
  }

  /**
   * Writes material-specific uniform data (color + shininess) to the buffer.
   * MVP matrix should be written separately at offset 0.
   * Model matrix should be written at offset 64.
   * Normal matrix should be written at offset 128.
   * Light data should be written by the Renderer.
   * @param buffer - DataView of the uniform buffer
   * @param offset - Byte offset to start writing (default: 192, after MVP + Model + Normal matrices)
   */
  writeUniformData(buffer: DataView, offset: number = 128): void {
    buffer.setFloat32(offset, this.color.r, true);
    buffer.setFloat32(offset + 4, this.color.g, true);
    buffer.setFloat32(offset + 8, this.color.b, true);
    buffer.setFloat32(offset + 12, this.shininess, true);
  }
}
