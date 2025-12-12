import type { Material } from "../material/Material";

export class PipelineCache {
  private _device: GPUDevice;
  private _format: GPUTextureFormat;
  private _sampleCount: number;
  private _pipelineCache: Map<string, GPURenderPipeline> = new Map();

  constructor(options: {
    device: GPUDevice;
    format: GPUTextureFormat;
    sampleCount: number;
  }) {
    this._device = options.device;
    this._format = options.format;
    this._sampleCount = options.sampleCount;
  }

  getOrCreate(material: Material): GPURenderPipeline {
    const topology = material.getPrimitiveTopology();
    const key = `${material.type}_${topology}`;

    const cached = this._pipelineCache.get(key);
    if (cached) return cached;

    const vertexShaderModule = this._device.createShaderModule({
      label: `${material.type} Vertex Shader`,
      code: material.getVertexShader(),
    });

    const fragmentShaderModule = this._device.createShaderModule({
      label: `${material.type} Fragment Shader`,
      code: material.getFragmentShader(),
    });

    const vertexBufferLayout = material.getVertexBufferLayout();

    const pipeline = this._device.createRenderPipeline({
      label: `${material.type} Pipeline`,
      layout: "auto",
      vertex: {
        module: vertexShaderModule,
        entryPoint: "main",
        buffers: [
          {
            arrayStride: vertexBufferLayout.arrayStride,
            attributes: vertexBufferLayout.attributes,
          },
        ],
      },
      fragment: {
        module: fragmentShaderModule,
        entryPoint: "main",
        targets: [{ format: this._format }],
      },
      primitive: {
        topology,
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
      },
      multisample: {
        count: this._sampleCount,
      },
    });

    this._pipelineCache.set(key, pipeline);
    return pipeline;
  }

  clear(): void {
    this._pipelineCache.clear();
  }
}
