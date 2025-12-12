export class SamplerCache {
  private _cacheByDevice: WeakMap<GPUDevice, Map<string, GPUSampler>> =
    new WeakMap();

  get(device: GPUDevice, descriptor: GPUSamplerDescriptor = {}): GPUSampler {
    let cache = this._cacheByDevice.get(device);
    if (!cache) {
      cache = new Map();
      this._cacheByDevice.set(device, cache);
    }

    const key = this._makeKey(descriptor);
    const existing = cache.get(key);
    if (existing) {
      return existing;
    }

    const sampler = device.createSampler(descriptor);
    cache.set(key, sampler);
    return sampler;
  }

  private _makeKey(descriptor: GPUSamplerDescriptor): string {
    const normalized = {
      addressModeU: descriptor.addressModeU ?? "clamp-to-edge",
      addressModeV: descriptor.addressModeV ?? "clamp-to-edge",
      addressModeW: descriptor.addressModeW ?? "clamp-to-edge",
      magFilter: descriptor.magFilter ?? "nearest",
      minFilter: descriptor.minFilter ?? "nearest",
      mipmapFilter: descriptor.mipmapFilter ?? "nearest",
      lodMinClamp: descriptor.lodMinClamp ?? 0,
      lodMaxClamp: descriptor.lodMaxClamp ?? 32,
      compare: descriptor.compare ?? null,
      maxAnisotropy: descriptor.maxAnisotropy ?? 1,
    };

    return JSON.stringify(normalized);
  }
}
