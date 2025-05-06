// MarkerHandler.js - Handles AR marker detection and mapping

document.addEventListener("DOMContentLoaded", function () {
  // Initialize marker mapping using the extracted nodes
  window.initializeMarkerMapping = function() {
    // This will be called after the SVG is parsed and nodes are extracted
    if (window.extractedNodes && window.extractedNodes.length > 0) {
      window.markerMapping = {};
      
      // Create mapping based on index in extractedNodes array
      window.extractedNodes.forEach((node, index) => {
        if (node.id) {
          window.markerMapping[index] = node.id;
        }
      });
      
      console.log("Marker mapping initialized:", window.markerMapping);
    }
  };
  
  // Listen for custom event triggered by MindAR targets
  document.addEventListener('targetFound', (e) => {
    const targetIndex = e.detail.targetIndex;

    // Get marker ID from extracted nodes
    const svgNodes = window.extractedNodes || [];
    const markerId = svgNodes[targetIndex]?.id;

    console.log("Detected marker index:", targetIndex, "-> Marker ID:", markerId);

    if (markerId) {
      // Update user location on map
      if (typeof window.setUserLocation === 'function') {
        window.setUserLocation(markerId);
      }
      
      // If we're navigating and have an AR direction handler, update arrows
      if (window.arDirectionHandler && window.arDirectionHandler.currentPath.length > 0) {
        window.arDirectionHandler.updateNavigationArrows(markerId);
      }
    }
  });
  
  // Function to start navigation to a destination
  window.routeToDestination = function() {
    const destinationSelect = document.getElementById("destinationDropdown");
    const destinationNodeId = destinationSelect.value;
    
    if (!destinationNodeId) {
      console.warn("No destination selected");
      return;
    }
    
    // Get current marker ID
    if (!window.currentMarkerId) {
      alert("Please scan a marker first to establish your location");
      return;
    }
    
    console.log(`Routing from ${window.currentMarkerId} to ${destinationNodeId}`);
    
    // Calculate path using existing Dijkstra function
    if (window.goTo) {
      const result = window.goTo(destinationNodeId);
      
      // If we have path and AR direction handler, start AR navigation
      if (result && result.path && window.arDirectionHandler) {
        window.arDirectionHandler.setNavigationPath(result.path);
        
        // Show status message about navigation
        if (window.showStatusMessage) {
          window.showStatusMessage(`Follow the AR arrows to ${destinationNodeId}`);
        }
      }
    }
  };
  
  // Expose a function to get node ID from marker index
  window.getNodeIdFromMarkerIndex = function(markerIndex) {
    const svgNodes = window.extractedNodes || [];
    return svgNodes[markerIndex]?.id;
  };
});
