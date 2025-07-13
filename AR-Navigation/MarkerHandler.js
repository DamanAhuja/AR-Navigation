document.addEventListener('DOMContentLoaded', () => {
scene.addEventListener('markerFound', (e) => {
  const marker = e.target;
  const preset = marker.getAttribute('preset');
  const markerId = marker.id;

  let nodeId;
  if (preset === 'hiro') nodeId = window.extractedNodes?.[0]?.id;
  else if (preset === 'kanji') nodeId = window.extractedNodes?.[1]?.id;

  console.log('Detected marker:', preset, '-> Marker ID:', nodeId);

  // Store data for the next scene
  sessionStorage.setItem('detectedMarkerPreset', preset);
  sessionStorage.setItem('nodeId', nodeId);
  sessionStorage.setItem('markerId', markerId);

  // Release AR.js webcam
  const arScene = document.querySelector('a-scene');
  if (arScene && arScene.systems && arScene.systems["arjs"]) {
    const arSystem = arScene.systems["arjs"];
    if (arSystem.arToolkitSource && arSystem.arToolkitSource.domElement) {
      const video = arSystem.arToolkitSource.domElement;
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        console.log('[AR.js] Webcam tracks stopped.');
      }
    }
  }

  // ⏱️ Wait before redirecting
  setTimeout(() => {
    console.log('[AR.js] Redirecting to WebXR scene...');
    window.location.href = 'webxr.html';
  }, 1000); // 1 second delay is usually safe
});
});
