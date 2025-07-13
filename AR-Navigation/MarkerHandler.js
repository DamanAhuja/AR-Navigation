document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene');

  // Listen for markerFound event on the scene
  scene.addEventListener('markerFound', (e) => {
    const marker = e.target; // The <a-marker> element that triggered the event
    const preset = marker.getAttribute('preset'); // Get preset (e.g., 'hiro')
    const markerId = marker.id; // Get marker ID

    // Map preset to node ID (adjust based on your extractedNodes structure)
    let nodeId;
    if (preset === 'hiro') nodeId = window.extractedNodes[0]?.id;
    else if (preset === 'kanji') nodeId = window.extractedNodes[1]?.id;

    console.log('Detected marker:', preset, '-> Marker ID:', nodeId);

    // Store marker entity in markerMap
    window.markerMap[preset] = marker;

    // Handle world origin setup
    if (!window.worldOrigin && nodeId && typeof window.setUserLocation === 'function') {
      window.setUserLocation(nodeId);

      const match = window.nodeMap[nodeId];

      if (match && marker) {
        // Access Three.js object for position and rotation
        const markerObject3D = marker.object3D;
        console.log('[DEBUG] Marker world position:', markerObject3D.position);

        window.worldOrigin = {
          x: match.x,
          y: match.y,
          worldPosition: markerObject3D.position.clone(),
          rotationY: markerObject3D.rotation.y || 0
        };

        const converted = svgToWorld(match.x, match.y);
        console.log('[DEBUG] Converted world from SVG:', converted);

        console.log('[AR] World origin set:', window.worldOrigin);
      } else {
        console.warn('[AR] Failed to set world origin - match or marker not found');
      }
    } else if (window.worldOrigin) {
      console.log('[AR] World origin already set. Skipping update.');
    }
  });

  // Optional: Handle markerLost event
  scene.addEventListener('markerLost', (e) => {
    const preset = e.target.getAttribute('preset');
    console.log('Marker lost:', preset);
    // Add logic for when marker is no longer visible, if needed
  });
});
