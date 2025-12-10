import {
  Engine,
  Renderer,
  SphereGeometry,
  BasicMaterial,
  Mesh,
  Scene,
  PerspectiveCamera,
  OrbitCameraController,
  Texture,
} from "@web-real/core";
import { Vector3, Color } from "@web-real/math";
import GUI from "lil-gui";

interface EnvironmentMapParams {
  // Skybox
  skyboxExposure: number;
  skyboxRoughness: number;
}

async function main() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;

  // Handle high DPI displays
  function updateCanvasSize() {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    const width = Math.floor(displayWidth * dpr);
    const height = Math.floor(displayHeight * dpr);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  updateCanvasSize();
  window.addEventListener("resize", updateCanvasSize);

  try {
    const engine = await Engine.create({ canvas });
    const renderer = new Renderer(engine);
    renderer.setClearColor([0.0, 0.0, 0.0]);

    const params: EnvironmentMapParams = {
      // Skybox
      skyboxExposure: 1.0,
      skyboxRoughness: 0.0,
    };

    // Load panorama texture
    const panoramaTexture = await Texture.fromURL(
      engine.device,
      "/assets/apple-store-environment-map.png"
    );

    // Create scene
    const scene = new Scene();

    // Set environment from equirectangular panorama (skybox only, no IBL)
    scene.setEnvironmentFromEquirectangular(panoramaTexture, {
      skyboxExposure: params.skyboxExposure,
      skyboxRoughness: params.skyboxRoughness,
    });

    // Create reflective sphere
    const sphereGeometry = new SphereGeometry({
      radius: 1.0,
      widthSegments: 64,
      heightSegments: 32,
    });

    const material = new BasicMaterial({
      color: new Color(0.8, 0.8, 0.8),
    });

    const sphere = new Mesh(sphereGeometry, material);
    scene.add(sphere);

    // Camera setup
    const camera = new PerspectiveCamera({
      fov: 60,
      near: 0.1,
      far: 100,
    });
    camera.updateAspect(canvas);
    camera.position.set(0, 0, 3);
    camera.lookAt(new Vector3(0, 0, 0));

    // Orbit camera controller
    const controller = new OrbitCameraController(camera, canvas, {
      radius: 3,
      minRadius: 1.5,
      maxRadius: 10,
    });

    // GUI setup
    const gui = new GUI({ title: "Environment Map Controls" });

    // Skybox folder
    const skyboxFolder = gui.addFolder("Skybox");
    skyboxFolder
      .add(params, "skyboxExposure", 0.1, 3.0, 0.1)
      .name("Exposure")
      .onChange((value: number) => {
        scene.skyboxExposure = value;
      });
    skyboxFolder
      .add(params, "skyboxRoughness", 0.0, 1.0, 0.01)
      .name("Roughness")
      .onChange((value: number) => {
        scene.skyboxRoughness = value;
      });

    // Render loop
    engine.run(() => {
      controller.update();
      renderer.render(scene, camera);
    });
  } catch (error) {
    console.error("Failed to initialize WebGPU:", error);

    const errorMessage = document.createElement("div");
    errorMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid rgba(255, 0, 0, 0.3);
      padding: 20px;
      border-radius: 8px;
      color: #ff6666;
      text-align: center;
      font-family: system-ui, sans-serif;
    `;
    errorMessage.innerHTML = `
      <h2>WebGPU Not Available</h2>
      <p>Your browser does not support WebGPU.</p>
      <p>Please use Chrome 113+ or Edge 113+</p>
    `;
    document.body.appendChild(errorMessage);
  }
}

main();
