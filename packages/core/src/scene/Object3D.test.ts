import { describe, it, expect } from "bun:test";
import { Object3D } from "./Object3D";
import { Vector3, Matrix4 } from "@web-real/math";

describe("Object3D", () => {
  describe("constructor", () => {
    it("should create an Object3D with default transformation values", () => {
      const obj = new Object3D();

      expect(obj.position.x).toBe(0);
      expect(obj.position.y).toBe(0);
      expect(obj.position.z).toBe(0);

      expect(obj.rotation.x).toBe(0);
      expect(obj.rotation.y).toBe(0);
      expect(obj.rotation.z).toBe(0);

      expect(obj.scale.x).toBe(1);
      expect(obj.scale.y).toBe(1);
      expect(obj.scale.z).toBe(1);
    });

    it("should have no parent by default", () => {
      const obj = new Object3D();
      expect(obj.parent).toBe(null);
    });

    it("should have an empty children array by default", () => {
      const obj = new Object3D();
      expect(obj.children).toEqual([]);
      expect(obj.children.length).toBe(0);
    });

    it("should be visible by default", () => {
      const obj = new Object3D();
      expect(obj.visible).toBe(true);
    });

    it("should have identity matrices by default", () => {
      const obj = new Object3D();
      const identity = new Matrix4();

      expect(obj.localMatrix.data).toEqual(identity.data);
      expect(obj.worldMatrix.data).toEqual(identity.data);
    });
  });

  describe("add", () => {
    it("should add a child to the children array", () => {
      const parent = new Object3D();
      const child = new Object3D();

      parent.add(child);

      expect(parent.children.length).toBe(1);
      expect(parent.children[0]).toBe(child);
    });

    it("should set the parent reference on the child", () => {
      const parent = new Object3D();
      const child = new Object3D();

      parent.add(child);

      expect(child.parent).toBe(parent);
    });

    it("should return the parent object for chaining", () => {
      const parent = new Object3D();
      const child = new Object3D();

      const result = parent.add(child);

      expect(result).toBe(parent);
    });

    it("should remove child from previous parent when adding to a new parent", () => {
      const parent1 = new Object3D();
      const parent2 = new Object3D();
      const child = new Object3D();

      parent1.add(child);
      parent2.add(child);

      expect(parent1.children.length).toBe(0);
      expect(parent2.children.length).toBe(1);
      expect(parent2.children[0]).toBe(child);
      expect(child.parent).toBe(parent2);
    });

    it("should handle adding multiple children", () => {
      const parent = new Object3D();
      const child1 = new Object3D();
      const child2 = new Object3D();
      const child3 = new Object3D();

      parent.add(child1).add(child2).add(child3);

      expect(parent.children.length).toBe(3);
      expect(parent.children[0]).toBe(child1);
      expect(parent.children[1]).toBe(child2);
      expect(parent.children[2]).toBe(child3);
    });
  });

  describe("remove", () => {
    it("should remove a child from the children array", () => {
      const parent = new Object3D();
      const child = new Object3D();

      parent.add(child);
      parent.remove(child);

      expect(parent.children.length).toBe(0);
    });

    it("should clear the parent reference on the removed child", () => {
      const parent = new Object3D();
      const child = new Object3D();

      parent.add(child);
      parent.remove(child);

      expect(child.parent).toBe(null);
    });

    it("should return the parent object for chaining", () => {
      const parent = new Object3D();
      const child = new Object3D();

      parent.add(child);
      const result = parent.remove(child);

      expect(result).toBe(parent);
    });

    it("should do nothing if the child is not in the children array", () => {
      const parent = new Object3D();
      const child = new Object3D();

      parent.remove(child);

      expect(parent.children.length).toBe(0);
    });

    it("should handle removing from the middle of children array", () => {
      const parent = new Object3D();
      const child1 = new Object3D();
      const child2 = new Object3D();
      const child3 = new Object3D();

      parent.add(child1).add(child2).add(child3);
      parent.remove(child2);

      expect(parent.children.length).toBe(2);
      expect(parent.children[0]).toBe(child1);
      expect(parent.children[1]).toBe(child3);
      expect(child2.parent).toBe(null);
    });
  });

  describe("updateMatrix", () => {
    it("should update local matrix from identity TRS", () => {
      const obj = new Object3D();
      obj.updateMatrix();

      const identity = new Matrix4();
      expect(obj.localMatrix.data).toEqual(identity.data);
    });

    it("should update local matrix with translation only", () => {
      const obj = new Object3D();
      obj.position.x = 5;
      obj.position.y = 10;
      obj.position.z = 15;
      obj.updateMatrix();

      const expected = Matrix4.translation(new Vector3(5, 10, 15));
      expect(obj.localMatrix.data).toEqual(expected.data);
    });

    it("should update local matrix with scale only", () => {
      const obj = new Object3D();
      obj.scale.x = 2;
      obj.scale.y = 3;
      obj.scale.z = 4;
      obj.updateMatrix();

      const expected = Matrix4.scaling(new Vector3(2, 3, 4));
      expect(obj.localMatrix.data).toEqual(expected.data);
    });

    it("should update local matrix with rotation only (X-axis)", () => {
      const obj = new Object3D();
      const angle = Math.PI / 4; // 45 degrees
      obj.rotation.x = angle;
      obj.updateMatrix();

      const expected = Matrix4.rotationX(angle);

      // Compare with floating-point tolerance
      for (let i = 0; i < 16; i++) {
        expect(obj.localMatrix.data[i]).toBeCloseTo(expected.data[i], 5);
      }
    });

    it("should update local matrix with rotation only (Y-axis)", () => {
      const obj = new Object3D();
      const angle = Math.PI / 3; // 60 degrees
      obj.rotation.y = angle;
      obj.updateMatrix();

      const expected = Matrix4.rotationY(angle);

      for (let i = 0; i < 16; i++) {
        expect(obj.localMatrix.data[i]).toBeCloseTo(expected.data[i], 5);
      }
    });

    it("should update local matrix with rotation only (Z-axis)", () => {
      const obj = new Object3D();
      const angle = Math.PI / 6; // 30 degrees
      obj.rotation.z = angle;
      obj.updateMatrix();

      const expected = Matrix4.rotationZ(angle);

      for (let i = 0; i < 16; i++) {
        expect(obj.localMatrix.data[i]).toBeCloseTo(expected.data[i], 5);
      }
    });

    it("should apply transformations in TRS order", () => {
      const obj = new Object3D();
      obj.position.x = 10;
      obj.rotation.y = Math.PI / 2;
      obj.scale.x = 2;
      obj.updateMatrix();

      // Expected: Translate * Rotate * Scale
      const scaleMatrix = Matrix4.scaling(new Vector3(2, 1, 1));
      const rotationMatrix = Matrix4.rotationY(Math.PI / 2);
      const translationMatrix = Matrix4.translation(new Vector3(10, 0, 0));
      const expected = translationMatrix
        .multiply(rotationMatrix)
        .multiply(scaleMatrix);

      for (let i = 0; i < 16; i++) {
        expect(obj.localMatrix.data[i]).toBeCloseTo(expected.data[i], 5);
      }
    });

    it("should apply rotation in ZYX order", () => {
      const obj = new Object3D();
      obj.rotation.x = Math.PI / 6;
      obj.rotation.y = Math.PI / 4;
      obj.rotation.z = Math.PI / 3;
      obj.updateMatrix();

      const rotX = Matrix4.rotationX(Math.PI / 6);
      const rotY = Matrix4.rotationY(Math.PI / 4);
      const rotZ = Matrix4.rotationZ(Math.PI / 3);
      const expected = rotZ.multiply(rotY).multiply(rotX);

      for (let i = 0; i < 16; i++) {
        expect(obj.localMatrix.data[i]).toBeCloseTo(expected.data[i], 5);
      }
    });
  });

  describe("updateWorldMatrix", () => {
    it("should set world matrix equal to local matrix when no parent", () => {
      const obj = new Object3D();
      obj.position.x = 5;
      obj.position.y = 10;
      obj.position.z = 15;
      obj.updateWorldMatrix();

      expect(obj.worldMatrix.data).toEqual(obj.localMatrix.data);
    });

    it("should combine parent and local matrices", () => {
      const parent = new Object3D();
      const child = new Object3D();

      parent.position.x = 10;
      child.position.x = 5;

      parent.add(child);
      parent.updateWorldMatrix();

      const expectedParentWorld = Matrix4.translation(new Vector3(10, 0, 0));
      const expectedChildLocal = Matrix4.translation(new Vector3(5, 0, 0));
      const expectedChildWorld =
        expectedParentWorld.multiply(expectedChildLocal);

      expect(parent.worldMatrix.data).toEqual(expectedParentWorld.data);

      for (let i = 0; i < 16; i++) {
        expect(child.worldMatrix.data[i]).toBeCloseTo(
          expectedChildWorld.data[i],
          5
        );
      }
    });

    it("should update children recursively by default", () => {
      const root = new Object3D();
      const child1 = new Object3D();
      const child2 = new Object3D();

      root.position.x = 10;
      child1.position.y = 5;
      child2.position.z = 3;

      root.add(child1);
      child1.add(child2);
      root.updateWorldMatrix();

      // Verify all matrices were updated
      expect(root.worldMatrix.data).not.toEqual(new Matrix4().data);
      expect(child1.worldMatrix.data).not.toEqual(new Matrix4().data);
      expect(child2.worldMatrix.data).not.toEqual(new Matrix4().data);
    });

    it("should not update children when updateChildren is false", () => {
      const parent = new Object3D();
      const child = new Object3D();

      parent.position.x = 10;
      child.position.x = 5;

      parent.add(child);
      parent.updateWorldMatrix(false, false);

      // Parent world matrix should be updated
      const expectedParentWorld = Matrix4.translation(new Vector3(10, 0, 0));
      expect(parent.worldMatrix.data).toEqual(expectedParentWorld.data);

      // Child world matrix should remain identity
      expect(child.worldMatrix.data).toEqual(new Matrix4().data);
    });

    it("should update parent chain when updateParents is true", () => {
      const grandparent = new Object3D();
      const parent = new Object3D();
      const child = new Object3D();

      grandparent.position.x = 10;
      parent.position.y = 5;
      child.position.z = 3;

      grandparent.add(parent);
      parent.add(child);

      // Update only the child with updateParents = true
      child.updateWorldMatrix(true, false);

      // All parent matrices should be updated
      expect(grandparent.worldMatrix.data).not.toEqual(new Matrix4().data);
      expect(parent.worldMatrix.data).not.toEqual(new Matrix4().data);
      expect(child.worldMatrix.data).not.toEqual(new Matrix4().data);
    });

    it("should handle complex hierarchy transformations", () => {
      const root = new Object3D();
      const child1 = new Object3D();
      const child2 = new Object3D();

      root.position.x = 10;
      root.scale.x = 2;
      child1.position.y = 5;
      child1.rotation.z = Math.PI / 2;
      child2.position.z = 3;

      root.add(child1);
      child1.add(child2);
      root.updateWorldMatrix();

      // Verify child2's world position accounts for all parent transformations
      // This is a complex transformation chain, just verify it's not identity
      expect(child2.worldMatrix.data).not.toEqual(new Matrix4().data);
    });
  });

  describe("traverse", () => {
    it("should call callback on the object itself", () => {
      const obj = new Object3D();
      const visited: Object3D[] = [];

      obj.traverse((o) => visited.push(o));

      expect(visited.length).toBe(1);
      expect(visited[0]).toBe(obj);
    });

    it("should call callback on direct children", () => {
      const parent = new Object3D();
      const child1 = new Object3D();
      const child2 = new Object3D();

      parent.add(child1).add(child2);

      const visited: Object3D[] = [];
      parent.traverse((o) => visited.push(o));

      expect(visited.length).toBe(3);
      expect(visited[0]).toBe(parent);
      expect(visited[1]).toBe(child1);
      expect(visited[2]).toBe(child2);
    });

    it("should traverse deeply nested hierarchies", () => {
      const root = new Object3D();
      const child1 = new Object3D();
      const child2 = new Object3D();
      const grandchild1 = new Object3D();
      const grandchild2 = new Object3D();

      root.add(child1).add(child2);
      child1.add(grandchild1);
      child2.add(grandchild2);

      const visited: Object3D[] = [];
      root.traverse((o) => visited.push(o));

      expect(visited.length).toBe(5);
      expect(visited[0]).toBe(root);
      expect(visited[1]).toBe(child1);
      expect(visited[2]).toBe(grandchild1);
      expect(visited[3]).toBe(child2);
      expect(visited[4]).toBe(grandchild2);
    });

    it("should allow modifying objects during traversal", () => {
      const root = new Object3D();
      const child1 = new Object3D();
      const child2 = new Object3D();

      root.add(child1).add(child2);

      root.traverse((o) => {
        o.visible = false;
      });

      expect(root.visible).toBe(false);
      expect(child1.visible).toBe(false);
      expect(child2.visible).toBe(false);
    });
  });

  describe("visibility", () => {
    it("should allow toggling visibility", () => {
      const obj = new Object3D();

      expect(obj.visible).toBe(true);

      obj.visible = false;
      expect(obj.visible).toBe(false);

      obj.visible = true;
      expect(obj.visible).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle zero scale", () => {
      const obj = new Object3D();
      obj.scale.x = 0;
      obj.scale.y = 0;
      obj.scale.z = 0;
      obj.updateMatrix();

      const expected = Matrix4.scaling(new Vector3(0, 0, 0));
      expect(obj.localMatrix.data).toEqual(expected.data);
    });

    it("should handle negative scale", () => {
      const obj = new Object3D();
      obj.scale.x = -1;
      obj.scale.y = -2;
      obj.scale.z = -3;
      obj.updateMatrix();

      const expected = Matrix4.scaling(new Vector3(-1, -2, -3));
      expect(obj.localMatrix.data).toEqual(expected.data);
    });

    it("should handle 2π rotation (full circle)", () => {
      const obj = new Object3D();
      obj.rotation.y = Math.PI * 2;
      obj.updateMatrix();

      // A full rotation should return to identity rotation
      const expected = Matrix4.rotationY(Math.PI * 2);

      for (let i = 0; i < 16; i++) {
        expect(obj.localMatrix.data[i]).toBeCloseTo(expected.data[i], 5);
      }
    });

    it("should handle very large position values", () => {
      const obj = new Object3D();
      obj.position.x = 1e10;
      obj.position.y = 1e10;
      obj.position.z = 1e10;
      obj.updateMatrix();

      const expected = Matrix4.translation(new Vector3(1e10, 1e10, 1e10));

      for (let i = 0; i < 16; i++) {
        expect(obj.localMatrix.data[i]).toBeCloseTo(expected.data[i], 1);
      }
    });

    it("should handle adding an object as its own child (should not infinite loop)", () => {
      const obj = new Object3D();

      // Adding object to itself should remove it from itself first
      obj.add(obj);

      // This shouldn't cause issues, object should be parent of itself
      expect(obj.parent).toBe(obj);
      expect(obj.children.length).toBe(1);
      expect(obj.children[0]).toBe(obj);
    });

    it("should handle circular parent-child relationships", () => {
      const obj1 = new Object3D();
      const obj2 = new Object3D();

      obj1.add(obj2);
      obj2.add(obj1);

      // When obj2.add(obj1) is called, obj1 is removed from obj2 first (since obj2 is obj1's child)
      // Then obj1 becomes parent of obj2, creating a circular reference
      expect(obj1.parent).toBe(obj2);
      expect(obj2.parent).toBe(obj1);
      expect(obj1.children[0]).toBe(obj2);
      expect(obj2.children[0]).toBe(obj1);
    });
  });
});
