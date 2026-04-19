import * as THREE from 'three';

const BUBBLE_RADIUS   = 6;
const GRENADE_GRAVITY = -22;
const THROW_SPEED     = 11;

export const BUBBLE_LIFE         = 6;
export const BUBBLE_SCALE        = 0.1;   // player / target slow (same as Q)
const        BUBBLE_BULLET_SCALE = 0.002; // bullets crawl at ~2 units/sec inside

export class TimeBubbles {
  constructor(scene) {
    this.scene    = scene;
    this.bubbles  = [];
    this.grenades = [];
    this._fillGeo    = new THREE.SphereGeometry(BUBBLE_RADIUS, 22, 15);
    this._wireGeo    = new THREE.SphereGeometry(BUBBLE_RADIUS * 1.02, 11, 8);
    this._grenadeGeo = new THREE.SphereGeometry(0.12, 7, 5);
    this._grenadeMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
  }

  throwGrenade(origin, dir) {
    const mesh = new THREE.Mesh(this._grenadeGeo, this._grenadeMat);
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.grenades.push({
      mesh,
      pos: origin.clone(),
      vel: dir.clone().multiplyScalar(THROW_SPEED),
      bounces: 0,
    });
  }

  spawn(pos) {
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x2233ff, transparent: true, opacity: 0.07, side: THREE.BackSide,
    });
    const fill = new THREE.Mesh(this._fillGeo, fillMat);
    fill.position.copy(pos);
    this.scene.add(fill);

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x88aaff, transparent: true, opacity: 0.40, wireframe: true,
    });
    const wire = new THREE.Mesh(this._wireGeo, wireMat);
    wire.position.copy(pos);
    this.scene.add(wire);

    const light = new THREE.PointLight(0x4466ff, 2.0, BUBBLE_RADIUS * 2.5);
    light.position.copy(pos);
    this.scene.add(light);

    this.bubbles.push({ pos: pos.clone(), fill, fillMat, wire, wireMat, light, life: BUBBLE_LIFE });
  }

  timeScaleAt(pos) {
    for (const b of this.bubbles) {
      if (b.pos.distanceTo(pos) < BUBBLE_RADIUS) return BUBBLE_SCALE;
    }
    return 1.0;
  }

  bulletScaleAt(pos) {
    for (const b of this.bubbles) {
      if (b.pos.distanceTo(pos) < BUBBLE_RADIUS) return BUBBLE_BULLET_SCALE;
    }
    return 1.0;
  }

  update(realDt, boxes) {
    // ── grenades ─────────────────────────────────────────────────────────────
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];

      // Idle countdown after final bounce
      if (g.resting) {
        g.restTimer -= realDt;
        if (g.restTimer <= 0) {
          this.scene.remove(g.mesh);
          this.grenades.splice(i, 1);
          this.spawn(g.pos);
        }
        continue;
      }

      // If grenade is inside any time bubble, freeze it completely (don't integrate).
      const insideBubble = this.timeScaleAt(g.pos) < 1.0;
      if (insideBubble) {
        // Stop movement and pause any resting countdowns while inside.
        g.vel.set(0, 0, 0);
        g.frozen = true;
        g.resting = false;
        delete g.restTimer;
        g.mesh.position.copy(g.pos);
        continue; // skip physics/bounce handling while frozen
      } else if (g.frozen) {
        // left the bubble — resume normal physics next frame
        g.frozen = false;
      }

      // integrate physics
      g.vel.y += GRENADE_GRAVITY * realDt;
      g.pos.addScaledVector(g.vel, realDt);
      g.mesh.position.copy(g.pos);

      let bounce = false;
      if (g.pos.y <= 0) {
        g.pos.y = 0;
        bounce = true;
      } else if (boxes) {
        for (const box of boxes) {
          if (box.containsPoint(g.pos)) {
            g.pos.y = box.max.y;
            bounce = true;
            break;
          }
        }
      }

      if (bounce) {
        if (g.bounces < 3) {
          g.vel.y  = Math.abs(g.vel.y) * 0.55;
          g.vel.x *= 0.70;
          g.vel.z *= 0.70;
          g.bounces++;
        } else {
          g.resting   = true;
          g.restTimer = 1.0;
          g.vel.set(0, 0, 0);
        }
      }
    }

    // ── bubbles ───────────────────────────────────────────────────────────────
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.life -= realDt;
      if (b.life <= 0) {
        this.scene.remove(b.fill);
        this.scene.remove(b.wire);
        this.scene.remove(b.light);
        this.bubbles.splice(i, 1);
        continue;
      }
      const t    = b.life / BUBBLE_LIFE;
      const fade = Math.min(1, t * 4);
      b.fillMat.opacity  = 0.07 * fade;
      b.wireMat.opacity  = 0.40 * fade;
      b.light.intensity  = 2.0  * fade;
      const pulse = 1 + Math.sin(b.life * 5) * 0.015;
      b.fill.scale.setScalar(pulse);
      b.wire.scale.setScalar(pulse);
    }
  }
}
