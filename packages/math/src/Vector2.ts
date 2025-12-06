export class Vector2 {
  private _data: Float32Array;

  constructor(x = 0, y = 0) {
    this._data = new Float32Array([x, y]);
  }

  get x(): number {
    return this._data[0];
  }
  set x(value: number) {
    this._data[0] = value;
  }

  get y(): number {
    return this._data[1];
  }
  set y(value: number) {
    this._data[1] = value;
  }

  get data(): Float32Array {
    return this._data;
  }

  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  sub(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  scale(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  normalize(): Vector2 {
    const len = this.length;

    if (len === 0) {
      return new Vector2();
    }

    return this.scale(1 / len);
  }

  distanceTo(v: Vector2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  set(x: number, y: number): this {
    this._data[0] = x;
    this._data[1] = y;
    return this;
  }

  toString(): string {
    return `Vector2(${this.x}, ${this.y})`;
  }
}
