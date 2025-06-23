// arDirectionalNavigation.js
// AR Navigation with directional arrows - Revised for dynamic node integration

class ARDirectionalNavigation {
  constructor() {
    this.currentPath = null;
    this.currentStepIndex = 0;
    this.arrowGroup = null;
    this.isNavigating = false;
    this.arrowUpdateInterval = null;
    this.currentUserPosition = null;
    this.destinationNodeId = null;
    
    // Arrow configuration
    this.arrowConfig = {
      size: 0.5,
      distance: 2, // Distance in front of camera
      height: 1.5, // Height above ground
      updateInterval: 1000, // 1 second updates
      color: 0x00ff00, // Green arrows
      opacity: 0.8
    };
    
    this.init();
  }

  init() {
    // Wait for AR scene to be ready
    this.waitForARScene();
    
    // Listen for marker detection events from MarkerHandler.js
    document.addEventListener('markerFound', (event) => {
      this.handleMarkerFound(event.detail.preset);
    });
    
    document.addEventListener('markerLost', (event) => {
      this.handleMarkerLost(event.detail.preset);
    });

    // Expose navigation functions globally
    window.startNavigation = (destination) => {
      return this.startNavigation(destination);
    };
    
    window.stopNavigation = () => {
      this.stopNavigation();
    };

    // Listen for step detection (from your sensor system)
    window.addEventListener('stepDetected', () => {
      this.handleStepDetected();
    });
  }

  waitForARScene() {
    if (window.markerRootHiro && window.markerRootKanji && scene) {
      console.log('[AR Navigation] AR Scene ready');
      this.setupArrowGroup();
    } else {
      setTimeout(() => this.waitForARScene(), 100);
    }
  }

  setupArrowGroup() {
    // Create a group for arrows that will be added to the scene
    this.arrowGroup = new THREE.Group();
    scene.add(this.arrowGroup);
    console.log('[AR Navigation] Arrow group created');
  }

  handleMarkerFound(preset) {
    console.log(`[AR Navigation] Marker found: ${preset}`);
    // Get the marker ID from the existing logic in MarkerHandler.js
    this.updateUserPositionFromMarker(preset);
  }

  handleMarkerLost(preset) {
    console.log(`[AR Navigation] Marker lost: ${preset}`);
    // Continue navigation even if marker is lost
  }

  updateUserPositionFromMarker(preset) {
    // Use the same logic as MarkerHandler.js to determine node ID
    const svgNodes = window.extractedNodes || [];
    let markerId;
    
    // Map preset to node ID (same as MarkerHandler.js)
    if (preset === 'hiro') markerId = svgNodes[0]?.id;
    else if (preset === 'kanji') markerId = svgNodes[1]?.id;
    // Add more presets as needed
    
    if (markerId && window.nodeMap && window.nodeMap[markerId]) {
      this.currentUserPosition = markerId;
      console.log(`[AR Navigation] User position updated to: ${markerId}`);
      
      // Update navigation if currently navigating
      if (this.isNavigating) {
        this.recalculateNavigationFromCurrentPosition();
      }
    }
  }

  startNavigation(destination) {
    if (!this.currentUserPosition) {
      console.warn('[AR Navigation] Current user position not set. Please scan a marker first.');
      return false;
    }

    if (!window.nodeMap || !window.nodeMap[destination]) {
      console.warn(`[AR Navigation] Destination ${destination} not found in nodeMap`);
      return false;
    }

    // Store destination
    this.destinationNodeId = destination;

    // Calculate path using the pathfinding system
    const pathResult = this.calculatePath(this.currentUserPosition, destination);
    if (!pathResult || !pathResult.path) {
      console.warn('[AR Navigation] No path found to destination');
      return false;
    }

    this.currentPath = pathResult.path;
    this.currentStepIndex = 0;
    this.isNavigating = true;

    console.log(`[AR Navigation] Starting navigation from ${this.currentUserPosition} to ${destination}`);
    console.log('[AR Navigation] Path:', this.currentPath);
    console.log('[AR Navigation] Distance:', pathResult.distance, 'm');

    // Start showing arrows
    this.startArrowUpdates();
    
    // Dispatch navigation started event
    const event = new CustomEvent('navigationStarted', {
      detail: { 
        from: this.currentUserPosition, 
        to: destination, 
        path: this.currentPath,
        distance: pathResult.distance
      }
    });
    document.dispatchEvent(event);
    
    return true;
  }

  stopNavigation() {
    this.isNavigating = false;
    this.currentPath = null;
    this.currentStepIndex = 0;
    this.destinationNodeId = null;
    
    // Clear arrows
    this.clearArrows();
    
    // Stop interval
    if (this.arrowUpdateInterval) {
      clearInterval(this.arrowUpdateInterval);
      this.arrowUpdateInterval = null;
    }
    
    console.log('[AR Navigation] Navigation stopped');
    
    // Dispatch navigation stopped event
    const event = new CustomEvent('navigationStopped');
    document.dispatchEvent(event);
  }

  recalculateNavigationFromCurrentPosition() {
    if (!this.isNavigating || !this.destinationNodeId) return;
    
    console.log('[AR Navigation] Recalculating path from new position');
    
    // Recalculate path from current position
    const pathResult = this.calculatePath(this.currentUserPosition, this.destinationNodeId);
    if (pathResult && pathResult.path) {
      this.currentPath = pathResult.path;
      this.currentStepIndex = 0;
      this.updateNavigationArrows();
      console.log('[AR Navigation] Path recalculated:', this.currentPath);
    }
  }

  calculatePath(start, end) {
    // Wait for graph data to be available
    if (!window.nodeMap || !window.extractedEdges) {
      console.warn('[AR Navigation] Graph data not available');
      return null;
    }
    
    // Build graph from extracted edges
    const graph = {};
    
    window.extractedEdges.forEach(edge => {
      const from = window.nodeMap[edge.from];
      const to = window.nodeMap[edge.to];
      if (from && to) {
        if (!graph[from.id]) graph[from.id] = [];
        if (!graph[to.id]) graph[to.id] = [];
        const weight = Math.hypot(to.x - from.x, to.y - from.y);
        graph[from.id].push({ node: to.id, weight });
        graph[to.id].push({ node: from.id, weight });
      }
    });

    // Dijkstra algorithm implementation
    const distances = {}, previous = {}, queue = new Set(Object.keys(graph));
    for (const node of queue) {
      distances[node] = Infinity;
      previous[node] = null;
    }
    distances[start] = 0;

    while (queue.size > 0) {
      let currentNode = null;
      let minDistance = Infinity;
      for (const node of queue) {
        if (distances[node] < minDistance) {
          minDistance = distances[node];
          currentNode = node;
        }
      }

      if (currentNode === end) break;
      queue.delete(currentNode);

      if (!graph[currentNode]) continue;

      for (const neighbor of graph[currentNode]) {
        const alt = distances[currentNode] + neighbor.weight;
        if (alt < distances[neighbor.node]) {
          distances[neighbor.node] = alt;
          previous[neighbor.node] = currentNode;
        }
      }
    }

    const path = [];
    let curr = end;
    while (curr) {
      path.unshift(curr);
      curr = previous[curr];
    }

    return {
      distance: (distances[end] * 0.04254).toFixed(2), // Same scale factor as leaflet.js
      path: distances[end] !== Infinity ? path : null
    };
  }

  startArrowUpdates() {
    // Update arrows immediately
    this.updateNavigationArrows();
    
    // Set interval for periodic updates
    this.arrowUpdateInterval = setInterval(() => {
      this.updateNavigationArrows();
    }, this.arrowConfig.updateInterval);
  }

  updateNavigationArrows() {
    if (!this.isNavigating || !this.currentPath || this.currentStepIndex >= this.currentPath.length - 1) {
      return;
    }

    // Clear existing arrows
    this.clearArrows();

    // Get next node in path
    const nextNodeId = this.currentPath[this.currentStepIndex + 1];
    const nextNode = window.nodeMap[nextNodeId];
    
    if (!nextNode) {
      console.warn('[AR Navigation] Next node not found:', nextNodeId);
      return;
    }

    // Create directional arrow pointing to next node
    this.createDirectionalArrow(nextNode, nextNodeId);
    
    console.log(`[AR Navigation] Arrow updated, pointing to: ${nextNodeId}`);

    // Check if close to next waypoint (you can adjust this threshold)
    if (this.isCloseToWaypoint(nextNode)) {
      console.log(`[AR Navigation] Approaching waypoint: ${nextNodeId}`);
      this.advanceToNextStep();
    }
  }

  createDirectionalArrow(targetNode, targetNodeId) {
    // Create arrow geometry
    const arrowGeometry = this.createArrowGeometry();
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: this.arrowConfig.color,
      transparent: true,
      opacity: this.arrowConfig.opacity
    });

    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);

    // Position arrow in front of camera
    arrow.position.set(0, this.arrowConfig.height, -this.arrowConfig.distance);

    // Calculate direction to target
    const direction = this.calculateDirection(targetNode);
    
    // Rotate arrow to point in the right direction
    if (direction !== null) {
      arrow.rotation.y = direction;
    }

    // Add to arrow group
    this.arrowGroup.add(arrow);

    // Add floating animation
    this.animateArrow(arrow);

    // Add text label (optional)
    this.addArrowLabel(arrow, targetNodeId);
  }

  createArrowGeometry() {
    // Create a simple arrow shape pointing forward
    const shape = new THREE.Shape();
    const size = this.arrowConfig.size;
    
    // Arrow pointing forward (along negative Z)
    shape.moveTo(0, size * 0.5);           // Top point
    shape.lineTo(-size * 0.3, -size * 0.2); // Left back
    shape.lineTo(-size * 0.1, -size * 0.2); // Left inner
    shape.lineTo(-size * 0.1, -size * 0.5); // Left bottom
    shape.lineTo(size * 0.1, -size * 0.5);  // Right bottom
    shape.lineTo(size * 0.1, -size * 0.2);  // Right inner
    shape.lineTo(size * 0.3, -size * 0.2);  // Right back
    shape.lineTo(0, size * 0.5);            // Back to top

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: false
    });

    return geometry;
  }

  calculateDirection(targetNode) {
    if (!this.currentUserPosition || !window.nodeMap[this.currentUserPosition]) {
      return 0;
    }

    const currentNode = window.nodeMap[this.currentUserPosition];
    
    // Calculate angle between current position and target
    const dx = targetNode.x - currentNode.x;
    const dy = targetNode.y - currentNode.y;
    
    // Convert to radians for AR coordinate system
    let angle = Math.atan2(dx, dy);
    
    // Adjust for coordinate system differences if needed
    return angle;
  }

  addArrowLabel(arrow, targetNodeId) {
    // Create text geometry for label (optional feature)
    try {
      const loader = new THREE.FontLoader();
      // Note: You might need to load a font first
      // For now, we'll skip text labels to avoid font loading complexity
      console.log(`[AR Navigation] Arrow pointing to: ${targetNodeId}`);
    } catch (error) {
      console.log('[AR Navigation] Text labels not available');
    }
  }

  animateArrow(arrow) {
    // Add subtle floating animation
    const startY = arrow.position.y;
    const animateFloat = () => {
      if (arrow.parent) { // Check if arrow still exists
        arrow.position.y = startY + Math.sin(Date.now() * 0.002) * 0.1;
        requestAnimationFrame(animateFloat);
      }
    };
    animateFloat();
  }

  clearArrows() {
    // Remove all arrows from the group
    while (this.arrowGroup.children.length > 0) {
      const arrow = this.arrowGroup.children[0];
      this.arrowGroup.remove(arrow);
      
      // Dispose of geometry and material to free memory
      if (arrow.geometry) arrow.geometry.dispose();
      if (arrow.material) arrow.material.dispose();
    }
  }

  isCloseToWaypoint(waypoint) {
    // Check if user is close to the waypoint
    // This uses the userPosition from sensors.js if available
    if (!window.userPosition) return false;
    
    const distance = Math.hypot(
      waypoint.x - window.userPosition.x * window.scaleFactorX,
      waypoint.y - (window.svgHeight - window.userPosition.y) * window.scaleFactorY
    );
    
    // Threshold for considering "close" (adjust as needed)
    const threshold = 20; // pixels in map coordinates
    return distance < threshold;
  }

  advanceToNextStep() {
    if (this.isNavigating && this.currentPath && this.currentStepIndex < this.currentPath.length - 1) {
      this.currentStepIndex++;
      console.log(`[AR Navigation] Advanced to step ${this.currentStepIndex}: ${this.currentPath[this.currentStepIndex]}`);
      
      // Check if reached destination
      if (this.currentStepIndex >= this.currentPath.length - 1) {
        console.log('[AR Navigation] Destination reached!');
        this.stopNavigation();
        
        // Dispatch event for destination reached
        const event = new CustomEvent('navigationComplete', {
          detail: { destination: this.currentPath[this.currentPath.length - 1] }
        });
        document.dispatchEvent(event);
      }
    }
  }

  handleStepDetected() {
    // Called when a step is detected by sensors
    if (this.isNavigating) {
      console.log('[AR Navigation] Step detected, updating navigation');
      this.updateNavigationArrows();
    }
  }

  // Public methods for external control
  getCurrentPath() {
    return this.currentPath;
  }

  getCurrentStep() {
    return this.currentStepIndex;
  }

  getDestination() {
    return this.destinationNodeId;
  }

  isCurrentlyNavigating() {
    return this.isNavigating;
  }
}

// Initialize AR Navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for other scripts to load
  setTimeout(() => {
    window.arNavigation = new ARDirectionalNavigation();
    console.log('[AR Navigation] System initialized and ready');
  }, 1000);
});

