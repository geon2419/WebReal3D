import { describe, expect, it } from "vitest";
import { calculateMipLevelCount, isRenderableFormat } from "./MipmapGenerator";

describe("MipmapGenerator", () => {
  describe("calculateMipLevelCount", () => {
    it("should return 1 for 1x1 texture", () => {
      expect(calculateMipLevelCount(1, 1)).toBe(1);
    });

    it("should return 2 for 2x2 texture", () => {
      expect(calculateMipLevelCount(2, 2)).toBe(2);
    });

    it("should return 9 for 256x256 texture", () => {
      // 256 -> 128 -> 64 -> 32 -> 16 -> 8 -> 4 -> 2 -> 1 (9 levels)
      expect(calculateMipLevelCount(256, 256)).toBe(9);
    });

    it("should return 10 for 512x512 texture", () => {
      expect(calculateMipLevelCount(512, 512)).toBe(10);
    });

    it("should return 11 for 1024x1024 texture", () => {
      expect(calculateMipLevelCount(1024, 1024)).toBe(11);
    });

    it("should use the larger dimension for non-square textures", () => {
      // 1024x512: max is 1024, so 11 levels
      expect(calculateMipLevelCount(1024, 512)).toBe(11);
      // 512x1024: max is 1024, so 11 levels
      expect(calculateMipLevelCount(512, 1024)).toBe(11);
    });

    it("should handle non-power-of-two dimensions", () => {
      // 100: floor(log2(100)) + 1 = 6 + 1 = 7
      expect(calculateMipLevelCount(100, 100)).toBe(7);
      // 1920x1080: max is 1920, floor(log2(1920)) + 1 = 10 + 1 = 11
      expect(calculateMipLevelCount(1920, 1080)).toBe(11);
    });

    it("should return correct levels for common texture sizes", () => {
      expect(calculateMipLevelCount(64, 64)).toBe(7);
      expect(calculateMipLevelCount(128, 128)).toBe(8);
      expect(calculateMipLevelCount(2048, 2048)).toBe(12);
      expect(calculateMipLevelCount(4096, 4096)).toBe(13);
    });

    it("should handle rectangular textures", () => {
      // 256x64: max is 256, so 9 levels
      expect(calculateMipLevelCount(256, 64)).toBe(9);
      // 64x256: max is 256, so 9 levels
      expect(calculateMipLevelCount(64, 256)).toBe(9);
    });
  });

  describe("isRenderableFormat", () => {
    it("should return true for rgba8unorm", () => {
      expect(isRenderableFormat("rgba8unorm")).toBe(true);
    });

    it("should return true for rgba8unorm-srgb", () => {
      expect(isRenderableFormat("rgba8unorm-srgb")).toBe(true);
    });

    it("should return true for bgra8unorm", () => {
      expect(isRenderableFormat("bgra8unorm")).toBe(true);
    });

    it("should return true for bgra8unorm-srgb", () => {
      expect(isRenderableFormat("bgra8unorm-srgb")).toBe(true);
    });

    it("should return true for rgba16float", () => {
      expect(isRenderableFormat("rgba16float")).toBe(true);
    });

    it("should return true for rgba32float", () => {
      expect(isRenderableFormat("rgba32float")).toBe(true);
    });

    it("should return true for rgb10a2unorm", () => {
      expect(isRenderableFormat("rgb10a2unorm")).toBe(true);
    });

    it("should return false for non-renderable formats", () => {
      // Compressed formats are not renderable
      expect(isRenderableFormat("bc1-rgba-unorm")).toBe(false);
      expect(isRenderableFormat("bc3-rgba-unorm")).toBe(false);
      expect(isRenderableFormat("etc2-rgb8unorm")).toBe(false);
    });

    it("should return false for depth/stencil formats", () => {
      expect(isRenderableFormat("depth24plus")).toBe(false);
      expect(isRenderableFormat("depth32float")).toBe(false);
      expect(isRenderableFormat("depth24plus-stencil8")).toBe(false);
    });
  });
});
