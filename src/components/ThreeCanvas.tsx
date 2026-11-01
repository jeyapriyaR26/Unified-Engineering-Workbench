import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Maximize2, RotateCcw, Eye, Compass, Grid as GridIcon } from 'lucide-react';
import { StlGeometryData, TemperatureCsvData, TemperatureNodeData } from '../types/workbench';

interface ThreeCanvasProps {
  mode: 'stl' | 'pointcloud';
  stlData?: StlGeometryData | null;
  csvData?: TemperatureCsvData | null;
  onSelectNode?: (node: TemperatureNodeData | null) => void;
}

// Turbo / Cool-to-Warm colormap calculation
function getTemperatureColor(temp: number, minTemp: number, maxTemp: number): THREE.Color {
  const t = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp || 1)));
  // Multi-stop gradient: Blue (0.0) -> Cyan (0.25) -> Green (0.5) -> Yellow (0.75) -> Red (1.0)
  const color = new THREE.Color();
  if (t < 0.25) {
    const factor = t / 0.25;
    color.setRGB(0.1, 0.2 + 0.6 * factor, 0.9);
  } else if (t < 0.5) {
    const factor = (t - 0.25) / 0.25;
    color.setRGB(0.1 + 0.1 * factor, 0.8 + 0.2 * factor, 0.9 - 0.7 * factor);
  } else if (t < 0.75) {
    const factor = (t - 0.5) / 0.25;
    color.setRGB(0.2 + 0.75 * factor, 1.0 - 0.2 * factor, 0.2 - 0.2 * factor);
  } else {
    const factor = (t - 0.75) / 0.25;
    color.setRGB(0.95 + 0.05 * factor, 0.8 - 0.7 * factor, 0.1 - 0.1 * factor);
  }
  return color;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  mode,
  stlData,
  csvData,
  onSelectNode,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState(false);
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<TemperatureNodeData | null>(null);

  // Three.js instances ref
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const pointCloudRef = useRef<THREE.Points | null>(null);
  const axesRef = useRef<THREE.AxesHelper | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);

  // Interaction controls state
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraDistanceRef = useRef(2.5);
  const cameraAnglesRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3 });

  // Update camera position based on spherical coordinates
  const updateCameraTransform = () => {
    if (!cameraRef.current) return;
    const { theta, phi } = cameraAnglesRef.current;
    const r = cameraDistanceRef.current;
    const target = cameraTargetRef.current;

    cameraRef.current.position.x = target.x + r * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = target.y + r * Math.cos(phi);
    cameraRef.current.position.z = target.z + r * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(target);
  };

  // Reset View handler
  const handleResetView = () => {
    cameraTargetRef.current.set(0, 0, 0);
    cameraDistanceRef.current = 2.5;
    cameraAnglesRef.current = { theta: Math.PI / 4, phi: Math.PI / 3 };
    updateCameraTransform();
  };

  // Fit to View handler
  const handleFitToView = () => {
    let bbox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number }; center: { x: number; y: number; z: number }; dimensions: { x: number; y: number; z: number } } | undefined;
    if (mode === 'stl' && stlData?.bbox) bbox = stlData.bbox;
    if (mode === 'pointcloud' && csvData?.stats?.bbox) bbox = csvData.stats.bbox;

    if (bbox) {
      cameraTargetRef.current.set(bbox.center.x, bbox.center.y, bbox.center.z);
      const maxDim = Math.max(bbox.dimensions.x, bbox.dimensions.y, bbox.dimensions.z, 0.1);
      cameraDistanceRef.current = maxDim * 2.8;
      updateCameraTransform();
    } else {
      handleResetView();
    }
  };

  // Setup Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070c18);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
    cameraRef.current = camera;
    updateCameraTransform();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x06b6d4, 1.2);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.8);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // Helpers
    const axesHelper = new THREE.AxesHelper(1.0);
    scene.add(axesHelper);
    axesRef.current = axesHelper;

    const gridHelper = new THREE.GridHelper(2, 20, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -0.001;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    // Group for objects
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Mouse Interaction Handlers
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isDraggingRef.current = true;
      if (e.button === 2 || e.shiftKey) isPanningRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - prevMouseRef.current.x;
      const deltaY = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      if (isDraggingRef.current && !e.shiftKey) {
        cameraAnglesRef.current.theta -= deltaX * 0.01;
        cameraAnglesRef.current.phi = Math.max(
          0.05,
          Math.min(Math.PI - 0.05, cameraAnglesRef.current.phi - deltaY * 0.01)
        );
        updateCameraTransform();
      } else if (isPanningRef.current || (isDraggingRef.current && e.shiftKey)) {
        if (!cameraRef.current) return;
        const panSpeed = cameraDistanceRef.current * 0.0015;
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraRef.current.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraRef.current.quaternion);

        cameraTargetRef.current.addScaledVector(right, -deltaX * panSpeed);
        cameraTargetRef.current.addScaledVector(up, deltaY * panSpeed);
        updateCameraTransform();
      }

      // Raycasting for point cloud node inspection
      if (mode === 'pointcloud' && csvData && csvData.nodes && cameraRef.current && container) {
        const rect = container.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.params.Points = { threshold: 0.04 };
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

        if (pointCloudRef.current) {
          const intersects = raycaster.intersectObject(pointCloudRef.current);
          if (intersects.length > 0 && intersects[0].index !== undefined) {
            const nodeIndex = intersects[0].index;
            if (nodeIndex >= 0 && nodeIndex < csvData.nodes.length) {
              const matchedNode = csvData.nodes[nodeIndex];
              setHoveredNode(matchedNode);
              if (onSelectNode) onSelectNode(matchedNode);
              return;
            }
          }
        }
      }
      setHoveredNode(null);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      isPanningRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      cameraDistanceRef.current = Math.max(0.05, Math.min(100.0, cameraDistanceRef.current * zoomFactor));
      updateCameraTransform();
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('contextmenu', onContextMenu);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('contextmenu', onContextMenu);
      renderer.dispose();
    };
  }, []);

  // Update Wireframe / Axes / Grid display
  useEffect(() => {
    if (axesRef.current) axesRef.current.visible = showAxes;
    if (gridRef.current) gridRef.current.visible = showGrid;
    if (meshGroupRef.current) {
      meshGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshStandardMaterial).wireframe = wireframe;
        }
      });
    }
  }, [wireframe, showAxes, showGrid]);

  // Update Geometry Mesh when STL data changes
  useEffect(() => {
    if (!meshGroupRef.current || !sceneRef.current) return;
    // Clear old meshes
    while (meshGroupRef.current.children.length > 0) {
      const obj = meshGroupRef.current.children[0];
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
      meshGroupRef.current.remove(obj);
    }
    if (pointCloudRef.current) {
      sceneRef.current.remove(pointCloudRef.current);
      pointCloudRef.current.geometry.dispose();
      (pointCloudRef.current.material as THREE.Material).dispose();
      pointCloudRef.current = null;
    }

    if (mode === 'stl' && stlData && stlData.vertices && stlData.vertices.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(stlData.vertices, 3)
      );

      if (stlData.normals && stlData.normals.length === stlData.vertices.length) {
        geometry.setAttribute(
          'normal',
          new THREE.Float32BufferAttribute(stlData.normals, 3)
        );
      } else {
        geometry.computeVertexNormals();
      }

      const material = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        roughness: 0.35,
        metalness: 0.25,
        wireframe: wireframe,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      meshGroupRef.current.add(mesh);

      // Add Bounding Box wireframe
      if (stlData.bbox) {
        const { min, max } = stlData.bbox;
        const boxGeo = new THREE.BoxGeometry(
          max.x - min.x,
          max.y - min.y,
          max.z - min.z
        );
        const wireGeo = new THREE.WireframeGeometry(boxGeo);
        const line = new THREE.LineSegments(
          wireGeo,
          new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 })
        );
        line.position.set(
          (min.x + max.x) * 0.5,
          (min.y + max.y) * 0.5,
          (min.z + max.z) * 0.5
        );
        meshGroupRef.current.add(line);
      }

      handleFitToView();
    } else if (mode === 'pointcloud' && csvData && csvData.nodes && csvData.nodes.length > 0) {
      const positions: number[] = [];
      const colors: number[] = [];

      const minT = csvData.stats.min_temp_C;
      const maxT = csvData.stats.max_temp_C;

      csvData.nodes.forEach((node) => {
        positions.push(node.x_m, node.y_m, node.z_m);
        const col = getTemperatureColor(node.temperature_C, minT, maxT);
        colors.push(col.r, col.g, col.b);
      });

      const pointGeometry = new THREE.BufferGeometry();
      pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      pointGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      // Generate circular particle texture programmatically
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      const particleTexture = new THREE.CanvasTexture(canvas);

      const pointMaterial = new THREE.PointsMaterial({
        size: 0.035,
        vertexColors: true,
        map: particleTexture,
        transparent: true,
        alphaTest: 0.2,
      });

      const pointCloud = new THREE.Points(pointGeometry, pointMaterial);
      sceneRef.current.add(pointCloud);
      pointCloudRef.current = pointCloud;

      // Add Bounding Box wireframe for points
      if (csvData.stats.bbox) {
        const { min, max } = csvData.stats.bbox;
        const boxGeo = new THREE.BoxGeometry(
          Math.max(0.01, max.x - min.x),
          Math.max(0.01, max.y - min.y),
          Math.max(0.01, max.z - min.z)
        );
        const wireGeo = new THREE.WireframeGeometry(boxGeo);
        const line = new THREE.LineSegments(
          wireGeo,
          new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.4 })
        );
        line.position.set(
          (min.x + max.x) * 0.5,
          (min.y + max.y) * 0.5,
          (min.z + max.z) * 0.5
        );
        meshGroupRef.current.add(line);
      }

      handleFitToView();
    }
  }, [mode, stlData, csvData]);

  return (
    <div className="relative w-full h-full min-h-[460px] bg-[#070c18] rounded-lg border border-slate-700/80 overflow-hidden shadow-inner flex flex-col">
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing flex-1" />

      {/* Floating Viewport Toolbar Controls */}
      <div className="absolute top-3 right-3 flex items-center space-x-1.5 bg-[#0f172a]/90 backdrop-blur border border-slate-700 p-1.5 rounded-md shadow-lg z-10 text-xs">
        <button
          onClick={handleFitToView}
          className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition"
          title="Fit Geometry to View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetView}
          className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition"
          title="Reset Camera View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {mode === 'stl' && (
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`p-1.5 rounded transition ${
              wireframe
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-300 hover:text-cyan-400'
            }`}
            title="Toggle Wireframe"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() => setShowAxes(!showAxes)}
          className={`p-1.5 rounded transition ${
            showAxes
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
          title="Toggle XYZ Axes"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-1.5 rounded transition ${
            showGrid
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
          title="Toggle Grid Ground Plane"
        >
          <GridIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Viewport Axis Legend */}
      <div className="absolute bottom-3 left-3 bg-[#0f172a]/85 backdrop-blur border border-slate-700/80 px-2.5 py-1.5 rounded text-[11px] font-mono text-slate-400 flex items-center space-x-3 pointer-events-none">
        <div className="flex items-center space-x-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          <span>+X</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span>+Y</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <span>+Z</span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-[10px] text-slate-500">Drag: Rotate • Shift/Right: Pan • Scroll: Zoom</span>
      </div>

      {/* Temperature Colormap Bar (when in Point Cloud mode) */}
      {mode === 'pointcloud' && csvData && csvData.stats && (
        <div className="absolute top-3 left-3 bg-[#0f172a]/90 backdrop-blur border border-slate-700/80 p-2.5 rounded-md shadow-lg text-[11px] font-mono z-10 w-48">
          <div className="text-slate-300 font-semibold mb-1 flex items-center justify-between">
            <span>TEMPERATURE</span>
            <span className="text-cyan-400">[°C]</span>
          </div>
          <div
            className="h-3.5 rounded w-full border border-slate-600 mb-1"
            style={{
              background:
                'linear-gradient(to right, rgb(25, 51, 230), rgb(25, 204, 230), rgb(51, 255, 51), rgb(242, 204, 25), rgb(242, 25, 25))',
            }}
          />
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>{csvData.stats.min_temp_C.toFixed(1)} °C</span>
            <span>{csvData.stats.mean_temp_C.toFixed(1)} °C</span>
            <span>{csvData.stats.max_temp_C.toFixed(1)} °C</span>
          </div>
        </div>
      )}

      {/* Node Hover Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-12 left-3 bg-[#0f172a]/95 backdrop-blur border border-cyan-500/60 p-2.5 rounded shadow-xl text-xs font-mono z-20 pointer-events-none">
          <div className="text-cyan-300 font-bold mb-1">INSPECTED NODE #{hoveredNode.node_id}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-slate-300">
            <span className="text-slate-400">Position (X, Y, Z):</span>
            <span className="text-white">
              ({hoveredNode.x_m.toFixed(3)}, {hoveredNode.y_m.toFixed(3)}, {hoveredNode.z_m.toFixed(3)}) m
            </span>
            <span className="text-slate-400">Temperature:</span>
            <span className="text-amber-300 font-bold">{hoveredNode.temperature_C.toFixed(2)} °C</span>
          </div>
        </div>
      )}
    </div>
  );
};
