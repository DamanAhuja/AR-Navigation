(() => {
  const ARROW_SPACING_METERS = 1;      // Place one arrow every 1m
  const SVG_TO_METERS = 0.01;          // 1 SVG unit = 1cm

  let arrows = [];
  let pathNodes = [];
  let navActive = false;

  function clearNavigation() {
    arrows.forEach(a => scene.remove(a));
    arrows = [];
    pathNodes = [];
    navActive = false;
    console.log('[AR Navigation] Navigation cleared');
  }

  function svgToWorld(svgX, svgY) {
    const dx = svgX - window.userPosition.x;
    const dy = svgY - window.userPosition.y;

    const angleRad = getNorthOffset() * Math.PI / 180;

    const xMeters = dx * SVG_TO_METERS;
    const zMeters = -dy * SVG_TO_METERS;

    const rotatedX = xMeters * Math.cos(angleRad) - zMeters * Math.sin(angleRad);
    const rotatedZ = xMeters * Math.sin(angleRad) + zMeters * Math.cos(angleRad);

    return new THREE.Vector3(rotatedX, 0, rotatedZ);
  }

  function createArrowMesh() {
    try {
      const shaft = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8);
      const head = new THREE.ConeGeometry(0.1, 0.2, 8);

      const shaftMaterial = new THREE.MeshBasicMaterial({ color: 0x1976d2 });
      const headMaterial = new THREE.MeshBasicMaterial({ color: 0xff5722 });

      const shaftMesh = new THREE.Mesh(shaft, shaftMaterial);
      const headMesh = new THREE.Mesh(head, headMaterial);

      shaftMesh.position.y = 0.3;
      headMesh.position.y = 0.7;

      const arrow = new THREE.Group();
      arrow.add(shaftMesh);
      arrow.add(headMesh);

      arrow.rotation.x = Math.PI / 2;

      return arrow;
    } catch (err) {
      console.error('[AR Arrow] Failed to create arrow mesh:', err);
      return null;
    }
  }

  function drawArrowsBetween(fromNode, toNode) {
    console.log("[AR] Drawing arrows from", fromNode, "to", toNode);

    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const distanceSVG = Math.hypot(dx, dy);
    const distanceMeters = distanceSVG * SVG_TO_METERS;
    const steps = Math.floor(distanceMeters / ARROW_SPACING_METERS);

    console.log(`[AR] Total distance: ${distanceMeters.toFixed(2)} m, steps: ${steps}`);

    if (steps === 0) {
      console.warn('[AR] Too close to draw arrows. Skipping.');
      return;
    }

    for (let i = 1; i <= steps; i++) {
      const lerpX = fromNode.x + (dx * i / steps);
      const lerpY = fromNode.y + (dy * i / steps);

      const worldPos = svgToWorld(lerpX, lerpY);
      const arrow = createArrowMesh();
      if (!arrow) continue;

      arrow.position.copy(worldPos);

      if (typeof scene !== 'undefined') {
        scene.add(arrow);
      } else {
        console.warn('[AR Navigation] Scene is undefined. Arrow not added.');
      }

      arrows.push(arrow);
      console.log(`[AR Navigation] Placed arrow at world: (${worldPos.x.toFixed(2)}, 0, ${worldPos.z.toFixed(2)})`);
    }

    console.log(`[AR Navigation] Total arrows placed: ${arrows.length}`);
  }

  function highlightNearestArrow() {
    if (!navActive || !window.userPosition || arrows.length === 0) return;

    const userWorldPos = new THREE.Vector3(0, 0, 0); // user is at world origin in AR

    arrows.forEach(arrow => {
      const dist = arrow.position.distanceTo(userWorldPos);
      arrow.children[1].material.color.set(dist < 1.5 ? 0xffff00 : 0xff5722);
    });
  }

  window.startNavigation = function (destinationId) {
    clearNavigation();

    if (!window.userPosition || !window.goTo || !window.nodeMap) {
      console.error('[AR Navigation] Required state not initialized');
      alert('Missing position or graph data.');
      return;
    }

    const pathResult = window.goTo(destinationId);
    if (!pathResult?.path || pathResult.path.length < 2) {
      console.warn('[AR Navigation] Invalid path');
      alert('No path found.');
      return;
    }

    pathNodes = pathResult.path.map(id => window.nodeMap[id]);

    for (let i = 0; i < pathNodes.length - 1; i++) {
      drawArrowsBetween(pathNodes[i], pathNodes[i + 1]);
    }

    navActive = true;
    console.log(`[AR Navigation] Navigation started to ${destinationId}`);
  };

  setInterval(() => {
    if (navActive) highlightNearestArrow();
  }, 1000);
})();
