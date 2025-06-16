document.addEventListener('markerFound', (e) => {
  const marker = e.target;
  const preset = marker.getAttribute('preset'); // e.g., "hiro" or "kanji"
  const svgNodes = window.extractedNodes || [];
  let markerId;

  // Map preset to node ID
  if (preset === 'hiro') markerId = svgNodes[0]?.id; // e.g., "Entrance"
  else if (preset === 'kanji') markerId = svgNodes[1]?.id; // e.g., "Entrance2"

  console.log("Detected marker:", preset, "-> Marker ID:", markerId);

  if (markerId && typeof window.setUserLocation === 'function') {
    window.setUserLocation(markerId);

    // Update userPosition in sensors.js
    const match = window.nodeMap[markerId];
    if (match) {
      window.userPosition = {
        x: match.x / window.scaleFactorX,
        y: window.svgHeight - (match.y / window.scaleFactorY)
      };
      window.stepCount = 0; // Reset step count
      console.log('Reset userPosition:', window.userPosition);
    }
  }
});
