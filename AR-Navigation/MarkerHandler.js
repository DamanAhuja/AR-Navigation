document.addEventListener('markerFound', (e) => {
  const preset = e.detail.preset;
  const svgNodes = window.extractedNodes || [];
  let markerId;

  // Map preset to node ID
  if (preset === 'hiro') markerId = svgNodes[0]?.id;
  else if (preset === 'kanji') markerId = svgNodes[1]?.id;

  console.log("Detected marker:", preset, "-> Marker ID:", markerId);

  // Retrieve markerGroup from somewhere (maybe event or existing structure?)
  const markerGroup = window.markerMap?.[preset];

  if (!markerGroup) {
    console.warn(`[AR] No markerGroup found for preset: ${preset}`);
    return;
  }

  window.markerMap = window.markerMap || {};
  window.markerMap[preset] = markerGroup;

  // Only update world origin once
  if (!window.worldOrigin && markerId && typeof window.setUserLocation === 'function') {
    window.setUserLocation(markerId);

    const match = window.nodeMap[markerId];

    if (match && markerGroup) {
      console.log('[DEBUG] Marker world position:', markerGroup.position);

      window.worldOrigin = {
        x: match.x,
        y: match.y,
        worldPosition: markerGroup.position.clone(),
        rotationY: markerGroup.rotation.y || 0
      };

      const converted = svgToWorld(match.x, match.y);
      console.log('[DEBUG] Converted world from SVG:', converted);

      console.log('[AR] World origin set:', window.worldOrigin);

    } else {
      console.warn('[AR] Failed to set world origin - match or markerGroup not found');
    }

  } else if (window.worldOrigin) {
    console.log('[AR] World origin already set. Skipping update.');
  }
});
