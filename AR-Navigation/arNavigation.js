(() => {
  const ARROW_SPACING_METERS = 1;  // Place arrow every 1m
  const SVG_TO_METERS = 0.1;       // 1 SVG unit = 0.1 meters

  let arrows = [];
  let pathNodes = [];
  let navActive = false;

  // Clear existing arrows from scene
  function clearNavigation() {
     arrows.forEach(a => scene.remove(a));
    arrows = [];
    pathNodes = [];
    navActive = false;
    console.log('[AR Navigation] Navigation cleared');
  }

  // Converts SVG coords → AR world coords (relative to marker anchor)
  function svgToWorld(svgX, svgY) {
    const dx = svgX - window.userPosition.x;
    const dy = svgY - window.userPosition.y;

    const angleOffset = getNorthOffset() * Math.PI / 180;

    const xMeters = dx * SVG_TO_METERS;
    const zMeters = -dy * SVG_TO_METERS;

    const rotatedX = xMeters * Math.cos(angleOffset) - zMeters * Math.sin(angleOffset);
    const rotatedZ = xMeters * Math.sin(angleOffset) + zMeters * Math.cos(angleOffset);

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

    console.log('[AR Arrow] Created arrow mesh:', arrow);
    return arrow;
  } catch (err) {
    console.error('[AR Arrow] Failed to create arrow mesh:', err);
    return null;
  }
}
function drawArrowsBetween(fromNode, toNode) {
  console.log("[AR] Drawing arrows from", fromNode, "to", toNode);

  const segmentDistance = 100; // 1 meter in SVG units
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.floor(distance / segmentDistance);

  if (steps === 0) {
    console.warn('[AR] Too close to draw arrows. Skipping.');
    return;
  }

  for (let i = 1; i <= steps; i++) {
    const lerpX = fromNode.x + (dx * i / steps);
    const lerpY = fromNode.y + (dy * i / steps);

    const worldX = (lerpX - window.worldOrigin.x) / 100;
    const worldZ = (lerpY - window.worldOrigin.y) / 100;

    const arrow = createArrowMesh();
    if (!arrow) {
      console.warn(`[AR] Failed to create arrow at step ${i}`);
      continue;
    }

    arrow.position.set(worldX, 0, worldZ);

   if (typeof scene !== 'undefined') {
  scene.add(arrow);
} else {
  console.warn('[AR Navigation] Scene is undefined. Arrow not added.');
}

    arrows.push(arrow);

    console.log(`[AR Navigation] Placed arrow at world: (${worldX.toFixed(2)}, 0, ${worldZ.toFixed(2)})`);
  }

  console.log(`[AR Navigation] Total arrows placed: ${arrows.length}`);
}

  // Create a simple arrow mesh (shaft + head)
/* function createArrowMesh() {
  const shaft = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8);
  const head = new THREE.ConeGeometry(0.1, 0.2, 8);

  const shaftMesh = new THREE.Mesh(shaft, new THREE.MeshBasicMaterial({ color: 0x1976d2 }));
  const headMesh = new THREE.Mesh(head, new THREE.MeshBasicMaterial({ color: 0xff5722 }));

  shaftMesh.position.y = 0.3;
  headMesh.position.y = 0.7;

  const arrow = new THREE.Group();
  arrow.add(shaftMesh);
  arrow.add(headMesh);

  arrow.rotation.x = Math.PI / 2;

  console.log('[AR Arrow] Created arrow mesh');

  return arrow;
}

function drawArrowsBetween(fromNode, toNode) {
    console.log("[AR] Drawing arrows from", fromNode, "to", toNode);
  const segmentDistance = 100; // 1 meter in SVG units (if 100px = 1m)
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.floor(distance / segmentDistance);

  for (let i = 1; i <= steps; i++) {
    const lerpX = fromNode.x + (dx * i / steps);
    const lerpY = fromNode.y + (dy * i / steps);

    // Convert to AR world coordinates
    const worldX = (lerpX - window.worldOrigin.x) / 100;
    const worldZ = (lerpY - window.worldOrigin.y) / 100;

    const arrow = createArrowMesh();
    arrow.position.set(worldX, 0, worldZ); // Y = 0 for flat ground

    scene.add(arrow); 
    arrows.push(arrow);

    console.log(`[AR Navigation] Placed arrow at world: (${worldX.toFixed(2)}, 0, ${worldZ.toFixed(2)})`);
  }
}*/


  function highlightNearestArrow() {
    if (!navActive || !window.userPosition || arrows.length === 0) return;

    const userWorldPos = new THREE.Vector3(0, 0, 0); // User is always at origin in AR scene

    arrows.forEach((arrow, idx) => {
      const dist = arrow.position.distanceTo(userWorldPos);
      const color = arrow.children[1].material.color;
      color.set(dist < 1.5 ? 0xffff00 : 0xff5722); // Highlight in yellow if close
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
    if (!pathResult || !pathResult.path || pathResult.path.length < 2) {
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

  // Update arrow highlight every second
  setInterval(() => {
    if (navActive) {
      highlightNearestArrow();
    }
  }, 1000);

})();
