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

      // Lookahead for direction
      const nextSvgX = x + direction.x * 0.01; // small step forward
      const nextSvgY = y + direction.y * 0.01;
      const nextPos = svgToWorldBasic(nextSvgX, nextSvgY);

      const arrow = createArrowMesh();
      arrow.position.copy(pos);
      arrow.lookAt(nextPos);
      arrow.rotation.x = 0;
      arrow.rotation.z = 0;
      arrow.scale.set(5, 5, 5);

      window.scene?.add(arrow);
      arrows.push(arrow);

      nextArrowAt += ARROW_SPACING_METERS;
    }

    totalDistance += distM;
  }

  console.log(`[AR Navigation] Placed ${arrows.length} arrows.`);
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
