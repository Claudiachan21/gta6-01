// Keyboard + mouse input. Movement is read as axes; one-frame actions are
// exposed through wasPressed(). Screenshot staging can inject a scripted
// override (see shots.js) that replaces the live axes.
import { KEYS } from './config.js';

function matches(codes, set) {
  for (const code of codes) if (set.has(code)) return true;
  return false;
}

export function createInput(canvas) {
  const down = new Set();
  const pressed = new Set();
  let lookDX = 0;
  let lookDY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let mouseDown = false;
  let mousePressed = false;
  const input = {
    /** Scripted axes for staged screenshots; null during normal play. */
    override: null,
    keyDown(code) {
      return down.has(code);
    },
    wasPressed(code) {
      return pressed.has(code);
    },
    mouseWasPressed() {
      return mousePressed;
    },
    mouseIsDown() {
      return mouseDown;
    },
    /** Camera look delta (pixels) since the last call; drag with the mouse. */
    takeLook() {
      const out = { dx: lookDX, dy: lookDY };
      lookDX = 0;
      lookDY = 0;
      return out;
    },
    /** On-foot move axes in camera space: x strafe right, z forward. */
    moveAxes() {
      if (input.override) return input.override.move;
      return {
        x: (matches(KEYS.right, down) ? 1 : 0) - (matches(KEYS.left, down) ? 1 : 0),
        z: (matches(KEYS.forward, down) ? 1 : 0) - (matches(KEYS.back, down) ? 1 : 0),
      };
    },
    /** Driving axes: throttle 1/-1, steer -1..1, handbrake. */
    driveAxes() {
      if (input.override) return input.override.drive;
      return {
        throttle: (matches(KEYS.forward, down) ? 1 : 0) - (matches(KEYS.back, down) ? 1 : 0),
        steer: (matches(KEYS.left, down) ? 1 : 0) - (matches(KEYS.right, down) ? 1 : 0),
        handbrake: matches(KEYS.handbrake, down),
      };
    },
    running() {
      return matches(KEYS.run, down);
    },
    /** Clear one-frame state; called once per frame by the loop. */
    endFrame() {
      pressed.clear();
      mousePressed = false;
    },
  };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    down.add(event.code);
    pressed.add(event.code);
    if (event.code === 'Space') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => down.delete(event.code));
  window.addEventListener('blur', () => down.clear());
  canvas.addEventListener('mousedown', (event) => {
    dragging = true;
    mouseDown = true;
    mousePressed = true;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  window.addEventListener('mousemove', (event) => {
    if (!dragging) return;
    lookDX += event.clientX - lastX;
    lookDY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    mouseDown = false;
  });
  return input;
}
