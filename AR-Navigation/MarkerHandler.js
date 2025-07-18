scene.addEventListener('markerFound', (e) => {
  const marker = e.target;
  const preset = marker.getAttribute('preset');
  const markerId = marker.id;

  console.log('[MarkerHandler] Marker found:', preset, markerId);

  // 1. Get world position of the marker
  const markerWorldPos = marker.object3D.getWorldPosition(new THREE.Vector3());

  // 2. Map marker ID or preset to known SVG coordinates
  let svgX, svgY;

  // You must define this mapping yourself — example:
  const markerToSvgCoords = {
    'hiro': { x: 150, y: 250 },
    'kanji': { x: 400, y: 100 },
    // Add more marker mappings as needed
  };

  if (markerToSvgCoords[markerId]) {
    svgX = markerToSvgCoords[markerId].x;
    svgY = markerToSvgCoords[markerId].y;
  } else {
    console.warn(`[MarkerHandler] No SVG coordinates mapped for marker ${markerId}`);
    return;
  }

  // 3. Set worldOrigin
  window.worldOrigin = {
    x: svgX,
    y: svgY,
    worldPosition: markerWorldPos.clone()
  };

  console.log('[AR] World origin set:', window.worldOrigin);

  // Optionally save for next page use:
  sessionStorage.setItem('worldOrigin', JSON.stringify({
    x: svgX,
    y: svgY,
    wx: markerWorldPos.x,
    wy: markerWorldPos.y,
    wz: markerWorldPos.z
  }));

  // 4. Stop webcam and redirect
  const arSystem = scene.systems?.arjs;
  if (arSystem?.arToolkitSource?.domElement?.srcObject) {
    arSystem.arToolkitSource.domElement.srcObject.getTracks().forEach(track => track.stop());
    console.log('[AR.js] Webcam tracks stopped.');
  }

  console.log('[MarkerHandler] Redirecting to WebXR...');
  window.location.href = 'webxr.html';
});
