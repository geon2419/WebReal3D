import type { Color } from "@web-real/math";

export class RenderTargets {
  private _device: GPUDevice;
  private _context: GPUCanvasContext;
  private _format: GPUTextureFormat;
  private _canvas: HTMLCanvasElement;
  private _sampleCount: number;

  private _depthTexture!: GPUTexture;
  private _msaaTexture!: GPUTexture;
  private _resizeObserver: ResizeObserver;

  constructor(options: {
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;
    canvas: HTMLCanvasElement;
    sampleCount: number;
  }) {
    this._device = options.device;
    this._context = options.context;
    this._format = options.format;
    this._canvas = options.canvas;
    this._sampleCount = options.sampleCount;

    this._createDepthTexture();
    this._createMSAATexture();

    this._resizeObserver = new ResizeObserver(() => {
      this._createDepthTexture();
      this._createMSAATexture();
    });

    this._resizeObserver.observe(this._canvas);
  }

  beginRenderPass(options: {
    commandEncoder: GPUCommandEncoder;
    clearColor: Color;
  }): { passEncoder: GPURenderPassEncoder } {
    const textureView = this._context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: this._msaaTexture.createView(),
          resolveTarget: textureView,
          clearValue: {
            r: options.clearColor.r,
            g: options.clearColor.g,
            b: options.clearColor.b,
            a: options.clearColor.a,
          },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: this._depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    };

    return {
      passEncoder: options.commandEncoder.beginRenderPass(renderPassDescriptor),
    };
  }

  dispose(): void {
    this._resizeObserver.disconnect();

    this._depthTexture?.destroy();
    this._msaaTexture?.destroy();
  }

  private _createDepthTexture(): void {
    this._depthTexture?.destroy();

    this._depthTexture = this._device.createTexture({
      size: [this._canvas.width, this._canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: this._sampleCount,
    });
  }

  private _createMSAATexture(): void {
    this._msaaTexture?.destroy();

    this._msaaTexture = this._device.createTexture({
      size: [this._canvas.width, this._canvas.height],
      format: this._format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: this._sampleCount,
    });
  }
}
