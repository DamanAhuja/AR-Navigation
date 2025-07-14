document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene');
  if (!scene) {
    console.error('[MarkerHandler] <a-scene> not found.');
    return;
  }

  scene.addEventListener('markerFound', (e) => {
    const marker = e.target;
    const preset = marker.getAttribute('preset');
    const markerId = marker.id;

    console.log('[MarkerHandler] Marker found:', preset, markerId);

    // Store marker ID only
    sessionStorage.setItem('markerId', markerId);
    sessionStorage.setItem('detectedMarkerPreset', preset);

    // Stop webcam (cleanly exit AR.js)
    const arSystem = scene.systems?.arjs;
    if (arSystem?.arToolkitSource?.domElement?.srcObject) {
      arSystem.arToolkitSource.domElement.srcObject.getTracks().forEach(track => track.stop());
      console.log('[AR.js] Webcam tracks stopped.');
    }

    // Redirect to WebXR page
    console.log('[MarkerHandler] Redirecting to WebXR...');
    window.location.href = 'webxr.html';
  });
});
