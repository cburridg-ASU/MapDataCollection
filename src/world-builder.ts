import {
  BoxGeometry,
  BufferAttribute,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  Fog,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { proceduralSeed } from "./seed";

export type BiomeId =
  | "temperate"
  | "tundra"
  | "desert"
  | "swamp"
  | "arcane"
  | "fel";

export interface WorldSettings {
  editionId: string;
  mapId: string;
  name: string;
  category: string;
  edition: string;
  seed: string;
  scale: number;
  relief: number;
  biome: BiomeId;
  vegetation: boolean;
  ruins: boolean;
}

interface BiomePalette {
  sky: string;
  fog: string;
  water: string;
  vegetation: string;
  stone: string;
  bands: [number, string][];
}

const palettes: Record<BiomeId, BiomePalette> = {
  temperate: {
    sky: "#18211f",
    fog: "#18211f",
    water: "#385d5b",
    vegetation: "#587455",
    stone: "#7d7768",
    bands: [
      [0.08, "#445f53"],
      [0.38, "#708269"],
      [0.7, "#98977b"],
      [0.88, "#b8b39a"],
      [1, "#e0d9c4"],
    ],
  },
  tundra: {
    sky: "#182128",
    fog: "#182128",
    water: "#416b7b",
    vegetation: "#617b78",
    stone: "#8c9a9b",
    bands: [
      [0.08, "#40595b"],
      [0.35, "#718a89"],
      [0.68, "#a4b8b5"],
      [0.88, "#d0d5cf"],
      [1, "#f0eee7"],
    ],
  },
  desert: {
    sky: "#282018",
    fog: "#282018",
    water: "#527a78",
    vegetation: "#71804d",
    stone: "#987b5a",
    bands: [
      [0.08, "#76634a"],
      [0.34, "#a2835a"],
      [0.68, "#c2a16b"],
      [0.88, "#d6bb87"],
      [1, "#e8d8ae"],
    ],
  },
  swamp: {
    sky: "#1c2119",
    fog: "#1c2119",
    water: "#465a45",
    vegetation: "#557346",
    stone: "#797965",
    bands: [
      [0.08, "#425647"],
      [0.36, "#687554"],
      [0.68, "#87906b"],
      [0.88, "#a6a47e"],
      [1, "#c6bea0"],
    ],
  },
  arcane: {
    sky: "#1d1b2c",
    fog: "#1d1b2c",
    water: "#4c568b",
    vegetation: "#627b84",
    stone: "#8881a7",
    bands: [
      [0.08, "#454f68"],
      [0.36, "#677586"],
      [0.68, "#8589a8"],
      [0.88, "#b3a5bd"],
      [1, "#ddd0df"],
    ],
  },
  fel: {
    sky: "#211a20",
    fog: "#211a20",
    water: "#55533f",
    vegetation: "#748144",
    stone: "#8b735e",
    bands: [
      [0.08, "#4c5944"],
      [0.36, "#74794b"],
      [0.68, "#a08554"],
      [0.88, "#b49a72"],
      [1, "#d4c397"],
    ],
  },
};

function randomGenerator(seed: number): () => number {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function latticeValue(x: number, z: number, seed: number): number {
  let value = Math.imul(x, 374761393) + Math.imul(z, 668265263) + seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smoothNoise(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const top =
    latticeValue(x0, z0, seed) * (1 - sx) +
    latticeValue(x0 + 1, z0, seed) * sx;
  const bottom =
    latticeValue(x0, z0 + 1, seed) * (1 - sx) +
    latticeValue(x0 + 1, z0 + 1, seed) * sx;
  return top * (1 - sz) + bottom * sz;
}

function terrainHeight(
  x: number,
  z: number,
  seed: number,
  relief: number,
): number {
  const broad = smoothNoise(x * 3.2, z * 3.2, seed);
  const middle = smoothNoise(x * 7.5, z * 7.5, seed + 17);
  const detail = smoothNoise(x * 17, z * 17, seed + 41);
  const ridges = smoothNoise(x * 2.1 + 9, z * 2.1 + 9, seed + 83);
  const peak = Math.pow(Math.max(0, ridges - 0.57) * 2.3, 2);
  return ((broad - 0.48) * 0.95 + (middle - 0.5) * 0.36 + (detail - 0.5) * 0.13 + peak * 0.42) * relief;
}

function terrainColor(height: number, relief: number, bands: [number, string][]): Color {
  const elevation = Math.min(1, Math.max(0, height / (relief * 0.82) + 0.52));
  for (let index = 1; index < bands.length; index += 1) {
    const [upper, upperColor] = bands[index]!;
    const [lower, lowerColor] = bands[index - 1]!;
    if (elevation <= upper) {
      return new Color(lowerColor).lerp(
        new Color(upperColor),
        (elevation - lower) / (upper - lower),
      );
    }
  }
  return new Color(bands[bands.length - 1]![1]);
}

function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function addInstances(
  geometry: BufferGeometry,
  material: MeshStandardMaterial,
  placements: { position: Vector3; scale: Vector3; rotation: number }[],
  parent: Object3D,
): void {
  if (placements.length === 0) return;
  const mesh = new InstancedMesh(geometry, material, placements.length);
  const transform = new Object3D();
  placements.forEach((placement, index) => {
    transform.position.copy(placement.position);
    transform.rotation.set(0, placement.rotation, 0);
    transform.scale.copy(placement.scale);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

export class WorldBuilder {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(38, 1, 0.1, 3000);
  private readonly keyLight = new DirectionalLight("#fff0d3", 2.1);
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private world = new Object3D();
  private activeSettings: WorldSettings | null = null;
  private wireframe = false;
  private readonly baseMaterials: MeshStandardMaterial[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.scene.add(new HemisphereLight("#c9d6cb", "#30332b", 2.3));
    this.keyLight.position.set(-110, 180, 95);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.keyLight);

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.setClearColor("#18211f");

    this.camera.position.set(195, 190, 225);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 36;
    this.controls.maxDistance = 950;
    this.controls.target.set(0, 0, 0);

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }

  build(settings: WorldSettings): void {
    const palette = palettes[settings.biome];
    if (this.scene.children.includes(this.world)) {
      this.scene.remove(this.world);
      disposeObject(this.world);
    }
    this.baseMaterials.forEach((material) => material.dispose());
    this.baseMaterials.length = 0;
    this.world = new Object3D();
    this.world.name = "Generated Environment";
    this.activeSettings = { ...settings };
    const seed = proceduralSeed(
      settings.seed,
      settings.editionId,
      settings.mapId,
    );
    const random = randomGenerator(seed);
    const size = settings.scale;
    const relief = settings.relief * 0.48;
    const shadowBounds = size * 0.72;
    this.keyLight.shadow.camera.left = -shadowBounds;
    this.keyLight.shadow.camera.right = shadowBounds;
    this.keyLight.shadow.camera.top = shadowBounds;
    this.keyLight.shadow.camera.bottom = -shadowBounds;
    this.keyLight.shadow.camera.updateProjectionMatrix();
    const segments = 144;
    const geometry = new PlaneGeometry(size, size, segments, segments);
    const positions = geometry.getAttribute("position");
    const colors: number[] = [];

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index) / size;
      const z = positions.getY(index) / size;
      const height = terrainHeight(x + 0.5, z + 0.5, seed, relief);
      positions.setZ(index, height);
      const color = terrainColor(height, relief, palette.bands);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();

    const terrainMaterial = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      wireframe: this.wireframe,
    });
    this.baseMaterials.push(terrainMaterial);
    const terrain = new Mesh(geometry, terrainMaterial);
    terrain.name = "Procedural Terrain";
    terrain.receiveShadow = true;
    this.world.add(terrain);

    const waterMaterial = new MeshStandardMaterial({
      color: palette.water,
      roughness: 0.27,
      metalness: 0.08,
      transparent: true,
      opacity: 0.84,
      wireframe: this.wireframe,
    });
    this.baseMaterials.push(waterMaterial);
    const water = new Mesh(new PlaneGeometry(size, size), waterMaterial);
    water.name = "Water Plane";
    water.rotation.x = -Math.PI / 2;
    water.position.y = -2.2;
    this.world.add(water);

    const trunkMaterial = new MeshStandardMaterial({
      color: settings.biome === "desert" ? "#80704d" : "#514437",
      roughness: 1,
      wireframe: this.wireframe,
    });
    const foliageMaterial = new MeshStandardMaterial({
      color: palette.vegetation,
      roughness: 0.9,
      wireframe: this.wireframe,
    });
    const stoneMaterial = new MeshStandardMaterial({
      color: palette.stone,
      roughness: 1,
      wireframe: this.wireframe,
    });
    this.baseMaterials.push(trunkMaterial, foliageMaterial, stoneMaterial);

    if (settings.vegetation) {
      const trunks: { position: Vector3; scale: Vector3; rotation: number }[] = [];
      const crowns: { position: Vector3; scale: Vector3; rotation: number }[] = [];
      const count = settings.biome === "desert" ? 70 : 240;
      const canopyGeometry =
        settings.biome === "swamp" || settings.biome === "arcane"
          ? new SphereGeometry(1, 7, 5)
          : new ConeGeometry(1, 2.4, 7);
      const desertGeometry = new CylinderGeometry(0.32, 0.52, 4.5, 7);

      for (let index = 0; index < count; index += 1) {
        const x = random() * size * 0.92 - size * 0.46;
        const z = random() * size * 0.92 - size * 0.46;
        const height = terrainHeight(x / size + 0.5, z / size + 0.5, seed, relief);
        if (height < 0.8 || height > relief * 0.48 || random() < 0.24) continue;

        const treeHeight = 2.7 + random() * 4.8;
        const width = 0.7 + random() * 0.8;
        if (settings.biome === "desert") {
          trunks.push({
            position: new Vector3(x, height + 2.2, z),
            scale: new Vector3(width, 1 + random() * 0.45, width),
            rotation: random() * Math.PI * 2,
          });
        } else {
          trunks.push({
            position: new Vector3(x, height + treeHeight * 0.28, z),
            scale: new Vector3(0.65, treeHeight / 5, 0.65),
            rotation: random() * Math.PI * 2,
          });
          crowns.push({
            position: new Vector3(x, height + treeHeight * 0.86, z),
            scale: new Vector3(width, width * 1.4, width),
            rotation: random() * Math.PI * 2,
          });
        }
      }

      addInstances(
        settings.biome === "desert"
          ? desertGeometry
          : new CylinderGeometry(0.28, 0.42, 5, 6),
        trunkMaterial,
        trunks,
        this.world,
      );
      if (settings.biome !== "desert") {
        addInstances(canopyGeometry, foliageMaterial, crowns, this.world);
      }
    }

    const rocks: { position: Vector3; scale: Vector3; rotation: number }[] = [];
    for (let index = 0; index < 110; index += 1) {
      const x = random() * size * 0.94 - size * 0.47;
      const z = random() * size * 0.94 - size * 0.47;
      const height = terrainHeight(x / size + 0.5, z / size + 0.5, seed, relief);
      if (height < 1 || random() < 0.58) continue;
      const width = 0.5 + random() * 1.7;
      rocks.push({
        position: new Vector3(x, height + width * 0.25, z),
        scale: new Vector3(width, width * (0.45 + random() * 0.7), width),
        rotation: random() * Math.PI * 2,
      });
    }
    addInstances(
      new DodecahedronGeometry(1, 0),
      stoneMaterial,
      rocks,
      this.world,
    );

    if (settings.ruins) {
      const ruins: { position: Vector3; scale: Vector3; rotation: number }[] = [];
      const blockCount = 34;
      for (let index = 0; index < blockCount; index += 1) {
        const angle = random() * Math.PI * 2;
        const radius = 18 + random() * size * 0.22;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = terrainHeight(x / size + 0.5, z / size + 0.5, seed, relief);
        if (height < 0.5) continue;
        const column = random() > 0.38;
        const blockHeight = column ? 3 + random() * 9 : 1 + random() * 2;
        ruins.push({
          position: new Vector3(x, height + blockHeight / 2, z),
          scale: new Vector3(
            column ? 1.3 + random() * 1.1 : 3 + random() * 5,
            blockHeight,
            column ? 1.3 + random() * 1.1 : 2 + random() * 4,
          ),
          rotation: random() * Math.PI,
        });
      }
      addInstances(new BoxGeometry(1, 1, 1), stoneMaterial, ruins, this.world);
    }

    this.scene.add(this.world);
    this.scene.fog = new Fog(palette.fog, size * 1.15, size * 3.6);
    this.scene.background = new Color(palette.sky);
    this.renderer.setClearColor(palette.sky);
  }

  setWireframe(enabled: boolean): void {
    this.wireframe = enabled;
    this.world.traverse((object) => {
      if (object instanceof Mesh) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => {
          if (material instanceof MeshStandardMaterial) {
            material.wireframe = enabled;
          }
        });
      }
    });
  }

  resetCamera(): void {
    const scale = this.activeSettings?.scale ?? 240;
    this.camera.position.set(scale * 0.82, scale * 0.8, scale * 0.95);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  async exportGlb(): Promise<ArrayBuffer> {
    if (!this.activeSettings) {
      throw new Error("Generate an environment before exporting.");
    }
    const { GLTFExporter } = await import(
      "three/addons/exporters/GLTFExporter.js"
    );
    const exporter = new GLTFExporter();
    return new Promise((resolve, reject) => {
      exporter.parse(
        this.world,
        (result) => {
          if (result instanceof ArrayBuffer) resolve(result);
          else reject(new Error("The GLB exporter returned an unexpected result."));
        },
        (error) => reject(error),
        { binary: true },
      );
    });
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.controls.dispose();
    this.renderer.dispose();
  }

  private resize(): void {
    const { clientWidth, clientHeight } = this.canvas;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
  }
}

export function biomeLabel(biome: BiomeId): string {
  return {
    temperate: "Temperate highlands",
    tundra: "Frostbound tundra",
    desert: "Sun-scorched badlands",
    swamp: "Murkfen wetlands",
    arcane: "Arcane wilds",
    fel: "Fel-scarred frontier",
  }[biome];
}
