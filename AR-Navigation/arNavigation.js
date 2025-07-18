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
    let sampled = [];

    for (let i = 0; i < pathNodes.length - 1; i++) {
      const from = pathNodes[i];
      const to = pathNodes[i + 1];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distSvg = Math.hypot(dx, dy);
      const distM = distSvg * SVG_TO_METERS_X;
      const steps = Math.floor(distM / ARROW_SPACING_METERS);
      const dirX = dx / distSvg;
      const dirY = dy / distSvg;

      for (let j = 1; j <= steps; j++) {
        const x = from.x + dirX * (j * ARROW_SPACING_METERS / SVG_TO_METERS_X);
        const y = from.y + dirY * (j * ARROW_SPACING_METERS / SVG_TO_METERS_X);
        sampled.push({ x, y });
      }
    }

    for (let i = 0; i < sampled.length - 1; i++) {
      const pos = svgToWorldBasic(sampled[i].x, sampled[i].y);
      const next = svgToWorldBasic(sampled[i + 1].x, sampled[i + 1].y);
      const arrow = createArrowMesh();
      arrow.position.copy(pos);
      arrow.lookAt(next);
      arrow.rotation.x = 0;
      arrow.rotation.z = 0;
      arrow.scale.set(5, 5, 5);
      window.scene?.add(arrow);
      arrows.push(arrow);
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
