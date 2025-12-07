import type { Geometry } from "./geometry/Geometry";
import type { Material } from "./material/Material";
import { VertexColorMaterial } from "./material/VertexColorMaterial";
import { Object3D } from "./Object3D";

export class Mesh extends Object3D {
  public readonly geometry: Geometry;
  public material: Material;
  /** Set to true when geometry data changes and GPU buffers need to be updated */
  public needsUpdate: boolean = false;

  constructor(geometry: Geometry, material: Material) {
    super();
    this.geometry = geometry;
    this.material = material;
  }

  get indices(): Uint16Array {
    return this.geometry.indices;
  }

  get vertexCount(): number {
    return this.geometry.vertexCount;
  }

  get indexCount(): number {
    return this.geometry.indexCount;
  }

  /**
   * Returns interleaved vertex data based on the material type.
   */
  getInterleavedVertices(): Float32Array {
    const { positions, normals, uvs } = this.geometry;
    const vertexCount = this.geometry.vertexCount;

    switch (this.material.type) {
      case "texture": {
        // Texture material needs positions + normals + UVs
        if (!uvs) {
          throw new Error(
            "TextureMaterial requires geometry with UV coordinates"
          );
        }
        const data = new Float32Array(vertexCount * 8); // 3 + 3 + 2 = 8

        for (let i = 0; i < vertexCount; i++) {
          const posOffset = i * 3;
          const uvOffset = i * 2;
          const dataOffset = i * 8;

          // position
          data[dataOffset] = positions[posOffset];
          data[dataOffset + 1] = positions[posOffset + 1];
          data[dataOffset + 2] = positions[posOffset + 2];

          // normal
          data[dataOffset + 3] = normals[posOffset];
          data[dataOffset + 4] = normals[posOffset + 1];
          data[dataOffset + 5] = normals[posOffset + 2];

          // uv
          data[dataOffset + 6] = uvs[uvOffset];
          data[dataOffset + 7] = uvs[uvOffset + 1];
        }

        return data;
      }

      case "vertexColor": {
        const colors = (this.material as VertexColorMaterial).colors;
        const data = new Float32Array(vertexCount * 6);

        for (let i = 0; i < vertexCount; i++) {
          const posOffset = i * 3;
          const dataOffset = i * 6;

          data[dataOffset] = positions[posOffset];
          data[dataOffset + 1] = positions[posOffset + 1];
          data[dataOffset + 2] = positions[posOffset + 2];

          data[dataOffset + 3] = colors[posOffset];
          data[dataOffset + 4] = colors[posOffset + 1];
          data[dataOffset + 5] = colors[posOffset + 2];
        }

        return data;
      }

      case "line": {
        // Line material only needs positions (no normals or colors)
        return positions;
      }

      case "lineColor": {
        // LineColor material needs positions + colors interleaved
        const lineColorMaterial = this.material as unknown as {
          colors: Float32Array;
        };
        const colors = lineColorMaterial.colors;
        const data = new Float32Array(vertexCount * 6);

        for (let i = 0; i < vertexCount; i++) {
          const posOffset = i * 3;
          const dataOffset = i * 6;

          data[dataOffset] = positions[posOffset];
          data[dataOffset + 1] = positions[posOffset + 1];
          data[dataOffset + 2] = positions[posOffset + 2];

          data[dataOffset + 3] = colors[posOffset];
          data[dataOffset + 4] = colors[posOffset + 1];
          data[dataOffset + 5] = colors[posOffset + 2];
        }

        return data;
      }

      case "basic":
      case "blinnPhong":
      default: {
        // Default: interleave position + normal
        const data = new Float32Array(vertexCount * 6);

        for (let i = 0; i < vertexCount; i++) {
          const offset = i * 3;
          const dataOffset = i * 6;

          data[dataOffset] = positions[offset];
          data[dataOffset + 1] = positions[offset + 1];
          data[dataOffset + 2] = positions[offset + 2];

          data[dataOffset + 3] = normals[offset];
          data[dataOffset + 4] = normals[offset + 1];
          data[dataOffset + 5] = normals[offset + 2];
        }

        return data;
      }
    }
  }
}
