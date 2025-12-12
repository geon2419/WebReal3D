struct Uniforms {
  mvpMatrix: mat4x4f,         // 64B offset 0
  modelMatrix: mat4x4f,       // 64B offset 64
  cameraPos: vec4f,           // 16B offset 128 (xyz = position, w unused)
  materialParams: vec4f,      // 16B offset 144 (x = depthScale, y = normalScale, z = useNormalMap, w = shininess)
  ambientLight: vec4f,        // 16B offset 160 (rgb = color, a = intensity)
  lightParams: vec4f,         // 16B offset 176 (x = lightCount, yzw = reserved)
  // lights[4]: each light is 3 vec4f (48 bytes) starting at offset 192
  light0Position: vec4f,      // 16B offset 192 (xyz = position/direction, w unused)
  light0Color: vec4f,         // 16B offset 208 (rgb = color, a = intensity)
  light0Params: vec4f,        // 16B offset 224 (x = type, y = range, z = attenType, w = attenParam)
  light1Position: vec4f,      // 16B offset 240
  light1Color: vec4f,         // 16B offset 256
  light1Params: vec4f,        // 16B offset 272
  light2Position: vec4f,      // 16B offset 288
  light2Color: vec4f,         // 16B offset 304
  light2Params: vec4f,        // 16B offset 320
  light3Position: vec4f,      // 16B offset 336
  light3Color: vec4f,         // 16B offset 352
  light3Params: vec4f,        // 16B offset 368 (total: 384B)
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var albedoTexture: texture_2d<f32>;
@group(0) @binding(3) var depthTexture: texture_2d<f32>;
@group(0) @binding(4) var normalTexture: texture_2d<f32>;

struct VertexInput {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
  @location(3) tangent: vec3f,
  @location(4) bitangent: vec3f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) worldPosition: vec3f,
  @location(2) worldNormal: vec3f,
  @location(3) worldTangent: vec3f,
  @location(4) worldBitangent: vec3f,
  @location(5) viewDir: vec3f,
}

struct TBN {
  N: vec3f,
  T: vec3f,
  B: vec3f,
}

fn modelMatrix3(modelMatrix: mat4x4f) -> mat3x3f {
  return mat3x3f(
    modelMatrix[0].xyz,
    modelMatrix[1].xyz,
    modelMatrix[2].xyz
  );
}

fn worldPosition(modelMatrix: mat4x4f, localPosition: vec3f) -> vec3f {
  return (modelMatrix * vec4f(localPosition, 1.0)).xyz;
}

fn clipPosition(mvpMatrix: mat4x4f, localPosition: vec3f) -> vec4f {
  // Contract: mvpMatrix is expected to be P*V*M (local -> clip).
  return mvpMatrix * vec4f(localPosition, 1.0);
}

fn worldNormal(model3: mat3x3f, localNormal: vec3f) -> vec3f {
  // NOTE: For broad WebGPU driver compatibility, avoid inverse() here.
  // This is correct for rigid transforms and uniform scaling.
  return normalize(model3 * localNormal);
}

fn worldTBN(model3: mat3x3f, localNormal: vec3f, localTangent: vec3f, localBitangent: vec3f) -> TBN {
  let N = worldNormal(model3, localNormal);

  // Transform tangent and bitangent to world space
  let T_in = normalize(model3 * localTangent);
  let B_in = normalize(model3 * localBitangent);

  // Orthonormalize T to N (Gram–Schmidt)
  let T = normalize(T_in - N * dot(N, T_in));
  // Preserve handedness using original bitangent
  let handedness = select(-1.0, 1.0, dot(cross(N, T), B_in) >= 0.0);
  let B = normalize(cross(N, T) * handedness);

  return TBN(N, T, B);
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  let model3 = modelMatrix3(uniforms.modelMatrix);

  // Positions
  let worldPos = worldPosition(uniforms.modelMatrix, input.position);
  output.position = clipPosition(uniforms.mvpMatrix, input.position);
  output.worldPosition = worldPos;

  // UV
  output.uv = input.uv;

  // Basis (world space)
  let tbn = worldTBN(model3, input.normal, input.tangent, input.bitangent);
  output.worldNormal = tbn.N;
  output.worldTangent = tbn.T;
  output.worldBitangent = tbn.B;

  // View vector (world space): keep unnormalized for interpolation stability.
  output.viewDir = uniforms.cameraPos.xyz - worldPos;

  return output;
}
