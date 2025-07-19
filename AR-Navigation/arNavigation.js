(() => {
  const ARROW_SPACING_METERS = 1;
  const SVG_TO_METERS_X = 5.45 / (230 - 90); // ~0.03893
  let arrows = [];
  
  function clearNavigation() {
    arrows.forEach(a => window.scene?.remove(a));
    arrows = [];
  }
  
  function svgToWorldBasic(svgX, svgY) {
    if (!window.worldOrigin || !window.worldOrigin.worldPosition) return new THREE.Vector3(0, 0, 0);
    const dx = svgX - window.worldOrigin.x;
    const dy = svgY - window.worldOrigin.y;
    const xMeters = dx * SVG_TO_METERS_X;
    const zMeters = dy * SVG_TO_METERS_X; // assuming same scale for now
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
    if (pathNodes.length < 2) return;
    
    // Convert all path nodes to AR world positions
    const arWorldPath = [];
    for (let i = 0; i < pathNodes.length; i++) {
      const node = pathNodes[i];
      const y = window.svgHeight - node.y;
      const worldPos = svgToWorldBasic(node.x, y);
      arWorldPath.push(worldPos);
      console.log(`[Path Node ${i}] SVG: (${node.x}, ${node.y}) -> AR World: (${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)})`);
    }
    
    // Build path segments with cumulative distances in AR world space
    const pathSegments = [];
    let cumulativeDistance = 0;
    
    for (let i = 0; i < arWorldPath.length - 1; i++) {
      const start = arWorldPath[i];
      const end = arWorldPath[i + 1];
      const segmentDistance = start.distanceTo(end); // Real AR world distance
      
      pathSegments.push({
        start: start.clone(),
        end: end.clone(),
        length: segmentDistance,
        startCumulative: cumulativeDistance,
        endCumulative: cumulativeDistance + segmentDistance
      });
      
      cumulativeDistance += segmentDistance;
      console.log(`[Segment ${i}] AR World Distance: ${segmentDistance.toFixed(3)}m, Cumulative: ${cumulativeDistance.toFixed(3)}m`);
    }
    
    console.log(`[AR Navigation] Total AR path length: ${cumulativeDistance.toFixed(2)}m`);
    
    // Place arrows every 1 meter in AR world space
    let nextArrowDistance = ARROW_SPACING_METERS;
    let arrowCount = 0;
    
    while (nextArrowDistance < cumulativeDistance) {
      // Find which segment this distance falls into
      let targetSegment = null;
      for (const segment of pathSegments) {
        if (nextArrowDistance >= segment.startCumulative && nextArrowDistance <= segment.endCumulative) {
          targetSegment = segment;
          break;
        }
      }
      
      if (!targetSegment) {
        nextArrowDistance += ARROW_SPACING_METERS;
        continue;
      }
      
      // Calculate position within segment (in AR world coordinates)
      const distanceIntoSegment = nextArrowDistance - targetSegment.startCumulative;
      const segmentProgress = distanceIntoSegment / targetSegment.length;
      
      // Linear interpolation in AR world space
      const arrowPosition = targetSegment.start.clone().lerp(targetSegment.end, segmentProgress);
      
      // Calculate direction vector in AR world space
      const direction = targetSegment.end.clone().sub(targetSegment.start).normalize();
      const lookAtTarget = arrowPosition.clone().add(direction.multiplyScalar(0.5));
      
      console.log(`[Arrow ${arrowCount + 1}] Target Distance: ${nextArrowDistance.toFixed(2)}m`);
      console.log(`[Arrow ${arrowCount + 1}] AR Position: (${arrowPosition.x.toFixed(3)}, ${arrowPosition.y.toFixed(3)}, ${arrowPosition.z.toFixed(3)})`);
      
      // Create arrow mesh
      const arrow = createArrowMesh();
      arrow.position.copy(arrowPosition);
      arrow.lookAt(lookAtTarget);
      arrow.rotateX(Math.PI / 2);
      arrow.scale.set(2, 2, 2);
      
      window.scene?.add(arrow);
      arrows.push(arrow);
      
      // Verify spacing with previous arrow
      if (arrows.length > 1) {
        const prevArrow = arrows[arrows.length - 2];
        const actualDistance = arrowPosition.distanceTo(prevArrow.position);
        console.log(`[Arrow ${arrowCount + 1}] Actual distance from previous: ${actualDistance.toFixed(3)}m`);
      }
      
      arrowCount++;
      nextArrowDistance += ARROW_SPACING_METERS;
    }
    
    console.log(`[AR Navigation] Placed ${arrows.length} arrows with 1m AR world spacing.`);
  }
  
  window.startNavigation = function (destinationId) {
    clearNavigation();
    if (!window.userPosition || !window.goTo || !window.nodeMap) return;
    const result = window.goTo(destinationId);
    if (!result?.path || result.path.length < 2) return;
    const pathNodes = result.path.map(id => window.nodeMap[id]);
    placeArrows(pathNodes);
  };
})();
