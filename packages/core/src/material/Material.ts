import type { Texture } from "../texture";
import type { Camera } from "../camera/Camera";
import type { Scene } from "../scene/Scene";
import type { Mesh } from "../scene/Mesh";
import type { Light } from "../light/Light";

export interface VertexBufferLayout {
  arrayStride: number;
  attributes: {
    shaderLocation: number;
    offset: number;
    format: GPUVertexFormat;
  }[];
}

/**
 * Context information passed to materials during rendering.
 */
export interface RenderContext {
  camera: Camera;
  scene: Scene;
  mesh: Mesh;
  /** Lights collected from the scene (collected once per frame by Renderer) */
  lights: Light[];
}

export interface Material {
  readonly type: string;
  getVertexShader(): string;
  getFragmentShader(): string;
  getVertexBufferLayout(): VertexBufferLayout;
  getUniformBufferSize(): number;
  getPrimitiveTopology(): GPUPrimitiveTopology;
  /**
   * Optional method to write material-specific uniform data to the buffer.
   * @param buffer - DataView of the uniform buffer
   * @param offset - Byte offset to start writing (default varies by material, typically 64 after MVP matrix)
   * @param context - Optional rendering context with camera, scene, and mesh information
   */
  writeUniformData?(
    buffer: DataView,
    offset: number,
    context?: RenderContext
  ): void;
  /**
   * Optional method to get textures for multi-texture materials.
   * @param device - Optional GPUDevice for creating default/dummy textures
   * @returns Array of Texture objects to be bound to the shader
   */
  getTextures?(device?: GPUDevice): Texture[];
}
