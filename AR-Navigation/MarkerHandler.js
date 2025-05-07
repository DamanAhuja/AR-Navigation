document.addEventListener("DOMContentLoaded", function () {
    document.addEventListener('targetFound', (e) => {
        const targetIndex = e.detail.targetIndex;
        const svgNodes = window.extractedNodes || [];
        const markerId = svgNodes[targetIndex]?.id;

        console.log("Detected marker index:", targetIndex, "-> Marker ID:", markerId);

        if (markerId && typeof window.setUserLocation === 'function') {
            window.setUserLocation(markerId);
        }

        // Assuming routeToDestination is part of the logic after the target is found
        const path = window.routeToDestination(markerId);

        // Show arrows for each consecutive pair of nodes in the path
        for (let i = 0; i < path.length - 1; i++) {
            const fromNode = svgNodes.find(n => n.id === path[i]);
            const toNode = svgNodes.find(n => n.id === path[i + 1]);

            if (fromNode && toNode) {
                showArrowBetween(fromNode.position, toNode.position);
            }
        }
    });
});

function showArrowBetween(from, to) {
  const scene = document.querySelector('a-scene');

  const arrow = document.createElement('a-entity');
  arrow.setAttribute('geometry', {
    primitive: 'cone',
    radiusBottom: 0.1,
    radiusTop: 0,
    height: 0.3
  });
  arrow.setAttribute('material', 'color: red');

  // Calculate direction and position
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const angle = Math.atan2(dx, dz) * (180 / Math.PI);

  arrow.setAttribute('position', {
    x: from.x,
    y: from.y + 0.3, // raise slightly above ground
    z: from.z
  });

  arrow.setAttribute('rotation', {
    x: -90, // cone points forward
    y: angle,
    z: 0
  });

  arrow.setAttribute('id', 'directionArrow');

  // Remove any existing arrow
  const old = document.getElementById('directionArrow');
  if (old) old.remove();

  scene.appendChild(arrow);
}
