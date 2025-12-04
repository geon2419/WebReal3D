import type { Material, VertexBufferLayout } from "./Material";

export interface LineColorMaterialOptions {
  /** Per-vertex colors as Float32Array (3 floats per vertex: RGB) */
  colors?: Float32Array;
}

/**
 * Material for rendering lines with per-vertex colors.
 * Uses "line-list" primitive topology.
 */
export class LineColorMaterial implements Material {
  readonly type = "lineColor";
  private _colors: Float32Array;

  constructor(options: LineColorMaterialOptions = {}) {
    this._colors = options.colors ?? new Float32Array(0);
  }

  get colors(): Float32Array {
    return this._colors;
  }

  /**
   * Updates per-vertex colors.
   * @param colors - Float32Array of RGB values (3 floats per vertex)
   */
  setColors(colors: Float32Array): void {
    this._colors = colors;
  }

  getVertexShader(): string {
    return /* wgsl */ `
struct Uniforms {
  mvpMatrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec3f,
  @location(1) color: vec3f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.mvpMatrix * vec4f(input.position, 1.0);
  output.color = input.color;
  return output;
}
`;
  }

  getFragmentShader(): string {
    return /* wgsl */ `
struct FragmentInput {
  @location(0) color: vec3f,
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
  return vec4f(input.color, 1.0);
}
`;
  }

  getVertexBufferLayout(): VertexBufferLayout {
    return {
      // position(vec3f) + color(vec3f) = 6 floats × 4 bytes = 24 bytes
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
          format: "float32x3", // color
        },
      ],
    };
  }

  // Only needs MVP matrix (64 bytes).
  getUniformBufferSize(): number {
    return 64;
  }

  getPrimitiveTopology(): GPUPrimitiveTopology {
    return "line-list";
  }
}
