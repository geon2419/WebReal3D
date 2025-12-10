const PI: f32 = 3.14159265359;

// Cube face direction vectors
fn getCubeDirection(face: u32, uv: vec2f) -> vec3f {
  // Map UV from [0,1] to [-1,1]
  let u = uv.x * 2.0 - 1.0;
  let v = uv.y * 2.0 - 1.0;
  
  switch (face) {
    case 0u: { return normalize(vec3f( 1.0, -v, -u)); } // +X (PositiveX)
    case 1u: { return normalize(vec3f(-1.0, -v,  u)); } // -X (NegativeX)
    case 2u: { return normalize(vec3f( u,  1.0,  v)); } // +Y (PositiveY)
    case 3u: { return normalize(vec3f( u, -1.0, -v)); } // -Y (NegativeY)
    case 4u: { return normalize(vec3f( u, -v,  1.0)); } // +Z (PositiveZ)
    case 5u: { return normalize(vec3f(-u, -v, -1.0)); } // -Z (NegativeZ)
    default: { return vec3f(0.0); } // Should never happen
  }
}

// Sample equirectangular map
fn sampleEquirectangular(direction: vec3f) -> vec2f {
  let phi = atan2(direction.z, direction.x);
  let theta = asin(clamp(direction.y, -1.0, 1.0));
  let u = (phi + PI) / (2.0 * PI);
  let v = (theta + PI * 0.5) / PI;
  return vec2f(u, 1.0 - v);
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

// Fullscreen triangle vertex shader
@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;
  let x = f32((vertexIndex << 1u) & 2u);
  let y = f32(vertexIndex & 2u);
  output.position = vec4f(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
  output.uv = vec2f(x, 1.0 - y);
  return output;
}
