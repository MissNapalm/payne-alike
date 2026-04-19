export class Input {
  constructor() {
    this.keys = {};
    this.dx = 0;
    this.dy = 0;
    this.scroll = 0;
    this.locked = false;
    this.mouseButtons = 0;

    window.addEventListener('keydown',   e => { this.keys[e.code] = true; });
    window.addEventListener('keyup',     e => { this.keys[e.code] = false; });
    window.addEventListener('mousedown', e => { this.mouseButtons |=  (1 << e.button); });
    window.addEventListener('mouseup',   e => { this.mouseButtons &= ~(1 << e.button); });
    window.addEventListener('mousemove', e => {
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    window.addEventListener('wheel', e => { this.scroll += e.deltaY; }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement != null;
    });
  }

  key(code)      { return !!this.keys[code]; }
  mouseBtn(btn)  { return !!(this.mouseButtons & (1 << btn)); }

  consumeMouse() {
    const dx = this.dx, dy = this.dy, scroll = this.scroll;
    this.dx = 0; this.dy = 0; this.scroll = 0;
    return { dx, dy, scroll };
  }
}
