document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene');

  if (!scene) {
    console.error("Scene not found!");
    return;
  }

  scene.addEventListener('markerFound', (e) => {
    const marker = e.target;
    const preset = marker.getAttribute('preset');
    const markerId = marker.id;

    let nodeId;
    if (preset === 'hiro') nodeId = window.extractedNodes?.[0]?.id;
    else if (preset === 'kanji') nodeId = window.extractedNodes?.[1]?.id;

    console.log('Detected marker:', preset, '-> Marker ID:', nodeId);

    sessionStorage.setItem('detectedMarkerPreset', preset);
    sessionStorage.setItem('nodeId', nodeId);
    sessionStorage.setItem('markerId', markerId);

    // Redirect after storing state
    const arScene = document.querySelector('a-scene');
if (arScene && arScene.systems && arScene.systems["arjs"]) {
  const arSystem = arScene.systems["arjs"];
  if (arSystem.arToolkitSource && arSystem.arToolkitSource.domElement) {
    const video = arSystem.arToolkitSource.domElement;
    if (video && video.srcObject) {
      // Stop all video tracks
      video.srcObject.getTracks().forEach(track => track.stop());
    }
  }
}

    window.location.href = 'webxr.html';
  });

  scene.addEventListener('markerLost', (e) => {
    const preset = e.target.getAttribute('preset');
    console.log('Marker lost:', preset);
  });
});
