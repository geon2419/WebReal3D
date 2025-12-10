const PI: f32 = 3.14159265359;
const SAMPLE_COUNT: u32 = 1024u;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

// Fullscreen triangle vertex shader
@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;
  
  // Generate fullscreen triangle vertices
  let x = f32((vertexIndex << 1u) & 2u);
  let y = f32(vertexIndex & 2u);
  
  output.position = vec4f(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
  output.uv = vec2f(x, 1.0 - y);
  
  return output;
}

// Van der Corput sequence for quasi-random sampling
fn radicalInverse_VdC(bits_in: u32) -> f32 {
  var bits = bits_in;
  bits = (bits << 16u) | (bits >> 16u);
  bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
  bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
  bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
  bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
  return f32(bits) * 2.3283064365386963e-10; // 1.0 / 2^32 = normalize 32-bit integer to [0,1] range
}

// Hammersley sequence point
fn hammersley(i: u32, N: u32) -> vec2f {
  return vec2f(f32(i) / f32(N), radicalInverse_VdC(i));
}

// Importance sample GGX distribution
fn importanceSampleGGX(Xi: vec2f, N: vec3f, roughness: f32) -> vec3f {
  let a = roughness * roughness;
  
  let phi = 2.0 * PI * Xi.x;
  let cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a * a - 1.0) * Xi.y));
  let sinTheta = sqrt(1.0 - cosTheta * cosTheta);
  
  // Spherical to cartesian (tangent space)
  let H = vec3f(
    cos(phi) * sinTheta,
    sin(phi) * sinTheta,
    cosTheta
  );
  
  // Tangent space to world space
  let up = select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), abs(N.z) < 0.999);
  let tangent = normalize(cross(up, N));
  let bitangent = cross(N, tangent);
  
  return normalize(tangent * H.x + bitangent * H.y + N * H.z);
}

// Geometry function (Schlick-GGX)
fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
  let a = roughness;
  let k = (a * a) / 2.0;
  return NdotV / (NdotV * (1.0 - k) + k);
}

// Smith's geometry function
fn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 {
  let NdotV = max(dot(N, V), 0.0);
  let NdotL = max(dot(N, L), 0.0);
  let ggx1 = geometrySchlickGGX(NdotV, roughness);
  let ggx2 = geometrySchlickGGX(NdotL, roughness);
  return ggx1 * ggx2;
}

// Integrate BRDF for given NdotV and roughness
fn integrateBRDF(NdotV: f32, roughness: f32) -> vec2f {
  let V = vec3f(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);
  let N = vec3f(0.0, 0.0, 1.0);
  
  var A: f32 = 0.0; // Scale
  var B: f32 = 0.0; // Bias
  
  for (var i: u32 = 0u; i < SAMPLE_COUNT; i++) {
    let Xi = hammersley(i, SAMPLE_COUNT);
    let H = importanceSampleGGX(Xi, N, roughness);
    let L = normalize(2.0 * dot(V, H) * H - V);
    
    let NdotL = max(L.z, 0.0);
    let NdotH = max(H.z, 0.0);
    let VdotH = max(dot(V, H), 0.0);
    
    if (NdotL > 0.0) {
      let G = geometrySmith(N, V, L, roughness);
      let G_Vis = (G * VdotH) / (NdotH * NdotV);
      let Fc = pow(1.0 - VdotH, 5.0);
      
      A += (1.0 - Fc) * G_Vis;
      B += Fc * G_Vis;
    }
  }
  
  return vec2f(A, B) / f32(SAMPLE_COUNT);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec2f {
  let NdotV = input.uv.x;
  let roughness = input.uv.y;
  
  // Avoid edge cases
  let safeNdotV = max(NdotV, 0.001);
  let safeRoughness = max(roughness, 0.001);
  
  return integrateBRDF(safeNdotV, safeRoughness);
}
