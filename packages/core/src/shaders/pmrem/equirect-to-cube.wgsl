struct Uniforms {
  face: u32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var equirectMap: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let direction = getCubeDirection(uniforms.face, input.uv);
  let uv = sampleEquirectangular(direction);
  return textureSample(equirectMap, texSampler, uv);
}
