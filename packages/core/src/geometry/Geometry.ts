export interface Geometry {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly indices: Uint16Array;
  readonly vertexCount: number;
  readonly indexCount: number;
  /**
   * @deprecated Use `positions` instead.
   */
  readonly vertices: Float32Array;
}
