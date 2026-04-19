import * as THREE from 'three';

// ── Texture generators ────────────────────────────────────────────────────────

function brickTex() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  // mortar
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(0, 0, 256, 128);
  // bricks
  const bw = 60, bh = 26;
  for (let row = 0; row <= 5; row++) {
    const off = row % 2 === 0 ? 0 : bw / 2;
    for (let col = -1; col <= 5; col++) {
      const x = col * bw + off + 2;
      const y = row * bh + 2;
      const r = 155 + Math.floor(Math.random() * 40);
      const g = 80  + Math.floor(Math.random() * 20);
      const b = 40  + Math.floor(Math.random() * 15);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, bw - 3, bh - 3);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function concreteTex() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');

  // base
  ctx.fillStyle = '#686868';
  ctx.fillRect(0, 0, 512, 512);

  // large tile lines
  ctx.strokeStyle = '#484848';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 512; i += 128) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }

  // medium subdivision lines
  ctx.strokeStyle = '#595959';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }

  // fine hairlines
  ctx.strokeStyle = 'rgba(60,60,60,0.5)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i <= 512; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }

  // diagonal scratch lines
  ctx.strokeStyle = 'rgba(50,50,50,0.25)';
  ctx.lineWidth = 0.6;
  for (let i = -512; i < 1024; i += 48) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 512, 512); ctx.stroke();
  }

  // dense noise
  for (let i = 0; i < 4000; i++) {
    const v = Math.floor(Math.random() * 55);
    ctx.fillStyle = `rgba(0,0,0,${v / 255})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random(), 1 + Math.random());
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function metalTex() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(0, 0, 128, 128);
  // grate lines
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
  }
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  for (let i = 8; i <= 128; i += 16) {
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
    const brick    = brickTex();
    const concrete = concreteTex();
    const metal    = metalTex();

    const floorMat   = new THREE.MeshLambertMaterial({ map: concrete });
    const wallMat    = new THREE.MeshLambertMaterial({ map: brick });
    const ceilMat    = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const platMat    = new THREE.MeshLambertMaterial({ map: metal });
    const platMat2   = new THREE.MeshLambertMaterial({ map: brick,  color: 0x8899aa });

    const ROOM = 40;
    const CEIL = 10;

    // ── Floor ──
    const fTex = concrete.clone();
    fTex.repeat.set(10, 10); fTex.needsUpdate = true;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // ── Ceiling ──
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = CEIL;
    scene.add(ceil);

    // ── Walls (visual only — player clamped by BOUNDS in Player.js) ──
    // Tile brick texture per wall
    const wallSpecs = [
      { pos: [0, CEIL/2, -ROOM/2], ry: 0,          rpt: [ROOM/3, CEIL/3] },
      { pos: [0, CEIL/2,  ROOM/2], ry: Math.PI,     rpt: [ROOM/3, CEIL/3] },
      { pos: [-ROOM/2, CEIL/2, 0], ry:  Math.PI/2,  rpt: [ROOM/3, CEIL/3] },
      { pos: [ ROOM/2, CEIL/2, 0], ry: -Math.PI/2,  rpt: [ROOM/3, CEIL/3] },
    ];
    for (const { pos, ry, rpt } of wallSpecs) {
      const t = brick.clone();
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
    const wrMat = new THREE.MeshLambertMaterial({ color: 0x4a7090, map: metal });

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

    // ── Lighting ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    const sun = new THREE.DirectionalLight(0xfff4e0, 0.9);
    sun.position.set(8, 9, 6);
    scene.add(sun);

    // A couple of fill lights for depth
    const fill1 = new THREE.PointLight(0x8888ff, 0.6, 30);
    fill1.position.set(-10, 6, -10);
    scene.add(fill1);

    const fill2 = new THREE.PointLight(0xff8844, 0.4, 25);
    fill2.position.set(12, 5, 10);
    scene.add(fill2);
  }
}
