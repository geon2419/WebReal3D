@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var diffuseTexture: texture_2d<f32>;

struct FragmentInput {
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
  let texColor = textureSample(diffuseTexture, textureSampler, input.uv);
  return texColor;
}
