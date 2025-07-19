(() => {
  const ARROW_SPACING_METERS = 1; // Real-world meters in AR space
  const SVG_TO_METERS_X = 5.45 / (230 - 90); // ~0.03893 - conversion factor from SVG units to meters
  let arrows = [];
  
  function clearNavigation() {
    arrows.forEach(arrow => {
      if (window.scene && arrow.parent === window.scene) {
        window.scene.remove(arrow);
      }
    });
    arrows = [];
  }
  
  function svgToWorldBasic(svgX, svgY) {
    // Ensure we have a valid world origin set when AR marker is scanned
    if (!window.worldOrigin || !window.worldOrigin.worldPosition) {
      console.warn('[AR Navigation] No world origin set - marker needs to be scanned first');
      return new THREE.Vector3(0, 0, 0);
    }
    
    // Calculate offset from origin in SVG coordinates
    const dx = svgX - window.worldOrigin.x;
    const dy = svgY - window.worldOrigin.y;
    
    // Convert SVG units to real-world meters
    const xMeters = dx * SVG_TO_METERS_X;
    const zMeters = dy * SVG_TO_METERS_X; // Z-axis for depth in AR space
    
    // Get origin position (0,0,0 when marker is scanned)
    const origin = window.worldOrigin.worldPosition.clone();
    
    // Return position in AR world coordinates where 1 unit = 1 meter
    return new THREE.Vector3(
      origin.x + xMeters, 
      origin.y, // Keep Y at ground level
      origin.z - zMeters // Negative Z to match coordinate system
    );
  }
  
  function createArrowMesh() {
    // Create arrow geometry - sizes in real meters for AR
    const shaftGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8);
    const headGeometry = new THREE.ConeGeometry(0.1, 0.2, 8);
    
    // Blue shaft, orange head for visibility
    const shaftMaterial = new THREE.MeshBasicMaterial({ color: 0x1976d2 });
    const headMaterial = new THREE.MeshBasicMaterial({ color: 0xff5722 });
    
    const shaftMesh = new THREE.Mesh(shaftGeometry, shaftMaterial);
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    
    // Position components relative to arrow center
    shaftMesh.position.y = 0.3;
    headMesh.position.y = 0.7;
    
    // Create arrow group
    const arrow = new THREE.Group();
    arrow.add(shaftMesh, headMesh);
    
    // Rotate to point forward (along positive Z initially)
    arrow.rotation.x = Math.PI / 2;
    
    return arrow;
  }
  
  function placeArrows(pathNodes) {
    if (!pathNodes || pathNodes.length < 2) {
      console.warn('[AR Navigation] Invalid path - need at least 2 nodes');
      return;
    }
    
    console.log(`[AR Navigation] Converting ${pathNodes.length} SVG nodes to AR world coordinates`);
    
    // STEP 1: Convert ALL path nodes to AR world coordinates first
    const worldPathNodes = pathNodes.map(node => {
      const worldPos = svgToWorldBasic(node.x, node.y);
      console.log(`[Node] SVG (${node.x}, ${node.y}) -> AR World (${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)})`);
      return worldPos;
    });
    
    // STEP 2: Calculate distances and place arrows in AR world coordinates
    let totalDistanceMeters = 0; // Accumulated distance in real AR meters
    let nextArrowAtMeters = ARROW_SPACING_METERS; // Next arrow placement distance in real meters
    
    console.log(`[AR Navigation] Starting arrow placement with ${ARROW_SPACING_METERS}m intervals`);
    
    // Walk through each segment in AR world space
    for (let i = 0; i < worldPathNodes.length - 1; i++) {
      const fromWorld = worldPathNodes[i];
      const toWorld = worldPathNodes[i + 1];
      
      // Calculate segment vector in AR world coordinates (real meters)
      const segmentVector = toWorld.clone().sub(fromWorld);
      const segmentLengthMeters = segmentVector.length(); // Real distance in meters
      
      if (segmentLengthMeters === 0) continue; // Skip zero-length segments
      
      const segmentDirection = segmentVector.clone().normalize();
      
      console.log(`[Segment ${i}] Length: ${segmentLengthMeters.toFixed(3)}m`);
      
      // Place arrows along this segment at 1-meter real-world intervals
      while (totalDistanceMeters + segmentLengthMeters >= nextArrowAtMeters) {
        // Distance into current segment where arrow should be placed
        const distanceIntoSegmentMeters = nextArrowAtMeters - totalDistanceMeters;
        
        // Calculate exact AR world position for arrow
        const arrowWorldPos = fromWorld.clone().add(
          segmentDirection.clone().multiplyScalar(distanceIntoSegmentMeters)
        );
        
        console.log(`[Arrow ${arrows.length}] AR World Position: (${arrowWorldPos.x.toFixed(3)}, ${arrowWorldPos.y.toFixed(3)}, ${arrowWorldPos.z.toFixed(3)})`);
        
        // Calculate direction for arrow orientation (look ahead 10cm in AR space)
        const lookAheadDistance = 0.1; // 10cm in real meters
        const lookAheadPos = arrowWorldPos.clone().add(
          segmentDirection.clone().multiplyScalar(lookAheadDistance)
        );
        
        // Create and position arrow
        const arrow = createArrowMesh();
        arrow.position.copy(arrowWorldPos);
        
        // Point arrow in direction of travel in AR space
        arrow.lookAt(lookAheadPos);
        arrow.rotateX(Math.PI / 2); // Adjust for arrow mesh orientation
        
        // Scale for visibility (2x scale = 1.2m tall in AR)
        arrow.scale.set(2, 2, 2);
        
        // Add to scene
        if (window.scene) {
          window.scene.add(arrow);
          arrows.push(arrow);
        }
        
        // Set next arrow placement distance (exactly 1 meter further in AR space)
        nextArrowAtMeters += ARROW_SPACING_METERS;
      }
      
      totalDistanceMeters += segmentLengthMeters;
    }
    
    console.log(`[AR Navigation] Placed ${arrows.length} arrows along ${totalDistanceMeters.toFixed(2)}m path in AR world coordinates`);
  }
  
  // Global function to start navigation
  window.startNavigation = function(destinationId) {
    console.log(`[AR Navigation] Starting navigation to: ${destinationId}`);
    
    // Clear any existing arrows
    clearNavigation();
    
    // Validate required globals
    if (!window.userPosition) {
      console.error('[AR Navigation] No user position available');
      return;
    }
    
    if (!window.goTo) {
      console.error('[AR Navigation] No pathfinding function available');
      return;
    }
    
    if (!window.nodeMap) {
      console.error('[AR Navigation] No node map available');
      return;
    }
    
    // Calculate path
    const result = window.goTo(destinationId);
    
    if (!result || !result.path || result.path.length < 2) {
      console.warn('[AR Navigation] No valid path found');
      return;
    }
    
    console.log(`[AR Navigation] Path found with ${result.path.length} nodes`);
    
    // Convert path node IDs to actual node objects
    const pathNodes = result.path.map(nodeId => window.nodeMap[nodeId]).filter(Boolean);
    
    if (pathNodes.length < 2) {
      console.warn('[AR Navigation] Insufficient valid path nodes');
      return;
    }
    
    // Place arrows along the path using AR world coordinates
    placeArrows(pathNodes);
  };
  
  // Helper function to clear navigation (exposed globally)
  window.clearNavigation = clearNavigation;
  
  console.log('[AR Navigation] System initialized - arrows calculated in AR world coordinates with true 1-meter spacing');
})();
