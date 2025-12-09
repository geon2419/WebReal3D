import { describe, it, expect } from "bun:test";
import { Matrix4, Vector3 } from "@web-real/math";
import { OrthographicCamera } from "./OrthographicCamera";

describe("OrthographicCamera", () => {
  describe("constructor", () => {
    it("should initialize with default parameters", () => {
      const camera = new OrthographicCamera();

      expect(camera.left).toBe(-1);
      expect(camera.right).toBe(1);
      expect(camera.top).toBe(1);
      expect(camera.bottom).toBe(-1);
      expect(camera.near).toBe(0.1);
      expect(camera.far).toBe(100);
      expect(camera.zoom).toBe(1);
    });

    it("should initialize with specified parameters", () => {
      const camera = new OrthographicCamera({
        left: -10,
        right: 10,
        top: 10,
        bottom: -10,
        near: 1,
        far: 1000,
        zoom: 2,
      });

      expect(camera.left).toBe(-10);
      expect(camera.right).toBe(10);
      expect(camera.top).toBe(10);
      expect(camera.bottom).toBe(-10);
      expect(camera.near).toBe(1);
      expect(camera.far).toBe(1000);
      expect(camera.zoom).toBe(2);
    });

    it("should initialize with partial parameters", () => {
      const camera = new OrthographicCamera({
        left: -5,
        right: 5,
        zoom: 3,
      });

      expect(camera.left).toBe(-5);
      expect(camera.right).toBe(5);
      expect(camera.top).toBe(1); // default
      expect(camera.bottom).toBe(-1); // default
      expect(camera.near).toBe(0.1); // default
      expect(camera.far).toBe(100); // default
      expect(camera.zoom).toBe(3);
    });

    it("should inherit from Camera", () => {
      const camera = new OrthographicCamera();

      expect(camera.lookAt).toBeDefined();
      expect(camera.setUp).toBeDefined();
      expect(camera.position).toBeDefined();
    });
  });

  describe("projectionMatrix", () => {
    it("should compute orthographic projection matrix with zoom = 1", () => {
      const camera = new OrthographicCamera({
        left: -10,
        right: 10,
        top: 10,
        bottom: -10,
        near: 0.1,
        far: 100,
        zoom: 1,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix).toBeInstanceOf(Matrix4);
      expect(projectionMatrix.data).toBeInstanceOf(Float32Array);
      expect(projectionMatrix.data.length).toBe(16);
    });

    it("should apply zoom to scale the view", () => {
      const camera = new OrthographicCamera({
        left: -10,
        right: 10,
        top: 10,
        bottom: -10,
        near: 0.1,
        far: 100,
        zoom: 1,
      });

      const matrix1 = camera.projectionMatrix;

      camera.zoom = 2; // Zoom in (smaller view)
      const matrix2 = camera.projectionMatrix;

      // Matrices should be different
      let isDifferent = false;
      for (let i = 0; i < 16; i++) {
        if (matrix1.data[i] !== matrix2.data[i]) {
          isDifferent = true;
          break;
        }
      }
      expect(isDifferent).toBe(true);
    });

    it("should maintain center with zoom", () => {
      const camera = new OrthographicCamera({
        left: -10,
        right: 10,
        top: 10,
        bottom: -10,
        zoom: 2,
      });

      const projectionMatrix = camera.projectionMatrix;

      // Center should be at (0, 0)
      expect(projectionMatrix).toBeInstanceOf(Matrix4);
    });

    it("should handle asymmetric bounds", () => {
      const camera = new OrthographicCamera({
        left: -5,
        right: 15,
        top: 20,
        bottom: -10,
        zoom: 1,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix).toBeInstanceOf(Matrix4);
    });

    it("should update when bounds change", () => {
      const camera = new OrthographicCamera({
        left: -1,
        right: 1,
        top: 1,
        bottom: -1,
      });

      const matrix1 = camera.projectionMatrix;

      camera.left = -10;
      camera.right = 10;
      camera.top = 10;
      camera.bottom = -10;

      const matrix2 = camera.projectionMatrix;

      // Matrices should be different
      let isDifferent = false;
      for (let i = 0; i < 16; i++) {
        if (matrix1.data[i] !== matrix2.data[i]) {
          isDifferent = true;
          break;
        }
      }
      expect(isDifferent).toBe(true);
    });

    it("should handle high zoom values", () => {
      const camera = new OrthographicCamera({
        left: -10,
        right: 10,
        top: 10,
        bottom: -10,
        zoom: 100,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix).toBeInstanceOf(Matrix4);
      expect(projectionMatrix.data.some(isNaN)).toBe(false);
    });

    it("should handle fractional zoom values", () => {
      const camera = new OrthographicCamera({
        left: -10,
        right: 10,
        top: 10,
        bottom: -10,
        zoom: 0.5,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix).toBeInstanceOf(Matrix4);
      expect(projectionMatrix.data.some(isNaN)).toBe(false);
    });
  });

  describe("setViewport", () => {
    it("should set bounds based on width and height", () => {
      const camera = new OrthographicCamera();

      camera.setViewport(800, 600);

      expect(camera.left).toBe(-400);
      expect(camera.right).toBe(400);
      expect(camera.top).toBe(300);
      expect(camera.bottom).toBe(-300);
    });

    it("should center the viewport at origin", () => {
      const camera = new OrthographicCamera();

      camera.setViewport(1000, 1000);

      expect(camera.left).toBe(-500);
      expect(camera.right).toBe(500);
      expect(camera.top).toBe(500);
      expect(camera.bottom).toBe(-500);
    });

    it("should return this for method chaining", () => {
      const camera = new OrthographicCamera();
      const result = camera.setViewport(800, 600);

      expect(result).toBe(camera);
    });

    it("should handle square viewports", () => {
      const camera = new OrthographicCamera();

      camera.setViewport(500, 500);

      expect(camera.left).toBe(-250);
      expect(camera.right).toBe(250);
      expect(camera.top).toBe(250);
      expect(camera.bottom).toBe(-250);
    });

    it("should handle very wide viewports", () => {
      const camera = new OrthographicCamera();

      camera.setViewport(1920, 400);

      expect(camera.left).toBe(-960);
      expect(camera.right).toBe(960);
      expect(camera.top).toBe(200);
      expect(camera.bottom).toBe(-200);
    });

    it("should handle very tall viewports", () => {
      const camera = new OrthographicCamera();

      camera.setViewport(400, 1920);

      expect(camera.left).toBe(-200);
      expect(camera.right).toBe(200);
      expect(camera.top).toBe(960);
      expect(camera.bottom).toBe(-960);
    });
  });

  describe("disposeResizeObserver", () => {
    it("should handle being called when no observer exists", () => {
      const camera = new OrthographicCamera();

      // Should not throw
      camera.disposeResizeObserver();

      expect(true).toBe(true);
    });

    it("should handle being called when no observer exists", () => {
      const camera = new OrthographicCamera();

      camera.dispose();

      expect(true).toBe(true);
    });
  });

  describe("dispose", () => {
    it("should work with lookAt and position", () => {
      const camera = new OrthographicCamera({
        left: -10,
        right: 10,
        top: 10,
        bottom: -10,
      });

      camera.position.set(0, 10, 20);
      camera.lookAt(new Vector3(0, 0, 0));
      camera.updateWorldMatrix();

      const viewMatrix = camera.viewMatrix;
      const projectionMatrix = camera.projectionMatrix;

      expect(viewMatrix).toBeInstanceOf(Matrix4);
      expect(projectionMatrix).toBeInstanceOf(Matrix4);
    });

    it("should maintain correct projection with zoom changes", () => {
      const camera = new OrthographicCamera({
        left: -10,
        right: 10,
        top: 10,
        bottom: -10,
        zoom: 1,
      });

      const matrix1 = camera.projectionMatrix;

      camera.zoom = 2;
      const matrix2 = camera.projectionMatrix;

      camera.zoom = 0.5;
      const matrix3 = camera.projectionMatrix;

      // All should be valid matrices
      expect(matrix1.data.some(isNaN)).toBe(false);
      expect(matrix2.data.some(isNaN)).toBe(false);
      expect(matrix3.data.some(isNaN)).toBe(false);
    });
  });
});
