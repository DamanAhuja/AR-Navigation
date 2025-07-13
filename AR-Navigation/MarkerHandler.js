scene.addEventListener('markerFound', (e) => {
  const marker = e.target;
  const preset = marker.getAttribute('preset');
  const markerId = marker.id;

  let nodeId;
  if (preset === 'hiro') nodeId = window.extractedNodes?.[0]?.id;
  else if (preset === 'kanji') nodeId = window.extractedNodes?.[1]?.id;

  console.log('Detected marker:', preset, '-> Marker ID:', nodeId);

  // Save info to sessionStorage (or localStorage)
  sessionStorage.setItem('detectedMarkerPreset', preset);
  sessionStorage.setItem('nodeId', nodeId);

  // Optional: Save additional data like marker ID
  sessionStorage.setItem('markerId', markerId);

  // Redirect to the AR scene
  window.location.href = 'webxr.html';
});
