document.addEventListener('markerFound', (e) => {
  const marker = e.target;
  const preset = marker.getAttribute('preset'); // e.g., "hiro" or "kanji"
  const svgNodes = window.extractedNodes || [];
  let markerId;
  // Map preset to node ID (customize based on your setup)
  if (preset === 'hiro') markerId = svgNodes[0]?.id; // e.g., "Entrance"
  else if (preset === 'kanji') markerId = svgNodes[1]?.id; // e.g., "Entrance2"
  console.log("Detected marker:", preset, "-> Marker ID:", markerId);
  if (markerId && typeof window.setUserLocation === 'function') {
    window.setUserLocation(markerId);
  }
});
