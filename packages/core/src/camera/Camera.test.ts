import { describe, it, expect } from "bun:test";
import { Matrix4, Vector3 } from "@web-real/math";
import { Camera } from "./Camera";

// Concrete implementation for testing abstract Camera class
class TestCamera extends Camera {
  get projectionMatrix(): Matrix4 {
    return new Matrix4();
  }
}

describe("Camera", () => {
  describe("constructor", () => {
    it("should initialize with default target at origin", () => {
      const camera = new TestCamera();
      expect(camera.target.x).toBe(0);
      expect(camera.target.y).toBe(0);
      expect(camera.target.z).toBe(0);
    });

    it("should initialize with default up vector (0, 1, 0)", () => {
      const camera = new TestCamera();
      expect(camera.up.x).toBe(0);
      expect(camera.up.y).toBe(1);
      expect(camera.up.z).toBe(0);
    });

    it("should inherit from Object3D", () => {
      const camera = new TestCamera();
      expect(camera.position).toBeDefined();
      expect(camera.rotation).toBeDefined();
      expect(camera.scale).toBeDefined();
    });
  });

  describe("lookAt", () => {
    it("should set the camera target to the specified position", () => {
      const camera = new TestCamera();
      const target = new Vector3(10, 20, 30);

      camera.lookAt(target);

      expect(camera.target.x).toBe(10);
      expect(camera.target.y).toBe(20);
      expect(camera.target.z).toBe(30);
    });

    it("should update target when called multiple times", () => {
      const camera = new TestCamera();

      camera.lookAt(new Vector3(1, 1, 1));
      expect(camera.target.x).toBe(1);

      camera.lookAt(new Vector3(5, 5, 5));
      expect(camera.target.x).toBe(5);
      expect(camera.target.y).toBe(5);
      expect(camera.target.z).toBe(5);
    });

    it("should return this for method chaining", () => {
      const camera = new TestCamera();
      const result = camera.lookAt(new Vector3(1, 2, 3));

      expect(result).toBe(camera);
    });

    it("should handle negative coordinates", () => {
      const camera = new TestCamera();
      camera.lookAt(new Vector3(-10, -20, -30));

      expect(camera.target.x).toBe(-10);
      expect(camera.target.y).toBe(-20);
      expect(camera.target.z).toBe(-30);
    });

    it("should handle zero vector", () => {
      const camera = new TestCamera();
      camera.lookAt(new Vector3(5, 5, 5));
      camera.lookAt(new Vector3(0, 0, 0));

      expect(camera.target.x).toBe(0);
      expect(camera.target.y).toBe(0);
      expect(camera.target.z).toBe(0);
    });
  });

  describe("setUp", () => {
    it("should set the camera up vector", () => {
      const camera = new TestCamera();
      const up = new Vector3(1, 0, 0);

      camera.setUp(up);

      expect(camera.up.x).toBe(1);
      expect(camera.up.y).toBe(0);
      expect(camera.up.z).toBe(0);
    });

    it("should return this for method chaining", () => {
      const camera = new TestCamera();
      const result = camera.setUp(new Vector3(0, 0, 1));

      expect(result).toBe(camera);
    });

    it("should allow chaining with lookAt", () => {
      const camera = new TestCamera();

      camera.lookAt(new Vector3(10, 0, 0)).setUp(new Vector3(0, 0, 1));

      expect(camera.target.x).toBe(10);
      expect(camera.up.z).toBe(1);
    });

    it("should handle different up vectors", () => {
      const camera = new TestCamera();

      camera.setUp(new Vector3(0, 0, -1));
      expect(camera.up.x).toBe(0);
      expect(camera.up.y).toBe(0);
      expect(camera.up.z).toBe(-1);

      camera.setUp(new Vector3(1, 1, 0));
      expect(camera.up.x).toBe(1);
      expect(camera.up.y).toBe(1);
      expect(camera.up.z).toBe(0);
    });
  });

  describe("viewMatrix", () => {
    it("should compute view matrix using lookAt", () => {
      const camera = new TestCamera();
      camera.position.set(0, 0, 5);
      camera.lookAt(new Vector3(0, 0, 0));
      camera.updateWorldMatrix();

      const viewMatrix = camera.viewMatrix;

      expect(viewMatrix).toBeInstanceOf(Matrix4);
      expect(viewMatrix.data).toBeInstanceOf(Float32Array);
      expect(viewMatrix.data.length).toBe(16);
    });

    it("should update when camera position changes", () => {
      const camera = new TestCamera();
      camera.position.set(0, 0, 10);
      camera.lookAt(new Vector3(0, 0, 0));
      camera.updateWorldMatrix();

      const viewMatrix1 = camera.viewMatrix;

      camera.position.set(10, 0, 10);
      camera.updateWorldMatrix();

      const viewMatrix2 = camera.viewMatrix;

      // Matrices should be different
      let isDifferent = false;
      for (let i = 0; i < 16; i++) {
        if (viewMatrix1.data[i] !== viewMatrix2.data[i]) {
          isDifferent = true;
          break;
        }
      }
      expect(isDifferent).toBe(true);
    });

    it("should update when target changes", () => {
      const camera = new TestCamera();
      camera.position.set(0, 0, 10);
      camera.lookAt(new Vector3(0, 0, 0));
      camera.updateWorldMatrix();

      const viewMatrix1 = camera.viewMatrix;

      camera.lookAt(new Vector3(5, 0, 0));

      const viewMatrix2 = camera.viewMatrix;

      // Matrices should be different
      let isDifferent = false;
      for (let i = 0; i < 16; i++) {
        if (viewMatrix1.data[i] !== viewMatrix2.data[i]) {
          isDifferent = true;
          break;
        }
      }
      expect(isDifferent).toBe(true);
    });

    it("should use world position from world matrix", () => {
      const camera = new TestCamera();
      camera.position.set(5, 10, 15);
      camera.lookAt(new Vector3(0, 0, 0));
      camera.updateWorldMatrix();

      const viewMatrix = camera.viewMatrix;

      // View matrix should be computed from world position
      expect(viewMatrix).toBeInstanceOf(Matrix4);
    });
  });

  describe("target and up getters", () => {
    it("should return the internal target vector", () => {
      const camera = new TestCamera();
      camera.lookAt(new Vector3(1, 2, 3));

      const target = camera.target;

      expect(target.x).toBe(1);
      expect(target.y).toBe(2);
      expect(target.z).toBe(3);
    });

    it("should return the internal up vector", () => {
      const camera = new TestCamera();
      camera.setUp(new Vector3(0, 0, 1));

      const up = camera.up;

      expect(up.x).toBe(0);
      expect(up.y).toBe(0);
      expect(up.z).toBe(1);
    });
  });

  describe("projectionMatrix", () => {
    it("should be implemented by subclasses", () => {
      const camera = new TestCamera();
      const projectionMatrix = camera.projectionMatrix;

      expect(projectionMatrix).toBeInstanceOf(Matrix4);
    });
  });
});
