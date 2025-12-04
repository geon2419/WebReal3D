import type { Material, VertexBufferLayout } from "./Material";

export interface LineMaterialOptions {
  color?: [number, number, number];
}

/**
 * Material for rendering lines with a single color.
 * Uses "line-list" primitive topology.
 */
export class LineMaterial implements Material {
  readonly type = "line";
  /** RGB color (0-1 range) */
  readonly color: [number, number, number];

  constructor(options: LineMaterialOptions = {}) {
    this.color = options.color ?? [1.0, 1.0, 1.0];
  }

  getVertexShader(): string {
    return /* wgsl */ `
struct Uniforms {
  mvpMatrix: mat4x4f,
  color: vec4f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec3f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.mvpMatrix * vec4f(input.position, 1.0);
  return output;
}
`;
  }

  getFragmentShader(): string {
    return /* wgsl */ `
struct Uniforms {
  mvpMatrix: mat4x4f,
  color: vec4f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn main() -> @location(0) vec4f {
  return uniforms.color;
}
`;
  }

  getVertexBufferLayout(): VertexBufferLayout {
    return {
      // position(vec3f) = 3 floats × 4 bytes = 12 bytes
      arrayStride: 12,
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: "float32x3", // position
        },
      ],
    };
  }

  // Layout: mat4x4f (64 bytes) + vec4f color (16 bytes) = 80 bytes
  getUniformBufferSize(): number {
    return 80;
  }

  getPrimitiveTopology(): GPUPrimitiveTopology {
    return "line-list";
  }
}
