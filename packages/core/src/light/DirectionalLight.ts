import { Color, Vector3 } from "@web-real/math";
import { Light } from "./Light";

export class DirectionalLight extends Light {
  public direction: Vector3;

  constructor(
    direction: Vector3 = new Vector3(0, -1, 0),
    color: Color = new Color(1, 1, 1),
    intensity: number = 1
  ) {
    super(color, intensity);
    if (direction.length() < 1e-8) {
      throw new Error("DirectionalLight: direction vector must be non-zero.");
    }
    this.direction = direction.normalize();
}
