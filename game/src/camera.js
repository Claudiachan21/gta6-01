// Third-person follow camera: drag the mouse to orbit, scroll-free fixed
// distances per mode (on foot, driving), smoothed follow, and a shake
// impulse for crashes and gunfire. Entering or leaving a car eases the
// camera between the two distances instead of snapping, and the field of
// view widens as speed rises so fast driving feels fast.
import * as THREE from 'three';

export function createCameraRig(camera) {
  return {
    camera,
    yaw: Math.PI,
    pitch: 0.32,
    dist: 9,
    shake: 0,
    target: new THREE.Vector3(),
    mode: 'foot',
    blend: 1,
    fov: 60,
  };
}

/** Add a shake impulse (0..1). */
export function addShake(rig, amount) {
  rig.shake = Math.min(1, rig.shake + amount);
}

/**
 * Follow `targetPos` from behind the rig's yaw. `driving` pulls the camera
 * further back; `look` is the mouse drag delta for this frame. `speedNorm`
 * (0..1) widens the field of view as the car picks up speed.
 */
export function updateCamera(dt, rig, targetPos, driving, look, speedNorm = 0) {
  rig.yaw -= look.dx * 0.005;
  rig.pitch = Math.max(0.08, Math.min(1.1, rig.pitch + look.dy * 0.004));
  const mode = driving ? 'car' : 'foot';
  if (mode !== rig.mode) {
    rig.mode = mode;
    rig.blend = 0;
  }
  rig.blend = Math.min(1, rig.blend + dt * 2.4);
  const ease = rig.blend * rig.blend * (3 - 2 * rig.blend);
  const wantDist = driving ? 8.5 + 2.5 * ease : 11 - 2.5 * ease;
  rig.dist += (wantDist - rig.dist) * Math.min(1, dt * 3);
  const wantFov = 60 + (driving ? speedNorm * 8 : 0);
  rig.fov += (wantFov - rig.fov) * Math.min(1, dt * 4);
  if (Math.abs(rig.camera.fov - rig.fov) > 0.05) {
    rig.camera.fov = rig.fov;
    rig.camera.updateProjectionMatrix();
  }
  const eye = new THREE.Vector3(
    targetPos.x - Math.sin(rig.yaw) * Math.cos(rig.pitch) * rig.dist,
    targetPos.y + 2 + Math.sin(rig.pitch) * rig.dist,
    targetPos.z - Math.cos(rig.yaw) * Math.cos(rig.pitch) * rig.dist,
  );
  if (eye.y < 1.6) eye.y = 1.6;
  rig.target.lerp(new THREE.Vector3(targetPos.x, targetPos.y + 1.6, targetPos.z), Math.min(1, dt * 8));
  rig.shake = Math.max(0, rig.shake - dt * 2.2);
  if (rig.shake > 0) {
    eye.x += (Math.random() - 0.5) * rig.shake * 0.5;
    eye.y += (Math.random() - 0.5) * rig.shake * 0.4;
  }
  rig.camera.position.lerp(eye, Math.min(1, dt * 10));
  rig.camera.lookAt(rig.target);
}

/** Point the camera at a fixed vista (title screen, cover shot). */
export function orbitCamera(dt, rig, centre, radius, height, speed, time) {
  const angle = time * speed;
  rig.camera.position.set(
    centre.x + Math.sin(angle) * radius,
    height,
    centre.z + Math.cos(angle) * radius,
  );
  rig.camera.lookAt(centre.x, 4, centre.z);
  void dt;
}
