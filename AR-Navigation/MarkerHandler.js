document.addEventListener('markerFound', (e) => {
  const preset = e.detail.preset;
  const svgNodes = window.extractedNodes || [];
  let markerId;

  // Map preset to node ID
  if (preset === 'hiro') markerId = svgNodes[0]?.id;
  else if (preset === 'kanji') markerId = svgNodes[1]?.id;

  console.log("Detected marker:", preset, "-> Marker ID:", markerId);

   // Update userPosition in sensors.js
   /* const match = window.nodeMap[markerId];
    if (match) {
      window.userPosition = {
        x: match.x / window.scaleFactorX,
        y: window.svgHeight - (match.y / window.scaleFactorY)
      };
      window.stepCount = 0; // Reset step count
      console.log('Reset userPosition:', window.userPosition);
    }*/

  if (markerId && typeof window.setUserLocation === 'function') {
    window.setUserLocation(markerId);

    const match = window.nodeMap[markerId];
    const markerGroup = window.markerMap?.[preset]; 

    if (match && markerGroup) {
      window.worldOrigin = {
        x: match.x,
        y: match.y,
        worldPosition: markerGroup.position.clone(), 
        rotationY: markerGroup.rotation.y || 0        
      };
      console.log('[AR] World origin set:', window.worldOrigin);
    } else {
      console.warn('[AR] Failed to set world origin - match or markerGroup not found');
    }
  }
});
