import { describe, it, expect } from "bun:test";
import { Matrix4, Vector3 } from "@web-real/math";
import { PerspectiveCamera } from "./PerspectiveCamera";

describe("PerspectiveCamera", () => {
  describe("constructor", () => {
    it("should initialize with default parameters", () => {
      const camera = new PerspectiveCamera();

      expect(camera.fov).toBe(60);
      expect(camera.aspect).toBe(1);
      expect(camera.near).toBe(0.1);
      expect(camera.far).toBe(100);
    });

    it("should initialize with specified parameters", () => {
      const camera = new PerspectiveCamera({
        fov: 75,
        aspect: 16 / 9,
        near: 0.5,
        far: 2000,
      });

      expect(camera.fov).toBe(75);
      expect(camera.aspect).toBeCloseTo(16 / 9, 5);
      expect(camera.near).toBe(0.5);
      expect(camera.far).toBe(2000);
    });

    it("should initialize with partial parameters", () => {
      const camera = new PerspectiveCamera({
        fov: 90,
        far: 500,
      });

      expect(camera.fov).toBe(90);
      expect(camera.aspect).toBe(1); // default
      expect(camera.near).toBe(0.1); // default
      expect(camera.far).toBe(500);
    });

    it("should inherit from Camera", () => {
      const camera = new PerspectiveCamera();

      expect(camera.lookAt).toBeDefined();
      expect(camera.setUp).toBeDefined();
      expect(camera.position).toBeDefined();
    });
  });

  describe("projectionMatrix", () => {
    it("should compute perspective projection matrix", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 16 / 9,
        near: 0.1,
        far: 100,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix).toBeInstanceOf(Matrix4);
      expect(projectionMatrix.data).toBeInstanceOf(Float32Array);
      expect(projectionMatrix.data.length).toBe(16);
      expect(projectionMatrix.data.some(isNaN)).toBe(false);
    });

    it("should update when fov changes", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 1,
        near: 0.1,
        far: 100,
      });

      const matrix1 = camera.projectionMatrix;

      camera.fov = 90;
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

    it("should update when aspect changes", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 1,
        near: 0.1,
        far: 100,
      });

      const matrix1 = camera.projectionMatrix;

      camera.aspect = 16 / 9;
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

    it("should update when near plane changes", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 1,
        near: 0.1,
        far: 100,
      });

      const matrix1 = camera.projectionMatrix;

      camera.near = 1;
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

    it("should update when far plane changes", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 1,
        near: 0.1,
        far: 100,
      });

      const matrix1 = camera.projectionMatrix;

      camera.far = 1000;
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

    it("should handle wide field of view", () => {
      const camera = new PerspectiveCamera({
        fov: 120,
        aspect: 1,
        near: 0.1,
        far: 100,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix).toBeInstanceOf(Matrix4);
      expect(projectionMatrix.data.some(isNaN)).toBe(false);
    });

    it("should handle narrow field of view", () => {
      const camera = new PerspectiveCamera({
        fov: 15,
        aspect: 1,
        near: 0.1,
        far: 100,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix).toBeInstanceOf(Matrix4);
      expect(projectionMatrix.data.some(isNaN)).toBe(false);
    });

    it("should handle wide aspect ratios", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 21 / 9,
        near: 0.1,
        far: 100,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix).toBeInstanceOf(Matrix4);
      expect(projectionMatrix.data.some(isNaN)).toBe(false);
    });

    it("should handle tall aspect ratios", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 9 / 16,
        near: 0.1,
        far: 100,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix).toBeInstanceOf(Matrix4);
      expect(projectionMatrix.data.some(isNaN)).toBe(false);
    });

    it("should handle large far plane distances", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 1,
        near: 0.1,
        far: 100000,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix).toBeInstanceOf(Matrix4);
      expect(projectionMatrix.data.some(isNaN)).toBe(false);
    });
  });

  describe("disposeResizeObserver", () => {
    it("should handle being called when no observer exists", () => {
      const camera = new PerspectiveCamera();

      // Should not throw
      camera.disposeResizeObserver();

      expect(true).toBe(true);
    });

    it("should handle being called when no observer exists", () => {
      const camera = new PerspectiveCamera();

      camera.dispose();

      expect(true).toBe(true);
    });
  });

  describe("dispose", () => {
    it("should work with lookAt and position", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 16 / 9,
        near: 0.1,
        far: 1000,
      });

      camera.position.set(0, 10, 20);
      camera.lookAt(new Vector3(0, 0, 0));
      camera.updateWorldMatrix();

      const viewMatrix = camera.viewMatrix;
      const projectionMatrix = camera.projectionMatrix;

      expect(viewMatrix).toBeInstanceOf(Matrix4);
      expect(projectionMatrix).toBeInstanceOf(Matrix4);
      expect(viewMatrix.data.some(isNaN)).toBe(false);
      expect(projectionMatrix.data.some(isNaN)).toBe(false);
    });

    it("should maintain correct projection with aspect changes", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 1,
        near: 0.1,
        far: 100,
      });

      const matrix1 = camera.projectionMatrix;

      camera.aspect = 16 / 9;
      const matrix2 = camera.projectionMatrix;

      camera.aspect = 9 / 16;
      const matrix3 = camera.projectionMatrix;

      // All should be valid matrices
      expect(matrix1.data.some(isNaN)).toBe(false);
      expect(matrix2.data.some(isNaN)).toBe(false);
      expect(matrix3.data.some(isNaN)).toBe(false);
    });

    it("should handle extreme camera positions", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 16 / 9,
        near: 0.1,
        far: 10000,
      });

      camera.position.set(1000, 2000, 3000);
      camera.lookAt(new Vector3(0, 0, 0));
      camera.updateWorldMatrix();

      const viewMatrix = camera.viewMatrix;
      const projectionMatrix = camera.projectionMatrix;

      expect(viewMatrix.data.some(isNaN)).toBe(false);
      expect(projectionMatrix.data.some(isNaN)).toBe(false);
    });

    it("should work with custom up vector", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 16 / 9,
        near: 0.1,
        far: 100,
      });

      camera.position.set(10, 0, 0);
      camera.lookAt(new Vector3(0, 0, 0));
      camera.setUp(new Vector3(0, 0, 1));
      camera.updateWorldMatrix();

      const viewMatrix = camera.viewMatrix;

      expect(viewMatrix).toBeInstanceOf(Matrix4);
      expect(viewMatrix.data.some(isNaN)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle very small fov values", () => {
      const camera = new PerspectiveCamera({
        fov: 1,
        aspect: 1,
        near: 0.1,
        far: 100,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix.data.some(isNaN)).toBe(false);
      expect(projectionMatrix.data.some((v) => !isFinite(v))).toBe(false);
    });

    it("should handle very small near plane", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 1,
        near: 0.001,
        far: 100,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix.data.some(isNaN)).toBe(false);
      expect(projectionMatrix.data.some((v) => !isFinite(v))).toBe(false);
    });

    it("should handle small aspect ratio", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 0.1,
        near: 0.1,
        far: 100,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix.data.some(isNaN)).toBe(false);
      expect(projectionMatrix.data.some((v) => !isFinite(v))).toBe(false);
    });

    it("should handle large aspect ratio", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 10,
        near: 0.1,
        far: 100,
      });

      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix.data.some(isNaN)).toBe(false);
      expect(projectionMatrix.data.some((v) => !isFinite(v))).toBe(false);
    });
  });
});
