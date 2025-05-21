// Sensor variables
window.userPosition = { x: 0, y: 0 }; // Current position in SVG coordinates
window.stepCount = 0;
let lastMagnitude = 0;
let isRising = false;
let currentHeading = 0;
const stepLength = 0.7; // Average step length in meters
let lastStepTime = 0;
const stepThreshold = 3.0; // Acceleration threshold (m/s²)
const minStepInterval = 300; // Minimum time between steps (ms)
const svgHeight = 450; // From leaflet.js
const scaleFactorX = 230 / 230; // From leaflet.js
const scaleFactorY = 450 / 450; // From leaflet.js

// Request sensor permissions
window.requestSensorPermissions = async function () {
  console.log('Attempting to request sensor permissions...');
  try {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      const motionPermission = await DeviceMotionEvent.requestPermission();
      console.log('DeviceMotionEvent permission:', motionPermission);
      if (motionPermission !== 'granted') {
        console.error('DeviceMotionEvent permission denied');
        return false;
      }
    }
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const orientationPermission = await DeviceOrientationEvent.requestPermission();
      console.log('DeviceOrientationEvent permission:', orientationPermission);
      if (orientationPermission !== 'granted') {
        console.error('DeviceOrientationEvent permission denied');
        return false;
      }
    }
    console.log('Sensor permissions granted');
    return true;
  } catch (error) {
    console.error('Sensor permission error:', error);
    return false;
  }
};


function detectStep(accel) {
  const magnitude = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
  const currentTime = Date.now();

  const rising = magnitude > lastMagnitude;

  if (!rising && isRising && magnitude > stepThreshold && currentTime - lastStepTime > minStepInterval) {
    // Peak detected
    window.stepCount++;
    lastStepTime = currentTime;
    updatePosition();
    console.log('Step counted:', window.stepCount);
  }

  isRising = rising;
  lastMagnitude = magnitude;
}

// Step detection
/*function detectStep(accel) {
  const magnitude = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
  const currentTime = Date.now();
  if (magnitude > stepThreshold && currentTime - lastStepTime > minStepInterval) {
    window.stepCount++;
    console.log(stepCount);
    lastStepTime = currentTime;
    updatePosition();
  }
}*/

// Update position using PDR
function updatePosition() {
  const rad = (currentHeading * Math.PI) / 180; // Convert heading to radians
  const svgScale = 10; // Adjust based on your SVG map's scale (e.g., 1 meter = 10 SVG units)
  window.userPosition.x += stepLength * Math.sin(rad) * svgScale;
  window.userPosition.y += stepLength * Math.cos(rad) * svgScale;
  console.log('Updated position (SVG coords):', window.userPosition);
  updateMapMarker(window.userPosition);
}

// Update userMarker on Leaflet map
function updateMapMarker(position) {
  if (window.userMarker) {
    const leafletX = position.x * scaleFactorX;
    const leafletY = (svgHeight - position.y) * scaleFactorY;
    window.userMarker.setLatLng([leafletY, leafletX]);
    console.log('Updated Leaflet marker:', [leafletY, leafletX]);
  }
}

// Sensor event listeners
window.addEventListener('devicemotion', (event) => {
  if (event.accelerationIncludingGravity) {
   // detectStep(event.accelerationIncludingGravity);
     detectStep(event.acceleration);
  }
});

window.addEventListener('deviceorientation', (event) => {
  currentHeading = event.webkitCompassHeading || event.alpha || 0;
  if (window.north) {
    currentHeading = (currentHeading + 360) % 360; // Adjust based on window.north if needed
  }
  console.log('Current heading:', currentHeading);
});

// Ensure permissions are requested on button click
document.addEventListener('DOMContentLoaded', () => {
  console.log('sensors.js loaded, waiting for Go button click');
  const goButton = document.querySelector('#routing-ui button');
  if (goButton) {
    console.log('Go button found, attaching event listener');
    goButton.addEventListener('click', () => {
      console.log('Go button clicked, requesting permissions');
      window.requestSensorPermissions();
    });
  } else {
    console.error('Go button not found');
  }
});
