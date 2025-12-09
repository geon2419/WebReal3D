import { describe, it, expect } from "bun:test";
import { ShaderMaterial } from "./ShaderMaterial";

describe("ShaderMaterial", () => {
  const simpleVertexShader = `
    struct Uniforms {
      mvpMatrix: mat4x4f,
    }
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;
    
    @vertex
    fn main(@location(0) position: vec3f) -> @builtin(position) vec4f {
      return uniforms.mvpMatrix * vec4f(position, 1.0);
    }
  `;

  const simpleFragmentShader = `
    @fragment
    fn main() -> @location(0) vec4f {
      return vec4f(1.0, 0.0, 0.0, 1.0);
    }
  `;

  describe("type generation", () => {
    it("should generate consistent type for identical shaders", () => {
      const material1 = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
      });

      const material2 = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
      });

      expect(material1.type).toBe(material2.type);
    });

    it("should generate different types for different shaders", () => {
      const material1 = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
      });

      const material2 = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: `
          @fragment
          fn main() -> @location(0) vec4f {
            return vec4f(0.0, 1.0, 0.0, 1.0); // Different color!
          }
        `,
      });

      expect(material1.type).not.toBe(material2.type);
    });

    it("should generate type starting with 'shader_'", () => {
      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
      });

      expect(material.type).toMatch(/^shader_/);
    });
  });

  describe("uniformBufferSize validation", () => {
    it("should throw error if uniformBufferSize < 64", () => {
      expect(() => {
        new ShaderMaterial({
          vertexShader: simpleVertexShader,
          fragmentShader: simpleFragmentShader,
          uniformBufferSize: 32,
        });
      }).toThrow("uniformBufferSize must be at least 64 bytes");
    });

    it("should accept uniformBufferSize >= 64", () => {
      expect(() => {
        new ShaderMaterial({
          vertexShader: simpleVertexShader,
          fragmentShader: simpleFragmentShader,
          uniformBufferSize: 64,
        });
      }).not.toThrow();

      expect(() => {
        new ShaderMaterial({
          vertexShader: simpleVertexShader,
          fragmentShader: simpleFragmentShader,
          uniformBufferSize: 128,
        });
      }).not.toThrow();
    });

    it("should use default uniformBufferSize of 80", () => {
      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
      });

      expect(material.getUniformBufferSize()).toBe(80);
    });
  });

  describe("shader getters", () => {
    it("should return provided vertex shader", () => {
      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
      });

      expect(material.getVertexShader()).toBe(simpleVertexShader);
    });

    it("should return provided fragment shader", () => {
      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
      });

      expect(material.getFragmentShader()).toBe(simpleFragmentShader);
    });
  });

  describe("writeUniformData callback", () => {
    it("should call the callback when writeUniformData is invoked", () => {
      let called = false;
      const callback = (buffer: DataView, offset?: number) => {
        called = true;
        expect(offset).toBe(64); // default offset
        buffer.setFloat32(offset ?? 64, 1.0, true);
      };

      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
        writeUniformData: callback,
      });

      const buffer = new DataView(new ArrayBuffer(80));
      material.writeUniformData(buffer, 64);

      expect(called).toBe(true);
      expect(buffer.getFloat32(64, true)).toBe(1.0);
    });

    it("should not throw if writeUniformData is called without a callback", () => {
      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
      });

      const buffer = new DataView(new ArrayBuffer(80));
      expect(() => material.writeUniformData(buffer, 64)).not.toThrow();
    });
  });

  describe("topology", () => {
    it("should use triangle-list by default", () => {
      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
      });

      expect(material.getPrimitiveTopology()).toBe("triangle-list");
    });

    it("should use provided topology", () => {
      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
        primitiveTopology: "line-list",
      });

      expect(material.getPrimitiveTopology()).toBe("line-list");
    });

    it("should support all valid primitive topologies", () => {
      const topologies: GPUPrimitiveTopology[] = [
        "point-list",
        "line-list",
        "line-strip",
        "triangle-list",
        "triangle-strip",
      ];

      topologies.forEach((topology) => {
        const material = new ShaderMaterial({
          vertexShader: simpleVertexShader,
          fragmentShader: simpleFragmentShader,
          primitiveTopology: topology,
        });

        expect(material.getPrimitiveTopology()).toBe(topology);
      });
    });
  });

  describe("vertex buffer layout", () => {
    it("should use default vertex buffer layout", () => {
      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
      });

      const layout = material.getVertexBufferLayout();
      expect(layout.arrayStride).toBe(24);
      expect(layout.attributes).toHaveLength(2);
      expect(layout.attributes[0].shaderLocation).toBe(0);
      expect(layout.attributes[0].offset).toBe(0);
      expect(layout.attributes[0].format).toBe("float32x3");
      expect(layout.attributes[1].shaderLocation).toBe(1);
      expect(layout.attributes[1].offset).toBe(12);
      expect(layout.attributes[1].format).toBe("float32x3");
    });

    it("should use custom vertex buffer layout", () => {
      const customLayout = {
        arrayStride: 32,
        attributes: [
          {
            shaderLocation: 0,
            offset: 0,
            format: "float32x3" as GPUVertexFormat,
          },
          {
            shaderLocation: 1,
            offset: 12,
            format: "float32x3" as GPUVertexFormat,
          },
          {
            shaderLocation: 2,
            offset: 24,
            format: "float32x2" as GPUVertexFormat,
          },
        ],
      };

      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
        vertexBufferLayout: customLayout,
      });

      const layout = material.getVertexBufferLayout();
      expect(layout.arrayStride).toBe(32);
      expect(layout.attributes).toHaveLength(3);
      expect(layout.attributes[2].shaderLocation).toBe(2);
      expect(layout.attributes[2].offset).toBe(24);
      expect(layout.attributes[2].format).toBe("float32x2");
    });
  });

  describe("uniform data buffer", () => {
    it("should return a pre-allocated uniform data buffer", () => {
      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
        uniformBufferSize: 128,
      });

      const buffer = material.getUniformDataBuffer();
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(128);
    });

    it("should return the same buffer instance on multiple calls", () => {
      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
      });

      const buffer1 = material.getUniformDataBuffer();
      const buffer2 = material.getUniformDataBuffer();
      expect(buffer1).toBe(buffer2);
    });

    it("should allocate buffer with correct size", () => {
      const sizes = [64, 80, 128, 256];

      sizes.forEach((size) => {
        const material = new ShaderMaterial({
          vertexShader: simpleVertexShader,
          fragmentShader: simpleFragmentShader,
          uniformBufferSize: size,
        });

        expect(material.getUniformDataBuffer().byteLength).toBe(size);
      });
    });
  });

  describe("writeUniformData with custom offsets", () => {
    it("should call callback with custom offset", () => {
      let receivedOffset: number | undefined;
      const callback = (buffer: DataView, offset?: number) => {
        receivedOffset = offset;
      };

      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
        writeUniformData: callback,
      });

      const buffer = new DataView(new ArrayBuffer(256));
      material.writeUniformData(buffer, 128);

      expect(receivedOffset).toBe(128);
    });

    it("should write data at specified offset", () => {
      const callback = (buffer: DataView, offset = 64) => {
        buffer.setFloat32(offset, 3.14159, true);
        buffer.setFloat32(offset + 4, 2.71828, true);
      };

      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
        uniformBufferSize: 256,
        writeUniformData: callback,
      });

      const buffer = new DataView(new ArrayBuffer(256));
      material.writeUniformData(buffer, 128);

      expect(buffer.getFloat32(128, true)).toBeCloseTo(3.14159, 5);
      expect(buffer.getFloat32(132, true)).toBeCloseTo(2.71828, 5);
    });

    it("should handle complex uniform data writing", () => {
      const callback = (buffer: DataView, offset = 64) => {
        // Write vec4 color (16 bytes)
        buffer.setFloat32(offset, 1.0, true);
        buffer.setFloat32(offset + 4, 0.5, true);
        buffer.setFloat32(offset + 8, 0.25, true);
        buffer.setFloat32(offset + 12, 1.0, true);

        // Write float intensity (4 bytes, + 12 bytes padding for alignment)
        buffer.setFloat32(offset + 16, 0.8, true);

        // Write vec3 position (12 bytes + 4 bytes padding)
        buffer.setFloat32(offset + 32, 10.0, true);
        buffer.setFloat32(offset + 36, 20.0, true);
        buffer.setFloat32(offset + 40, 30.0, true);
      };

      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
        uniformBufferSize: 128,
        writeUniformData: callback,
      });

      const buffer = new DataView(new ArrayBuffer(128));
      material.writeUniformData(buffer, 64);

      // Verify color
      expect(buffer.getFloat32(64, true)).toBe(1.0);
      expect(buffer.getFloat32(68, true)).toBe(0.5);
      expect(buffer.getFloat32(72, true)).toBe(0.25);
      expect(buffer.getFloat32(76, true)).toBe(1.0);

      // Verify intensity
      expect(buffer.getFloat32(80, true)).toBeCloseTo(0.8, 5);

      // Verify position
      expect(buffer.getFloat32(96, true)).toBe(10.0);
      expect(buffer.getFloat32(100, true)).toBe(20.0);
      expect(buffer.getFloat32(104, true)).toBe(30.0);
    });
  });

  describe("edge cases", () => {
    it("should handle empty shader strings", () => {
      const material = new ShaderMaterial({
        vertexShader: "",
        fragmentShader: "",
      });

      expect(material.getVertexShader()).toBe("");
      expect(material.getFragmentShader()).toBe("");
      expect(material.type).toMatch(/^shader_/);
    });

    it("should handle very long shader strings", () => {
      const longShader = simpleVertexShader + "\n".repeat(1000) + "// padding";
      const material = new ShaderMaterial({
        vertexShader: longShader,
        fragmentShader: simpleFragmentShader,
      });

      expect(material.getVertexShader()).toBe(longShader);
      expect(material.type).toMatch(/^shader_/);
    });

    it("should handle minimum valid uniformBufferSize", () => {
      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
        uniformBufferSize: 64,
      });

      expect(material.getUniformBufferSize()).toBe(64);
      expect(material.getUniformDataBuffer().byteLength).toBe(64);
    });

    it("should handle large uniformBufferSize", () => {
      const material = new ShaderMaterial({
        vertexShader: simpleVertexShader,
        fragmentShader: simpleFragmentShader,
        uniformBufferSize: 4096,
      });

      expect(material.getUniformBufferSize()).toBe(4096);
      expect(material.getUniformDataBuffer().byteLength).toBe(4096);
    });

    it("should generate unique types for shaders differing only in whitespace", () => {
      const shader1 = "fn main() {}";
      const shader2 = "fn main(){}";
      const shader3 = "fn main() { }";

      const material1 = new ShaderMaterial({
        vertexShader: shader1,
        fragmentShader: simpleFragmentShader,
      });

      const material2 = new ShaderMaterial({
        vertexShader: shader2,
        fragmentShader: simpleFragmentShader,
      });

      const material3 = new ShaderMaterial({
        vertexShader: shader3,
        fragmentShader: simpleFragmentShader,
      });

      // Different whitespace should result in different hashes
      expect(material1.type).not.toBe(material2.type);
      expect(material1.type).not.toBe(material3.type);
      expect(material2.type).not.toBe(material3.type);
    });

    it("should handle shader with special characters", () => {
      const specialShader = `
        @vertex
        fn main() -> @builtin(position) vec4f {
          // Comment with special chars: !@#$%^&*()
          return vec4f(0.0, 0.0, 0.0, 1.0);
        }
      `;

      const material = new ShaderMaterial({
        vertexShader: specialShader,
        fragmentShader: simpleFragmentShader,
      });

      expect(material.getVertexShader()).toBe(specialShader);
      expect(material.type).toMatch(/^shader_/);
    });
  });

  describe("hash collision resistance", () => {
    it("should generate different hashes for similar shaders", () => {
      const shaders = [
        "fn main() { return vec4f(1.0, 0.0, 0.0, 1.0); }",
        "fn main() { return vec4f(0.0, 1.0, 0.0, 1.0); }",
        "fn main() { return vec4f(0.0, 0.0, 1.0, 1.0); }",
        "fn main() { return vec4f(1.0, 1.0, 0.0, 1.0); }",
        "fn main() { return vec4f(1.0, 0.0, 1.0, 1.0); }",
      ];

      const types = shaders.map((shader) => {
        const material = new ShaderMaterial({
          vertexShader: simpleVertexShader,
          fragmentShader: shader,
        });
        return material.type;
      });

      // All types should be unique
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(shaders.length);
    });
  });
});
