import type { Camera } from "../camera/Camera";
import type { RenderContext } from "../material/Material";
import { SkyboxMaterial } from "../material/SkyboxMaterial";
import { FallbackResources } from "./FallbackResources";

interface SkyboxGPUResources {
  pipeline: GPURenderPipeline;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  material: SkyboxMaterial;
  bindingRevision: number;
}

export class SkyboxPass {
  private _device: GPUDevice;
  private _format: GPUTextureFormat;
  private _sampleCount: number;
  private _fallback: FallbackResources;

  private _resources?: SkyboxGPUResources;

  constructor(options: {
    device: GPUDevice;
    format: GPUTextureFormat;
    sampleCount: number;
    fallback: FallbackResources;
  }) {
    this._device = options.device;
    this._format = options.format;
    this._sampleCount = options.sampleCount;
    this._fallback = options.fallback;
  }

  render(
    passEncoder: GPURenderPassEncoder,
    material: SkyboxMaterial,
    camera: Camera
  ): void {
    const resources = this._getOrCreateResources(material);

    const uniformData = new ArrayBuffer(material.getUniformBufferSize());
    const dataView = new DataView(uniformData);

    const renderContext: RenderContext = {
      camera,
      lights: [],
    };

    material.writeUniformData(dataView, 0, renderContext);
    this._device.queue.writeBuffer(resources.uniformBuffer, 0, uniformData);

    passEncoder.setPipeline(resources.pipeline);
    passEncoder.setBindGroup(0, resources.bindGroup);
    passEncoder.draw(3);
  }

  dispose(): void {
    if (this._resources) {
      this._resources.uniformBuffer.destroy();
      this._resources = undefined;
    }
  }

  private _getOrCreateResources(material: SkyboxMaterial): SkyboxGPUResources {
    if (this._resources && this._resources.material !== material) {
      this._resources.uniformBuffer.destroy();
      this._resources = undefined;
    }

    if (
      this._resources &&
      this._resources.material === material &&
      this._resources.bindingRevision !== material.bindingRevision
    ) {
      const textures = material.getTextures(this._device);
      const cubeTexture = material.getCubeTexture();

      const bindGroupEntries: GPUBindGroupEntry[] = [
        {
          binding: 0,
          resource: { buffer: this._resources.uniformBuffer },
        },
        { binding: 1, resource: textures[0].gpuSampler },
        { binding: 2, resource: textures[0].gpuTexture.createView() },
      ];

      if (cubeTexture) {
        bindGroupEntries.push({ binding: 3, resource: cubeTexture.cubeView });
      } else {
        bindGroupEntries.push({
          binding: 3,
          resource: this._fallback
            .getDummyCubeTexture()
            .createView({ dimension: "cube" }),
        });
      }

      this._resources.bindGroup = this._device.createBindGroup({
        label: "Skybox Bind Group",
        layout: this._resources.pipeline.getBindGroupLayout(0),
        entries: bindGroupEntries,
      });
      this._resources.bindingRevision = material.bindingRevision;

      return this._resources;
    }

    if (!this._resources) {
      const vertexShaderModule = this._device.createShaderModule({
        label: "Skybox Vertex Shader",
        code: material.getVertexShader(),
      });

      const fragmentShaderModule = this._device.createShaderModule({
        label: "Skybox Fragment Shader",
        code: material.getFragmentShader(),
      });

      const pipeline = this._device.createRenderPipeline({
        label: "Skybox Pipeline",
        layout: "auto",
        vertex: {
          module: vertexShaderModule,
          entryPoint: "main",
        },
        fragment: {
          module: fragmentShaderModule,
          entryPoint: "main",
          targets: [{ format: this._format }],
        },
        primitive: {
          topology: "triangle-list",
          cullMode: "none",
        },
        depthStencil: {
          depthWriteEnabled: false,
          depthCompare: "less-equal",
          format: "depth24plus",
        },
        multisample: {
          count: this._sampleCount,
        },
      });

      const uniformBuffer = this._device.createBuffer({
        label: "Skybox Uniform Buffer",
        size: material.getUniformBufferSize(),
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const textures = material.getTextures(this._device);
      const cubeTexture = material.getCubeTexture();

      const bindGroupEntries: GPUBindGroupEntry[] = [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: textures[0].gpuSampler },
        { binding: 2, resource: textures[0].gpuTexture.createView() },
      ];

      if (cubeTexture) {
        bindGroupEntries.push({ binding: 3, resource: cubeTexture.cubeView });
      } else {
        bindGroupEntries.push({
          binding: 3,
          resource: this._fallback
            .getDummyCubeTexture()
            .createView({ dimension: "cube" }),
        });
      }

      const bindGroup = this._device.createBindGroup({
        label: "Skybox Bind Group",
        layout: pipeline.getBindGroupLayout(0),
        entries: bindGroupEntries,
      });

      this._resources = {
        pipeline,
        uniformBuffer,
        bindGroup,
        material,
        bindingRevision: material.bindingRevision,
      };
    }

    return this._resources;
  }
}
