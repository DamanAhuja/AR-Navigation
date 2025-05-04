document.addEventListener("DOMContentLoaded", () => {
    if (typeof AFRAME === 'undefined') {
      console.error("AFRAME is not loaded");
      return;
    }
  
    AFRAME.registerComponent('markerhandler', {
      init: function () {
        const sceneEl = this.el.sceneEl;
  
        sceneEl.addEventListener('targetFound', (e) => {
          const targetIndex = e.detail?.targetIndex;
          if (typeof targetIndex !== 'number') {
            console.error("Invalid or missing targetIndex in event detail");
            return;
          }
          
          // Get marker ID from extractedNodes
          const extractedNodes = window.extractedNodes || [];
          const markerId = extractedNodes[targetIndex]?.id;
  
          console.log(`Detected target index: ${targetIndex} → Marker ID: ${markerId}`);
  
          if (markerId && typeof window.setUserLocation === 'function') {
            window.setUserLocation(markerId);
          } else {
            console.warn("markerId missing or setUserLocation not defined.");
          }
        });
  
        // OPTIONAL: Simulate detection
        if (window.TEST_MODE) {
          setTimeout(() => {
            this.simulateDetection(0); // Change index to test different targets
          }, 1000);
        }
      },
  
      simulateDetection(index) {
        const event = new CustomEvent('targetFound', {
          detail: { targetIndex: index }
        });
        this.el.sceneEl.dispatchEvent(event);
      }
    });
  
    // Attach the markerhandler to the <a-scene>
    const scene = document.querySelector('a-scene');
    if (scene) {
      scene.setAttribute('markerhandler', '');
    } else {
      console.error("<a-scene> not found in DOM.");
    }
  });
  