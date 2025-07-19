(() => {
  const ARROW_SPACING_METERS = 1;
  const SVG_TO_METERS_X = 5.45 / (230 - 90); // ~0.03893
  let arrows = [];
  let northOffsetAngle = 0; // Angle in radians to correct for north orientation
  
  function clearNavigation() {
    arrows.forEach(a => window.scene?.remove(a));
    arrows = [];
  }

  function svgToWorldBasic(svgX, svgY) {
    if (!window.worldOrigin || !window.worldOrigin.worldPosition) return new THREE.Vector3(0, 0, 0);
    const dx = svgX - window.worldOrigin.x;
    const dy = svgY - window.worldOrigin.y;
    const xMeters = dx * SVG_TO_METERS_X;
    const zMeters = dy * SVG_TO_METERS_X;
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

  // Calculate the north offset angle when marker is scanned
  function calculateNorthOffset(markerPosition, userCurrentPosition) {
    if (!window.north || !markerPosition) return 0;
    
    // Calculate the vector from marker to north in SVG coordinates
    const northVectorSvg = {
      x: window.north.x - markerPosition.x,
      y: window.north.y - markerPosition.y
    };
    
    // Calculate the angle of north direction in SVG coordinate system
    const svgNorthAngle = Math.atan2(northVectorSvg.y, northVectorSvg.x);
    
    // In AR/camera coordinate system, we assume the user is initially facing forward (negative Z)
    // The offset is the difference between where north should be and where it appears to be
    // This will need to be calibrated based on how the marker is oriented in real world
    const realWorldNorthAngle = 0; // Assuming north is initially forward, adjust as needed
    
    const offsetAngle = svgNorthAngle - realWorldNorthAngle;
    
    console.log(`[North Offset] SVG North Vector: (${northVectorSvg.x.toFixed(2)}, ${northVectorSvg.y.toFixed(2)})`);
    console.log(`[North Offset] SVG North Angle: ${(svgNorthAngle * 180 / Math.PI).toFixed(2)}°`);
    console.log(`[North Offset] Calculated Offset: ${(offsetAngle * 180 / Math.PI).toFixed(2)}°`);
    
    return offsetAngle;
  }

  function rotateVector2D(vector, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: vector.x * cos - vector.y * sin,
      y: vector.x * sin + vector.y * cos
    };
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
        const pos = svgToWorldBasic(x, y);
        
        console.log(`[Arrow] SVG Position: (${x.toFixed(2)}, ${y.toFixed(2)})`);
        console.log(`[Arrow] World Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
        
        // Calculate the direction vector in SVG coordinates
        const svgDirection = { x: direction.x, y: direction.y };
        
        // Apply north offset rotation to the direction vector
        const correctedDirection = rotateVector2D(svgDirection, northOffsetAngle);
        
        // Create arrow
        const arrow = createArrowMesh();
        arrow.position.copy(pos);
        
        // Calculate the target position for arrow orientation
        const targetX = x + correctedDirection.x * 0.5; // Increased step for better direction calculation
        const targetY = y + correctedDirection.y * 0.5;
        const targetPos = svgToWorldBasic(targetX, targetY);
        
        // Orient the arrow towards the corrected direction
        arrow.lookAt(targetPos);
        arrow.rotateX(Math.PI / 2); // Adjust for arrow mesh orientation
        
        arrow.scale.set(2, 2, 2);
        
        console.log(`[Arrow] Direction before correction: (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)})`);
        console.log(`[Arrow] Direction after north correction: (${correctedDirection.x.toFixed(2)}, ${correctedDirection.y.toFixed(2)})`);
        console.log(`[Arrow] North offset angle: ${(northOffsetAngle * 180 / Math.PI).toFixed(2)}°`);
        
        window.scene?.add(arrow);
        arrows.push(arrow);
        nextArrowAt += ARROW_SPACING_METERS;
      }
      totalDistance += distM;
    }
    console.log(`[AR Navigation] Placed ${arrows.length} arrows with north offset correction.`);
  }

  // Function to set the north offset when marker is scanned
  window.setNorthOffset = function(markerNodeId) {
    const markerNode = window.nodeMap?.[markerNodeId];
    if (!markerNode) {
      console.warn(`[North Offset] Marker node ${markerNodeId} not found`);
      return;
    }
    
    northOffsetAngle = calculateNorthOffset(markerNode);
    console.log(`[North Offset] Set north offset angle to: ${(northOffsetAngle * 180 / Math.PI).toFixed(2)}° for marker ${markerNodeId}`);
  };

  // Function to manually set north offset angle (for testing/calibration)
  window.setNorthOffsetAngle = function(angleInDegrees) {
    northOffsetAngle = angleInDegrees * Math.PI / 180;
    console.log(`[North Offset] Manually set north offset angle to: ${angleInDegrees}°`);
  };

  window.startNavigation = function (destinationId) {
    clearNavigation();
    if (!window.userPosition || !window.goTo || !window.nodeMap) {
      console.warn('[AR Navigation] Missing required components for navigation');
      return;
    }
    
    const result = window.goTo(destinationId);
    if (!result?.path || result.path.length < 2) {
      console.warn('[AR Navigation] No valid path found');
      return;
    }
    
    const pathNodes = result.path.map(id => window.nodeMap[id]);
    console.log(`[AR Navigation] Starting navigation with north offset: ${(northOffsetAngle * 180 / Math.PI).toFixed(2)}°`);
    placeArrows(pathNodes);
  };

  // Utility function to get current north offset angle
  window.getNorthOffsetAngle = function() {
    return northOffsetAngle * 180 / Math.PI; // Return in degrees
  };

  console.log('[AR Navigation] Enhanced navigation with north offset correction loaded');
  console.log('[AR Navigation] Available functions: setNorthOffset(), setNorthOffsetAngle(), startNavigation(), getNorthOffsetAngle()');
})();
