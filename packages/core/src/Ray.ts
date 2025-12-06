import { Vector3 } from "@web-real/math";

export interface RayTriangleIntersection {
  /** Distance along the ray to the intersection point */
  t: number;
  /** The 3D point of intersection */
  point: Vector3;
  /** Face normal of the intersected triangle */
  faceNormal: Vector3;
}

/**
 * Represents a ray in 3D space, defined by an origin point and a direction vector.
 * Used for raycasting operations such as mouse picking and collision detection.
 */
export class Ray {
  public origin: Vector3;
  public direction: Vector3;

  constructor(origin = new Vector3(), direction = new Vector3(0, 0, -1)) {
    this.origin = origin;
    this.direction = direction;
  }

  /**
   * Gets a point along the ray at distance t from the origin.
   * @param t - Distance along the ray
   * @returns Point at origin + direction * t
   */
  at(t: number): Vector3 {
    return this.origin.add(this.direction.scale(t));
  }

  /**
   * Tests intersection between this ray and a triangle using the Möller–Trumbore algorithm.
   * @param a - First vertex of the triangle
   * @param b - Second vertex of the triangle
   * @param c - Third vertex of the triangle
   * @returns Intersection data if the ray intersects the triangle, null otherwise
   */
  intersectTriangle(
    a: Vector3,
    b: Vector3,
    c: Vector3
  ): RayTriangleIntersection | null {
    const EPSILON = 1e-6;

    // Edge vectors
    const edge1 = b.sub(a);
    const edge2 = c.sub(a);

    // Calculate face normal (for backface culling and return value)
    const faceNormal = edge1.cross(edge2).normalize();

    // Begin Möller–Trumbore intersection algorithm
    const h = this.direction.cross(edge2);
    const det = edge1.dot(h);

    // Ray is parallel to triangle
    if (Math.abs(det) < EPSILON) {
      return null;
    }

    const invDet = 1.0 / det;
    const s = this.origin.sub(a);
    const u = invDet * s.dot(h);

    // Intersection is outside triangle (u < 0 or u > 1)
    if (u < 0.0 || u > 1.0) {
      return null;
    }

    const q = s.cross(edge1);
    const v = invDet * this.direction.dot(q);

    // Intersection is outside triangle (v < 0 or u + v > 1)
    if (v < 0.0 || u + v > 1.0) {
      return null;
    }

    // Calculate t to find the intersection point on the ray
    const t = invDet * edge2.dot(q);

    // Ray intersection (t > EPSILON to avoid self-intersection)
    if (t > EPSILON) {
      const point = this.at(t);
      return { t, point, faceNormal };
    }

    // Line intersection but not ray intersection
    return null;
  }

  /**
   * Creates a copy of this ray.
   * @returns A new Ray with the same origin and direction
   */
  clone(): Ray {
    return new Ray(this.origin.clone(), this.direction.clone());
  }

  /**
   * Sets the origin and direction of this ray.
   * @param origin - New origin point
   * @param direction - New direction vector
   * @returns This ray for chaining
   */
  set(origin: Vector3, direction: Vector3): this {
    this.origin = origin;
    this.direction = direction;
    return this;
  }
}
