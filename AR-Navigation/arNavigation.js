(() => {
  const ARROW_SPACING_METERS = 1;
  const SVG_TO_METERS = 0.01;

  let arrows = [];
  let pathNodes = [];
  let navActive = false;

  function clearNavigation() {
    arrows.forEach(a => window.scene.remove(a));
    arrows = [];
    pathNodes = [];
    navActive = false;
    console.log('[AR Navigation] Navigation cleared');
  }

  function svgToWorld(svgX, svgY) {
    if (!window.worldOrigin || !window.worldOrigin.worldPosition) {
      console.warn('[AR] Missing world origin');
      return new THREE.Vector3(0, 0, 0);
    }

    const dx = svgX - window.worldOrigin.x;
    const dy = svgY - window.worldOrigin.y;

    const angleRad = (getNorthOffset?.() || 0) * Math.PI / 180;

    const xMeters = dx * SVG_TO_METERS;
    const zMeters = dy * SVG_TO_METERS;

    const rotatedX = xMeters * Math.cos(angleRad) - zMeters * Math.sin(angleRad);
    const rotatedZ = xMeters * Math.sin(angleRad) + zMeters * Math.cos(angleRad);

    const origin = window.worldOrigin.worldPosition.clone();

    return new THREE.Vector3(
      origin.x + rotatedX,
      origin.y, // keep Y fixed as anchor
      origin.z - rotatedZ
    );
  }

  window.svgToWorld = svgToWorld;

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

  function placeArrowsAlongPath(pathNodes) {
  const sampledPoints = [];
  const totalPoints = [];

  // Collect all SVG points from path segments
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const from = pathNodes[i];
    const to = pathNodes[i + 1];
    totalPoints.push([from, to]);
  }

  // Walk the full path and place arrows every 1m
  let remaining = 0; // meters carried over to next segment

  for (const [from, to] of totalPoints) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distSVG = Math.hypot(dx, dy);
    const distM = distSVG * SVG_TO_METERS;

    const segmentSteps = Math.floor((distM + remaining) / ARROW_SPACING_METERS);
    const segmentDirX = dx / distSVG;
    const segmentDirY = dy / distSVG;

    let offsetM = ARROW_SPACING_METERS - remaining;

    for (let i = 0; i < segmentSteps; i++) {
      const svgX = from.x + segmentDirX * (offsetM / SVG_TO_METERS);
      const svgY = from.y + segmentDirY * (offsetM / SVG_TO_METERS);
      sampledPoints.push({ x: svgX, y: svgY });

      offsetM += ARROW_SPACING_METERS;
    }

    // Calculate leftover distance for next segment
    remaining = (distM + remaining) % ARROW_SPACING_METERS;
  }

  // Instantiate arrows at sampled points
  for (let i = 0; i < sampledPoints.length - 1; i++) {
    const point = sampledPoints[i];
    const next = sampledPoints[i + 1];

    const worldPos = svgToWorld(point.x, point.y);
    const nextWorld = svgToWorld(next.x, next.y);

    const arrow = createArrowMesh();
    if (!arrow) continue;

    arrow.position.copy(worldPos);
    arrow.scale.set(5, 5, 5);
    arrow.lookAt(nextWorld);
    arrow.rotation.x = 0;
    arrow.rotation.z = 0;

    if (window.scene) {
      window.scene.add(arrow);
    }
    arrows.push(arrow);
  }

  console.log(`[AR Navigation] ${arrows.length} arrows placed along path.`);
}


  function highlightNearestArrow() {
    if (!navActive || !window.camera || arrows.length === 0) return;

    const userWorldPos = window.camera.position.clone();

    arrows.forEach(arrow => {
      const dist = arrow.position.distanceTo(userWorldPos);
      arrow.children[1].material.color.set(dist < 1.5 ? 0xffff00 : 0xff5722);
    });
  }

  // Call this when routing is triggered
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

    placeArrowsAlongPath(pathNodes);

    navActive = true;
    console.log(`[AR Navigation] Navigation started to ${destinationId}`);
  };

  // Expose for use in render loop
  window.updateNavigationFrame = highlightNearestArrow;
})();
