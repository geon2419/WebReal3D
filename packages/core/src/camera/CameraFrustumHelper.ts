import type { PerspectiveCamera } from "./PerspectiveCamera";
import {
  FrustumGeometry,
  type FrustumColors,
} from "../geometry/FrustumGeometry";
import { LineColorMaterial } from "../material/LineColorMaterial";
import { Mesh } from "../Mesh";

export interface CameraFrustumHelperOptions {
  /** Color for the near plane edges (RGB, 0-1 range). Default: [1, 1, 0] (yellow) */
  nearColor?: [number, number, number];
  /** Color for the far plane edges (RGB, 0-1 range). Default: [1, 0.5, 0] (orange) */
  farColor?: [number, number, number];
  /** Color for the connecting edges (RGB, 0-1 range). Default: [0.5, 0.5, 0.5] (gray) */
  sideColor?: [number, number, number];
  /** Color for the lines from camera to near plane (RGB, 0-1 range). Default: [0.3, 0.3, 0.3] (dark gray) */
  coneColor?: [number, number, number];
}

/**
 * A helper class that visualizes a PerspectiveCamera's view frustum.
 * Useful for debugging camera setup and understanding the visible area.
 *
 * Different colors are used for different parts of the frustum:
 * - Near plane edges (default: yellow)
 * - Far plane edges (default: orange)
 * - Side edges connecting near to far (default: gray)
 * - Cone lines from camera position to near plane (default: dark gray)
 *
 * @example
 * ```typescript
 * const debugCamera = new PerspectiveCamera(60, 1.5, 0.1, 100);
 * const helper = new CameraFrustumHelper(debugCamera, {
 *   nearColor: [0, 1, 0],   // Green near plane
 *   farColor: [1, 0, 0],    // Red far plane
 *   sideColor: [0, 0, 1],   // Blue sides
 *   coneColor: [1, 1, 1],   // White cone
 * });
 * scene.add(helper);
 *
 * // Update when camera parameters change
 * debugCamera.fov = 90;
 * helper.update();
 * ```
 */
export class CameraFrustumHelper extends Mesh {
  private readonly camera: PerspectiveCamera;
  private readonly frustumGeometry: FrustumGeometry;
  private readonly lineColorMaterial: LineColorMaterial;

  constructor(
    camera: PerspectiveCamera,
    options: CameraFrustumHelperOptions = {}
  ) {
    const frustumColors: FrustumColors = {
      near: options.nearColor ?? [1, 1, 0],
      far: options.farColor ?? [1, 0.5, 0],
      sides: options.sideColor ?? [0.5, 0.5, 0.5],
      cone: options.coneColor ?? [0.3, 0.3, 0.3],
    };

    const geometry = new FrustumGeometry(camera, frustumColors);
    const material = new LineColorMaterial({
      colors: geometry.colors,
    });

    super(geometry, material);

    this.camera = camera;
    this.frustumGeometry = geometry;
    this.lineColorMaterial = material;
  }

  /**
   * Updates the frustum geometry when camera parameters change.
   * Call this after modifying camera's fov, aspect, near, or far.
   */
  update(): void {
    this.frustumGeometry.update(this.camera);
    this.lineColorMaterial.setColors(this.frustumGeometry.colors);
    this.needsUpdate = true;
  }
}
