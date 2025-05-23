window.userPosition = { x: 0, y: 0 };
window.stepCount = 0;
let lastMagnitude = 0;
let isRising = false;
let cameraHeading = 0;
const stepLength = 0.7;
let lastStepTime = 0;
const stepThreshold = 3.0;
const minStepInterval = 300;
const svgHeight = 450;
const scaleFactorX = 230 / 230;
const scaleFactorY = 450 / 450;

function getNorthOffset() {
  if (!window.north || typeof window.north.x !== 'number' || typeof window.north.y !== 'number') {
    console.warn('[Sensors] window.north not defined or invalid, assuming north is up');
    return 0;
  }
  const centerX = 115; // 230 / 2
  const centerY = 225; // 450 / 2
  const deltaX = window.north.x - centerX;
  const deltaY = window.north.y - centerY;
  const angle = Math.atan2(deltaX, deltaY) * 180 / Math.PI;
  console.log('[Sensors] window.north:', window.north);
  console.log('[Sensors] Computed northOffset:', angle, 'degrees');
  return angle;
}

window.requestSensorPermissions = async function () {
  console.log('[Sensors] Attempting to request sensor permissions...');
  try {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      const motionPermission = await DeviceMotionEvent.requestPermission();
      console.log('[Sensors] DeviceMotionEvent permission:', motionPermission);
      if (motionPermission !== 'granted') {
        console.error('[Sensors] DeviceMotionEvent permission denied');
        alert('Motion sensor permission denied. Please allow to enable navigation.');
        return false;
      }
    }
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const orientationPermission = await DeviceOrientationEvent.requestPermission();
      console.log('[Sensors] DeviceOrientationEvent permission:', orientationPermission);
      if (orientationPermission !== 'granted') {
        console.error('[Sensors] DeviceOrientationEvent permission denied');
        alert('Orientation sensor permission denied. Please allow to enable navigation.');
        return false;
      }
    }
    console.log('[Sensors] Sensor permissions granted');
    return true;
  } catch (error) {
    console.error('[Sensors] Sensor permission error:', error);
    alert('Error requesting sensor permissions: ' + error.message);
    return false;
  }
};

function detectStep(accel) {
  const magnitude = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
  const currentTime = Date.now();

  const rising = magnitude > lastMagnitude;

  if (!rising && isRising && magnitude > stepThreshold && currentTime - lastStepTime > minStepInterval) {
    window.stepCount++;
    lastStepTime = currentTime;
    updatePosition();
    console.log('[Sensors] Step counted:', window.stepCount);
  }

  isRising = rising;
  lastMagnitude = magnitude;
}

function updatePosition() {
  const northOffset = getNorthOffset();
  const adjustedHeading = (cameraHeading + northOffset) % 360;
  const rad = (adjustedHeading * Math.PI) / 180;
  const svgScale = 10;
  window.userPosition.x += stepLength * Math.sin(rad) * svgScale;
  window.userPosition.y -= stepLength * Math.cos(rad) * svgScale; // Re-add y-inversion for correct mapping
  console.log('[Sensors] Camera heading:', cameraHeading, 'Adjusted heading:', adjustedHeading);
  console.log('[Sensors] Updated position (SVG coords):', window.userPosition);
  updateMapMarker(window.userPosition);
}

function updateMapMarker(position) {
  if (window.userMarker) {
    const leafletX = position.x * scaleFactorX;
    const leafletY = (svgHeight - position.y) * scaleFactorY;
    window.userMarker.setLatLng([leafletY, leafletX]);
    console.log('[Sensors] Updated Leaflet marker:', [leafletY, leafletX]);
  } else {
    console.error('[Sensors] userMarker not initialized in updateMapMarker');
  }
}

window.addEventListener('devicemotion', (event) => {
  if (event.accelerationIncludingGravity) {
    detectStep(event.accelerationIncludingGravity);
  } else {
    console.warn('[Sensors] No acceleration data available');
  }
});

// Compute camera heading from deviceorientation
let alpha = 0, beta = 0, gamma = 0;
window.addEventListener('deviceorientation', (event) => {
  if (event.alpha !== null && event.beta !== null && event.gamma !== null) {
    alpha = event.alpha;
    beta = event.beta;
    gamma = event.gamma;
    // Compute camera heading based on orientation
    if (Math.abs(beta) > 45) { // Phone is vertical (portrait or landscape)
      if (Math.abs(gamma) > 45) { // Landscape
        cameraHeading = (alpha + (gamma > 0 ? 90 : -90)) % 360;
      } else { // Portrait
        cameraHeading = alpha;
      }
    } else { // Phone is flat
      cameraHeading = alpha;
    }
    cameraHeading = (cameraHeading + 360) % 360;
    console.log('[Sensors] Device orientation - alpha:', alpha, 'beta:', beta, 'gamma:', gamma);
    console.log('[Sensors] Computed camera heading:', cameraHeading);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Sensors] sensors.js loaded');
});
