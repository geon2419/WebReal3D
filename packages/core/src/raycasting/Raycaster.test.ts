import { describe, it, expect } from "bun:test";
import { Raycaster } from "./Raycaster";
import { Vector2, Vector3 } from "@web-real/math";
import { PerspectiveCamera } from "../camera/PerspectiveCamera";
import { OrthographicCamera } from "../camera/OrthographicCamera";
import { Mesh } from "../scene/Mesh";
import { BoxGeometry } from "../geometry/BoxGeometry";
import { VertexColorMaterial } from "../material/VertexColorMaterial";

describe("Raycaster", () => {
  describe("constructor", () => {
    it("should create raycaster with default parameters", () => {
      const raycaster = new Raycaster();

      expect(raycaster.ray).toBeDefined();
      expect(raycaster.ray.origin.x).toBe(0);
      expect(raycaster.ray.origin.y).toBe(0);
      expect(raycaster.ray.origin.z).toBe(0);
      expect(raycaster.near).toBe(0);
      expect(raycaster.far).toBe(Infinity);
    });

    it("should create raycaster with specified origin and direction", () => {
      const origin = new Vector3(1, 2, 3);
      const direction = new Vector3(0, 1, 0);
      const raycaster = new Raycaster(origin, direction);

      expect(raycaster.ray.origin.x).toBe(1);
      expect(raycaster.ray.origin.y).toBe(2);
      expect(raycaster.ray.origin.z).toBe(3);
      expect(raycaster.ray.direction.x).toBe(0);
      expect(raycaster.ray.direction.y).toBe(1);
      expect(raycaster.ray.direction.z).toBe(0);
    });

    it("should create raycaster with specified near and far", () => {
      const raycaster = new Raycaster(undefined, undefined, 0.1, 1000);

      expect(raycaster.near).toBe(0.1);
      expect(raycaster.far).toBe(1000);
    });
  });

  describe("setFromCamera", () => {
    it("should set ray from perspective camera at center", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 1,
        near: 0.1,
        far: 100,
      });
      camera.position = new Vector3(0, 0, 5);
      camera.lookAt(new Vector3(0, 0, 0));

      const raycaster = new Raycaster();
      const coords = new Vector2(0, 0); // Center of screen

      raycaster.setFromCamera(coords, camera);

      // Ray should originate from camera position
      expect(raycaster.ray.origin.x).toBeCloseTo(0, 5);
      expect(raycaster.ray.origin.y).toBeCloseTo(0, 5);
      expect(raycaster.ray.origin.z).toBeCloseTo(5, 5);

      // Direction should point towards -Z
      expect(raycaster.ray.direction.z).toBeLessThan(0);
    });

    it("should set ray from perspective camera at screen corner", () => {
      const camera = new PerspectiveCamera({
        fov: 60,
        aspect: 1,
        near: 0.1,
        far: 100,
      });
      camera.position = new Vector3(0, 0, 5);
      camera.lookAt(new Vector3(0, 0, 0));

      const raycaster = new Raycaster();
      const coords = new Vector2(1, 1); // Top-right corner

      raycaster.setFromCamera(coords, camera);

      // Ray should originate from camera position
      expect(raycaster.ray.origin.x).toBeCloseTo(0, 5);
      expect(raycaster.ray.origin.y).toBeCloseTo(0, 5);
      expect(raycaster.ray.origin.z).toBeCloseTo(5, 5);

      // Direction should point towards top-right
      expect(raycaster.ray.direction.x).toBeGreaterThan(0);
      expect(raycaster.ray.direction.y).toBeGreaterThan(0);
    });

    it("should set ray from orthographic camera at center", () => {
      const camera = new OrthographicCamera({
        left: -5,
        right: 5,
        top: 5,
        bottom: -5,
        near: 0.1,
        far: 100,
      });
      camera.position = new Vector3(0, 0, 10);
      camera.lookAt(new Vector3(0, 0, 0));

      const raycaster = new Raycaster();
      const coords = new Vector2(0, 0); // Center of screen

      raycaster.setFromCamera(coords, camera);

      // For orthographic camera, rays are parallel
      // Origin should be on the near plane
      expect(raycaster.ray.origin.x).toBeCloseTo(0, 5);
      expect(raycaster.ray.origin.y).toBeCloseTo(0, 5);

      // Direction should be normalized (unit vector)
      const dirLength = Math.sqrt(
        raycaster.ray.direction.x ** 2 +
          raycaster.ray.direction.y ** 2 +
          raycaster.ray.direction.z ** 2
      );
      expect(dirLength).toBeCloseTo(1, 5);
    });

    it("should set ray from orthographic camera at screen edge", () => {
      const camera = new OrthographicCamera({
        left: -5,
        right: 5,
        top: 5,
        bottom: -5,
        near: 0.1,
        far: 100,
      });
      camera.position = new Vector3(0, 0, 10);
      camera.lookAt(new Vector3(0, 0, 0));

      const raycaster = new Raycaster();
      const coords = new Vector2(-1, -1); // Bottom-left corner

      raycaster.setFromCamera(coords, camera);

      // Origin should be at the edge position
      expect(raycaster.ray.origin.x).toBeLessThan(0);
      expect(raycaster.ray.origin.y).toBeLessThan(0);

      // Direction should be normalized (unit vector)
      const dirLength = Math.sqrt(
        raycaster.ray.direction.x ** 2 +
          raycaster.ray.direction.y ** 2 +
          raycaster.ray.direction.z ** 2
      );
      expect(dirLength).toBeCloseTo(1, 5);
    });

    it("should return this for method chaining", () => {
      const camera = new PerspectiveCamera();
      const raycaster = new Raycaster();
      const coords = new Vector2(0, 0);

      const result = raycaster.setFromCamera(coords, camera);

      expect(result).toBe(raycaster);
    });
  });

  describe("intersectObject", () => {
    it("should find intersection with mesh in front of ray", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new VertexColorMaterial();
      const mesh = new Mesh(geometry, material);
      mesh.position = new Vector3(0, 0, 0);

      const raycaster = new Raycaster(
        new Vector3(0, 0, 5),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObject(mesh);

      expect(intersections.length).toBeGreaterThan(0);
      expect(intersections[0].object).toBe(mesh);
      expect(intersections[0].distance).toBeGreaterThan(0);
      expect(intersections[0].point).toBeDefined();
      expect(intersections[0].normal).toBeDefined();
      expect(intersections[0].faceIndex).toBeGreaterThanOrEqual(0);
    });

    it("should return empty array when ray misses mesh", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new VertexColorMaterial();
      const mesh = new Mesh(geometry, material);
      mesh.position = new Vector3(0, 0, 0);

      const raycaster = new Raycaster(
        new Vector3(10, 10, 5),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObject(mesh);

      expect(intersections.length).toBe(0);
    });

    it("should return empty array when ray points away from mesh", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new VertexColorMaterial();
      const mesh = new Mesh(geometry, material);
      mesh.position = new Vector3(0, 0, 0);

      const raycaster = new Raycaster(
        new Vector3(0, 0, 5),
        new Vector3(0, 0, 1)
      );

      const intersections = raycaster.intersectObject(mesh);

      expect(intersections.length).toBe(0);
    });

    it("should return empty array when mesh is invisible", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new VertexColorMaterial();
      const mesh = new Mesh(geometry, material);
      mesh.position = new Vector3(0, 0, 0);
      mesh.visible = false;

      const raycaster = new Raycaster(
        new Vector3(0, 0, 5),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObject(mesh);

      expect(intersections.length).toBe(0);
    });

    it("should respect near and far clipping planes", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new VertexColorMaterial();
      const mesh = new Mesh(geometry, material);
      mesh.position = new Vector3(0, 0, 0);

      // Set far plane too close to reach the mesh
      const raycaster = new Raycaster(
        new Vector3(0, 0, 5),
        new Vector3(0, 0, -1),
        0,
        2
      );

      const intersections = raycaster.intersectObject(mesh);

      expect(intersections.length).toBe(0);
    });

    it("should sort intersections by distance (closest first)", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new VertexColorMaterial();
      const mesh = new Mesh(geometry, material);
      mesh.position = new Vector3(0, 0, 0);

      const raycaster = new Raycaster(
        new Vector3(0, 0, 10),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObject(mesh);

      // Should have at least 2 intersections (entry and exit)
      if (intersections.length > 1) {
        for (let i = 0; i < intersections.length - 1; i++) {
          expect(intersections[i].distance).toBeLessThanOrEqual(
            intersections[i + 1].distance
          );
        }
      }
    });

    it("should test children when recursive is true", () => {
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new VertexColorMaterial();

      const parent = new Mesh(geometry, material);
      parent.position = new Vector3(0, 0, 0);

      const child = new Mesh(geometry, material);
      child.position = new Vector3(3, 0, 0);
      parent.add(child);

      const raycaster = new Raycaster(
        new Vector3(3, 0, 5),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObject(parent, true);

      // Should find intersection with child
      expect(intersections.length).toBeGreaterThan(0);
      expect(intersections.some((i) => i.object === child)).toBe(true);
    });

    it("should not test children when recursive is false", () => {
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new VertexColorMaterial();

      const parent = new Mesh(geometry, material);
      parent.position = new Vector3(10, 0, 0); // Parent is far away

      const child = new Mesh(geometry, material);
      child.position = new Vector3(-10, 0, 0); // Relative to parent
      parent.add(child);

      const raycaster = new Raycaster(
        new Vector3(0, 0, 5),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObject(parent, false);

      // Should only test parent, which is out of ray's path
      expect(intersections.length).toBe(0);
    });

    it("should include UV coordinates when geometry has UVs", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new VertexColorMaterial();
      const mesh = new Mesh(geometry, material);
      mesh.position = new Vector3(0, 0, 0);

      const raycaster = new Raycaster(
        new Vector3(0, 0, 5),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObject(mesh);

      expect(intersections.length).toBeGreaterThan(0);
      expect(intersections[0].uv).toBeDefined();
      expect(intersections[0].uv!.x).toBeGreaterThanOrEqual(0);
      expect(intersections[0].uv!.x).toBeLessThanOrEqual(1);
      expect(intersections[0].uv!.y).toBeGreaterThanOrEqual(0);
      expect(intersections[0].uv!.y).toBeLessThanOrEqual(1);
    });
  });

  describe("intersectObjects", () => {
    it("should find intersections with multiple meshes", () => {
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new VertexColorMaterial();

      const mesh1 = new Mesh(geometry, material);
      mesh1.position = new Vector3(0, 0, 0);

      const mesh2 = new Mesh(geometry, material);
      mesh2.position = new Vector3(0, 0, -5);

      const raycaster = new Raycaster(
        new Vector3(0, 0, 10),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObjects([mesh1, mesh2]);

      expect(intersections.length).toBeGreaterThan(0);
      // Should find both meshes
      const objects = intersections.map((i) => i.object);
      expect(objects).toContain(mesh1);
      expect(objects).toContain(mesh2);
    });

    it("should return empty array when ray misses all meshes", () => {
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new VertexColorMaterial();

      const mesh1 = new Mesh(geometry, material);
      mesh1.position = new Vector3(10, 0, 0);

      const mesh2 = new Mesh(geometry, material);
      mesh2.position = new Vector3(-10, 0, 0);

      const raycaster = new Raycaster(
        new Vector3(0, 0, 5),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObjects([mesh1, mesh2]);

      expect(intersections.length).toBe(0);
    });

    it("should sort all intersections by distance", () => {
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new VertexColorMaterial();

      const mesh1 = new Mesh(geometry, material);
      mesh1.position = new Vector3(0, 0, -10);

      const mesh2 = new Mesh(geometry, material);
      mesh2.position = new Vector3(0, 0, -5);

      const mesh3 = new Mesh(geometry, material);
      mesh3.position = new Vector3(0, 0, 0);

      const raycaster = new Raycaster(
        new Vector3(0, 0, 10),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObjects([mesh1, mesh2, mesh3]);

      // Verify sorted by distance (closest first)
      for (let i = 0; i < intersections.length - 1; i++) {
        expect(intersections[i].distance).toBeLessThanOrEqual(
          intersections[i + 1].distance
        );
      }
    });

    it("should handle empty array input", () => {
      const raycaster = new Raycaster(
        new Vector3(0, 0, 5),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObjects([]);

      expect(intersections.length).toBe(0);
    });

    it("should test children recursively when specified", () => {
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new VertexColorMaterial();

      const parent1 = new Mesh(geometry, material);
      parent1.position = new Vector3(10, 0, 0); // Out of ray path

      const child1 = new Mesh(geometry, material);
      child1.position = new Vector3(-10, 0, 0); // Brings it to (0, 0, 0) in world
      parent1.add(child1);

      const parent2 = new Mesh(geometry, material);
      parent2.position = new Vector3(0, 0, -5);

      const raycaster = new Raycaster(
        new Vector3(0, 0, 10),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObjects(
        [parent1, parent2],
        true
      );

      expect(intersections.length).toBeGreaterThan(0);
    });

    it("should filter out invisible meshes from results", () => {
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new VertexColorMaterial();

      const mesh1 = new Mesh(geometry, material);
      mesh1.position = new Vector3(0, 0, 0);
      mesh1.visible = true;

      const mesh2 = new Mesh(geometry, material);
      mesh2.position = new Vector3(0, 0, -2);
      mesh2.visible = false;

      const raycaster = new Raycaster(
        new Vector3(0, 0, 5),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObjects([mesh1, mesh2]);

      // Should only find visible mesh
      const objects = intersections.map((i) => i.object);
      expect(objects).toContain(mesh1);
      expect(objects).not.toContain(mesh2);
    });
  });

  describe("intersection result", () => {
    it("should provide correct intersection data", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new VertexColorMaterial();
      const mesh = new Mesh(geometry, material);
      mesh.position = new Vector3(0, 0, 0);

      const raycaster = new Raycaster(
        new Vector3(0, 0, 5),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObject(mesh);

      expect(intersections.length).toBeGreaterThan(0);

      const intersection = intersections[0];

      // Verify all required fields are present
      expect(intersection.distance).toBeDefined();
      expect(intersection.distance).toBeGreaterThan(0);

      expect(intersection.point).toBeDefined();
      expect(intersection.point instanceof Vector3).toBe(true);

      expect(intersection.object).toBe(mesh);

      expect(intersection.faceIndex).toBeDefined();
      expect(intersection.faceIndex).toBeGreaterThanOrEqual(0);

      expect(intersection.normal).toBeDefined();
      expect(intersection.normal instanceof Vector3).toBe(true);

      // Normal should be normalized
      const normalLength = Math.sqrt(
        intersection.normal.x ** 2 +
          intersection.normal.y ** 2 +
          intersection.normal.z ** 2
      );
      expect(normalLength).toBeCloseTo(1, 5);
    });

    it("should provide world-space coordinates", () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const material = new VertexColorMaterial();
      const mesh = new Mesh(geometry, material);
      mesh.position = new Vector3(5, 3, -2);

      const raycaster = new Raycaster(
        new Vector3(5, 3, 5),
        new Vector3(0, 0, -1)
      );

      const intersections = raycaster.intersectObject(mesh);

      expect(intersections.length).toBeGreaterThan(0);

      // Intersection point should be in world space
      const intersection = intersections[0];
      expect(intersection.point.x).toBeCloseTo(5, 1);
      expect(intersection.point.y).toBeCloseTo(3, 1);
      expect(intersection.point.z).toBeLessThan(5);
    });
  });
});
