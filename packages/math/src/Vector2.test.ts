import { describe, it, expect } from "vitest";
import { Vector2 } from "./Vector2";

describe("Vector2", () => {
  describe("constructor", () => {
    it("should initialize with default values (0, 0)", () => {
      const v = new Vector2();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it("should initialize with given values", () => {
      const v = new Vector2(1, 2);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
    });
  });

  describe("getters and setters", () => {
    it("should get and set x, y values", () => {
      const v = new Vector2();
      v.x = 5;
      v.y = 10;
      expect(v.x).toBe(5);
      expect(v.y).toBe(10);
    });

    it("should return Float32Array data", () => {
      const v = new Vector2(1, 2);
      expect(v.data).toBeInstanceOf(Float32Array);
      expect(v.data[0]).toBe(1);
      expect(v.data[1]).toBe(2);
    });
  });

  describe("length", () => {
    it("should calculate length of zero vector", () => {
      const v = new Vector2(0, 0);
      expect(v.length).toBe(0);
    });

    it("should calculate length of unit vectors", () => {
      expect(new Vector2(1, 0).length).toBe(1);
      expect(new Vector2(0, 1).length).toBe(1);
    });

    it("should calculate length correctly", () => {
      const v = new Vector2(3, 4);
      expect(v.length).toBe(5);
    });
  });

  describe("add", () => {
    it("should add two vectors", () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(4, 5);
      const result = v1.add(v2);
      expect(result.x).toBe(5);
      expect(result.y).toBe(7);
    });

    it("should return a new vector (not mutate original)", () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(4, 5);
      const result = v1.add(v2);
      expect(v1.x).toBe(1);
      expect(v1.y).toBe(2);
      expect(result).not.toBe(v1);
    });
  });

  describe("sub", () => {
    it("should subtract two vectors", () => {
      const v1 = new Vector2(5, 7);
      const v2 = new Vector2(1, 2);
      const result = v1.sub(v2);
      expect(result.x).toBe(4);
      expect(result.y).toBe(5);
    });

    it("should return a new vector (not mutate original)", () => {
      const v1 = new Vector2(5, 7);
      const v2 = new Vector2(1, 2);
      const result = v1.sub(v2);
      expect(v1.x).toBe(5);
      expect(v1.y).toBe(7);
      expect(result).not.toBe(v1);
    });
  });

  describe("scale", () => {
    it("should scale vector by scalar", () => {
      const v = new Vector2(2, 3);
      const result = v.scale(2);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });

    it("should return a new vector (not mutate original)", () => {
      const v = new Vector2(2, 3);
      const result = v.scale(2);
      expect(v.x).toBe(2);
      expect(v.y).toBe(3);
      expect(result).not.toBe(v);
    });
  });

  describe("dot", () => {
    it("should calculate dot product", () => {
      const v1 = new Vector2(2, 3);
      const v2 = new Vector2(4, 5);
      expect(v1.dot(v2)).toBe(23);
    });

    it("should return 0 for perpendicular vectors", () => {
      const v1 = new Vector2(1, 0);
      const v2 = new Vector2(0, 1);
      expect(v1.dot(v2)).toBe(0);
    });
  });

  describe("normalize", () => {
    it("should normalize vector to unit length", () => {
      const v = new Vector2(3, 4);
      const result = v.normalize();
      expect(result.length).toBeCloseTo(1, 5);
      expect(result.x).toBeCloseTo(0.6, 5);
      expect(result.y).toBeCloseTo(0.8, 5);
    });

    it("should return zero vector for zero vector", () => {
      const v = new Vector2(0, 0);
      const result = v.normalize();
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it("should return a new vector (not mutate original)", () => {
      const v = new Vector2(3, 4);
      const result = v.normalize();
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
      expect(result).not.toBe(v);
    });
  });

  describe("distanceTo", () => {
    it("should calculate distance between two vectors", () => {
      const v1 = new Vector2(0, 0);
      const v2 = new Vector2(3, 4);
      expect(v1.distanceTo(v2)).toBe(5);
    });

    it("should return 0 for same vector", () => {
      const v = new Vector2(1, 2);
      expect(v.distanceTo(v)).toBe(0);
    });

    it("should be symmetric", () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(4, 6);
      expect(v1.distanceTo(v2)).toBe(v2.distanceTo(v1));
    });
  });

  describe("clone", () => {
    it("should create a new vector with same values", () => {
      const v1 = new Vector2(1, 2);
      const v2 = v1.clone();
      expect(v2.x).toBe(1);
      expect(v2.y).toBe(2);
      expect(v2).not.toBe(v1);
    });
  });

  describe("set", () => {
    it("should set vector values", () => {
      const v = new Vector2(0, 0);
      v.set(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });

    it("should return this for chaining", () => {
      const v = new Vector2();
      const result = v.set(1, 2);
      expect(result).toBe(v);
    });
  });

  describe("toString", () => {
    it("should return string representation", () => {
      const v = new Vector2(1, 2);
      expect(v.toString()).toBe("Vector2(1, 2)");
    });
  });
});
