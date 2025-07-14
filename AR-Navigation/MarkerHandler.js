scene.addEventListener('markerFound', (e) => {
  const marker = e.target;
  const preset = marker.getAttribute('preset');
  const markerId = marker.id;

  console.log('[MarkerHandler] Marker found:', preset, markerId);

  function tryStoreNodeAndRedirect(retries = 10) {
    if (window.extractedNodes && window.extractedNodes.length > 0) {
      let nodeId;
      if (preset === 'hiro') nodeId = window.extractedNodes[0]?.id;
      else if (preset === 'kanji') nodeId = window.extractedNodes[1]?.id;

      console.log('[MarkerHandler] Detected nodeId:', nodeId);

      sessionStorage.setItem('detectedMarkerPreset', preset);
      sessionStorage.setItem('nodeId', nodeId);
      sessionStorage.setItem('markerId', markerId);

      // Stop webcam
      const arSystem = scene.systems["arjs"];
      if (arSystem?.arToolkitSource?.domElement?.srcObject) {
        arSystem.arToolkitSource.domElement.srcObject.getTracks().forEach(track => track.stop());
        console.log('[AR.js] Webcam tracks stopped.');
      }

      // Redirect
      setTimeout(() => {
        console.log('[AR.js] Redirecting to WebXR scene...');
        window.location.href = 'webxr.html';
      }, 1000);

    } else if (retries > 0) {
      console.warn('[MarkerHandler] extractedNodes not ready. Retrying...');
      setTimeout(() => tryStoreNodeAndRedirect(retries - 1), 200);
    } else {
      console.error('[MarkerHandler] Failed to get nodeId from extractedNodes.');
    }
  }

  tryStoreNodeAndRedirect();
});
