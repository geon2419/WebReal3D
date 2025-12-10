import {
  Engine,
  Renderer,
  PlaneGeometry,
  ParallaxMaterial,
  Mesh,
  Scene,
  PerspectiveCamera,
  PointLight,
  Texture,
} from "@web-real/core";
import { Color, Vector3 } from "@web-real/math";
import GUI from "lil-gui";

interface ParallaxParams {
  // Parallax material params
  depthScale: number;
  normalScale: number;
  shininess: number;
  // Light params
  lightPosZ: number;
  lightIntensity: number;
  lightColorR: number;
  lightColorG: number;
  lightColorB: number;
  // Mouse control
  mouseEnabled: boolean;
  mouseRange: number;
}

async function main() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;

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
    renderer.setClearColor([0.02, 0.02, 0.03]);

    // GUI parameters
    const params: ParallaxParams = {
      // Parallax material params
      depthScale: 0.05,
      normalScale: 1.0,
      shininess: 64,
      // Light params
      lightPosZ: 1.0,
      lightIntensity: 0.5,
      lightColorR: 1.0,
      lightColorG: 1.0,
      lightColorB: 1.0,
      // Mouse control
      mouseEnabled: true,
      mouseRange: 1.0,
    };

    const gui = new GUI({ title: "2.5D Parallax Controls" });

    const parallaxFolder = gui.addFolder("Parallax Effect");
    parallaxFolder
      .add(params, "depthScale", 0.01, 0.15, 0.005)
      .name("Depth Scale");
    parallaxFolder
      .add(params, "normalScale", 0.5, 2.0, 0.1)
      .name("Normal Scale");
    parallaxFolder.add(params, "shininess", 1, 128, 1).name("Shininess");

    const lightFolder = gui.addFolder("Light");
    lightFolder.add(params, "lightPosZ", 0.1, 2.0, 0.1).name("Distance");
    lightFolder.add(params, "lightIntensity", 0.1, 2.0, 0.1).name("Intensity");
    const lightColorFolder = lightFolder.addFolder("Color");
    lightColorFolder.add(params, "lightColorR", 0, 1, 0.01).name("Red");
    lightColorFolder.add(params, "lightColorG", 0, 1, 0.01).name("Green");
    lightColorFolder.add(params, "lightColorB", 0, 1, 0.01).name("Blue");

    const mouseFolder = gui.addFolder("Mouse Control");
    mouseFolder.add(params, "mouseEnabled").name("Enabled");
    mouseFolder.add(params, "mouseRange", 0.0, 2.0, 0.1).name("Range");

    const [albedoTexture, depthTexture, normalTexture] = await Promise.all([
      Texture.fromURL(engine.device, "/assets/monalisa.jpg"),
      Texture.fromURL(engine.device, "/assets/monalisa-depth-map.png"),
      Texture.fromURL(engine.device, "/assets/monalisa-normal-map.png"),
    ]);

    const scene = new Scene();

    const imageWidth = 560;
    const imageHeight = 1000;
    const aspectRatio = imageWidth / imageHeight;

    const planeHeight = 2.0;
    const planeWidth = planeHeight * aspectRatio;

    const planeGeometry = new PlaneGeometry({
      width: planeWidth,
      height: planeHeight,
      widthSegments: 1,
      heightSegments: 1,
      orientation: "XY",
    });

    const parallaxMaterial = new ParallaxMaterial({
      albedo: albedoTexture,
      depth: depthTexture,
      normal: normalTexture,
      depthScale: params.depthScale,
      normalScale: params.normalScale,
      shininess: params.shininess,
      generateNormalFromDepth: false, // Use provided normal map
    });

    const mesh = new Mesh(planeGeometry, parallaxMaterial);
    scene.add(mesh);

    const light = new PointLight(
      new Color(params.lightColorR, params.lightColorG, params.lightColorB),
      params.lightIntensity,
      20,
      "quadratic"
    );
    light.position.set(0, 0, params.lightPosZ);
    scene.add(light);

    const camera = new PerspectiveCamera({
      fov: 45,
      near: 0.1,
      far: 100,
    });
    camera.updateAspect(canvas);
    camera.position.set(0, 0, 3);
    camera.lookAt(new Vector3(0, 0, 0));

    let mouseX = 0;
    let mouseY = 0;

    canvas.addEventListener("mousemove", (event) => {
      if (!params.mouseEnabled) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      // Normalize mouse position to [-1, 1] range
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    });

    canvas.addEventListener("mouseleave", () => {
      mouseX = 0;
      mouseY = 0;
    });

    engine.run(() => {
      // Update light position based on mouse
      if (params.mouseEnabled) {
        light.position.set(
          mouseX * params.mouseRange,
          mouseY * params.mouseRange,
          params.lightPosZ
        );
      } else {
        light.position.set(0, 0, params.lightPosZ);
      }

      // Update light properties
      light.intensity = params.lightIntensity;
      light.color = new Color(
        params.lightColorR,
        params.lightColorG,
        params.lightColorB
      );

      renderer.render(scene, camera);
    });
  } catch (error) {
    console.error(error);
  }
}

main();
