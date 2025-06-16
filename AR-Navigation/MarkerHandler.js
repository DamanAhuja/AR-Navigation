let markerId = null;

function checkReady() {
  if (
    markerId &&
    typeof window.setUserLocation === 'function' &&
    window.nodeMap &&
    window.nodeMap[markerId] &&
    window.extractedNodes &&
    window.extractedNodes.length > 0
  ) {
    window.setUserLocation(markerId);
    console.log('[MarkerHandler] Set user location to marker ID:', markerId);
  } else {
    console.warn('[MarkerHandler] Waiting for dependencies (nodeMap, extractedNodes, setUserLocation)...');
    setTimeout(checkReady, 100);
  }
}

document.querySelectorAll('a-marker').forEach(marker => {
  marker.addEventListener('markerFound', (e) => {
    const preset = marker.getAttribute('preset');
    const svgNodes = window.extractedNodes || [];
    let newMarkerId;

    if (preset === 'hiro') newMarkerId = svgNodes[0]?.id; // e.g., "Entrance"
    else if (preset === 'kanji') newMarkerId = svgNodes[1]?.id; // e.g., "Entrance2"

    if (newMarkerId && newMarkerId !== markerId) {
      markerId = newMarkerId;
      console.log('[MarkerHandler] Detected marker:', preset, '-> Marker ID:', markerId);
      checkReady();
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('[MarkerHandler] MarkerHandler.js loaded');
});
