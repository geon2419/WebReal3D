import { SamplerCache } from "../texture/SamplerCache";

export class FallbackResources {
  private _device: GPUDevice;
  private _dummyCubeTexture?: GPUTexture;
  private _dummyBrdfLUT?: GPUTexture;
  private _samplerCache: SamplerCache = new SamplerCache();

  constructor(device: GPUDevice) {
    this._device = device;
  }

  getDummyCubeTexture(): GPUTexture {
    if (!this._dummyCubeTexture) {
      this._dummyCubeTexture = this._device.createTexture({
        label: "Dummy IBL Cube Texture",
        size: [1, 1, 6],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING,
        dimension: "2d",
      });
    }

    return this._dummyCubeTexture;
  }

  getDummyBrdfLUT(): GPUTexture {
    if (!this._dummyBrdfLUT) {
      this._dummyBrdfLUT = this._device.createTexture({
        label: "Dummy BRDF LUT",
        size: [1, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING,
        dimension: "2d",
      });
    }

    return this._dummyBrdfLUT;
  }

  getLinearSampler(): GPUSampler {
    return this._samplerCache.get(this._device, {
      magFilter: "linear",
      minFilter: "linear",
    });
  }

  dispose(): void {
    this._dummyCubeTexture?.destroy();
    this._dummyCubeTexture = undefined;

    this._dummyBrdfLUT?.destroy();
    this._dummyBrdfLUT = undefined;
  }
}
