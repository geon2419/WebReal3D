import type { Geometry } from "./Geometry";

/** Normal vectors for each face */
const FACE_NORMALS: [number, number, number][] = [
  [0, 0, 1], // Front
  [0, 0, -1], // Back
  [0, 1, 0], // Top
  [0, -1, 0], // Bottom
  [1, 0, 0], // Right
  [-1, 0, 0], // Left
];

export class BoxGeometry implements Geometry {
  private readonly _positions: Float32Array;
  private readonly _normals: Float32Array;
  private readonly _indices: Uint16Array;

  /**
   * @param width
   * @param height
   * @param depth
   */
  constructor(
    public readonly width: number = 2,
    public readonly height: number = 2,
    public readonly depth: number = 2
  ) {
    const { positions, normals, indices } = this.generateData();
    this._positions = positions;
    this._normals = normals;
    this._indices = indices;
  }

  get positions(): Float32Array {
    return this._positions;
  }

  get normals(): Float32Array {
    return this._normals;
  }

  get indices(): Uint16Array {
    return this._indices;
  }

  get vertexCount(): number {
    // 6 faces × 4 vertices
    return 24;
  }

  get indexCount(): number {
    // 6 faces × 2 triangles × 3 vertices
    return 36;
  }

  private generateData(): {
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint16Array;
  } {
    const w = this.width / 2;
    const h = this.height / 2;
    const d = this.depth / 2;

    // 24 vertices: 6 faces × 4 vertices
    const positionData: [number, number, number][] = [
      // Front face
      [-w, -h, d],
      [w, -h, d],
      [w, h, d],
      [-w, h, d],
      // Back face
      [w, -h, -d],
      [-w, -h, -d],
      [-w, h, -d],
      [w, h, -d],
      // Top face
      [-w, h, d],
      [w, h, d],
      [w, h, -d],
      [-w, h, -d],
      // Bottom face
      [-w, -h, -d],
      [w, -h, -d],
      [w, -h, d],
      [-w, -h, d],
      // Right face
      [w, -h, d],
      [w, -h, -d],
      [w, h, -d],
      [w, h, d],
      // Left face
      [-w, -h, -d],
      [-w, -h, d],
      [-w, h, d],
      [-w, h, -d],
    ];

    // Generate separate position and normal arrays
    const positions: number[] = [];
    const normals: number[] = [];

    for (let i = 0; i < 24; i++) {
      const faceIndex = Math.floor(i / 4);
      positions.push(...positionData[i]);
      normals.push(...FACE_NORMALS[faceIndex]);
    }

    // Indices for 12 triangles (6 faces × 2 triangles)
    const indices = new Uint16Array([
      0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12,
      14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
    ]);

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      indices,
    };
  }
}
