import { describe, it, expect, beforeAll } from "bun:test";
import { Color, Vector3 } from "@web-real/math";

import { BlinnPhongMaterial } from "./BlinnPhongMaterial";
import { DirectionalLight } from "../light/DirectionalLight";
import { PointLight } from "../light/PointLight";
import type { RenderContext } from "./Material";

describe("BlinnPhongMaterial", () => {
  describe("constructor", () => {
    it("should create a material with default parameters", () => {
      const material = new BlinnPhongMaterial();

      expect(material.type).toBe("blinnPhong");
      expect(material.color.r).toBe(1.0);
      expect(material.color.g).toBe(1.0);
      expect(material.color.b).toBe(1.0);
      expect(material.shininess).toBe(32.0);
      expect(material.wireframe).toBe(false);
      expect(material.displacementMap).toBeUndefined();
      expect(material.displacementScale).toBe(1.0);
      expect(material.displacementBias).toBe(0.0);
      expect(material.normalMap).toBeUndefined();
      expect(material.normalScale).toBe(1.0);
    });

    it("should create a material with Color instance", () => {
      const color = new Color(0.5, 0.3, 0.8);
      const material = new BlinnPhongMaterial({ color });

      expect(material.color.r).toBe(0.5);
      expect(material.color.g).toBe(0.3);
      expect(material.color.b).toBe(0.8);
    });

    it("should create a material with RGB array", () => {
      const material = new BlinnPhongMaterial({ color: [0.2, 0.4, 0.6] });

      expect(material.color.r).toBe(0.2);
      expect(material.color.g).toBe(0.4);
      expect(material.color.b).toBe(0.6);
    });

    it("should create a material with custom shininess", () => {
      const material = new BlinnPhongMaterial({ shininess: 128 });

      expect(material.shininess).toBe(128);
    });

    it("should create a material with wireframe enabled", () => {
      const material = new BlinnPhongMaterial({ wireframe: true });

      expect(material.wireframe).toBe(true);
    });

    it("should create a material with custom displacement parameters", () => {
      const material = new BlinnPhongMaterial({
        displacementScale: 2.5,
        displacementBias: -0.5,
      });

      expect(material.displacementScale).toBe(2.5);
      expect(material.displacementBias).toBe(-0.5);
    });

    it("should create a material with custom normal scale", () => {
      const material = new BlinnPhongMaterial({ normalScale: 1.5 });

      expect(material.normalScale).toBe(1.5);
    });

    it("should create a material with all options specified", () => {
      const material = new BlinnPhongMaterial({
        color: [0.1, 0.2, 0.3],
        shininess: 64,
        wireframe: true,
        displacementScale: 3.0,
        displacementBias: 0.5,
        normalScale: 2.0,
      });

      expect(material.color.r).toBe(0.1);
      expect(material.color.g).toBe(0.2);
      expect(material.color.b).toBe(0.3);
      expect(material.shininess).toBe(64);
      expect(material.wireframe).toBe(true);
      expect(material.displacementScale).toBe(3.0);
      expect(material.displacementBias).toBe(0.5);
      expect(material.normalScale).toBe(2.0);
    });
  });

  describe("getters", () => {
    it("should return correct color value", () => {
      const material = new BlinnPhongMaterial({ color: [0.5, 0.6, 0.7] });
      const color = material.color;

      expect(color.r).toBe(0.5);
      expect(color.g).toBe(0.6);
      expect(color.b).toBe(0.7);
    });

    it("should return correct shininess value", () => {
      const material = new BlinnPhongMaterial({ shininess: 100 });

      expect(material.shininess).toBe(100);
    });

    it("should return correct normalScale value", () => {
      const material = new BlinnPhongMaterial({ normalScale: 2.5 });

      expect(material.normalScale).toBe(2.5);
    });

    it("should return correct displacementScale value", () => {
      const material = new BlinnPhongMaterial({ displacementScale: 5.0 });

      expect(material.displacementScale).toBe(5.0);
    });

    it("should return correct displacementBias value", () => {
      const material = new BlinnPhongMaterial({ displacementBias: -0.8 });

      expect(material.displacementBias).toBe(-0.8);
    });
  });

  describe("setColor", () => {
    it("should update color with Color instance", () => {
      const material = new BlinnPhongMaterial();
      const newColor = new Color(0.3, 0.4, 0.5);

      material.setColor(newColor);

      expect(material.color.r).toBe(0.3);
      expect(material.color.g).toBe(0.4);
      expect(material.color.b).toBe(0.5);
    });

    it("should update color with RGB array", () => {
      const material = new BlinnPhongMaterial();

      material.setColor([0.7, 0.8, 0.9]);

      expect(material.color.r).toBe(0.7);
      expect(material.color.g).toBe(0.8);
      expect(material.color.b).toBe(0.9);
    });

    it("should replace existing color completely", () => {
      const material = new BlinnPhongMaterial({ color: [1, 1, 1] });

      material.setColor([0, 0, 0]);

      expect(material.color.r).toBe(0);
      expect(material.color.g).toBe(0);
      expect(material.color.b).toBe(0);
    });
  });

  describe("setShininess", () => {
    it("should update shininess with valid value", () => {
      const material = new BlinnPhongMaterial();

      material.setShininess(64);

      expect(material.shininess).toBe(64);
    });

    it("should accept minimum valid value (1)", () => {
      const material = new BlinnPhongMaterial();

      material.setShininess(1);

      expect(material.shininess).toBe(1);
    });

    it("should accept maximum valid value (256)", () => {
      const material = new BlinnPhongMaterial();

      material.setShininess(256);

      expect(material.shininess).toBe(256);
    });

    it("should throw error for value less than 1", () => {
      const material = new BlinnPhongMaterial();

      expect(() => material.setShininess(0)).toThrow(
        "Shininess must be between 1 and 256"
      );
    });

    it("should throw error for negative value", () => {
      const material = new BlinnPhongMaterial();

      expect(() => material.setShininess(-5)).toThrow(
        "Shininess must be between 1 and 256"
      );
    });

    it("should throw error for value greater than 256", () => {
      const material = new BlinnPhongMaterial();

      expect(() => material.setShininess(257)).toThrow(
        "Shininess must be between 1 and 256"
      );
    });
  });

  describe("setNormalScale", () => {
    it("should update normalScale with valid value", () => {
      const material = new BlinnPhongMaterial();

      material.setNormalScale(1.5);

      expect(material.normalScale).toBe(1.5);
    });

    it("should accept minimum valid value (0)", () => {
      const material = new BlinnPhongMaterial();

      material.setNormalScale(0);

      expect(material.normalScale).toBe(0);
    });

    it("should accept maximum valid value (3)", () => {
      const material = new BlinnPhongMaterial();

      material.setNormalScale(3);

      expect(material.normalScale).toBe(3);
    });

    it("should throw error for negative value", () => {
      const material = new BlinnPhongMaterial();

      expect(() => material.setNormalScale(-0.1)).toThrow(
        "Normal scale must be between 0 and 3"
      );
    });

    it("should throw error for value greater than 3", () => {
      const material = new BlinnPhongMaterial();

      expect(() => material.setNormalScale(3.1)).toThrow(
        "Normal scale must be between 0 and 3"
      );
    });
  });

  describe("setDisplacementScale", () => {
    it("should update displacementScale with valid value", () => {
      const material = new BlinnPhongMaterial();

      material.setDisplacementScale(5.5);

      expect(material.displacementScale).toBe(5.5);
    });

    it("should accept minimum valid value (0)", () => {
      const material = new BlinnPhongMaterial();

      material.setDisplacementScale(0);

      expect(material.displacementScale).toBe(0);
    });

    it("should accept maximum valid value (10)", () => {
      const material = new BlinnPhongMaterial();

      material.setDisplacementScale(10);

      expect(material.displacementScale).toBe(10);
    });

    it("should throw error for negative value", () => {
      const material = new BlinnPhongMaterial();

      expect(() => material.setDisplacementScale(-1)).toThrow(
        "Displacement scale must be between 0 and 10"
      );
    });

    it("should throw error for value greater than 10", () => {
      const material = new BlinnPhongMaterial();

      expect(() => material.setDisplacementScale(10.1)).toThrow(
        "Displacement scale must be between 0 and 10"
      );
    });
  });

  describe("setDisplacementBias", () => {
    it("should update displacementBias with valid value", () => {
      const material = new BlinnPhongMaterial();

      material.setDisplacementBias(0.5);

      expect(material.displacementBias).toBe(0.5);
    });

    it("should accept minimum valid value (-1)", () => {
      const material = new BlinnPhongMaterial();

      material.setDisplacementBias(-1);

      expect(material.displacementBias).toBe(-1);
    });

    it("should accept maximum valid value (1)", () => {
      const material = new BlinnPhongMaterial();

      material.setDisplacementBias(1);

      expect(material.displacementBias).toBe(1);
    });

    it("should accept zero value", () => {
      const material = new BlinnPhongMaterial();

      material.setDisplacementBias(0);

      expect(material.displacementBias).toBe(0);
    });

    it("should throw error for value less than -1", () => {
      const material = new BlinnPhongMaterial();

      expect(() => material.setDisplacementBias(-1.1)).toThrow(
        "Displacement bias must be between -1 and 1"
      );
    });

    it("should throw error for value greater than 1", () => {
      const material = new BlinnPhongMaterial();

      expect(() => material.setDisplacementBias(1.1)).toThrow(
        "Displacement bias must be between -1 and 1"
      );
    });
  });

  describe("getVertexShader", () => {
    it("should return a non-empty shader string", () => {
      const material = new BlinnPhongMaterial();
      const shader = material.getVertexShader();

      expect(typeof shader).toBe("string");
      expect(shader.length).toBeGreaterThan(0);
    });
  });

  describe("getFragmentShader", () => {
    it("should return a non-empty shader string", () => {
      const material = new BlinnPhongMaterial();
      const shader = material.getFragmentShader();

      expect(typeof shader).toBe("string");
      expect(shader.length).toBeGreaterThan(0);
    });
  });

  describe("getVertexBufferLayout", () => {
    it("should return correct buffer layout", () => {
      const material = new BlinnPhongMaterial();
      const layout = material.getVertexBufferLayout();

      expect(layout.arrayStride).toBe(56);
      expect(layout.attributes).toHaveLength(5);
    });

    it("should have correct position attribute", () => {
      const material = new BlinnPhongMaterial();
      const layout = material.getVertexBufferLayout();
      const posAttr = layout.attributes[0];

      expect(posAttr.shaderLocation).toBe(0);
      expect(posAttr.offset).toBe(0);
      expect(posAttr.format).toBe("float32x3");
    });

    it("should have correct normal attribute", () => {
      const material = new BlinnPhongMaterial();
      const layout = material.getVertexBufferLayout();
      const normalAttr = layout.attributes[1];

      expect(normalAttr.shaderLocation).toBe(1);
      expect(normalAttr.offset).toBe(12);
      expect(normalAttr.format).toBe("float32x3");
    });

    it("should have correct uv attribute", () => {
      const material = new BlinnPhongMaterial();
      const layout = material.getVertexBufferLayout();
      const uvAttr = layout.attributes[2];

      expect(uvAttr.shaderLocation).toBe(2);
      expect(uvAttr.offset).toBe(24);
      expect(uvAttr.format).toBe("float32x2");
    });

    it("should have correct tangent attribute", () => {
      const material = new BlinnPhongMaterial();
      const layout = material.getVertexBufferLayout();
      const tangentAttr = layout.attributes[3];

      expect(tangentAttr.shaderLocation).toBe(3);
      expect(tangentAttr.offset).toBe(32);
      expect(tangentAttr.format).toBe("float32x3");
    });

    it("should have correct bitangent attribute", () => {
      const material = new BlinnPhongMaterial();
      const layout = material.getVertexBufferLayout();
      const bitangentAttr = layout.attributes[4];

      expect(bitangentAttr.shaderLocation).toBe(4);
      expect(bitangentAttr.offset).toBe(44);
      expect(bitangentAttr.format).toBe("float32x3");
    });
  });

  describe("getUniformBufferSize", () => {
    it("should return 304 bytes", () => {
      const material = new BlinnPhongMaterial();

      expect(material.getUniformBufferSize()).toBe(304);
    });
  });

  describe("getTextures", () => {
    it("should throw error when device is not provided", () => {
      const material = new BlinnPhongMaterial();

      expect(() => material.getTextures()).toThrow(
        "BlinnPhongMaterial.getTextures() requires a GPUDevice parameter"
      );
    });

    // Note: Tests that call getTextures(device) are skipped because GPUTextureUsage
    // is not available in Node.js test environment. These tests would need to run
    // in a browser environment with WebGPU support, or use a more sophisticated
    // mock that provides GPUTextureUsage constants.
  });

  describe("getPrimitiveTopology", () => {
    it("should return triangle-list for solid mode", () => {
      const material = new BlinnPhongMaterial({ wireframe: false });

      expect(material.getPrimitiveTopology()).toBe("triangle-list");
    });

    it("should return line-list for wireframe mode", () => {
      const material = new BlinnPhongMaterial({ wireframe: true });

      expect(material.getPrimitiveTopology()).toBe("line-list");
    });
  });

  describe("writeUniformData", () => {
    let buffer: ArrayBuffer;
    let dataView: DataView;

    beforeAll(() => {
      buffer = new ArrayBuffer(512);
      dataView = new DataView(buffer);
    });

    it("should write color and shininess correctly", () => {
      const material = new BlinnPhongMaterial({
        color: [0.5, 0.6, 0.7],
        shininess: 64,
      });

      material.writeUniformData(dataView);

      // Color at offset 192 (64 + 128)
      expect(dataView.getFloat32(192, true)).toBeCloseTo(0.5, 5);
      expect(dataView.getFloat32(196, true)).toBeCloseTo(0.6, 5);
      expect(dataView.getFloat32(200, true)).toBeCloseTo(0.7, 5);
      expect(dataView.getFloat32(204, true)).toBeCloseTo(64, 5);
    });

    it("should write displacement and normal parameters correctly", () => {
      const material = new BlinnPhongMaterial({
        displacementScale: 2.5,
        displacementBias: -0.3,
        normalScale: 1.8,
      });

      material.writeUniformData(dataView);

      // Displacement params at offset 288 (64 + 224)
      expect(dataView.getFloat32(288, true)).toBeCloseTo(2.5, 5);
      expect(dataView.getFloat32(292, true)).toBeCloseTo(-0.3, 5);
      expect(dataView.getFloat32(296, true)).toBeCloseTo(1.8, 5);
    });

    it("should write default light when no context provided", () => {
      const material = new BlinnPhongMaterial();

      material.writeUniformData(dataView);

      // Default directional light direction at offset 208
      expect(dataView.getFloat32(208, true)).toBe(0);
      expect(dataView.getFloat32(212, true)).toBe(-1);
      expect(dataView.getFloat32(216, true)).toBe(0);

      // Default light color at offset 224
      expect(dataView.getFloat32(224, true)).toBe(1);
      expect(dataView.getFloat32(228, true)).toBe(1);
      expect(dataView.getFloat32(232, true)).toBe(1);
      expect(dataView.getFloat32(236, true)).toBe(1);
    });

    it("should write DirectionalLight data correctly", () => {
      const material = new BlinnPhongMaterial();
      const light = new DirectionalLight(
        new Vector3(1, -1, 0),
        new Color(1, 0.5, 0.3),
        0.8
      );

      const mockContext: Partial<RenderContext> = {
        lights: [light],
      };

      material.writeUniformData(dataView, 64, mockContext as RenderContext);

      // Light direction should be normalized
      const expectedDir = new Vector3(1, -1, 0).normalize();
      expect(dataView.getFloat32(208, true)).toBeCloseTo(expectedDir.x, 5);
      expect(dataView.getFloat32(212, true)).toBeCloseTo(expectedDir.y, 5);
      expect(dataView.getFloat32(216, true)).toBeCloseTo(expectedDir.z, 5);

      // Light color and intensity
      expect(dataView.getFloat32(224, true)).toBeCloseTo(1, 5);
      expect(dataView.getFloat32(228, true)).toBeCloseTo(0.5, 5);
      expect(dataView.getFloat32(232, true)).toBeCloseTo(0.3, 5);
      expect(dataView.getFloat32(236, true)).toBeCloseTo(0.8, 5);

      // Light type: 0 for directional
      expect(dataView.getFloat32(272, true)).toBe(0);
    });

    it("should write PointLight data correctly with quadratic attenuation", () => {
      const material = new BlinnPhongMaterial();
      const light = new PointLight(
        new Color(0.8, 0.9, 1.0),
        1.5,
        20,
        "quadratic"
      );

      const mockContext: Partial<RenderContext> = {
        lights: [light],
      };

      material.writeUniformData(dataView, 64, mockContext as RenderContext);

      // Light color and intensity
      expect(dataView.getFloat32(224, true)).toBeCloseTo(0.8, 5);
      expect(dataView.getFloat32(228, true)).toBeCloseTo(0.9, 5);
      expect(dataView.getFloat32(232, true)).toBeCloseTo(1.0, 5);
      expect(dataView.getFloat32(236, true)).toBeCloseTo(1.5, 5);

      // Light params: range
      expect(dataView.getFloat32(256, true)).toBe(20);

      // Light type: 1 for point light
      expect(dataView.getFloat32(272, true)).toBe(1);
      // Attenuation type: 1 for quadratic
      expect(dataView.getFloat32(276, true)).toBe(1);
    });

    it("should write PointLight data correctly with linear attenuation", () => {
      const material = new BlinnPhongMaterial();
      const light = new PointLight(new Color(1, 1, 1), 1, 15, "linear");

      const mockContext: Partial<RenderContext> = {
        lights: [light],
      };

      material.writeUniformData(dataView, 64, mockContext as RenderContext);

      // Light params: range
      expect(dataView.getFloat32(256, true)).toBe(15);

      // Attenuation type: 0 for linear
      expect(dataView.getFloat32(276, true)).toBe(0);
    });

    it("should write PointLight data correctly with physical attenuation", () => {
      const material = new BlinnPhongMaterial();
      const light = new PointLight(new Color(1, 1, 1), 1, 25, "physical");

      const mockContext: Partial<RenderContext> = {
        lights: [light],
      };

      material.writeUniformData(dataView, 64, mockContext as RenderContext);

      // Light params: range and parameter (k=16 for physical)
      expect(dataView.getFloat32(256, true)).toBe(25);
      expect(dataView.getFloat32(260, true)).toBe(16);

      // Attenuation type: 2 for physical
      expect(dataView.getFloat32(276, true)).toBe(2);
    });

    it("should handle empty lights array", () => {
      const material = new BlinnPhongMaterial();

      const mockContext: Partial<RenderContext> = {
        lights: [],
      };

      material.writeUniformData(dataView, 64, mockContext as RenderContext);

      // Should use default light
      expect(dataView.getFloat32(208, true)).toBe(0);
      expect(dataView.getFloat32(212, true)).toBe(-1);
      expect(dataView.getFloat32(216, true)).toBe(0);
    });
  });

  describe("immutability", () => {
    it("should not mutate color when using setColor", () => {
      const material = new BlinnPhongMaterial({ color: [1, 1, 1] });
      const originalColor = material.color;

      material.setColor([0.5, 0.5, 0.5]);

      // New color object should be created
      expect(material.color).not.toBe(originalColor);
    });
  });

  describe("edge cases", () => {
    it("should handle zero shininess boundary", () => {
      const material = new BlinnPhongMaterial();

      expect(() => material.setShininess(0.5)).toThrow();
    });

    it("should handle very small valid shininess", () => {
      const material = new BlinnPhongMaterial();

      material.setShininess(1.1);

      expect(material.shininess).toBeCloseTo(1.1, 5);
    });

    it("should handle very large valid shininess", () => {
      const material = new BlinnPhongMaterial();

      material.setShininess(255.9);

      expect(material.shininess).toBeCloseTo(255.9, 5);
    });

    it("should handle zero displacement scale", () => {
      const material = new BlinnPhongMaterial();

      material.setDisplacementScale(0);

      expect(material.displacementScale).toBe(0);
    });

    it("should handle zero normal scale", () => {
      const material = new BlinnPhongMaterial();

      material.setNormalScale(0);

      expect(material.normalScale).toBe(0);
    });

    it("should handle black color", () => {
      const material = new BlinnPhongMaterial({ color: [0, 0, 0] });

      expect(material.color.r).toBe(0);
      expect(material.color.g).toBe(0);
      expect(material.color.b).toBe(0);
    });

    it("should handle extreme displacement bias values", () => {
      const material = new BlinnPhongMaterial();

      material.setDisplacementBias(-1);
      expect(material.displacementBias).toBe(-1);

      material.setDisplacementBias(1);
      expect(material.displacementBias).toBe(1);
    });
  });
});
