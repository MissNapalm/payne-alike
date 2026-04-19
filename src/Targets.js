import * as THREE from 'three';

const RADIUS         = 0.55;
const MAX_TARGETS    = 8;
const RESPAWN_DELAY  = 4.0;
const HIT_COLORS     = [0xff55cc, 0xff44bb, 0xff1199, 0xdd0077, 0xcc0055];
const BOB_SPEED      = 1.2;
const BOB_AMP        = 0.08;
const MOVE_SPEED_MIN = 1.5;
const MOVE_SPEED_MAX = 3.5;
const MAP_HALF       = 16;
const Y_MIN          = 0.9;
const Y_MAX          = 4.5;
const BAR_W          = 1.3;
const BAR_H          = 0.13;
const SHOOT_INTERVAL = 7.0;
const ORB_BULLET_SPD = 4;

const SPAWN_SPOTS = [
  [ 8,  0.6,  3 ],  [ -8, 1.2, -4 ], [ 12, 1.0, -8 ],  [  0, 1.6, -10],
  [-14, 1.7,  4 ],  [  8, 2.3, -16], [-10, 2.7, -14],   [  0, 3.2,   0],
  [ 14, 3.8,  12],  [-14, 3.8, -16], [  6, 0.5,  12],   [-6,  0.5, -16],
];

export class Targets {
  constructor(scene) {
    this.scene      = scene;
    this._targets   = [];
    this._queue     = [];
    this._orbBullets = [];
    this._geo       = new THREE.SphereGeometry(RADIUS, 10, 7);
    this._debGeo    = new THREE.SphereGeometry(0.09, 5, 4);
    this._shockGeo  = new THREE.SphereGeometry(0.15, 8, 6);
    this._orbBulGeo = new THREE.SphereGeometry(0.18, 6, 5);
    this._orbBulMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    this._usedSpots = new Set();

    for (let i = 0; i < MAX_TARGETS; i++) this._spawnTarget();
  }

  _randomWaypoint() {
    return new THREE.Vector3(
      (Math.random() - 0.5) * MAP_HALF * 2,
      Y_MIN + Math.random() * (Y_MAX - Y_MIN),
      (Math.random() - 0.5) * MAP_HALF * 2,
    );
  }

  _randomSpot() {
    const available = SPAWN_SPOTS.filter((_, i) => !this._usedSpots.has(i));
    if (!available.length) return null;
    const idx = SPAWN_SPOTS.indexOf(available[Math.floor(Math.random() * available.length)]);
    this._usedSpots.add(idx);
    return { idx, pos: new THREE.Vector3(...SPAWN_SPOTS[idx]) };
  }

  _makeHealthBar() {
    const group = new THREE.Group();

    const bgMat  = new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false });
    const bg     = new THREE.Mesh(new THREE.PlaneGeometry(BAR_W, BAR_H), bgMat);
    group.add(bg);

    const fillMat = new THREE.MeshBasicMaterial({ color: 0xff55cc, depthTest: false });
    const fill    = new THREE.Mesh(new THREE.PlaneGeometry(BAR_W, BAR_H * 0.65), fillMat);
    fill.position.z = 0.002;
    group.add(fill);

    group.visible = false;
    this.scene.add(group);
    return { group, fill };
  }

  _updateBarFill(tgt) {
    const ratio = tgt.hp / 5;
    tgt.bar.fill.scale.x = ratio;
    tgt.bar.fill.position.x = BAR_W * (ratio - 1) / 2;
    tgt.bar.fill.material.color.setHex(
      ratio > 0.6 ? 0xff55cc : ratio > 0.3 ? 0xff1199 : 0xcc0055
    );
  }

  _spawnTarget() {
    const spot = this._randomSpot();
    if (!spot) return;
    const mat  = new THREE.MeshLambertMaterial({ color: HIT_COLORS[0], emissive: 0x551133 });
    const mesh = new THREE.Mesh(this._geo, mat);
    const center = spot.pos.clone();
    center.y += 0.5;
    mesh.position.copy(center);
    this.scene.add(mesh);

    const bar = this._makeHealthBar();

    this._targets.push({
      mesh, mat, hp: 5, spotIdx: spot.idx,
      center: center.clone(),
      phase: Math.random() * Math.PI * 2,
      waypoint: this._randomWaypoint(),
      speed: MOVE_SPEED_MIN + Math.random() * (MOVE_SPEED_MAX - MOVE_SPEED_MIN),
      bar,
      shootTimer: Math.random() * SHOOT_INTERVAL,
    });
  }

  testBullet(pos) {
    for (let i = this._targets.length - 1; i >= 0; i--) {
      const t = this._targets[i];
      if (t.mesh.position.distanceTo(pos) < RADIUS + 0.05) {
        t.hp--;
        if (t.hp <= 0) {
          this._explode(t.mesh.position.clone());
          this.scene.remove(t.mesh);
          this.scene.remove(t.bar.group);
          this._usedSpots.delete(t.spotIdx);
          this._targets.splice(i, 1);
          this._queue.push(RESPAWN_DELAY);
        } else {
          t.mat.color.setHex(HIT_COLORS[5 - t.hp]);
          t.bar.group.visible = true;
          this._updateBarFill(t);
        }
        return true;
      }
    }
    return false;
  }

  _spawnOrbBullet(from, playerPos) {
    const dir = new THREE.Vector3().subVectors(playerPos, from).normalize();
    const mesh = new THREE.Mesh(this._orbBulGeo, this._orbBulMat);
    mesh.position.copy(from);
    this.scene.add(mesh);
    this._orbBullets.push({ mesh, vel: dir.multiplyScalar(ORB_BULLET_SPD) });
  }

  _explode(pos) {
    const shockMat = new THREE.MeshBasicMaterial({ color: 0xff44aa, transparent: true, opacity: 0.9, wireframe: true });
    const shock = new THREE.Mesh(this._shockGeo, shockMat);
    shock.position.copy(pos);
    this.scene.add(shock);

    const debris = [];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(this._debGeo, new THREE.MeshBasicMaterial({ color: 0xff44cc }));
      m.position.copy(pos);
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        Math.random() * 9 + 3,
        (Math.random() - 0.5) * 16
      );
      this.scene.add(m);
      debris.push({ mesh: m, vel: v });
    }

    const light = new THREE.PointLight(0xff44cc, 14, 12);
    light.position.copy(pos);
    this.scene.add(light);

    this._particles = this._particles || [];
    this._particles.push({ shock, shockMat, debris, light, life: 0.55 });
  }

  update(realDt, timeBubbles, camera, playerPos, orbsShoot) {
    for (let i = this._queue.length - 1; i >= 0; i--) {
      this._queue[i] -= realDt;
      if (this._queue[i] <= 0) {
        this._queue.splice(i, 1);
        this._spawnTarget();
      }
    }

    const t = performance.now() / 1000;
    for (const tgt of this._targets) {
      const tScale = timeBubbles ? timeBubbles.timeScaleAt(tgt.center) : 1.0;
      const eDt = realDt * tScale;

      const toWP = new THREE.Vector3().subVectors(tgt.waypoint, tgt.center);
      const dist = toWP.length();
      if (dist < 0.5) {
        tgt.waypoint = this._randomWaypoint();
      } else {
        const step = Math.min(tgt.speed * eDt, dist);
        tgt.center.addScaledVector(toWP.normalize(), step);
        tgt.center.x = Math.max(-MAP_HALF, Math.min(MAP_HALF, tgt.center.x));
        tgt.center.z = Math.max(-MAP_HALF, Math.min(MAP_HALF, tgt.center.z));
        tgt.center.y = Math.max(Y_MIN, Math.min(Y_MAX, tgt.center.y));
      }

      tgt.mesh.position.copy(tgt.center);
      tgt.mesh.position.y += Math.sin(t * BOB_SPEED + tgt.phase) * BOB_AMP;
      tgt.mesh.rotation.y += eDt * 0.6;

      // Health bar — billboard toward camera
      if (tgt.bar.group.visible && camera) {
        tgt.bar.group.position.copy(tgt.mesh.position);
        tgt.bar.group.position.y += RADIUS + 0.35;
        tgt.bar.group.lookAt(camera.position);
      }

      // Orb shooting
      if (orbsShoot && playerPos) {
        tgt.shootTimer -= realDt;
        if (tgt.shootTimer <= 0) {
          tgt.shootTimer = SHOOT_INTERVAL * (0.7 + Math.random() * 0.6);
          this._spawnOrbBullet(tgt.mesh.position.clone(), playerPos.clone());
        }
      }
    }

    // Orb bullets
    for (let i = this._orbBullets.length - 1; i >= 0; i--) {
      const b = this._orbBullets[i];
      b.mesh.position.addScaledVector(b.vel, realDt);
      const p = b.mesh.position;
      const oob = p.y < 0 || p.y > 12 || Math.abs(p.x) > 22 || Math.abs(p.z) > 22;
      if (oob) {
        this.scene.remove(b.mesh);
        this._orbBullets.splice(i, 1);
      }
    }

    if (!this._particles) this._particles = [];
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life -= realDt;
      const f = p.life / 0.55;
      if (p.life <= 0) {
        this.scene.remove(p.shock);
        for (const d of p.debris) this.scene.remove(d.mesh);
        this.scene.remove(p.light);
        this._particles.splice(i, 1);
        continue;
      }
      p.shock.scale.setScalar(1 + (1 - f) * 7);
      p.shockMat.opacity = f * 0.9;
      for (const d of p.debris) {
        d.vel.y -= 18 * realDt;
        d.mesh.position.addScaledVector(d.vel, realDt);
        if (d.mesh.position.y < 0) { d.mesh.position.y = 0; d.vel.y = 0; }
      }
      p.light.intensity = f * 14;
    }
  }
}
