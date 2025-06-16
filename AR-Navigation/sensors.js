window.userPosition = { x: 0, y: 0 };
window.stepCount = 0;
let lastMagnitude = 0;
let isRising = false;
let cameraHeading = 0;
let hasMarkerBeenScanned = false; // Flag to track if a marker has been scanned
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

function syncUserPosition() {
  if (window.userMarker) {
    const latLng = window.userMarker.getLatLng();
    if (latLng) {
      const leafletX = latLng.lng;
      const leafletY = latLng.lat;
      window.userPosition.x = leafletX / scaleFactorX;
      window.userPosition.y = (svgHeight - leafletY) / scaleFactorY;
      console.log('[Sensors] Synced userPosition from userMarker:', window.userPosition, 'Leaflet coords:', [leafletY, leafletX]);
    } else {
      console.warn('[Sensors] userMarker latLng not available');
    }
  } else {
    console.warn('[Sensors] userMarker not available for syncing');
  }
}

// Override window.setUserLocation to create userMarker if it doesn't exist
const originalSetUserLocation = window.setUserLocation;
window.setUserLocation = function (markerId) {
  if (!window.nodeMap || !window.nodeMap[markerId]) {
    console.warn('[Sensors] nodeMap or markerId not found:', markerId);
    return;
  }

  const match = window.nodeMap[markerId];
  if (!window.userMarker) {
    // Create userMarker and add to map
    window.userMarker = L.circleMarker([match.lat, match.lng], {
      radius: 5,
      color: 'blue',
      fillColor: 'blue',
      fillOpacity: 0.8
    }).addTo(map).bindPopup("You are here");
    console.log('[Sensors] Created userMarker at:', [match.lat, match.lng]);
  } else {
    // Update existing userMarker position
    window.userMarker.setLatLng([match.lat, match.lng]);
    console.log('[Sensors] Updated userMarker to:', [match.lat, match.lng]);
  }

  // Mark that a marker has been scanned
  hasMarkerBeenScanned = true;

  // Sync userPosition
  syncUserPosition();

  // Call original setUserLocation if it exists
  if (originalSetUserLocation) {
    originalSetUserLocation(markerId);
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
  // Only update position if a marker has been scanned
  if (!hasMarkerBeenScanned) {
    console.log('[Sensors] Waiting for first marker scan before updating position');
    return;
  }

  const northOffset = getNorthOffset();
  const adjustedHeading = (cameraHeading + northOffset) % 360;
  const rad = (adjustedHeading * Math.PI) / 180;
  const svgScale = 10;
  window.userPosition.x += stepLength * Math.sin(rad) * svgScale;
  window.userPosition.y -= stepLength * Math.cos(rad) * svgScale;
  console.log('[Sensors] Camera heading:', cameraHeading, 'Adjusted heading:', adjustedHeading);
  console.log('[Sensors] Updated position (SVG coords):', window.userPosition);
  updateMapMarker(window.userPosition);
}

function updateMapMarker(position) {
  if (window.userMarker && hasMarkerBeenScanned) {
    const leafletX = position.x * scaleFactorX;
    const leafletY = (svgHeight - position.y) * scaleFactorY;
    window.userMarker.setLatLng([leafletY, leafletX]);
    console.log('[Sensors] Updated Leaflet marker:', [leafletY, leafletX]);
  } else {
    console.log('[Sensors] Skipping updateMapMarker: userMarker not initialized or no marker scanned');
  }
}

window.addEventListener('devicemotion', (event) => {
  if (event.accelerationIncludingGravity) {
    detectStep(event.accelerationIncludingGravity);
  } else {
    console.warn('[Sensors] No acceleration data available');
  }
});

let alpha = 0, beta = 0, gamma = 0;
window.addEventListener('deviceorientation', (event) => {
  if (event.alpha !== null && event.beta !== null && event.gamma !== null) {
    alpha = event.alpha;
    beta = event.beta;
    gamma = event.gamma;
    if (Math.abs(beta) > 45) {
      if (Math.abs(gamma) > 45) {
        cameraHeading = (alpha + (gamma > 0 ? 90 : -90)) % 360;
      } else {
        cameraHeading = alpha;
      }
    } else {
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
