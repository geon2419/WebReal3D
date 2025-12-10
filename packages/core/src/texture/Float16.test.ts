import { describe, it, expect } from "bun:test";
import {
  toFloat16,
  fromFloat16,
  toFloat16Array,
  fromFloat16Array,
} from "./Float16";

describe("Float16", () => {
  describe("toFloat16", () => {
    it("should convert 0 correctly", () => {
      expect(toFloat16(0)).toBe(0x0000);
    });

    it("should convert -0 correctly", () => {
      expect(toFloat16(-0)).toBe(0x8000);
    });

    it("should convert 1.0 correctly", () => {
      // 1.0 in float16: sign=0, exp=15 (biased), mantissa=0
      // = 0 | (15 << 10) | 0 = 0x3C00
      expect(toFloat16(1.0)).toBe(0x3c00);
    });

    it("should convert -1.0 correctly", () => {
      // -1.0 in float16: sign=1, exp=15, mantissa=0
      // = 0x8000 | 0x3C00 = 0xBC00
      expect(toFloat16(-1.0)).toBe(0xbc00);
    });

    it("should convert 0.5 correctly", () => {
      // 0.5 in float16: sign=0, exp=14, mantissa=0
      expect(toFloat16(0.5)).toBe(0x3800);
    });

    it("should convert 2.0 correctly", () => {
      // 2.0 in float16: sign=0, exp=16, mantissa=0
      expect(toFloat16(2.0)).toBe(0x4000);
    });

    it("should convert Infinity correctly", () => {
      expect(toFloat16(Infinity)).toBe(0x7c00);
      expect(toFloat16(-Infinity)).toBe(0xfc00);
    });

    it("should convert NaN correctly", () => {
      const result = toFloat16(NaN);
      // NaN has exp=31 and non-zero mantissa
      expect((result & 0x7c00) >> 10).toBe(31); // exponent
      expect(result & 0x03ff).toBeGreaterThan(0); // mantissa non-zero
    });

    it("should handle overflow to infinity", () => {
      // Max float16 is ~65504, anything larger overflows
      expect(toFloat16(100000)).toBe(0x7c00); // +Inf
      expect(toFloat16(-100000)).toBe(0xfc00); // -Inf
    });

    it("should handle underflow to zero", () => {
      // Min positive float16 is ~5.96e-8 (denorm) or ~6.1e-5 (normalized)
      expect(toFloat16(1e-10)).toBe(0x0000); // Too small, becomes +0
    });

    it("should handle denormalized numbers", () => {
      // Very small numbers become denormalized in float16
      const tiny = 1e-6;
      const half = toFloat16(tiny);
      const back = fromFloat16(half);
      // Should be close but with limited precision
      expect(back).toBeGreaterThan(0);
      expect(back).toBeLessThan(1e-4);
    });
  });

  describe("fromFloat16", () => {
    it("should convert 0 correctly", () => {
      expect(fromFloat16(0x0000)).toBe(0);
    });

    it("should convert -0 correctly", () => {
      expect(Object.is(fromFloat16(0x8000), -0)).toBe(true);
    });

    it("should convert 1.0 correctly", () => {
      expect(fromFloat16(0x3c00)).toBe(1.0);
    });

    it("should convert -1.0 correctly", () => {
      expect(fromFloat16(0xbc00)).toBe(-1.0);
    });

    it("should convert 0.5 correctly", () => {
      expect(fromFloat16(0x3800)).toBe(0.5);
    });

    it("should convert Infinity correctly", () => {
      expect(fromFloat16(0x7c00)).toBe(Infinity);
      expect(fromFloat16(0xfc00)).toBe(-Infinity);
    });

    it("should convert NaN correctly", () => {
      expect(Number.isNaN(fromFloat16(0x7e00))).toBe(true);
    });
  });

  describe("roundtrip", () => {
    it("should roundtrip common values", () => {
      const values = [0, 1, -1, 0.5, -0.5, 2, 10, 100, 1000, 0.001, 0.1];
      for (const v of values) {
        const half = toFloat16(v);
        const back = fromFloat16(half);
        // Float16 has limited precision, so we check relative error
        if (v === 0) {
          expect(back).toBe(0);
        } else {
          const relError = Math.abs(back - v) / Math.abs(v);
          expect(relError).toBeLessThan(0.01); // Less than 1% error
        }
      }
    });

    it("should preserve sign of zero", () => {
      expect(Object.is(fromFloat16(toFloat16(0)), 0)).toBe(true);
      expect(Object.is(fromFloat16(toFloat16(-0)), -0)).toBe(true);
    });
  });

  describe("toFloat16Array", () => {
    it("should convert array correctly", () => {
      const input = new Float32Array([1.0, 0.5, 0.25, 2.0]);
      const result = toFloat16Array(input);

      expect(result).toBeInstanceOf(Uint16Array);
      expect(result.length).toBe(4);
      expect(result[0]).toBe(0x3c00); // 1.0
      expect(result[1]).toBe(0x3800); // 0.5
      // 0.25 and 2.0 checked via roundtrip
    });

    it("should handle RGBA data", () => {
      // Typical HDR pixel: bright red with alpha
      const input = new Float32Array([10.0, 0.0, 0.0, 1.0]);
      const result = toFloat16Array(input);

      expect(result.length).toBe(4);
      // Verify via roundtrip
      const back = fromFloat16Array(result);
      expect(back[0]).toBeCloseTo(10.0, 1);
      expect(back[1]).toBe(0);
      expect(back[2]).toBe(0);
      expect(back[3]).toBe(1.0);
    });
  });

  describe("fromFloat16Array", () => {
    it("should convert array correctly", () => {
      const input = new Uint16Array([0x3c00, 0x3800, 0x3400, 0x4000]);
      const result = fromFloat16Array(input);

      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(4);
      expect(result[0]).toBe(1.0);
      expect(result[1]).toBe(0.5);
      expect(result[2]).toBeCloseTo(0.25, 5);
      expect(result[3]).toBe(2.0);
    });
  });

  describe("HDR value range", () => {
    it("should handle typical HDR values", () => {
      // HDR values can range from very dark to very bright
      const hdrValues = [0.001, 0.01, 0.1, 1, 10, 100, 1000, 10000];

      for (const v of hdrValues) {
        const half = toFloat16(v);
        const back = fromFloat16(half);

        if (v <= 65504) {
          // Within float16 range
          const relError = Math.abs(back - v) / v;
          expect(relError).toBeLessThan(0.01); // Less than 1% error
        } else {
          // Should overflow to infinity
          expect(back).toBe(Infinity);
        }
      }
    });

    it("should handle typical environment map values", () => {
      // Sky brightness can be 10000+ cd/m², sun can be millions
      // But most IBL values are normalized to reasonable range
      const envMapValues = new Float32Array([
        0.5,
        0.8,
        1.2,
        1.0, // Typical sky pixel
        5.0,
        4.0,
        3.0,
        1.0, // Bright cloud
        50.0,
        45.0,
        40.0,
        1.0, // Sun glow
      ]);

      const converted = toFloat16Array(envMapValues);
      const back = fromFloat16Array(converted);

      // All values should be reasonably close
      for (let i = 0; i < envMapValues.length; i++) {
        const orig = envMapValues[i];
        const conv = back[i];
        if (orig === 0) {
          expect(conv).toBe(0);
        } else {
          const relError = Math.abs(conv - orig) / orig;
          expect(relError).toBeLessThan(0.01);
        }
      }
    });
  });
});
