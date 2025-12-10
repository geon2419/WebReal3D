/**
 * Radiance HDR (RGBE) file format parser.
 *
 * Parses .hdr files in the Radiance RGBE format, which stores HDR images
 * using a shared exponent encoding (R, G, B, Exponent).
 *
 * The parser supports:
 * - Standard RGBE format (32-bit/pixel)
 * - Run-length encoding (RLE) compression
 * - Header metadata (FORMAT, EXPOSURE, GAMMA)
 *
 * @module RGBEParser
 */

/**
 * Result of parsing an RGBE file.
 */
export interface RGBEResult {
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Linear RGBA float data (length = width * height * 4) */
  data: Float32Array;
  /** Exposure value from header (default: 1.0) */
  exposure: number;
  /** Gamma value from header (default: 1.0) */
  gamma: number;
}

/**
 * Error class for RGBE parsing failures.
 */
export class RGBEParserError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "RGBEParserError";
  }
}

/**
 * Parses a Radiance HDR (RGBE) file buffer into linear floating-point RGBA data.
 *
 * @param buffer - The raw ArrayBuffer containing the HDR file data
 * @returns Parsed RGBE result with width, height, data, exposure, and gamma
 * @throws {RGBEParserError} If the file format is invalid or parsing fails
 *
 * @example
 * ```ts
 * const response = await fetch('environment.hdr');
 * const buffer = await response.arrayBuffer();
 * const { width, height, data, exposure } = parse(buffer);
 * // data is Float32Array of RGBA values in linear space
 * ```
 */
export function parse(buffer: ArrayBuffer): RGBEResult {
  const bytes = new Uint8Array(buffer);
  let pos = 0;

  // Parse header
  const header = parseHeader(bytes, pos);
  pos = header.endPosition;

  // Parse resolution string
  const resolution = parseResolution(bytes, pos);
  pos = resolution.endPosition;

  const { width, height } = resolution;
  const pixelCount = width * height;

  // Allocate output buffer (RGBA float)
  const data = new Float32Array(pixelCount * 4);

  // Parse pixel data
  parsePixelData(bytes, pos, width, height, data);

  return {
    width,
    height,
    data,
    exposure: header.exposure,
    gamma: header.gamma,
  };
}

/**
 * Header parsing result.
 */
interface HeaderResult {
  format: string;
  exposure: number;
  gamma: number;
  endPosition: number;
}

/**
 * Parses the RGBE file header.
 */
function parseHeader(bytes: Uint8Array, startPos: number): HeaderResult {
  let pos = startPos;
  let format = "32-bit_rle_rgbe";
  let exposure = 1.0;
  let gamma = 1.0;

  // Read first line - should be magic number
  const firstLine = readLine(bytes, pos);
  pos = firstLine.endPosition;

  // Check magic number
  const magic = firstLine.line.trim();
  if (magic !== "#?RADIANCE" && magic !== "#?RGBE") {
    throw new RGBEParserError(
      `Invalid HDR file: expected "#?RADIANCE" or "#?RGBE" magic number, got "${magic}"`
    );
  }

  // Parse header lines until empty line
  while (pos < bytes.length) {
    const lineResult = readLine(bytes, pos);
    pos = lineResult.endPosition;
    const line = lineResult.line.trim();

    // Empty line marks end of header
    if (line === "") {
      break;
    }

    // Skip comments
    if (line.startsWith("#")) {
      continue;
    }

    // Parse FORMAT
    if (line.startsWith("FORMAT=")) {
      format = line.substring(7).trim();
      if (format !== "32-bit_rle_rgbe" && format !== "32-bit_rle_xyze") {
        throw new RGBEParserError(`Unsupported HDR format: ${format}`);
      }
    }

    // Parse EXPOSURE
    if (line.startsWith("EXPOSURE=")) {
      const value = parseFloat(line.substring(9));
      if (!Number.isNaN(value)) {
        exposure *= value; // Exposure values are cumulative
      }
    }

    // Parse GAMMA
    if (line.startsWith("GAMMA=")) {
      const value = parseFloat(line.substring(6));
      if (!Number.isNaN(value)) {
        gamma = value;
      }
    }
  }

  return { format, exposure, gamma, endPosition: pos };
}

/**
 * Resolution parsing result.
 */
interface ResolutionResult {
  width: number;
  height: number;
  endPosition: number;
}

/**
 * Parses the resolution string.
 * Format: "-Y height +X width" (most common) or variants
 */
function parseResolution(
  bytes: Uint8Array,
  startPos: number
): ResolutionResult {
  const lineResult = readLine(bytes, startPos);
  const line = lineResult.line.trim();

  // Parse resolution string: "-Y height +X width" or "+X width -Y height"
  const match = line.match(/^([+-][XY])\s+(\d+)\s+([+-][XY])\s+(\d+)$/);
  if (!match) {
    throw new RGBEParserError(
      `Invalid resolution string: "${line}". Expected format like "-Y 1024 +X 2048"`
    );
  }

  let width: number;
  let height: number;

  // Parse based on axis order
  if (match[1].includes("Y")) {
    height = parseInt(match[2], 10);
    width = parseInt(match[4], 10);
  } else {
    width = parseInt(match[2], 10);
    height = parseInt(match[4], 10);
  }

  if (width <= 0 || height <= 0) {
    throw new RGBEParserError(`Invalid dimensions: ${width}x${height}`);
  }

  // Sanity check for reasonable image size (max 16K x 16K)
  if (width > 16384 || height > 16384) {
    throw new RGBEParserError(
      `Image dimensions too large: ${width}x${height}. Maximum supported: 16384x16384`
    );
  }

  return { width, height, endPosition: lineResult.endPosition };
}

/**
 * Parses pixel data with automatic RLE detection.
 */
function parsePixelData(
  bytes: Uint8Array,
  startPos: number,
  width: number,
  height: number,
  output: Float32Array
): void {
  let pos = startPos;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;

    // Check if this scanline uses new-style RLE
    if (pos + 4 <= bytes.length && isNewStyleRLE(bytes, pos, width)) {
      pos = decodeScanlineRLE(bytes, pos, width, output, rowOffset);
    } else {
      // Old-style format (uncompressed or old RLE)
      pos = decodeScanlineFlat(bytes, pos, width, output, rowOffset);
    }
  }
}

/**
 * Checks if the scanline uses new-style RLE encoding.
 */
function isNewStyleRLE(bytes: Uint8Array, pos: number, width: number): boolean {
  // New-style RLE starts with: 0x02 0x02 <width high byte> <width low byte>
  return (
    bytes[pos] === 2 &&
    bytes[pos + 1] === 2 &&
    bytes[pos + 2] === ((width >> 8) & 0xff) &&
    bytes[pos + 3] === (width & 0xff)
  );
}

/**
 * Decodes a scanline with new-style RLE encoding.
 * Each channel is encoded separately with RLE.
 */
function decodeScanlineRLE(
  bytes: Uint8Array,
  startPos: number,
  width: number,
  output: Float32Array,
  rowOffset: number
): number {
  let pos = startPos + 4; // Skip RLE header

  // Temporary buffer for scanline RGBE data
  const scanline = new Uint8Array(width * 4);

  // Decode each channel separately (R, G, B, E)
  for (let channel = 0; channel < 4; channel++) {
    let pixelIndex = 0;

    while (pixelIndex < width) {
      if (pos >= bytes.length) {
        throw new RGBEParserError("Unexpected end of RLE data");
      }

      const code = bytes[pos++];

      if (code > 128) {
        // Run of same value
        const count = code - 128;
        if (pixelIndex + count > width) {
          throw new RGBEParserError("RLE run exceeds scanline width");
        }

        const value = bytes[pos++];
        for (let i = 0; i < count; i++) {
          scanline[pixelIndex * 4 + channel] = value;
          pixelIndex++;
        }
      } else {
        // Non-run (literal values)
        const count = code;
        if (pixelIndex + count > width) {
          throw new RGBEParserError("RLE literal count exceeds scanline width");
        }

        for (let i = 0; i < count; i++) {
          scanline[pixelIndex * 4 + channel] = bytes[pos++];
          pixelIndex++;
        }
      }
    }
  }

  // Convert RGBE scanline to float RGBA
  for (let x = 0; x < width; x++) {
    const srcIdx = x * 4;
    const dstIdx = rowOffset + x * 4;
    rgbeToFloat(
      scanline[srcIdx],
      scanline[srcIdx + 1],
      scanline[srcIdx + 2],
      scanline[srcIdx + 3],
      output,
      dstIdx
    );
  }

  return pos;
}

/**
 * Decodes a scanline without RLE (flat format).
 */
function decodeScanlineFlat(
  bytes: Uint8Array,
  startPos: number,
  width: number,
  output: Float32Array,
  rowOffset: number
): number {
  let pos = startPos;

  for (let x = 0; x < width; x++) {
    if (pos + 4 > bytes.length) {
      throw new RGBEParserError("Unexpected end of pixel data");
    }

    const dstIdx = rowOffset + x * 4;
    rgbeToFloat(
      bytes[pos],
      bytes[pos + 1],
      bytes[pos + 2],
      bytes[pos + 3],
      output,
      dstIdx
    );
    pos += 4;
  }

  return pos;
}

/**
 * Converts a single RGBE pixel to linear float RGBA.
 *
 * RGBE encoding: RGB values share a common exponent E.
 * float_value = encoded_value * 2^(E - 128 - 8)
 */
function rgbeToFloat(
  r: number,
  g: number,
  b: number,
  e: number,
  output: Float32Array,
  index: number
): void {
  if (e === 0) {
    // Zero exponent means black
    output[index] = 0;
    output[index + 1] = 0;
    output[index + 2] = 0;
    output[index + 3] = 1; // Alpha is always 1
  } else {
    // Calculate the scale factor: 2^(e - 128) / 256
    // This is equivalent to: 2^(e - 128 - 8)
    const scale = Math.pow(2, e - 128 - 8);
    output[index] = r * scale;
    output[index + 1] = g * scale;
    output[index + 2] = b * scale;
    output[index + 3] = 1; // Alpha is always 1
  }
}

/**
 * Reads a line from the byte array (terminated by \n).
 */
function readLine(
  bytes: Uint8Array,
  startPos: number
): { line: string; endPosition: number } {
  let endPos = startPos;

  // Find line ending
  while (endPos < bytes.length && bytes[endPos] !== 0x0a) {
    endPos++;
  }

  // Convert to string (handle potential \r\n)
  let lineEnd = endPos;
  if (lineEnd > startPos && bytes[lineEnd - 1] === 0x0d) {
    lineEnd--;
  }

  const line = String.fromCharCode(...bytes.slice(startPos, lineEnd));

  // Move past the newline
  return { line, endPosition: endPos + 1 };
}
