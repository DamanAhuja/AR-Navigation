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
    
    // Convert all path nodes to world positions first
    const worldPath = pathNodes.map(node => {
      const y = window.svgHeight - node.y;
      return {
        svgPos: { x: node.x, y: y },
        worldPos: svgToWorldBasic(node.x, y)
      };
    });
    
    // Calculate total path length in world coordinates
    let totalPathLength = 0;
    const segmentLengths = [];
    for (let i = 0; i < worldPath.length - 1; i++) {
      const segmentLength = worldPath[i].worldPos.distanceTo(worldPath[i + 1].worldPos);
      segmentLengths.push(segmentLength);
      totalPathLength += segmentLength;
    }
    
    console.log(`[AR Navigation] Total path length: ${totalPathLength.toFixed(2)}m`);
    
    // Place arrows at exact meter intervals along the world path
    const numArrows = Math.floor(totalPathLength / ARROW_SPACING_METERS);
    console.log(`[AR Navigation] Will place ${numArrows} arrows`);
    
    for (let arrowIndex = 0; arrowIndex < numArrows; arrowIndex++) {
      const targetDistance = (arrowIndex + 1) * ARROW_SPACING_METERS;
      
      // Find which segment this distance falls into
      let accumulatedDistance = 0;
      let segmentIndex = 0;
      
      for (let i = 0; i < segmentLengths.length; i++) {
        if (accumulatedDistance + segmentLengths[i] >= targetDistance) {
          segmentIndex = i;
          break;
        }
        accumulatedDistance += segmentLengths[i];
      }
      
      // Calculate position within the segment
      const distanceIntoSegment = targetDistance - accumulatedDistance;
      const segmentProgress = distanceIntoSegment / segmentLengths[segmentIndex];
      
      // Interpolate position in world coordinates
      const startWorld = worldPath[segmentIndex].worldPos;
      const endWorld = worldPath[segmentIndex + 1].worldPos;
      const arrowPos = startWorld.clone().lerp(endWorld, segmentProgress);
      
      // Calculate direction for arrow orientation
      const direction = endWorld.clone().sub(startWorld).normalize();
      const lookAtPos = arrowPos.clone().add(direction.clone().multiplyScalar(0.1));
      
      console.log(`[Arrow ${arrowIndex + 1}] Position: (${arrowPos.x.toFixed(2)}, ${arrowPos.y.toFixed(2)}, ${arrowPos.z.toFixed(2)})`);
      
      // Create and place arrow
      const arrow = createArrowMesh();
      arrow.position.copy(arrowPos);
      arrow.lookAt(lookAtPos);
      arrow.rotateX(Math.PI / 2);
      arrow.scale.set(2, 2, 2);
      
      window.scene?.add(arrow);
      arrows.push(arrow);
      
      // Debug: Check distance from previous arrow
      if (arrows.length > 1) {
        const prevArrow = arrows[arrows.length - 2];
        const actualDistance = arrowPos.distanceTo(prevArrow.position);
        console.log(`[Arrow ${arrowIndex + 1}] Distance from previous: ${actualDistance.toFixed(2)}m`);
      }
    }
    
    console.log(`[AR Navigation] Successfully placed ${arrows.length} arrows.`);
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
