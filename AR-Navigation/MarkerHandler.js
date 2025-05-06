document.addEventListener("DOMContentLoaded", function () {
    // Listen for custom event triggered by MindAR targets
    document.addEventListener('targetFound', (e) => {
      const targetIndex = e.detail.targetIndex;
  
      const svgNodes = window.extractedNodes || [];
      const markerId = svgNodes[targetIndex]?.id;
  
      console.log("Detected marker index:", targetIndex, "-> Marker ID:", markerId);
  
      if (markerId && typeof window.setUserLocation === 'function') {
        window.setUserLocation(markerId);
      }
    });
  });
