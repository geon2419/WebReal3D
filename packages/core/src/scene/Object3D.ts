import { Matrix4, Vector3 } from "@web-real/math";

export class Object3D {
  private _position: Vector3 = new Vector3(0, 0, 0);
  private _rotation: Vector3 = new Vector3(0, 0, 0);
  private _scale: Vector3 = new Vector3(1, 1, 1);
  public parent: Object3D | null = null;
  public readonly children: Object3D[] = [];
  /** Whether this object is visible and should be rendered */
  public visible: boolean = true;
  /** Local transformation matrix (TRS) */
  public readonly localMatrix: Matrix4 = new Matrix4();
  /** World transformation matrix (includes parent transforms) */
  public readonly worldMatrix: Matrix4 = new Matrix4();

  get position(): Vector3 {
    return this._position;
  }

  set position(value: Vector3) {
    this._position = value;
  }

  get rotation(): Vector3 {
    return this._rotation;
  }

  set rotation(value: Vector3) {
    this._rotation = value;
  }

  get scale(): Vector3 {
    return this._scale;
  }

  set scale(value: Vector3) {
    this._scale = value;
  }

  add(child: Object3D): this {
    if (child.parent !== null) {
      child.parent.remove(child);
    }
    child.parent = this;
    this.children.push(child);
    return this;
  }

  remove(child: Object3D): this {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      child.parent = null;
      this.children.splice(index, 1);
    }
    return this;
  }

  /**
   * Updates the local matrix from position, rotation, and scale.
   * Applies transformations in TRS order (Scale -> Rotate -> Translate).
   * Rotation is applied in ZYX order.
   */
  updateMatrix(): void {
    const scaleMatrix = Matrix4.scaling(this.scale);

    const rotX = Matrix4.rotationX(this.rotation.x);
    const rotY = Matrix4.rotationY(this.rotation.y);
    const rotZ = Matrix4.rotationZ(this.rotation.z);
    const rotationMatrix = rotZ.multiply(rotY).multiply(rotX);

    const translationMatrix = Matrix4.translation(this.position);

    const result = translationMatrix
      .multiply(rotationMatrix)
      .multiply(scaleMatrix);
    this.localMatrix.data.set(result.data);
  }

  /**
   * Updates the world matrix by combining parent's world matrix with local matrix.
   * Recursively updates all children.
   */
  updateWorldMatrix(updateParents = false, updateChildren = true): void {
    // Optionally update parent chain first
    if (updateParents && this.parent !== null) {
      this.parent.updateWorldMatrix(true, false);
    }

    this.updateMatrix();

    // Compute world matrix
    if (this.parent === null) {
      this.worldMatrix.data.set(this.localMatrix.data);
    } else {
      const result = this.parent.worldMatrix.multiply(this.localMatrix);
      this.worldMatrix.data.set(result.data);
    }

    if (updateChildren) {
      for (const child of this.children) {
        child.updateWorldMatrix(false, true);
      }
    }
  }

  traverse(callback: (object: Object3D) => void): void {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }
}
