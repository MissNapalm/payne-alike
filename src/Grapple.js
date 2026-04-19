import * as THREE from 'three';

const HOOK_SPEED  = 48;
const PULL_FORCE  = 30;
const MAX_RANGE   = 45;

export class Grapple {
  constructor(scene) {
    this.scene    = scene;
    this.state    = 'idle'; // 'idle' | 'flying' | 'attached'
    this.hookPos  = new THREE.Vector3();
    this._hookVel = new THREE.Vector3();
    this._prevHookPos = new THREE.Vector3();

    // rope line
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this._rope = new THREE.Line(geo,
      new THREE.LineBasicMaterial({ color: 0xffcc33, linewidth: 2 }));
    this._rope.visible = false;
    scene.add(this._rope);

    // flying hook tip
    this._tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffdd55 })
    );
    this._tip.visible = false;
    scene.add(this._tip);

    this._ray = new THREE.Ray();
  }

  get isActive()   { return this.state !== 'idle'; }
  get isAttached() { return this.state === 'attached'; }

  shoot(origin, direction) {
    this.state = 'flying';
    this.hookPos.copy(origin);
    this._prevHookPos.copy(origin);
    this._hookVel.copy(direction).normalize().multiplyScalar(HOOK_SPEED);
    this._tip.visible  = true;
    this._rope.visible = true;
  }

  release() {
    this.state = 'idle';
    this._tip.visible  = false;
    this._rope.visible = false;
  }

  update(dt, playerPos, boxes) {
    if (this.state === 'idle') return;

    if (this.state === 'flying') {
      this._prevHookPos.copy(this.hookPos);
      this.hookPos.addScaledVector(this._hookVel, dt);

      if (this._checkHit(boxes)) {
        this.state = 'attached';
        this._tip.visible = false;
      } else if (this.hookPos.distanceTo(playerPos) > MAX_RANGE ||
                 this.hookPos.y < -1) {
        this.release();
        return;
      }
      this._tip.position.copy(this.hookPos);
    }

    this._updateRope(playerPos);
  }

  // Call every frame when attached — mutates vel
  applyPull(playerPos, vel, dt) {
    if (!this.isAttached) return;
    const toHook = this.hookPos.clone().sub(playerPos);
    const dist = toHook.length();
    if (dist < 0.8) return;
    vel.addScaledVector(toHook.normalize(), PULL_FORCE * dt);
  }

  _checkHit(boxes) {
    const dir = this._hookVel.clone().normalize();
    const travelDist = this._prevHookPos.distanceTo(this.hookPos);
    this._ray.set(this._prevHookPos, dir);

    const hitPt = new THREE.Vector3();
    for (const b of boxes) {
      if (this._ray.intersectBox(b, hitPt)) {
        if (this._prevHookPos.distanceTo(hitPt) <= travelDist + 0.05) {
          this.hookPos.copy(hitPt);
          return true;
        }
      }
    }
    // room bounds / ceiling / floor
    if (Math.abs(this.hookPos.x) >= 19.4 || Math.abs(this.hookPos.z) >= 19.4 ||
        this.hookPos.y >= 9.8 || this.hookPos.y <= 0.05) {
      return true;
    }
    return false;
  }

  _updateRope(playerPos) {
    const a = this._rope.geometry.attributes.position.array;
    // rope from shoulder height
    a[0] = playerPos.x; a[1] = playerPos.y + 0.85; a[2] = playerPos.z;
    a[3] = this.hookPos.x; a[4] = this.hookPos.y; a[5] = this.hookPos.z;
    this._rope.geometry.attributes.position.needsUpdate = true;
  }
}
