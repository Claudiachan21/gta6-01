// Third-person follow camera: drag to orbit, fixed distances per mode,
// smoothed follow, shake impulses, speed-driven FOV kick, photo mode.
import * as THREE from 'three';

export function createCameraRig(camera) {
  return {
    camera,
    yaw: Math.PI,
    pitch: 0.32,
    dist: 9,
    shake: 0,
    fov: 60,
    fovOverride: null,
    photo: false,
    target: new THREE.Vector3(),
  };
}

/** Add a shake impulse (0..1). */
export function addShake(rig, amount) {
  rig.shake = Math.min(1, rig.shake + amount);
}

/**
 * Follow `targetPos` from behind the rig's yaw. `driving` pulls the camera
 * further back; `look` is the mouse drag delta for this frame; `speedNorm`
 * (0..1) drives the FOV kick. In photo mode the camera orbits the target
 * instead of following behind it.
 */
export function updateCamera(dt, rig, targetPos, driving, look, speedNorm) {
  rig.yaw -= look.dx * 0.005;
  rig.pitch = Math.max(0.08, Math.min(1.1, rig.pitch + look.dy * 0.004));
  const wantDist = rig.photo ? 11 : driving ? 11 : 9;
  rig.dist += (wantDist - rig.dist) * Math.min(1, dt * 3);
  const wantFov = rig.fovOverride ?? (rig.photo ? 55 : 60 + (driving ? (speedNorm ?? 0) * 12 : 0));
  if (Math.abs(wantFov - rig.fov) > 0.2) {
    rig.fov += (wantFov - rig.fov) * Math.min(1, dt * 4);
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
export function orbitCamera(dt, rig, centre, radius, height, speed, time, phase = 0) {
  const angle = phase + time * speed;
  rig.camera.position.set(
    centre.x + Math.sin(angle) * radius,
    height,
    centre.z + Math.cos(angle) * radius,
  );
  rig.camera.lookAt(centre.x, 4, centre.z);
  void dt;
}
