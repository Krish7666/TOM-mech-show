import { useEffect, useRef, useState, useCallback } from "react";

const MATERIALS = [
  { name: "Engineering Steel", color: [0.72, 0.77, 0.84], swatch: "#b0c4de" },
  { name: "Industrial Brass", color: [0.86, 0.68, 0.22], swatch: "#d4af37" },
  { name: "Anodized Cyan", color: [0.18, 0.65, 0.92], swatch: "#38bdf8" },
  { name: "Cast Titanium", color: [0.45, 0.48, 0.54], swatch: "#708090" },
  { name: "Machinery Orange", color: [0.94, 0.46, 0.12], swatch: "#f97316" },
  { name: "Studio Polymer", color: [0.92, 0.93, 0.96], swatch: "#f1f5f9" },
];

const VS_SOURCE = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  uniform mat4 uProjection;
  uniform mat4 uModelView;
  uniform mat3 uNormalMatrix;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec4 pos = uModelView * vec4(aPosition, 1.0);
    vPosition = pos.xyz;
    vNormal = normalize(uNormalMatrix * aNormal);
    gl_Position = uProjection * pos;
  }
`;

const FS_SOURCE = `
  precision mediump float;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform vec3 uColor;
  uniform bool uWireframe;
  void main() {
    if (uWireframe) {
      gl_FragColor = vec4(0.22, 0.74, 0.97, 0.95);
      return;
    }
    vec3 normal = normalize(vNormal);
    vec3 light1 = normalize(vec3(0.55, 0.85, 0.75));
    vec3 light2 = normalize(vec3(-0.6, -0.4, -0.5));
    vec3 viewDir = normalize(-vPosition);

    float diff1 = max(dot(normal, light1), 0.0);
    float diff2 = max(dot(normal, light2), 0.0) * 0.35;

    vec3 halfDir = normalize(light1 + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 28.0) * 0.4;

    vec3 ambient = uColor * 0.32;
    vec3 diffuse = uColor * (diff1 * 0.78 + diff2);
    vec3 specular = vec3(1.0, 1.0, 1.0) * spec;

    gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
  }
`;

function parseBinaryStl(buffer) {
  const dataView = new DataView(buffer);
  if (buffer.byteLength < 84) throw new Error("File too small for binary STL");
  const numTriangles = dataView.getUint32(80, true);

  if (numTriangles <= 0 || numTriangles > 5000000) {
    throw new Error("Invalid triangle count in binary STL");
  }

  const positions = new Float32Array(numTriangles * 9);
  const normals = new Float32Array(numTriangles * 9);

  let offset = 84;
  let pIdx = 0;

  for (let i = 0; i < numTriangles; i++) {
    if (offset + 50 > buffer.byteLength) break;

    let nx = dataView.getFloat32(offset, true);
    let ny = dataView.getFloat32(offset + 4, true);
    let nz = dataView.getFloat32(offset + 8, true);
    offset += 12;

    const v1x = dataView.getFloat32(offset, true);
    const v1y = dataView.getFloat32(offset + 4, true);
    const v1z = dataView.getFloat32(offset + 8, true);
    offset += 12;

    const v2x = dataView.getFloat32(offset, true);
    const v2y = dataView.getFloat32(offset + 4, true);
    const v2z = dataView.getFloat32(offset + 8, true);
    offset += 12;

    const v3x = dataView.getFloat32(offset, true);
    const v3y = dataView.getFloat32(offset + 4, true);
    const v3z = dataView.getFloat32(offset + 8, true);
    offset += 12;

    offset += 2; // skip 2-byte attribute byte count

    if (nx === 0 && ny === 0 && nz === 0) {
      const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
      const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
      let cx = ay * bz - az * by;
      let cy = az * bx - ax * bz;
      let cz = ax * by - ay * bx;
      const len = Math.hypot(cx, cy, cz);
      if (len > 0.000001) {
        nx = cx / len; ny = cy / len; nz = cz / len;
      } else {
        nz = 1;
      }
    }

    positions[pIdx] = v1x; positions[pIdx + 1] = v1y; positions[pIdx + 2] = v1z;
    normals[pIdx] = nx; normals[pIdx + 1] = ny; normals[pIdx + 2] = nz;

    positions[pIdx + 3] = v2x; positions[pIdx + 4] = v2y; positions[pIdx + 5] = v2z;
    normals[pIdx + 3] = nx; normals[pIdx + 4] = ny; normals[pIdx + 3 + 1] = ny; normals[pIdx + 5] = nz;

    positions[pIdx + 6] = v3x; positions[pIdx + 7] = v3y; positions[pIdx + 8] = v3z;
    normals[pIdx + 6] = nx; normals[pIdx + 7] = ny; normals[pIdx + 8] = nz;

    pIdx += 9;
  }

  return { positions, normals, count: numTriangles };
}

function parseAsciiStl(text) {
  const vertexPattern = /vertex\s+([+-]?\d*(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d*(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d*(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const rawVertices = [];
  let match;
  while ((match = vertexPattern.exec(text)) !== null) {
    rawVertices.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
  }

  const numTriangles = Math.floor(rawVertices.length / 9);
  if (numTriangles <= 0) throw new Error("No valid triangles found in ASCII STL");

  const positions = new Float32Array(numTriangles * 9);
  const normals = new Float32Array(numTriangles * 9);

  for (let i = 0; i < numTriangles; i++) {
    const pIdx = i * 9;
    const v1x = rawVertices[pIdx], v1y = rawVertices[pIdx + 1], v1z = rawVertices[pIdx + 2];
    const v2x = rawVertices[pIdx + 3], v2y = rawVertices[pIdx + 4], v2z = rawVertices[pIdx + 5];
    const v3x = rawVertices[pIdx + 6], v3y = rawVertices[pIdx + 7], v3z = rawVertices[pIdx + 8];

    const ax = v2x - v1x, ay = v2y - v1y, az = v2z - v1z;
    const bx = v3x - v1x, by = v3y - v1y, bz = v3z - v1z;
    let cx = ay * bz - az * by;
    let cy = az * bx - ax * bz;
    let cz = ax * by - ay * bx;
    const len = Math.hypot(cx, cy, cz);
    let nx = 0, ny = 0, nz = 1;
    if (len > 0.000001) {
      nx = cx / len; ny = cy / len; nz = cz / len;
    }

    for (let j = 0; j < 9; j++) positions[pIdx + j] = rawVertices[pIdx + j];
    for (let j = 0; j < 3; j++) {
      normals[pIdx + j * 3] = nx;
      normals[pIdx + j * 3 + 1] = ny;
      normals[pIdx + j * 3 + 2] = nz;
    }
  }

  return { positions, normals, count: numTriangles };
}

function parseStl(buffer) {
  const headerCheck = new Uint8Array(buffer.slice(0, 80));
  let isAscii = false;
  try {
    const text = new TextDecoder("utf-8").decode(headerCheck);
    if (text.trim().startsWith("solid") && !buffer.slice(0, 1024).some((b) => b === 0)) {
      isAscii = true;
    }
  } catch {
    isAscii = false;
  }

  if (isAscii) {
    try {
      const fullText = new TextDecoder("utf-8").decode(buffer);
      return parseAsciiStl(fullText);
    } catch {
      return parseBinaryStl(buffer);
    }
  }

  try {
    return parseBinaryStl(buffer);
  } catch {
    const fullText = new TextDecoder("utf-8").decode(buffer);
    return parseAsciiStl(fullText);
  }
}

function generateMechanicalDemoModel() {
  const triangles = [];
  function addTriangle(p1, p2, p3) {
    triangles.push(...p1, ...p2, ...p3);
  }
  function addQuad(p1, p2, p3, p4) {
    addTriangle(p1, p2, p3);
    addTriangle(p1, p3, p4);
  }

  const length = 120;
  const radius = 24;
  const holeR = 10;
  const thickness = 14;
  const segments = 24;

  const centers = [
    [-length / 2, 0],
    [length / 2, 0],
  ];

  centers.forEach(([cx, cy]) => {
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
      const cos2 = Math.cos(a2), sin2 = Math.sin(a2);

      const o1Top = [cx + cos1 * radius, cy + sin1 * radius, thickness / 2];
      const o2Top = [cx + cos2 * radius, cy + sin2 * radius, thickness / 2];
      const h1Top = [cx + cos1 * holeR, cy + sin1 * holeR, thickness / 2];
      const h2Top = [cx + cos2 * holeR, cy + sin2 * holeR, thickness / 2];

      const o1Bot = [cx + cos1 * radius, cy + sin1 * radius, -thickness / 2];
      const o2Bot = [cx + cos2 * radius, cy + sin2 * radius, -thickness / 2];
      const h1Bot = [cx + cos1 * holeR, cy + sin1 * holeR, -thickness / 2];
      const h2Bot = [cx + cos2 * holeR, cy + sin2 * holeR, -thickness / 2];

      addQuad(o1Top, o2Top, h2Top, h1Top);
      addQuad(o2Bot, o1Bot, h1Bot, h2Bot);
      addQuad(o1Bot, o2Bot, o2Top, o1Top);
      addQuad(h1Top, h2Top, h2Bot, h1Bot);
    }
  });

  const w = 18;
  const x1 = centers[0][0], x2 = centers[1][0];
  const zt = thickness / 2, zb = -thickness / 2;

  addQuad([x1, w, zt], [x2, w, zt], [x2, -w, zt], [x1, -w, zt]);
  addQuad([x1, -w, zb], [x2, -w, zb], [x2, w, zb], [x1, w, zb]);
  addQuad([x1, w, zb], [x2, w, zb], [x2, w, zt], [x1, w, zt]);
  addQuad([x2, -w, zb], [x1, -w, zb], [x1, -w, zt], [x2, -w, zt]);

  const numTriangles = triangles.length / 9;
  const positions = new Float32Array(triangles);
  const normals = new Float32Array(positions.length);

  for (let i = 0; i < numTriangles; i++) {
    const idx = i * 9;
    const ax = positions[idx + 3] - positions[idx];
    const ay = positions[idx + 4] - positions[idx + 1];
    const az = positions[idx + 5] - positions[idx + 2];
    const bx = positions[idx + 6] - positions[idx];
    const by = positions[idx + 7] - positions[idx + 1];
    const bz = positions[idx + 8] - positions[idx + 2];
    let cx = ay * bz - az * by;
    let cy = az * bx - ax * bz;
    let cz = ax * by - ay * bx;
    const len = Math.hypot(cx, cy, cz) || 1;
    cx /= len; cy /= len; cz /= len;

    for (let j = 0; j < 3; j++) {
      normals[idx + j * 3] = cx;
      normals[idx + j * 3 + 1] = cy;
      normals[idx + j * 3 + 2] = cz;
    }
  }

  return { positions, normals, count: numTriangles };
}

function mat4Perspective(fovy, aspect, near, far) {
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0,
  ];
}

export default function StlViewer3D({ fileUrl, fileName, initialColorIndex = 0 }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modelStats, setModelStats] = useState(null);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [materialIdx, setMaterialIdx] = useState(initialColorIndex);

  const cameraRef = useRef({
    rotX: 0.45,
    rotY: 0.65,
    panX: 0,
    panY: 0,
    distance: 3.4,
    isDragging: false,
    dragButton: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    touchDist: null,
  });

  const meshRef = useRef(null);
  const glRef = useRef(null);

  const setupGeometry = useCallback((parsed, name) => {
    const { positions, normals, count } = parsed;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const dx = maxX - minX;
    const dy = maxY - minY;
    const dz = maxZ - minZ;
    const maxDim = Math.max(dx, dy, dz) || 1;
    const scale = 2.0 / maxDim;

    const normPos = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      normPos[i] = (positions[i] - cx) * scale;
      normPos[i + 1] = (positions[i + 1] - cy) * scale;
      normPos[i + 2] = (positions[i + 2] - cz) * scale;
    }

    const wirePos = new Float32Array(count * 18);
    let wIdx = 0;
    for (let i = 0; i < count; i++) {
      const base = i * 9;
      wirePos[wIdx++] = normPos[base];
      wirePos[wIdx++] = normPos[base + 1];
      wirePos[wIdx++] = normPos[base + 2];
      wirePos[wIdx++] = normPos[base + 3];
      wirePos[wIdx++] = normPos[base + 4];
      wirePos[wIdx++] = normPos[base + 5];

      wirePos[wIdx++] = normPos[base + 3];
      wirePos[wIdx++] = normPos[base + 4];
      wirePos[wIdx++] = normPos[base + 5];
      wirePos[wIdx++] = normPos[base + 6];
      wirePos[wIdx++] = normPos[base + 7];
      wirePos[wIdx++] = normPos[base + 8];

      wirePos[wIdx++] = normPos[base + 6];
      wirePos[wIdx++] = normPos[base + 7];
      wirePos[wIdx++] = normPos[base + 8];
      wirePos[wIdx++] = normPos[base];
      wirePos[wIdx++] = normPos[base + 1];
      wirePos[wIdx++] = normPos[base + 2];
    }

    const gl = glRef.current;
    if (gl) {
      const posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, normPos, gl.STATIC_DRAW);

      const normBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

      const wireBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, wireBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, wirePos, gl.STATIC_DRAW);

      meshRef.current = {
        posBuffer,
        normBuffer,
        wireBuffer,
        vertexCount: count * 3,
        wireVertexCount: count * 6,
      };
    }

    setModelStats({
      name: name || fileName || "Mechanical Part",
      triangles: count,
      dims: `${dx.toFixed(1)} × ${dy.toFixed(1)} × ${dz.toFixed(1)} mm`,
    });
    setLoading(false);
  }, [fileName]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true, alpha: true }) ||
               canvas.getContext("experimental-webgl", { antialias: true, alpha: true });

    if (!gl) {
      setError("WebGL is not supported in this browser.");
      setLoading(false);
      return;
    }
    glRef.current = gl;

    function compileShader(src, type) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compileShader(VS_SOURCE, gl.VERTEX_SHADER);
    const fs = compileShader(FS_SOURCE, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setError("Failed to link WebGL shaders.");
      return;
    }

    gl.useProgram(prog);
    gl.program = prog;
    gl.attribs = {
      aPosition: gl.getAttribLocation(prog, "aPosition"),
      aNormal: gl.getAttribLocation(prog, "aNormal"),
    };
    gl.uniforms = {
      uProjection: gl.getUniformLocation(prog, "uProjection"),
      uModelView: gl.getUniformLocation(prog, "uModelView"),
      uNormalMatrix: gl.getUniformLocation(prog, "uNormalMatrix"),
      uColor: gl.getUniformLocation(prog, "uColor"),
      uWireframe: gl.getUniformLocation(prog, "uWireframe"),
    };

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0.04, 0.07, 0.12, 1.0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError(null);

      if (!fileUrl) {
        const demo = generateMechanicalDemoModel();
        if (!cancelled) setupGeometry(demo, "Double-Pivot Rocker Link (Demo)");
        return;
      }

      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status} loading CAD file`);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;
        const parsed = parseStl(buffer);
        setupGeometry(parsed, fileName);
      } catch (err) {
        if (!cancelled) {
          console.warn("Failed to parse remote STL, using interactive demo model:", err.message);
          const demo = generateMechanicalDemoModel();
          setupGeometry(demo, `${fileName || "Part"} (Demo Representation)`);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [fileUrl, fileName, setupGeometry]);

  const handleLocalFile = (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const parsed = parseStl(buffer);
        setupGeometry(parsed, file.name);
      } catch (err) {
        setError(`Failed to parse STL: ${err.message}`);
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Error reading local STL file");
      setLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = glRef.current;
    if (!canvas || !gl) return;

    let isRunning = true;

    function render() {
      if (!isRunning) return;

      const cam = cameraRef.current;
      if (autoRotate && !cam.isDragging) {
        cam.rotY += 0.007;
      }

      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const mesh = meshRef.current;
      if (mesh && gl.program) {
        gl.useProgram(gl.program);

        const aspect = canvas.width / (canvas.height || 1);
        const proj = mat4Perspective(Math.PI / 4, aspect, 0.1, 100.0);

        const cosX = Math.cos(cam.rotX), sinX = Math.sin(cam.rotX);
        const cosY = Math.cos(cam.rotY), sinY = Math.sin(cam.rotY);

        const r00 = cosY;
        const r01 = sinX * sinY;
        const r02 = -cosX * sinY;

        const r10 = 0;
        const r11 = cosX;
        const r12 = sinX;

        const r20 = sinY;
        const r21 = -sinX * cosY;
        const r22 = cosX * cosY;

        const mv = new Float32Array([
          r00, r10, r20, 0,
          r01, r11, r21, 0,
          r02, r12, r22, 0,
          cam.panX, cam.panY, -cam.distance, 1,
        ]);

        const normMat = new Float32Array([
          r00, r10, r20,
          r01, r11, r21,
          r02, r12, r22,
        ]);

        gl.uniformMatrix4fv(gl.uniforms.uProjection, false, new Float32Array(proj));
        gl.uniformMatrix4fv(gl.uniforms.uModelView, false, mv);
        gl.uniformMatrix3fv(gl.uniforms.uNormalMatrix, false, normMat);

        const mat = MATERIALS[materialIdx] || MATERIALS[0];
        gl.uniform3fv(gl.uniforms.uColor, new Float32Array(mat.color));

        if (wireframe) {
          gl.uniform1i(gl.uniforms.uWireframe, 1);
          gl.bindBuffer(gl.ARRAY_BUFFER, mesh.wireBuffer);
          gl.enableVertexAttribArray(gl.attribs.aPosition);
          gl.vertexAttribPointer(gl.attribs.aPosition, 3, gl.FLOAT, false, 0, 0);
          gl.disableVertexAttribArray(gl.attribs.aNormal);

          gl.drawArrays(gl.LINES, 0, mesh.wireVertexCount);
        } else {
          gl.uniform1i(gl.uniforms.uWireframe, 0);

          gl.bindBuffer(gl.ARRAY_BUFFER, mesh.posBuffer);
          gl.enableVertexAttribArray(gl.attribs.aPosition);
          gl.vertexAttribPointer(gl.attribs.aPosition, 3, gl.FLOAT, false, 0, 0);

          gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normBuffer);
          gl.enableVertexAttribArray(gl.attribs.aNormal);
          gl.vertexAttribPointer(gl.attribs.aNormal, 3, gl.FLOAT, false, 0, 0);

          gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [autoRotate, materialIdx, wireframe]);

  const handleMouseDown = (e) => {
    const cam = cameraRef.current;
    cam.isDragging = true;
    cam.dragButton = e.button;
    cam.lastMouseX = e.clientX;
    cam.lastMouseY = e.clientY;
  };

  const handleMouseMove = (e) => {
    const cam = cameraRef.current;
    if (!cam.isDragging) return;
    const dx = e.clientX - cam.lastMouseX;
    const dy = e.clientY - cam.lastMouseY;
    cam.lastMouseX = e.clientX;
    cam.lastMouseY = e.clientY;

    if (cam.dragButton === 2 || e.shiftKey) {
      cam.panX += dx * 0.003 * (cam.distance / 3.4);
      cam.panY -= dy * 0.003 * (cam.distance / 3.4);
    } else {
      cam.rotY += dx * 0.009;
      cam.rotX += dy * 0.009;
      cam.rotX = Math.max(-Math.PI / 2 + 0.08, Math.min(Math.PI / 2 - 0.08, cam.rotX));
    }
  };

  const handleMouseUp = () => {
    cameraRef.current.isDragging = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const cam = cameraRef.current;
    const factor = e.deltaY > 0 ? 1.08 : 0.92;
    cam.distance = Math.max(1.1, Math.min(12.0, cam.distance * factor));
  };

  const handleTouchStart = (e) => {
    const cam = cameraRef.current;
    if (e.touches.length === 1) {
      cam.isDragging = true;
      cam.dragButton = 0;
      cam.lastMouseX = e.touches[0].clientX;
      cam.lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      cam.isDragging = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      cam.touchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    }
  };

  const handleTouchMove = (e) => {
    const cam = cameraRef.current;
    if (e.touches.length === 1 && cam.isDragging) {
      const dx = e.touches[0].clientX - cam.lastMouseX;
      const dy = e.touches[0].clientY - cam.lastMouseY;
      cam.lastMouseX = e.touches[0].clientX;
      cam.lastMouseY = e.touches[0].clientY;
      cam.rotY += dx * 0.009;
      cam.rotX += dy * 0.009;
      cam.rotX = Math.max(-Math.PI / 2 + 0.08, Math.min(Math.PI / 2 - 0.08, cam.rotX));
    } else if (e.touches.length === 2 && cam.touchDist) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = cam.touchDist / (newDist || 1);
      cam.distance = Math.max(1.1, Math.min(12.0, cam.distance * ratio));
      cam.touchDist = newDist;
    }
  };

  const handleResetView = () => {
    cameraRef.current.rotX = 0.45;
    cameraRef.current.rotY = 0.65;
    cameraRef.current.panX = 0;
    cameraRef.current.panY = 0;
    cameraRef.current.distance = 3.4;
  };

  return (
    <div
      style={{
        borderRadius: "18px",
        overflow: "hidden",
        border: "1px solid rgba(56, 189, 248, 0.35)",
        background: "radial-gradient(ellipse at 50% 0%, #0d1527 0%, #060913 100%)",
        boxShadow: "0 14px 40px rgba(0, 0, 0, 0.55)",
        position: "relative",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 3D Header Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 18px",
          background: "rgba(10, 16, 28, 0.88)",
          borderBottom: "1px solid rgba(56, 189, 248, 0.2)",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.25rem" }}>🧊</span>
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#38bdf8" }}>
              3D CAD Solid Model Viewer
            </div>
            {modelStats && (
              <div style={{ fontSize: "0.74rem", color: "rgba(226, 232, 240, 0.7)" }}>
                {modelStats.name} · {modelStats.triangles.toLocaleString()} polygons · {modelStats.dims}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Material Swatches */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "3px 6px",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
            title="Change CAD Finish Material"
          >
            {MATERIALS.map((m, idx) => (
              <button
                key={m.name}
                type="button"
                onClick={() => setMaterialIdx(idx)}
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: m.swatch,
                  border: materialIdx === idx ? "2px solid #38bdf8" : "1px solid rgba(0,0,0,0.5)",
                  cursor: "pointer",
                  padding: 0,
                  transform: materialIdx === idx ? "scale(1.2)" : "scale(1)",
                  transition: "transform 0.15s ease",
                }}
                title={m.name}
              />
            ))}
          </div>

          <button
            type="button"
            className="secondary-btn secondary-btn--small"
            onClick={() => setWireframe(!wireframe)}
            style={{
              background: wireframe ? "rgba(56, 189, 248, 0.25)" : undefined,
              borderColor: wireframe ? "#38bdf8" : undefined,
            }}
            title="Toggle Wireframe Geometry"
          >
            {wireframe ? "🕸️ Wireframe ON" : "🧊 Solid Shaded"}
          </button>

          <button
            type="button"
            className="secondary-btn secondary-btn--small"
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              background: autoRotate ? "rgba(56, 189, 248, 0.2)" : undefined,
            }}
            title="Toggle Auto Rotation"
          >
            {autoRotate ? "⏸ Pause Turn" : "▶ Rotate"}
          </button>

          <button
            type="button"
            className="secondary-btn secondary-btn--small"
            onClick={handleResetView}
            title="Reset to Default Angle"
          >
            🎯 Reset View
          </button>

          <label
            className="secondary-btn secondary-btn--small"
            style={{ cursor: "pointer", margin: 0, display: "inline-flex", alignItems: "center" }}
            title="Inspect your own .stl file"
          >
            📂 Load STL
            <input
              type="file"
              accept=".stl"
              style={{ display: "none" }}
              onChange={(e) => handleLocalFile(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      {/* Main 3D Canvas Area */}
      <div
        style={{
          width: "100%",
          height: "480px",
          position: "relative",
          cursor: "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { cameraRef.current.isDragging = false; }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.[0]) handleLocalFile(e.dataTransfer.files[0]);
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />

        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(6, 9, 19, 0.75)",
              color: "#38bdf8",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite" }}>⚙️</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>Tessellating 3D STL Mesh…</div>
          </div>
        )}

        {error && (
          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "16px",
              right: "16px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "#fca5a5",
              fontSize: "0.82rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Floating Instruction overlay */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "14px",
            background: "rgba(10, 16, 28, 0.75)",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "0.72rem",
            color: "rgba(226, 232, 240, 0.75)",
            pointerEvents: "none",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            gap: "12px",
          }}
        >
          <span>🖱️ Left Click + Drag: Rotate</span>
          <span>📜 Scroll: Zoom</span>
          <span>👆 Right Click / Shift: Pan</span>
          <span>📁 Drop .stl to inspect</span>
        </div>
      </div>
    </div>
  );
}
