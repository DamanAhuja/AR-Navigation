// Sensor variables
let userPosition = { x: 0, y: 0 }; // Current position in SVG coordinates
let stepCount = 0;
let currentHeading = 0;
const stepLength = 0.7; // Average step length in meters
let lastStepTime = 0;
const stepThreshold = 1.5; // Acceleration threshold (m/s²)
const minStepInterval = 300; // Minimum time between steps (ms)
const svgHeight = 450; // From leaflet.js
const scaleFactorX = 230 / 230; // From leaflet.js
const scaleFactorY = 450 / 450; // From leaflet.js

// Request sensor permissions
async function requestSensorPermissions() {
  try {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      await DeviceMotionEvent.requestPermission();
      await DeviceOrientationEvent.requestPermission();
      console.log('Sensor permissions granted');
    }
  } catch (error) {
    console.error('Sensor permission error:', error);
  }
}

// Step detection
function detectStep(accel) {
  const magnitude = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
  const currentTime = Date.now();
  if (magnitude > stepThreshold && currentTime - lastStepTime > minStepInterval) {
    stepCount++;
    lastStepTime = currentTime;
    updatePosition();
  }
}

// Update position using PDR
function updatePosition() {
  const rad = (currentHeading * Math.PI) / 180; // Convert heading to radians
  // Update position in SVG coordinates (meters to SVG units)
  const svgScale = 10; // Adjust based on your SVG map's scale (e.g., 1 meter = 10 SVG units)
  userPosition.x += stepLength * Math.sin(rad) * svgScale;
  userPosition.y += stepLength * Math.cos(rad) * svgScale;
  console.log('Updated position (SVG coords):', userPosition);
  updateMapMarker(userPosition);
}

// Update userMarker on Leaflet map
function updateMapMarker(position) {
  if (window.userMarker) {
    // Convert SVG coordinates to Leaflet coordinates (apply leaflet.js scaling)
    const leafletX = position.x * scaleFactorX;
    const leafletY = (svgHeight - position.y) * scaleFactorY;
    window.userMarker.setLatLng([leafletY, leafletX]);
    console.log('Updated Leaflet marker:', [leafletY, leafletX]);
  }
}

// Sensor event listeners
window.addEventListener('devicemotion', (event) => {
  if (event.accelerationIncludingGravity) {
    detectStep(event.accelerationIncludingGravity);
  }
});

window.addEventListener('deviceorientation', (event) => {
  // Use north reference from svg.js to align heading
  currentHeading = event.webkitCompassHeading || event.alpha || 0;
  if (window.north) {
    // Adjust heading relative to SVG map's north (window.north)
    // This assumes north is at 0° in SVG coordinates; adjust if needed
    currentHeading = (currentHeading + 360) % 360;
  }
  console.log('Current heading:', currentHeading);
});

// Trigger permissions on user action (e.g., routeToDestination)
document.addEventListener('DOMContentLoaded', () => {
  const goButton = document.querySelector('#routing-ui button');
  if (goButton) {
    goButton.addEventListener('click', requestSensorPermissions);
  }
});
