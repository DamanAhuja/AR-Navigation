(() => {
  const ARROW_SPACING_METERS = 1;
  const SVG_TO_METERS_X = 5.45 / (230 - 90); // ~0.03893
  let arrows = [];
  let mapRotationOffset = 0; // This will store the rotation needed to align with real world

  function clearNavigation() {
    arrows.forEach(a => window.scene?.remove(a));
    arrows = [];
  }

  // Calculate the rotation offset between SVG north and real-world north
  function calculateMapRotationOffset() {
    if (!window.north || !window.worldOrigin) {
      console.warn("[AR Navigation] North marker or world origin not available");
      return 0;
    }

    // Vector from world origin to north marker in SVG coordinates
    const northVector = {
      x: window.north.x - window.worldOrigin.x,
      y: window.north.y - window.worldOrigin.y
    };

    // Calculate the angle of north relative to SVG coordinates
    // In SVG, positive Y is down, so we need to account for that
    const northAngleInSVG = Math.atan2(-northVector.y, northVector.x); // negative Y because SVG Y is flipped

    // In real world, north should point towards positive Z (or whatever your coordinate system uses)
    // This assumes your AR coordinate system has north as positive Z direction
    // Adjust this based on your actual coordinate system
    const realWorldNorthAngle = Math.PI / 2; // 90 degrees, pointing in positive Z direction

    // Calculate the rotation offset needed
    const rotationOffset = realWorldNorthAngle - northAngleInSVG;

    console.log(`[AR Navigation] North vector in SVG: (${northVector.x.toFixed(2)}, ${northVector.y.toFixed(2)})`);
    console.log(`[AR Navigation] North angle in SVG: ${(northAngleInSVG * 180 / Math.PI).toFixed(2)}°`);
    console.log(`[AR Navigation] Rotation offset needed: ${(rotationOffset * 180 / Math.PI).toFixed(2)}°`);

    return rotationOffset;
  }

  function svgToWorldBasic(svgX, svgY) {
    if (!window.worldOrigin || !window.worldOrigin.worldPosition) return new THREE.Vector3(0, 0, 0);
    
    const dx = svgX - window.worldOrigin.x;
    const dy = svgY - window.worldOrigin.y;
    
    // Apply rotation to align with real-world coordinates
    const rotatedX = dx * Math.cos(mapRotationOffset) - dy * Math.sin(mapRotationOffset);
    const rotatedY = dx * Math.sin(mapRotationOffset) + dy * Math.cos(mapRotationOffset);
    
    const xMeters = rotatedX * SVG_TO_METERS_X;
    const zMeters = rotatedY * SVG_TO_METERS_X;
    
    const origin = window.worldOrigin.worldPosition.clone();
    return new THREE.Vector3(origin.x + xMeters, origin.y, origin.z - zMeters);
  }

  function createArrowMesh() {
    const shaft = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8);
    const head = new THREE.ConeGeometry(0.1, 0.2, 8);
    const shaftMesh = new THREE.Mesh(shaft, new THREE.MeshBasicMaterial({ color: 0x1976d2 }));
    const headMesh = new THREE.Mesh(head, new THREE.MeshBasicMaterial({ color: 0xff5722 }));
    
    shaftMesh.position.y = 0.3;
    headMesh.position.y = 0.7;
    
    const arrow = new THREE.Group();
    arrow.add(shaftMesh, headMesh);
    arrow.rotation.x = Math.PI / 2;
    return arrow;
  }

  function placeArrows(pathNodes) {
    let totalDistance = 0;
    let nextArrowAt = ARROW_SPACING_METERS;
    
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const fromSvg = pathNodes[i];
      const toSvg = pathNodes[i + 1];
      const dx = toSvg.x - fromSvg.x;
      const dy = toSvg.y - fromSvg.y;
      const distSvg = Math.hypot(dx, dy);
      const distM = distSvg * SVG_TO_METERS_X;
      
      if (distM === 0) continue;
      
      const direction = new THREE.Vector2(dx, dy).normalize();
      
      while (totalDistance + distM >= nextArrowAt) {
        const distIntoSegment = nextArrowAt - totalDistance;
        const distIntoSegmentSvg = distIntoSegment / SVG_TO_METERS_X;
        
        const x = fromSvg.x + direction.x * distIntoSegmentSvg;
        const y = window.svgHeight - (fromSvg.y + direction.y * distIntoSegmentSvg);
        
        // Convert to world coordinates with proper rotation
        const pos = svgToWorldBasic(x, y);
        
        console.log(`[Arrow] SVG Position: (${x.toFixed(2)}, ${y.toFixed(2)})`);
        console.log(`[Arrow] World Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
        
        // Calculate direction for arrow orientation
        const nextSvgX = x + direction.x * 0.1;
        const nextSvgY = y + direction.y * 0.1;
        const nextPos = svgToWorldBasic(nextSvgX, nextSvgY);
        
        // Create and position arrow
        const arrow = createArrowMesh();
        arrow.position.copy(pos);
        arrow.lookAt(nextPos);
        arrow.rotateX(Math.PI / 2);
        arrow.scale.set(2, 2, 2);
        
        window.scene?.add(arrow);
        arrows.push(arrow);
        nextArrowAt += ARROW_SPACING_METERS;
      }
      totalDistance += distM;
    }
    console.log(`[AR Navigation] Placed ${arrows.length} arrows with rotation offset: ${(mapRotationOffset * 180 / Math.PI).toFixed(2)}°`);
  }

  window.startNavigation = function (destinationId) {
    clearNavigation();
    
    if (!window.userPosition || !window.goTo || !window.nodeMap) {
      console.error("[AR Navigation] Missing required components");
      return;
    }

    // Calculate the map rotation offset based on north marker
    mapRotationOffset = calculateMapRotationOffset();
    
    const result = window.goTo(destinationId);
    if (!result?.path || result.path.length < 2) {
      console.error("[AR Navigation] No valid path found");
      return;
    }
    
    const pathNodes = result.path.map(id => window.nodeMap[id]);
    placeArrows(pathNodes);
  };

  // Helper function to debug north alignment
  window.debugNorthAlignment = function() {
    if (!window.north || !window.worldOrigin) {
      console.log("North marker or world origin not available for debugging");
      return;
    }
    
    console.log("=== North Alignment Debug ===");
    console.log("North marker SVG position:", window.north);
    console.log("World origin SVG position:", window.worldOrigin);
    console.log("World origin world position:", window.worldOrigin.worldPosition);
    console.log("Calculated rotation offset:", (mapRotationOffset * 180 / Math.PI).toFixed(2) + "°");
    
    // Visualize north direction with a test arrow
    const northWorldPos = svgToWorldBasic(window.north.x, window.north.y);
    const testArrow = createArrowMesh();
    testArrow.position.copy(northWorldPos);
    testArrow.material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green for north
    testArrow.scale.set(3, 3, 3);
    
    window.scene?.add(testArrow);
    
    console.log("Green north indicator arrow placed at:", northWorldPos);
  };

  // Clear any existing navigation when the script loads
  clearNavigation();
})();
