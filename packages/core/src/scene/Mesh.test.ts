import { describe, it, expect } from "bun:test";
import { Mesh } from "./Mesh";
import { BoxGeometry } from "../geometry/BoxGeometry";
import { BasicMaterial } from "../material/BasicMaterial";
import { VertexColorMaterial } from "../material/VertexColorMaterial";
import { Color, BoundingBox } from "@web-real/math";

describe("Mesh", () => {
  describe("constructor", () => {
    it("should create a mesh with geometry and material", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      expect(mesh.geometry).toBe(geometry);
      expect(mesh.material).toBe(material);
    });

    it("should initialize with needsUpdate set to false", () => {
      const geometry = new BoxGeometry();
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      expect(mesh.needsUpdate).toBe(false);
    });

    it("should inherit Object3D properties", () => {
      const geometry = new BoxGeometry();
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      expect(mesh.position).toBeDefined();
      expect(mesh.rotation).toBeDefined();
      expect(mesh.scale).toBeDefined();
      expect(mesh.visible).toBe(true);
    });
  });

  describe("geometry getter/setter", () => {
    it("should get the current geometry", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      expect(mesh.geometry).toBe(geometry);
    });

    it("should set new geometry and invalidate bounding box cache", () => {
      const geometry1 = new BoxGeometry(2, 2, 2);
      const geometry2 = new BoxGeometry(4, 4, 4);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry1, material);

      // Access bounding box to cache it
      const bbox1 = mesh.boundingBox;

      mesh.geometry = geometry2;

      // Bounding box should be recalculated
      const bbox2 = mesh.boundingBox;
      expect(bbox2).not.toBe(bbox1);
    });

    it("should set needsUpdate to true when geometry changes", () => {
      const geometry1 = new BoxGeometry(2, 2, 2);
      const geometry2 = new BoxGeometry(4, 4, 4);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry1, material);

      mesh.needsUpdate = false;
      mesh.geometry = geometry2;

      expect(mesh.needsUpdate).toBe(true);
    });
  });

  describe("boundingBox", () => {
    it("should compute and return a bounding box", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      const bbox = mesh.boundingBox;

      expect(bbox).toBeInstanceOf(BoundingBox);
      expect(bbox.min).toBeDefined();
      expect(bbox.max).toBeDefined();
    });

    it("should cache the bounding box", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      const bbox1 = mesh.boundingBox;
      const bbox2 = mesh.boundingBox;

      // Should return the same cached instance
      expect(bbox1).toBe(bbox2);
    });

    it("should recompute bounding box when geometry changes", () => {
      const geometry1 = new BoxGeometry(2, 2, 2);
      const geometry2 = new BoxGeometry(10, 10, 10);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry1, material);

      const bbox1 = mesh.boundingBox;
      mesh.geometry = geometry2;
      const bbox2 = mesh.boundingBox;

      // Different geometry should produce different bounding box
      expect(bbox1).not.toBe(bbox2);

      // Larger geometry should have larger bounding box
      const size1 = bbox1.getSize();
      const size2 = bbox2.getSize();
      const volume1 = size1.length;
      const volume2 = size2.length;
      expect(volume2).toBeGreaterThan(volume1);
    });
  });

  describe("indices", () => {
    it("should return the geometry indices", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      const indices = mesh.indices;

      expect(indices).toBe(geometry.indices);
      expect(indices.length).toBeGreaterThan(0);
    });
  });

  describe("vertexCount", () => {
    it("should return the geometry vertex count", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      expect(mesh.vertexCount).toBe(geometry.vertexCount);
      expect(mesh.vertexCount).toBeGreaterThan(0);
    });
  });

  describe("indexCount", () => {
    it("should return the geometry index count", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      expect(mesh.indexCount).toBe(geometry.indexCount);
      expect(mesh.indexCount).toBeGreaterThan(0);
    });
  });

  describe("getWireframeIndices", () => {
    it("should generate wireframe indices from triangle indices", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      const wireframeIndices = mesh.getWireframeIndices();

      // Each triangle (3 indices) becomes 3 lines (6 indices)
      const triangleCount = geometry.indices.length / 3;
      expect(wireframeIndices.length).toBe(triangleCount * 6);
    });

    it("should preserve index array type (Uint16Array)", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      const wireframeIndices = mesh.getWireframeIndices();

      if (geometry.indices instanceof Uint16Array) {
        expect(wireframeIndices).toBeInstanceOf(Uint16Array);
      } else {
        expect(wireframeIndices).toBeInstanceOf(Uint32Array);
      }
    });

    it("should create line segments for each triangle edge", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      const triangleIndices = geometry.indices;
      const wireframeIndices = mesh.getWireframeIndices();

      // Check first triangle converts to three line segments
      const a = triangleIndices[0];
      const b = triangleIndices[1];
      const c = triangleIndices[2];

      expect(wireframeIndices[0]).toBe(a);
      expect(wireframeIndices[1]).toBe(b);
      expect(wireframeIndices[2]).toBe(b);
      expect(wireframeIndices[3]).toBe(c);
      expect(wireframeIndices[4]).toBe(c);
      expect(wireframeIndices[5]).toBe(a);
    });
  });

  describe("getInterleavedVertices", () => {
    describe("basic material", () => {
      it("should return interleaved position and normal data", () => {
        const geometry = new BoxGeometry(2, 2, 2);
        const material = new BasicMaterial();
        const mesh = new Mesh(geometry, material);

        const data = mesh.getInterleavedVertices();

        // 6 floats per vertex (3 position + 3 normal)
        expect(data.length).toBe(geometry.vertexCount * 6);
        expect(data).toBeInstanceOf(Float32Array);
      });

      it("should correctly interleave first vertex data", () => {
        const geometry = new BoxGeometry(2, 2, 2);
        const material = new BasicMaterial();
        const mesh = new Mesh(geometry, material);

        const data = mesh.getInterleavedVertices();
        const positions = geometry.positions;
        const normals = geometry.normals;

        // Check first vertex
        expect(data[0]).toBe(positions[0]); // x
        expect(data[1]).toBe(positions[1]); // y
        expect(data[2]).toBe(positions[2]); // z
        expect(data[3]).toBe(normals[0]); // nx
        expect(data[4]).toBe(normals[1]); // ny
        expect(data[5]).toBe(normals[2]); // nz
      });
    });

    describe("vertex color material", () => {
      it("should return interleaved position and color data", () => {
        const geometry = new BoxGeometry(2, 2, 2);
        const colors = new Float32Array(geometry.vertexCount * 3);
        // Fill with red color
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] = 1; // R
          colors[i + 1] = 0; // G
          colors[i + 2] = 0; // B
        }
        const material = new VertexColorMaterial({ colors });
        const mesh = new Mesh(geometry, material);

        const data = mesh.getInterleavedVertices();

        // 6 floats per vertex (3 position + 3 color)
        expect(data.length).toBe(geometry.vertexCount * 6);
      });

      it("should correctly interleave position and color", () => {
        const geometry = new BoxGeometry(2, 2, 2);
        const colors = new Float32Array(geometry.vertexCount * 3);
        colors[0] = 1;
        colors[1] = 0.5;
        colors[2] = 0.25; // First vertex color
        const material = new VertexColorMaterial({ colors });
        const mesh = new Mesh(geometry, material);

        const data = mesh.getInterleavedVertices();
        const positions = geometry.positions;

        // Check first vertex
        expect(data[0]).toBe(positions[0]); // x
        expect(data[1]).toBe(positions[1]); // y
        expect(data[2]).toBe(positions[2]); // z
        expect(data[3]).toBe(1); // R
        expect(data[4]).toBe(0.5); // G
        expect(data[5]).toBe(0.25); // B
      });
    });

    describe("texture material", () => {
      it("should throw error if geometry lacks UV coordinates", () => {
        // Create a geometry without UVs (mock)
        const geometry = {
          positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
          normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
          uvs: undefined,
          indices: new Uint16Array([0, 1, 2]),
          vertexCount: 3,
          indexCount: 3,
        } as any;

        const material = { type: "texture" } as any;
        const mesh = new Mesh(geometry, material);

        expect(() => mesh.getInterleavedVertices()).toThrow(
          "TextureMaterial requires geometry with UV coordinates"
        );
      });
    });

    describe("parallax material", () => {
      it("should throw error if geometry lacks UV coordinates", () => {
        const geometry = {
          positions: new Float32Array([0, 0, 0]),
          normals: new Float32Array([0, 0, 1]),
          uvs: undefined,
          tangents: new Float32Array([1, 0, 0]),
          bitangents: new Float32Array([0, 1, 0]),
          indices: new Uint16Array([0]),
          vertexCount: 1,
          indexCount: 1,
        } as any;

        const material = { type: "parallax" } as any;
        const mesh = new Mesh(geometry, material);

        expect(() => mesh.getInterleavedVertices()).toThrow(
          "ParallaxMaterial requires geometry with UV coordinates"
        );
      });

      it("should throw error if geometry lacks tangents", () => {
        const geometry = {
          positions: new Float32Array([0, 0, 0]),
          normals: new Float32Array([0, 0, 1]),
          uvs: new Float32Array([0, 0]),
          tangents: undefined,
          bitangents: new Float32Array([0, 1, 0]),
          indices: new Uint16Array([0]),
          vertexCount: 1,
          indexCount: 1,
        } as any;

        const material = { type: "parallax" } as any;
        const mesh = new Mesh(geometry, material);

        expect(() => mesh.getInterleavedVertices()).toThrow(
          "ParallaxMaterial requires geometry with tangents and bitangents"
        );
      });

      it("should throw error if geometry lacks bitangents", () => {
        const geometry = {
          positions: new Float32Array([0, 0, 0]),
          normals: new Float32Array([0, 0, 1]),
          uvs: new Float32Array([0, 0]),
          tangents: new Float32Array([1, 0, 0]),
          bitangents: undefined,
          indices: new Uint16Array([0]),
          vertexCount: 1,
          indexCount: 1,
        } as any;

        const material = { type: "parallax" } as any;
        const mesh = new Mesh(geometry, material);

        expect(() => mesh.getInterleavedVertices()).toThrow(
          "ParallaxMaterial requires geometry with tangents and bitangents"
        );
      });
    });

    describe("line material", () => {
      it("should return only positions for line material", () => {
        const geometry = new BoxGeometry(2, 2, 2);
        const material = { type: "line" } as any;
        const mesh = new Mesh(geometry, material);

        const data = mesh.getInterleavedVertices();

        // Line material only needs positions
        expect(data).toBe(geometry.positions);
      });
    });

    describe("lineColor material", () => {
      it("should return interleaved position and color for lineColor material", () => {
        const geometry = new BoxGeometry(2, 2, 2);
        const colors = new Float32Array(geometry.vertexCount * 3);
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] = 1;
          colors[i + 1] = 1;
          colors[i + 2] = 0;
        }
        const material = { type: "lineColor", colors } as any;
        const mesh = new Mesh(geometry, material);

        const data = mesh.getInterleavedVertices();

        // 6 floats per vertex (3 position + 3 color)
        expect(data.length).toBe(geometry.vertexCount * 6);
      });

      it("should correctly interleave position and color for lineColor", () => {
        const geometry = new BoxGeometry(2, 2, 2);
        const colors = new Float32Array(geometry.vertexCount * 3);
        colors[0] = 1;
        colors[1] = 0.5;
        colors[2] = 0.25;
        const material = { type: "lineColor", colors } as any;
        const mesh = new Mesh(geometry, material);

        const data = mesh.getInterleavedVertices();
        const positions = geometry.positions;

        expect(data[0]).toBe(positions[0]); // x
        expect(data[1]).toBe(positions[1]); // y
        expect(data[2]).toBe(positions[2]); // z
        expect(data[3]).toBe(1); // R
        expect(data[4]).toBe(0.5); // G
        expect(data[5]).toBe(0.25); // B
      });
    });
  });

  describe("needsUpdate flag", () => {
    it("should allow manual setting of needsUpdate", () => {
      const geometry = new BoxGeometry();
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      mesh.needsUpdate = true;
      expect(mesh.needsUpdate).toBe(true);

      mesh.needsUpdate = false;
      expect(mesh.needsUpdate).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle geometry with minimal vertices", () => {
      const geometry = {
        positions: new Float32Array([0, 0, 0]),
        normals: new Float32Array([0, 1, 0]),
        indices: new Uint16Array([0]),
        vertexCount: 1,
        indexCount: 1,
      } as any;

      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      expect(mesh.vertexCount).toBe(1);
      expect(mesh.indexCount).toBe(1);
    });

    it("should handle different material types correctly", () => {
      const geometry = new BoxGeometry();
      const material1 = new BasicMaterial({ color: new Color(1, 0, 0) });
      const mesh = new Mesh(geometry, material1);

      expect(mesh.material).toBe(material1);

      const material2 = new BasicMaterial({ color: new Color(0, 1, 0) });
      mesh.material = material2;

      expect(mesh.material).toBe(material2);
    });

    it("should handle large geometries", () => {
      const geometry = new BoxGeometry(100, 100, 100, 10, 10, 10);
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      expect(mesh.vertexCount).toBeGreaterThan(0);
      expect(mesh.indexCount).toBeGreaterThan(0);

      const bbox = mesh.boundingBox;
      expect(bbox).toBeInstanceOf(BoundingBox);
    });

    it("should maintain mesh properties through transformations", () => {
      const geometry = new BoxGeometry();
      const material = new BasicMaterial();
      const mesh = new Mesh(geometry, material);

      mesh.position.x = 10;
      mesh.rotation.y = Math.PI / 2;
      mesh.scale.x = 2;
      mesh.updateMatrix();

      // Geometry shouldn't change
      expect(mesh.geometry).toBe(geometry);
      expect(mesh.material).toBe(material);
    });
  });
});
