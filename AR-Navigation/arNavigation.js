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

  function placeArrowsAlongPath(pathNodes) {
  const sampledPoints = [];

  let remaining = 0;

  for (let i = 0; i < pathNodes.length - 1; i++) {
    const from = pathNodes[i];
    const to = pathNodes[i + 1];

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distSVG = Math.hypot(dx, dy);
    const distM = distSVG * SVG_TO_METERS;

    const segmentDirX = dx / distSVG;
    const segmentDirY = dy / distSVG;

    const totalAvailable = distM + remaining;
    const segmentSteps = Math.floor(totalAvailable / ARROW_SPACING_METERS);
    let offsetM = (remaining > 0) ? ARROW_SPACING_METERS - remaining : 0;

    for (let j = 0; j < segmentSteps; j++) {
      const svgX = from.x + segmentDirX * (offsetM / SVG_TO_METERS);
      const svgY = from.y + segmentDirY * (offsetM / SVG_TO_METERS);
      sampledPoints.push({ x: svgX, y: svgY });

      offsetM += ARROW_SPACING_METERS;
    }

    const usedDistance = segmentSteps * ARROW_SPACING_METERS;
    remaining = totalAvailable - usedDistance;
  }

  // Instantiate arrows
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

    window.scene?.add(arrow);
    arrows.push(arrow);
  }

  console.log(`[AR Navigation] ${arrows.length} arrows placed along path.`);
}


  window.startNavigation = function (destinationId) {
    clearNavigation();
    if (!window.userPosition || !window.goTo || !window.nodeMap) return;

    const result = window.goTo(destinationId);
    if (!result?.path || result.path.length < 2) return;

    const pathNodes = result.path.map(id => window.nodeMap[id]);
    placeArrowsAlongPath(pathNodes);
  };
})();
