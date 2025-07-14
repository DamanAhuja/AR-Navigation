
document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene');
  if (!scene) {
    console.error('[MarkerHandler] <a-scene> not found.');
    return;
  }

  scene.addEventListener('markerFound', (e) => {
    const marker = e.target;
    const preset = marker.getAttribute('preset');
    const markerId = marker.id;

    console.log('[MarkerHandler] Marker found:', preset, markerId);

    let attempts = 0;

    function storeDataAndRedirect(nodeId) {
      sessionStorage.setItem('detectedMarkerPreset', preset);
      sessionStorage.setItem('nodeId', nodeId);
      sessionStorage.setItem('markerId', markerId);

      // Release AR.js webcam
      const arSystem = scene.systems?.arjs;
      if (arSystem?.arToolkitSource?.domElement?.srcObject) {
        arSystem.arToolkitSource.domElement.srcObject.getTracks().forEach(track => track.stop());
        console.log('[AR.js] Webcam tracks stopped.');
      }

      console.log('[MarkerHandler] Redirecting to WebXR...');
      window.location.href = 'webxr.html';
    }

    function waitForNodeAndRedirect() {
      const nodes = window.extractedNodes;

      if (nodes && nodes.length > 0) {
        let nodeId;
        if (preset === 'hiro') nodeId = nodes[0]?.id;
        else if (preset === 'kanji') nodeId = nodes[1]?.id;

        if (nodeId) {
          console.log('[MarkerHandler] Detected nodeId:', nodeId);
          storeDataAndRedirect(nodeId);
        } else {
          console.warn('[MarkerHandler] Node ID not found for preset:', preset);
          //storeDataAndRedirect(""); // fallback to empty so redirect still happens
        }

      } else if (attempts < 10) {
        console.warn('[MarkerHandler] extractedNodes not ready, retrying... (' + (attempts + 1) + ')');
        attempts++;
        setTimeout(waitForNodeAndRedirect, 200);
      } else {
        console.error('[MarkerHandler] Failed to access extractedNodes after 10 retries.');
        //storeDataAndRedirect(""); // fallback to still allow redirect
      }
    }

    waitForNodeAndRedirect();
  });
});






  /*document.addEventListener('DOMContentLoaded', () => {
const scene = document.querySelector('a-scene');
scene.addEventListener('markerFound', (e) => {
  const marker = e.target;
  const preset = marker.getAttribute('preset');
  const markerId = marker.id;

  let nodeId;
  if (preset === 'hiro') nodeId = window.extractedNodes?.[0]?.id;
  else if (preset === 'kanji') nodeId = window.extractedNodes?.[1]?.id;

  console.log('Detected marker:', preset, '-> Marker ID:', nodeId);

  // Store data for the next scene
  sessionStorage.setItem('detectedMarkerPreset', preset);
  sessionStorage.setItem('nodeId', nodeId);
  sessionStorage.setItem('markerId', markerId);

  // Release AR.js webcam
  const arScene = document.querySelector('a-scene');
  if (arScene && arScene.systems && arScene.systems["arjs"]) {
    const arSystem = arScene.systems["arjs"];
    if (arSystem.arToolkitSource && arSystem.arToolkitSource.domElement) {
      const video = arSystem.arToolkitSource.domElement;
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        console.log('[AR.js] Webcam tracks stopped.');
      }
    }
  }

  // ⏱️ Wait before redirecting
  setTimeout(() => {
    console.log('[AR.js] Redirecting to WebXR scene...');
    window.location.href = 'webxr.html';
  }, 1000); // 1 second delay is usually safe
});
});*/










/*document.addEventListener('DOMContentLoaded', () => {
const scene = document.querySelector('a-scene');
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
*/
