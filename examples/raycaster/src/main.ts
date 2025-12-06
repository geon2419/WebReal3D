import {
  Engine,
  Renderer,
  BoxGeometry,
  BlinnPhongMaterial,
  Mesh,
  Scene,
  PerspectiveCamera,
  DirectionalLight,
  Raycaster,
} from "@web-real/core";
import { Color, Vector2, Vector3 } from "@web-real/math";

async function main() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const hoveredInfo = document.getElementById("hovered") as HTMLDivElement;
  const logContent = document.getElementById("log-content") as HTMLDivElement;

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

  function addLogEntry(cubeIndex: number, intersection: any) {
    const timestamp = new Date().toLocaleTimeString();

    logContent.innerHTML = `
      <div class="log-entry">
        <div class="log-title">🎯 Cube ${cubeIndex + 1} - ${timestamp}</div>
        <div class="log-line"><span class="log-label">Distance:</span> <span class="log-value">${intersection.distance.toFixed(
          3
        )}</span></div>
        <div class="log-line"><span class="log-label">Point:</span> <span class="log-value">(${intersection.point.x.toFixed(
          2
        )}, ${intersection.point.y.toFixed(2)}, ${intersection.point.z.toFixed(
      2
    )})</span></div>
        <div class="log-line"><span class="log-label">Normal:</span> <span class="log-value">(${intersection.normal.x.toFixed(
          2
        )}, ${intersection.normal.y.toFixed(
      2
    )}, ${intersection.normal.z.toFixed(2)})</span></div>
        <div class="log-line"><span class="log-label">Face:</span> <span class="log-value">#${
          intersection.faceIndex
        }</span></div>
        ${
          intersection.uv
            ? `<div class="log-line"><span class="log-label">UV:</span> <span class="log-value">(${intersection.uv.x.toFixed(
                3
              )}, ${intersection.uv.y.toFixed(3)})</span></div>`
            : '<div class="log-line"><span class="log-label">UV:</span> <span class="log-value">undefined</span></div>'
        }
      </div>
    `;
  }

  try {
    const engine = await Engine.create({ canvas });
    const renderer = new Renderer(engine);
    renderer.setClearColor([0.1, 0.1, 0.1]);

    const scene = new Scene();

    const camera = new PerspectiveCamera({
      fov: 60,
      aspect: canvas.width / canvas.height,
      near: 0.1,
      far: 100,
    });
    camera.position.set(0, 2, 5);
    camera.lookAt(new Vector3(0, 0, 0));

    const light = new DirectionalLight(
      new Vector3(1, -1, 0.5),
      new Color(1, 1, 1),
      1.0
    );
    scene.add(light);

    const cubes: Mesh[] = [];
    const cubeColors = [
      new Color(1, 0.3, 0.3), // Red
      new Color(0.3, 1, 0.3), // Green
      new Color(0.3, 0.3, 1), // Blue
      new Color(1, 1, 0.3), // Yellow
      new Color(1, 0.3, 1), // Magenta
    ];

    const positions = [
      new Vector3(-4, 0, 0),
      new Vector3(-2, 0, 0),
      new Vector3(0, 0, 0),
      new Vector3(2, 0, 0),
      new Vector3(4, 0, 0),
    ];

    for (let i = 0; i < 5; i++) {
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new BlinnPhongMaterial({
        color: cubeColors[i],
        shininess: 32,
      });
      const mesh = new Mesh(geometry, material);
      mesh.position.set(positions[i].x, positions[i].y, positions[i].z);
      cubes.push(mesh);
      scene.add(mesh);
    }

    // Create raycaster
    const raycaster = new Raycaster();
    const mouse = new Vector2();

    let currentHovered: Mesh | null = null;
    const originalColors = new Map<Mesh, Color>();

    cubes.forEach((cube) => {
      const material = cube.material as BlinnPhongMaterial;
      originalColors.set(cube, material.color.clone());
    });

    canvas.addEventListener("mousemove", (event) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersections = raycaster.intersectObjects(cubes);

      if (currentHovered) {
        const material = currentHovered.material as BlinnPhongMaterial;
        const originalColor = originalColors.get(currentHovered);
        if (originalColor) {
          (material.color as any).set(
            originalColor.r,
            originalColor.g,
            originalColor.b
          );
        }
        currentHovered = null;
      }

      if (intersections.length > 0) {
        const intersection = intersections[0];
        currentHovered = intersection.object;

        const material = currentHovered.material as BlinnPhongMaterial;
        const originalColor = originalColors.get(currentHovered);
        if (originalColor) {
          (material.color as any).set(
            Math.min(originalColor.r * 1.5, 1),
            Math.min(originalColor.g * 1.5, 1),
            Math.min(originalColor.b * 1.5, 1)
          );
        }

        const cubeIndex = cubes.indexOf(currentHovered);
        hoveredInfo.innerHTML = `Hovered: <span class="highlight">Cube ${
          cubeIndex + 1
        }</span>`;
      } else {
        hoveredInfo.innerHTML = `Hovered: <span class="highlight">None</span>`;
      }
    });

    canvas.addEventListener("click", () => {
      raycaster.setFromCamera(mouse, camera);
      const intersections = raycaster.intersectObjects(cubes);

      if (intersections.length > 0) {
        const intersection = intersections[0];
        const cubeIndex = cubes.indexOf(intersection.object);
        addLogEntry(cubeIndex, intersection);
      }
    });

    let lastTime = 0;
    function animate(time: number) {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      cubes.forEach((cube, index) => {
        const newRotation = cube.rotation.add(
          new Vector3(deltaTime * 0.5, deltaTime * (0.3 + index * 0.1), 0)
        );
        cube.rotation.set(newRotation.x, newRotation.y, newRotation.z);
      });

      scene.updateWorldMatrix(true, true);

      renderer.render(scene, camera);

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
      camera.aspect = canvas.width / canvas.height;
    });
    resizeObserver.observe(canvas);
  } catch (error) {
    console.error(error);
  }
}

main();
