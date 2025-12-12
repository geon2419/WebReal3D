struct Uniforms {
  mvpMatrix: mat4x4f,         // 64B offset 0
  modelMatrix: mat4x4f,       // 64B offset 64
  cameraPos: vec4f,           // 16B offset 128 (xyz = position, w unused)
  materialParams: vec4f,      // 16B offset 144 (x = depthScale, y = normalScale, z = useNormalMap, w = shininess)
  ambientLight: vec4f,        // 16B offset 160 (rgb = color, a = intensity)
  lightParams: vec4f,         // 16B offset 176 (x = lightCount, yzw = reserved)
  // lights[4]: each light is 3 vec4f (48 bytes) starting at offset 192
  light0Position: vec4f,      // 16B offset 192 (xyz = position/direction, w unused)
  light0Color: vec4f,         // 16B offset 208 (rgb = color, a = intensity)
  light0Params: vec4f,        // 16B offset 224 (x = type, y = range, z = attenType, w = attenParam)
  light1Position: vec4f,      // 16B offset 240
  light1Color: vec4f,         // 16B offset 256
  light1Params: vec4f,        // 16B offset 272
  light2Position: vec4f,      // 16B offset 288
  light2Color: vec4f,         // 16B offset 304
  light2Params: vec4f,        // 16B offset 320
  light3Position: vec4f,      // 16B offset 336
  light3Color: vec4f,         // 16B offset 352
  light3Params: vec4f,        // 16B offset 368 (total: 384B)
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var albedoTexture: texture_2d<f32>;
@group(0) @binding(3) var depthTexture: texture_2d<f32>;
@group(0) @binding(4) var normalTexture: texture_2d<f32>;

struct FragmentInput {
  @location(0) uv: vec2f,
  @location(1) worldPosition: vec3f,
  @location(2) worldNormal: vec3f,
  @location(3) worldTangent: vec3f,
  @location(4) worldBitangent: vec3f,
  @location(5) viewDir: vec3f,
}

const PARALLAX_FLAG_INVERT_HEIGHT: u32 = 1u;
const PARALLAX_FLAG_GENERATE_NORMAL_FROM_DEPTH: u32 = 2u;
const PARALLAX_FLAG_SELF_SHADOW: u32 = 4u;

fn getParallaxFlags() -> u32 {
  // Stored as float in uniforms.lightParams.w
  return u32(uniforms.lightParams.w);
}

fn getSelfShadowStrength() -> f32 {
  // Stored in uniforms.lightParams.y
  return clamp(uniforms.lightParams.y, 0.0, 1.0);
}

fn sampleHeight(uv: vec2f) -> f32 {
  let flags = getParallaxFlags();
  let d = textureSampleLevel(depthTexture, textureSampler, uv, 0.0).r;
  if ((flags & PARALLAX_FLAG_INVERT_HEIGHT) != 0u) {
    return 1.0 - d;
  }
  return d;
}

// Calculate light attenuation based on type
fn calculateAttenuation(distance: f32, range: f32, attenuationType: f32, attenParam: f32) -> f32 {
  if (range <= 0.0) {
    return 1.0;
  }
  let normalizedDist = distance / range;
  
  if (attenuationType < 0.5) {
    // Linear: 1 - d/range
    return max(1.0 - normalizedDist, 0.0);
  } else if (attenuationType < 1.5) {
    // Quadratic: (1 - d/range)^2
    let linear = max(1.0 - normalizedDist, 0.0);
    return linear * linear;
  } else {
    // Physical: 1 / (1 + (d/range)^2 * k)
    return 1.0 / (1.0 + normalizedDist * normalizedDist * attenParam);
  }
}

// Calculate Blinn-Phong lighting contribution from a single light
fn calculateBlinnPhongLight(
  lightPosition: vec4f,
  lightColor: vec4f,
  lightParams: vec4f,
  N: vec3f,
  V: vec3f,
  worldPos: vec3f,
  albedo: vec3f,
  shininess: f32
) -> vec3f {
  let lightType = lightParams.x;
  let lightRange = lightParams.y;
  let attenType = lightParams.z;
  let attenParam = lightParams.w;
  
  var L: vec3f;
  var attenuation: f32 = 1.0;
  
  if (lightType < 0.5) {
    // Directional light: use direction directly (negated for incoming light)
    L = normalize(-lightPosition.xyz);
  } else {
    // Point light: calculate direction and attenuation
    let lightVec = lightPosition.xyz - worldPos;
    let distance = length(lightVec);
    L = normalize(lightVec);
    attenuation = calculateAttenuation(distance, lightRange, attenType, attenParam);
  }
  
  // Diffuse
  let NdotL = max(dot(N, L), 0.0);
  let diffuse = NdotL * albedo * lightColor.rgb * lightColor.a;
  
  // Specular (Blinn-Phong)
  let H = normalize(L + V);
  let NdotH = max(dot(N, H), 0.0);
  let specular = pow(NdotH, shininess) * lightColor.rgb * lightColor.a;
  
  return (diffuse + specular) * attenuation;
}

// Steep Parallax Mapping with Parallax Occlusion
fn parallaxMapping(uv: vec2f, viewDir: vec3f, TBN: mat3x3f) -> vec2f {
  // Transform view direction to tangent space
  let viewDirTangent = normalize(transpose(TBN) * viewDir);
  
  // Number of layers for steep parallax
  let minLayers = 8.0;
  let maxLayers = 64.0;
  let viewZ = abs(dot(vec3f(0.0, 0.0, 1.0), viewDirTangent));
  let layersFromAngle = mix(maxLayers, minLayers, viewZ);
  
  // The amount to shift the texture coordinates per layer
  // Divide by z to stabilize the effect at grazing angles.
  // Additionally:
  // - Fade parallax at very grazing angles to avoid "tearing" artifacts.
  // - Clamp max offset to prevent UV displacement from exploding.
  let vzAbs = abs(viewDirTangent.z);
  let angleFade = smoothstep(0.12, 0.35, vzAbs);
  let vz = max(vzAbs, 0.08);
  let baseP = (viewDirTangent.xy / vz) * uniforms.materialParams.x;
  // Increase layer count when displacement is large (helps reduce stepping/tearing).
  let layersFromOffset = clamp(minLayers + length(baseP) * 24.0, minLayers, maxLayers);
  let numLayers = max(layersFromAngle, layersFromOffset);

  // Calculate the size of each layer
  let layerDepth = 1.0 / numLayers;
  var currentLayerDepth = 0.0;

  var P = baseP;
  let maxOffset = 0.08;
  let pLen = length(P);
  if (pLen > maxOffset) {
    P *= maxOffset / pLen;
  }
  P *= angleFade;
  let deltaTexCoords = P / numLayers;
  
  // Initial values
  var currentTexCoords = uv;
  var currentDepthMapValue = sampleHeight(currentTexCoords);
  
  // Steep parallax mapping loop
  for (var i = 0; i < 64; i = i + 1) {
    // Honor dynamic layer count while keeping a fixed max loop for WGSL.
    if (f32(i) >= numLayers) {
      break;
    }
    if (currentLayerDepth >= currentDepthMapValue) {
      break;
    }
    
    // Shift texture coordinates along direction of P
    currentTexCoords -= deltaTexCoords;
    // Get depth map value at current texture coordinates (use textureSampleLevel for non-uniform control flow)
    currentDepthMapValue = sampleHeight(currentTexCoords);
    // Get depth of next layer
    currentLayerDepth += layerDepth;
  }
  
  // Parallax occlusion mapping - interpolation between layers
  // Bracketed segment:
  // - `currentTexCoords` at `currentLayerDepth` (just passed the height)
  // - `prevTexCoords` at `prevLayerDepth` (just before passing the height)
  var prevTexCoords = currentTexCoords + deltaTexCoords;
  var prevLayerDepth = currentLayerDepth - layerDepth;

  // Binary search refinement (fixed small step count for quality)
  // This reduces swimming and improves silhouette detail at similar cost.
  let refineSteps = select(3, 4, numLayers > 28.0);
  var aUV = prevTexCoords;
  var bUV = currentTexCoords;
  var aDepth = prevLayerDepth;
  var bDepth = currentLayerDepth;

  for (var j = 0; j < 4; j = j + 1) {
    if (j >= refineSteps) {
      break;
    }

    let midUV = (aUV + bUV) * 0.5;
    let midDepth = (aDepth + bDepth) * 0.5;
    let heightMid = sampleHeight(midUV);

    // If we're still "above" the surface (ray depth < height), move deeper.
    if (midDepth < heightMid) {
      aUV = midUV;
      aDepth = midDepth;
    } else {
      bUV = midUV;
      bDepth = midDepth;
    }
  }

  // Final interpolation within refined bracket
  let heightA = sampleHeight(aUV);
  let heightB = sampleHeight(bUV);
  let afterDepth = heightB - bDepth;
  let beforeDepth = heightA - aDepth;

  // Robust interpolation (avoid NaNs when depths are equal)
  let denom = afterDepth - beforeDepth;
  let weightUnclamped = select(afterDepth / denom, 0.5, abs(denom) < 1e-5);
  let weight = clamp(weightUnclamped, 0.0, 1.0);
  let finalTexCoords = aUV * weight + bUV * (1.0 - weight);
  
  return finalTexCoords;
}

// Generate normal from depth map using Sobel filter
fn generateNormalFromDepth(uv: vec2f, texelSize: vec2f) -> vec3f {
  // Sample surrounding height values (match parallax mapping convention)
  let d00 = sampleHeight(uv + vec2f(-texelSize.x, -texelSize.y));
  let d10 = sampleHeight(uv + vec2f(0.0, -texelSize.y));
  let d20 = sampleHeight(uv + vec2f(texelSize.x, -texelSize.y));
  
  let d01 = sampleHeight(uv + vec2f(-texelSize.x, 0.0));
  let d21 = sampleHeight(uv + vec2f(texelSize.x, 0.0));
  
  let d02 = sampleHeight(uv + vec2f(-texelSize.x, texelSize.y));
  let d12 = sampleHeight(uv + vec2f(0.0, texelSize.y));
  let d22 = sampleHeight(uv + vec2f(texelSize.x, texelSize.y));
  
  // Sobel operator
  let dx = (d20 + 2.0 * d21 + d22) - (d00 + 2.0 * d01 + d02);
  let dy = (d02 + 2.0 * d12 + d22) - (d00 + 2.0 * d10 + d20);
  
  // Create normal (x, y components from gradients, z pointing up)
  // Include parallax depth scale to keep generated normals consistent with displacement magnitude.
  let slopeScale = uniforms.materialParams.x * uniforms.materialParams.y;
  return normalize(vec3f(-dx * slopeScale, -dy * slopeScale, 1.0));
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4f {
  // Re-orthonormalize TBN (interpolation can break orthogonality)
  let N = normalize(input.worldNormal);
  let T0 = normalize(input.worldTangent);
  let T = normalize(T0 - N * dot(N, T0));
  let B0 = normalize(input.worldBitangent);
  let handedness = select(-1.0, 1.0, dot(cross(N, T), B0) >= 0.0);
  let B = normalize(cross(N, T) * handedness);
  let TBN = mat3x3f(T, B, N);
  
  // Apply parallax mapping
  let parallaxUVRaw = parallaxMapping(input.uv, input.viewDir, TBN);

  // Edge handling: fade parallax near borders and clamp UV to avoid hard discard holes.
  let edge = min(min(input.uv.x, 1.0 - input.uv.x), min(input.uv.y, 1.0 - input.uv.y));
  let parallaxFade = smoothstep(0.0, 0.05, edge);
  let parallaxUV = mix(input.uv, clamp(parallaxUVRaw, vec2f(0.0), vec2f(1.0)), parallaxFade);

  // Use gradients for better mip selection after UV displacement.
  let uvDx = dpdx(parallaxUV);
  let uvDy = dpdy(parallaxUV);

  // Sample albedo texture with parallax-adjusted UV
  var albedo = textureSampleGrad(albedoTexture, textureSampler, parallaxUV, uvDx, uvDy).rgb;

  // Cheap inner shadow (self-occlusion): darken cavities using the height map.
  // Applied to albedo only so it mainly affects ambient + diffuse (not specular).
  let flags = getParallaxFlags();
  if ((flags & PARALLAX_FLAG_SELF_SHADOW) != 0u) {
    let strength = getSelfShadowStrength();
    // View direction in tangent space (grazing angles enhance occlusion)
    let Vt = normalize(transpose(TBN) * input.viewDir);
    let grazing = 1.0 - clamp(abs(Vt.z), 0.0, 1.0);
    let h = sampleHeight(parallaxUV);
    let cavity = clamp(1.0 - h, 0.0, 1.0);
    let occlusion = 1.0 - cavity * strength * (0.25 + 0.75 * grazing);
    albedo *= clamp(occlusion, 0.0, 1.0);
  }
  
  // Get normal from normal map or generate from depth
  var normalTangent: vec3f;
  if (u32(uniforms.materialParams.z) != 0u) {
    // Sample normal map and convert from [0,1] to [-1,1]
    let normalMapSample = textureSampleGrad(normalTexture, textureSampler, parallaxUV, uvDx, uvDy).rgb;
    normalTangent = normalize(normalMapSample * 2.0 - 1.0);
    normalTangent = normalize(vec3f(
      normalTangent.x * uniforms.materialParams.y,
      normalTangent.y * uniforms.materialParams.y,
      normalTangent.z
    ));
  } else {
    let flags = getParallaxFlags();
    if ((flags & PARALLAX_FLAG_GENERATE_NORMAL_FROM_DEPTH) != 0u) {
      // Generate normal from depth map
      let dims = vec2f(textureDimensions(depthTexture, 0));
      let texelSize = 1.0 / max(dims, vec2f(1.0));
      normalTangent = generateNormalFromDepth(parallaxUV, texelSize);
    } else {
      // Flat tangent-space normal
      normalTangent = vec3f(0.0, 0.0, 1.0);
    }
  }
  
  // Transform normal from tangent space to world space
  let normal = normalize(TBN * normalTangent);
  
  // View direction
  let viewDir = normalize(input.viewDir);
  let shininess = uniforms.materialParams.w;
  
  // Ambient lighting from uniform
  let ambient = albedo * uniforms.ambientLight.rgb * uniforms.ambientLight.a;
  
  // Accumulate light contributions
  var Lo = vec3f(0.0);
  let lightCount = i32(uniforms.lightParams.x);
  
  // Light 0
  if (lightCount > 0) {
    Lo += calculateBlinnPhongLight(
      uniforms.light0Position,
      uniforms.light0Color,
      uniforms.light0Params,
      normal, viewDir, input.worldPosition, albedo, shininess
    );
  }
  
  // Light 1
  if (lightCount > 1) {
    Lo += calculateBlinnPhongLight(
      uniforms.light1Position,
      uniforms.light1Color,
      uniforms.light1Params,
      normal, viewDir, input.worldPosition, albedo, shininess
    );
  }
  
  // Light 2
  if (lightCount > 2) {
    Lo += calculateBlinnPhongLight(
      uniforms.light2Position,
      uniforms.light2Color,
      uniforms.light2Params,
      normal, viewDir, input.worldPosition, albedo, shininess
    );
  }
  
  // Light 3
  if (lightCount > 3) {
    Lo += calculateBlinnPhongLight(
      uniforms.light3Position,
      uniforms.light3Color,
      uniforms.light3Params,
      normal, viewDir, input.worldPosition, albedo, shininess
    );
  }
  
  // Combine ambient and direct lighting
  let finalColor = ambient + Lo;
  
  return vec4f(finalColor, 1.0);
}
