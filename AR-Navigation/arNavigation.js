let currentPath = [];
let nextNodeIndex = 0;
let arrowEntity = null;
const ARROW_DISTANCE = 2; // Distance in meters in front of the camera
const NODE_REACHED_THRESHOLD = 5; // Distance in SVG units to consider a node "reached"

function startNavigation(destinationId) {
  if (!window.setCurrentMarkerId || !window.goTo || !window.nodeMap || !window.userPosition || !window.north) {
    console.error('[ARNavigation] Required variables not available');
    return;
  }

  // Get the path to the destination
  window.goTo(destinationId);
  // window.goTo logs the path, but we need to access it. Since window.goTo doesn't return the path,
  // we'll use a workaround by calling dijkstra directly (copying logic from leaflet.js)
  const currentMarkerId = window.nodeMap[Object.keys(window.nodeMap).find(id => {
    const node = window.nodeMap[id];
    const dist = Math.hypot(
      node.x - (window.userPosition.x * window.scaleFactorX),
      node.y - ((window.svgHeight - window.userPosition.y) * window.scaleFactorY)
    );
    return dist < NODE_REACHED_THRESHOLD;
  })]?.id;

  if (!currentMarkerId) {
    console.error('[ARNavigation] Current marker ID not determined');
    return;
  }

  window.setCurrentMarkerId(currentMarkerId);
  const result = dijkstra(currentMarkerId, destinationId);
  if (!result.path) {
    console.error('[ARNavigation] No path found to destination:', destinationId);
    return;
  }

  currentPath = result.path;
  nextNodeIndex = 1; // Start with the first node after the current position
  console.log('[ARNavigation] Path to destination:', currentPath);

  // Create the arrow if it doesn't exist
  if (!arrowEntity) {
    arrowEntity = document.createElement('a-entity');
    arrowEntity.setAttribute('geometry', {
      primitive: 'cone',
      height: 0.5,
      radiusBottom: 0.2,
      radiusTop: 0
    });
    arrowEntity.setAttribute('material', 'color: green; opacity: 0.8');
    arrowEntity.setAttribute('position', '0 0 -' + ARROW_DISTANCE); // Position in front of camera
    arrowEntity.setAttribute('rotation', '90 0 0'); // Point the cone forward
    const scene = document.querySelector('a-scene');
    const camera = scene.querySelector('a-entity[camera]');
    camera.appendChild(arrowEntity);
    console.log('[ARNavigation] Arrow added to scene');
  }

  updateArrowDirection();
}

function dijkstra(start, end) {
  const graph = {};
  window.extractedEdges.forEach(edge => {
    const from = window.nodeMap[edge.from];
    const to = window.nodeMap[edge.to];
    if (from && to) {
      if (!graph[from.id]) graph[from.id] = [];
      if (!graph[to.id]) graph[to.id] = [];
      const weight = Math.hypot(to.x - from.x, to.y - from.y);
      graph[from.id].push({ node: to.id, weight });
      graph[to.id].push({ node: from.id, weight });
    }
  });

  const distances = {}, previous = {}, queue = new Set(Object.keys(graph));
  for (const node of queue) {
    distances[node] = Infinity;
    previous[node] = null;
  }
  distances[start] = 0;

  while (queue.size > 0) {
    let currentNode = null;
    let minDistance = Infinity;
    for (const node of queue) {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        currentNode = node;
      }
    }

    if (currentNode === end) break;
    queue.delete(currentNode);

    for (const neighbor of graph[currentNode]) {
      const alt = distances[currentNode] + neighbor.weight;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        previous[neighbor.node] = currentNode;
      }
    }
  }

  const path = [];
  let curr = end;
  while (curr) {
    path.unshift(curr);
    curr = previous[curr];
  }

  return {
    distance: (distances[end] * 0.04254).toFixed(2),
    path: distances[end] !== Infinity ? path : null
  };
}

function getNorthOffset() {
  if (!window.north || typeof window.north.x !== 'number' || typeof window.north.y !== 'number') {
    console.warn('[ARNavigation] window.north not defined or invalid, assuming north is up');
    return 0;
  }
  const centerX = 115; // 230 / 2
  const centerY = 225; // 450 / 2
  const deltaX = window.north.x - centerX;
  const deltaY = window.north.y - centerY;
  const angle = Math.atan2(deltaX, deltaY) * 180 / Math.PI;
  return angle;
}

function updateArrowDirection() {
  if (!arrowEntity || nextNodeIndex >= currentPath.length) {
    if (arrowEntity) {
      arrowEntity.parentNode.removeChild(arrowEntity);
      arrowEntity = null;
      console.log('[ARNavigation] Destination reached, arrow removed');
    }
    currentPath = [];
    nextNodeIndex = 0;
    return;
  }

  // Get the next node in the path
  const nextNodeId = currentPath[nextNodeIndex];
  const nextNode = window.nodeMap[nextNodeId];
  if (!nextNode) {
    console.error('[ARNavigation] Next node not found:', nextNodeId);
    return;
  }

  // Compute direction from user to next node in SVG coordinates
  const deltaX = nextNode.x / window.scaleFactorX - window.userPosition.x;
  const deltaY = (window.svgHeight - nextNode.y / window.scaleFactorY) - window.userPosition.y;
  let angle = Math.atan2(deltaX, deltaY) * 180 / Math.PI;

  // Adjust for window.north
  const northOffset = getNorthOffset();
  angle = (angle - northOffset) % 360;
  if (angle < 0) angle += 360;

  // In A-Frame, rotation is around the Y-axis (yaw), 0 degrees is along the negative Z-axis (forward)
  // We need to adjust the angle so the arrow points toward the next node
  const aframeAngle = (90 - angle) % 360;

  // Update arrow rotation
  arrowEntity.setAttribute('rotation', `90 ${aframeAngle} 0`);
  console.log('[ARNavigation] Arrow pointing to node:', nextNodeId, 'at angle:', aframeAngle);

  // Check if the user has reached the next node
  const distanceToNode = Math.hypot(deltaX, deltaY);
  if (distanceToNode < NODE_REACHED_THRESHOLD) {
    nextNodeIndex++;
    console.log('[ARNavigation] Reached node:', nextNodeId, 'Next node index:', nextNodeIndex);
    updateArrowDirection();
  }
}

// Monitor user position changes
let lastPosition = { x: 0, y: 0 };
function monitorPosition() {
  if (window.userPosition && (window.userPosition.x !== lastPosition.x || window.userPosition.y !== lastPosition.y)) {
    lastPosition = { x: window.userPosition.x, y: window.userPosition.y };
    updateArrowDirection();
  }
  requestAnimationFrame(monitorPosition);
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('[ARNavigation] arNavigation.js loaded');
  requestAnimationFrame(monitorPosition);
});

// Expose startNavigation globally so it can be called (e.g., from the Go button)
window.startNavigation = startNavigation;
