import * as THREE from 'three';

// ── Texture generators ────────────────────────────────────────────────────────

// Sci-fi neon grid floor
function scifiFloorTex() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#080c14';
  ctx.fillRect(0, 0, 512, 512);

  // major grid — bright cyan
  ctx.strokeStyle = 'rgba(0,220,255,0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 128) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }
  // minor grid — dim blue
  ctx.strokeStyle = 'rgba(0,100,180,0.30)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }
  // corner dots at major intersections
  for (let ix = 0; ix <= 4; ix++) for (let iy = 0; iy <= 4; iy++) {
    ctx.beginPath();
    ctx.arc(ix * 128, iy * 128, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,255,255,0.9)';
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Sci-fi tech panel wall
function scifiWallTex() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0d1220';
  ctx.fillRect(0, 0, 256, 256);

  // panel borders
  ctx.strokeStyle = 'rgba(0,180,255,0.5)';
  ctx.lineWidth = 2;
  const panels = [[8,8,116,116],[132,8,116,116],[8,132,116,116],[132,132,116,116]];
  for (const [x,y,w,h] of panels) {
    ctx.strokeRect(x, y, w, h);
    // inner inset
    ctx.strokeStyle = 'rgba(0,100,200,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x+6, y+6, w-12, h-12);
    ctx.strokeStyle = 'rgba(0,180,255,0.5)';
    ctx.lineWidth = 2;
  }
  // horizontal accent lines
  ctx.strokeStyle = 'rgba(80,220,255,0.35)';
  ctx.lineWidth = 1;
  for (let y = 20; y < 256; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
  }
  // small indicator dots
  for (let i = 0; i < 8; i++) {
    const x = 20 + Math.random() * 216, y = 20 + Math.random() * 216;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,255,180,0.8)' : 'rgba(255,80,80,0.7)';
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Sci-fi dark metal platform
function scifiMetalTex() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#111820';
  ctx.fillRect(0, 0, 128, 128);
  // diagonal hatching
  ctx.strokeStyle = 'rgba(40,80,120,0.4)';
  ctx.lineWidth = 1;
  for (let i = -128; i < 256; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 128, 128); ctx.stroke();
  }
  // bright edge lines
  ctx.strokeStyle = 'rgba(0,200,255,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 126, 126);
  // grid
  ctx.strokeStyle = 'rgba(0,120,200,0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 128; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function box(scene, boxes, x, y, z, w, h, d, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  // store as Box3 for collision (world space)
  boxes.push(new THREE.Box3(
    new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
    new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)
  ));
  return mesh;
}

// ── World ─────────────────────────────────────────────────────────────────────

export class World {
  constructor(scene) {
    this.boxes = [];
    this._build(scene);
  }

  _build(scene) {
    const floor_tex = scifiFloorTex();
    const wall_tex  = scifiWallTex();
    const metal     = scifiMetalTex();

    const floorMat   = new THREE.MeshLambertMaterial({ map: floor_tex });
    const ceilMat    = new THREE.MeshLambertMaterial({ color: 0x060a12 });
    const platMat    = new THREE.MeshLambertMaterial({ map: metal });
    const platMat2   = new THREE.MeshLambertMaterial({ map: metal, color: 0x8866ff });

    const ROOM = 40;
    const CEIL = 30;

    // ── Floor ──
    const fTex = floor_tex.clone();
    fTex.repeat.set(8, 8); fTex.needsUpdate = true;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // ── Ceiling ──
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = CEIL;
    scene.add(ceil);

    // ── Walls ──
    const wallSpecs = [
      { pos: [0, CEIL/2, -ROOM/2], ry: 0,          rpt: [4, 2] },
      { pos: [0, CEIL/2,  ROOM/2], ry: Math.PI,     rpt: [4, 2] },
      { pos: [-ROOM/2, CEIL/2, 0], ry:  Math.PI/2,  rpt: [4, 2] },
      { pos: [ ROOM/2, CEIL/2, 0], ry: -Math.PI/2,  rpt: [4, 2] },
    ];
    for (const { pos, ry, rpt } of wallSpecs) {
      const t = wall_tex.clone();
      t.repeat.set(...rpt); t.needsUpdate = true;
      const mat = new THREE.MeshLambertMaterial({ map: t });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, CEIL), mat);
      m.position.set(...pos);
      m.rotation.y = ry;
      scene.add(m);
    }

    // ── Platforms ────────────────────────────────────────────────────────────
    //
    //  Height guide (player can jump to ~1.8m feet, double-jump ~3.5m feet):
    //
    //   Ground    →  y=0
    //   Step      →  top y=0.6  (walk up / easy jump)
    //   Low       →  top y=1.5  (single jump)
    //   Mid       →  top y=2.5  (double jump, or single from low)
    //   High      →  top y=3.5  (double jump from mid platform)
    //   Very high →  top y=5.5  (chain of jumps needed)

    const t = 0.4; // platform thickness

    // Step — very easy, near start
    box(scene, this.boxes,  8, 0.3, 3,  5, t+0.2, 5, platMat);     // top y=0.6

    // Low platforms
    box(scene, this.boxes, -8, 0.75, -4, 6, t, 6, platMat2);        // top y=1.0 ← slightly higher
    box(scene, this.boxes, 12, 0.65, -8, 5, t, 5, platMat);         // top y=0.85

    // Mid platforms (need single jump from a low platform, or double from ground)
    box(scene, this.boxes,  0, 1.25, -10, 7, t, 4, platMat2);       // top y=1.45
    box(scene, this.boxes,-14, 1.3,   4,  5, t, 5, platMat);        // top y=1.5

    // Higher — double jump territory
    box(scene, this.boxes,  8, 1.9, -16, 6, t, 5, platMat2);        // top y=2.1
    box(scene, this.boxes,-10, 2.2, -14, 5, t, 6, platMat);         // top y=2.4

    // Walkway spanning the room — crosses at mid height
    box(scene, this.boxes,  0, 2.8,   0, 28, t, 3, platMat2);       // top y=3.0

    // High pillars you can stand on top of
    box(scene, this.boxes, 14, 1.75,  12, 3, 3.5, 3, platMat);      // top y=3.5
    box(scene, this.boxes,-14, 1.75, -16, 3, 3.5, 3, platMat2);     // top y=3.5

    // Very high — chain jump destination
    box(scene, this.boxes,  0, 4.25, -17, 5, t, 5, platMat);        // top y=4.45
    box(scene, this.boxes, -1, 5.55, -17, 4, t, 4, platMat2);       // top y=5.75

    // ── Wall-run slabs ───────────────────────────────────────────────────────
    // Tall thin panels — run along their long face to trigger wall-run
    const wrMat = new THREE.MeshLambertMaterial({ color: 0x0033aa, map: metal });

    // East corridor — three X-thin panels in a row, run along +X face
    box(scene, this.boxes,  10, 3,   4, 0.5, 6, 7, wrMat);
    box(scene, this.boxes,  10, 3,  -5, 0.5, 6, 7, wrMat);
    box(scene, this.boxes,  10, 3, -14, 0.5, 6, 7, wrMat);

    // West corridor — mirror
    box(scene, this.boxes, -10, 3,   4, 0.5, 6, 7, wrMat);
    box(scene, this.boxes, -10, 3,  -5, 0.5, 6, 7, wrMat);
    box(scene, this.boxes, -10, 3, -14, 0.5, 6, 7, wrMat);

    // Back run — Z-thin panels, run along +Z face
    box(scene, this.boxes,  -6, 3, -18, 7, 6, 0.5, wrMat);
    box(scene, this.boxes,   6, 3, -18, 7, 6, 0.5, wrMat);

    // ── Lighting (sci-fi) ────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x334466, 2.5));

    const key = new THREE.DirectionalLight(0xaaddff, 1.8);
    key.position.set(8, 9, 6);
    scene.add(key);

    const key2 = new THREE.DirectionalLight(0xffffff, 0.9);
    key2.position.set(-6, 8, -4);
    scene.add(key2);

    const neon1 = new THREE.PointLight(0x00eeff, 3.0, 35);
    neon1.position.set(-12, 7, -10);
    scene.add(neon1);

    const neon2 = new THREE.PointLight(0xbb44ff, 2.2, 30);
    neon2.position.set(14, 6, 12);
    scene.add(neon2);

    const neon3 = new THREE.PointLight(0x00ff99, 1.8, 25);
    neon3.position.set(0, 5, -18);
    scene.add(neon3);
  }
}
