// ARDirectionHandler.js - Manages AR direction arrows for navigation

class ARDirectionHandler {
  constructor() {
    this.arrowEntities = [];
    this.currentPath = [];
    this.currentPathIndex = 0;
    this.scene = null;
    this.anchors = [];
    this.initialized = false;
  }

  init(scene, anchors) {
    this.scene = scene;
    this.anchors = anchors;
    this.initialized = true;
    console.log("AR Direction Handler initialized with", anchors.length, "anchors");
    
    // Listen for target found events
    document.addEventListener("targetFound", this.handleTargetFound.bind(this));
  }

  handleTargetFound(event) {
    const targetIndex = event.detail.targetIndex;
    // Using your existing method to get marker ID from index
    const markerId = window.getNodeIdFromMarkerIndex(targetIndex);
    
    if (markerId) {
      console.log(`AR Direction Handler: Found marker ${markerId} at index ${targetIndex}`);
      
      // If we have an active navigation path, update the arrows
      if (this.currentPath.length > 0) {
        this.updateNavigationArrows(markerId);
      }
    }
  }

  setNavigationPath(path) {
    this.currentPath = path;
    this.currentPathIndex = 0;
    console.log("Navigation path set:", path);
    
    // Start showing arrows for current node
    if (window.currentMarkerId && this.currentPath.includes(window.currentMarkerId)) {
      this.updateNavigationArrows(window.currentMarkerId);
    }
  }

  updateNavigationArrows(currentNodeId) {
    if (!this.initialized) {
      console.warn("AR Direction Handler not initialized");
      return;
    }
    
    // Clear existing arrows
    this.clearArrows();
    
    // Find current position in path
    const currentIndex = this.currentPath.indexOf(currentNodeId);
    if (currentIndex === -1) {
      console.warn(`Current node ${currentNodeId} not found in path`);
      return;
    }
    
    // Update current path index
    this.currentPathIndex = currentIndex;
    
    // If we're at the destination, show completion
    if (currentIndex >= this.currentPath.length - 1) {
      console.log("Destination reached!");
      this.showDestinationReached(currentNodeId);
      return;
    }
    
    // Get next node in path
    const nextNodeId = this.currentPath[currentIndex + 1];
    console.log(`Showing direction from ${currentNodeId} to ${nextNodeId}`);
    
    // Find anchor for current marker
    const currentAnchorIndex = this.getAnchorIndexFromMarkerId(currentNodeId);
    if (currentAnchorIndex === -1) {
      console.warn(`No anchor found for marker ${currentNodeId}`);
      return;
    }
    
    // Calculate direction to next node
    const direction = this.calculateDirection(currentNodeId, nextNodeId);
    if (!direction) {
      console.warn(`Could not calculate direction to ${nextNodeId}`);
      return;
    }
    
    // Create AR arrow
    this.createArrow(this.anchors[currentAnchorIndex], direction, nextNodeId);
  }
  
  calculateDirection(fromNodeId, toNodeId) {
    if (!window.nodeMap || !window.nodeMap[fromNodeId] || !window.nodeMap[toNodeId]) {
      return null;
    }
    
    const fromNode = window.nodeMap[fromNodeId];
    const toNode = window.nodeMap[toNodeId];
    
    // Calculate angle
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Calculate distance
    const distance = Math.hypot(dx, dy);
    
    return {
      angle: angle,
      distance: distance,
      vector: { x: dx, y: dy }
    };
  }
  
  getAnchorIndexFromMarkerId(markerId) {
    // Get the target index for this marker ID using the extracted nodes
    if (!window.extractedNodes) {
      return -1;
    }
    
    for (let i = 0; i < window.extractedNodes.length; i++) {
      if (window.extractedNodes[i].id === markerId) {
        return i;
      }
    }
    return -1;
  }
  
  createArrow(anchor, direction, nextNodeId) {
    if (!anchor) {
      console.warn("Cannot create arrow: anchor is null");
      return null;
    }
    
    // Create a 3D arrow in the direction of the next node
    const arrowEntity = document.createElement("a-entity");
    
    // Position slightly above ground
    arrowEntity.setAttribute("position", "0 0.5 0");
    
    // Rotate arrow to point in the right direction
    // Add 90 degrees to the angle since the arrow model might point forward by default
    arrowEntity.setAttribute("rotation", `0 ${-direction.angle + 90} 0`);
    
    // Create arrow shape with a-frame primitives
    const arrowBody = document.createElement("a-box");
    arrowBody.setAttribute("position", "0 0 -0.5");
    arrowBody.setAttribute("scale", "0.1 0.1 1");
    arrowBody.setAttribute("color", "#00FF00");
    
    const arrowHead = document.createElement("a-cone");
    arrowHead.setAttribute("position", "0 0 -1");
    arrowHead.setAttribute("rotation", "0 0 -90");
    arrowHead.setAttribute("radius-bottom", "0.15");
    arrowHead.setAttribute("radius-top", "0");
    arrowHead.setAttribute("height", "0.3");
    arrowHead.setAttribute("color", "#00FF00");
    
    // Add label with distance and next node
    const distanceLabel = document.createElement("a-text");
    const distanceInMeters = (direction.distance * 0.04254).toFixed(2);
    distanceLabel.setAttribute("value", `${distanceInMeters}m to ${nextNodeId}`);
    distanceLabel.setAttribute("position", "0 0.2 -0.5");
    distanceLabel.setAttribute("rotation", "0 180 0");
    distanceLabel.setAttribute("align", "center");
    distanceLabel.setAttribute("color", "white");
    distanceLabel.setAttribute("scale", "0.5 0.5 0.5");
    
    // Add arrow parts to entity
    arrowEntity.appendChild(arrowBody);
    arrowEntity.appendChild(arrowHead);
    arrowEntity.appendChild(distanceLabel);
    
    // Add to anchor
    anchor.appendChild(arrowEntity);
    
    // Save for later cleanup
    this.arrowEntities.push(arrowEntity);
    
    // Add floating animation
    arrowEntity.setAttribute("animation", "property: position; to: 0 0.7 0; dir: alternate; dur: 1000; loop: true; easing: easeInOutQuad");
    
    return arrowEntity;
  }
  
  showDestinationReached(currentNodeId) {
    // Find current marker index
    const currentAnchorIndex = this.getAnchorIndexFromMarkerId(currentNodeId);
    
    if (currentAnchorIndex === -1 || !this.anchors[currentAnchorIndex]) {
      console.warn("Cannot show destination reached: anchor not found");
      return;
    }
    
    // Create destination indicator
    const destinationEntity = document.createElement("a-entity");
    destinationEntity.setAttribute("position", "0 1 0");
    
    const checkmark = document.createElement("a-text");
    checkmark.setAttribute("value", "✓ Destination");
    checkmark.setAttribute("color", "#00FF00");
    checkmark.setAttribute("align", "center");
    checkmark.setAttribute("scale", "0.5 0.5 0.5");
    
    destinationEntity.appendChild(checkmark);
    this.anchors[currentAnchorIndex].appendChild(destinationEntity);
    this.arrowEntities.push(destinationEntity);
    
    // Add floating animation
    destinationEntity.setAttribute("animation", "property: position; to: 0 1.2 0; dir: alternate; dur: 1000; loop: true; easing: easeInOutQuad");
    
    // Show status message
    if (window.showStatusMessage) {
      window.showStatusMessage("Destination reached!");
    }
  }
  
  clearArrows() {
    // Remove all arrow entities
    this.arrowEntities.forEach(entity => {
      if (entity.parentNode) {
        entity.parentNode.removeChild(entity);
      }
    });
    this.arrowEntities = [];
  }
}

// Create global instance
window.arDirectionHandler = new ARDirectionHandler();
