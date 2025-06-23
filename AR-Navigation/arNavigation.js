// arNavigation.js - AR Navigation with Path Arrows

window.arNavigationActive = false;
window.currentPath = null;
window.arrowObjects = [];
window.navigationArrows = [];

// Configuration
const ARROW_SPACING = 1.0; // meters between arrows
const ARROW_HEIGHT = 0.5; // height above ground
const ARROW_SCALE = 0.3; // size of arrows
const SVG_TO_METER_SCALE = 0.04254; // conversion factor from your leaflet.js

// Arrow geometry creation
function createArrowGeometry() {
  const geometry = new THREE.ConeGeometry(0.2, 0.6, 8);
  // Rotate to point forward (along Z-axis)
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

// Arrow material
function createArrowMaterial() {
  return new THREE.MeshBasicMaterial({ 
    color: 0x00ff00, // Green arrows
    transparent: true,
    opacity: 0.8
  });
}

// Calculate bearing between two points (in degrees)
function calculateBearing(from, to) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  let bearing = Math.atan2(deltaX, deltaY) * (180 / Math.PI);
  
  // Adjust for north offset if available
  if (window.north && typeof window.north.x === 'number' && typeof window.north.y === 'number') {
    const northOffset = getNorthOffset();
    bearing = (bearing - northOffset + 360) % 360;
  }
  
  return bearing;
}

// Get north offset (copied from sensors.js logic)
function getNorthOffset() {
  if (!window.north || typeof window.north.x !== 'number' || typeof window.north.y !== 'number') {
    return 0;
  }
  const centerX = 115; // 230 / 2
  const centerY = 225; // 450 / 2
  const deltaX = window.north.x - centerX;
  const deltaY = window.north.y - centerY;
  return Math.atan2(deltaX, deltaY) * 180 / Math.PI;
}

// Convert SVG coordinates to AR world coordinates
function svgToARCoords(svgX, svgY) {
  // Convert SVG pixels to meters using the scale factor
  const meterX = svgX * SVG_TO_METER_SCALE;
  const meterY = svgY * SVG_TO_METER_SCALE;
  
  // AR.js coordinate system: X right, Y up, Z towards user
  // We'll use X-Z plane for ground positioning
  return {
    x: meterX - (230 * SVG_TO_METER_SCALE / 2), // Center the coordinate system
    y: ARROW_HEIGHT, // Height above ground
    z: -(meterY - (450 * SVG_TO_METER_SCALE / 2)) // Invert Z and center
  };
}

// Calculate path points with arrows at 1-meter intervals
function calculateArrowPositions(path) {
  if (!path || path.length < 2) return [];
  
  const arrowPositions = [];
  
  for (let i = 0; i < path.length - 1; i++) {
    const fromNode = window.nodeMap[path[i]];
    const toNode = window.nodeMap[path[i + 1]];
    
    if (!fromNode || !toNode) continue;
    
    // Convert to SVG coordinates (accounting for scaling)
    const fromX = fromNode.x / window.scaleFactorX;
    const fromY = (window.svgHeight - fromNode.y / window.scaleFactorY);
    const toX = toNode.x / window.scaleFactorX;
    const toY = (window.svgHeight - toNode.y / window.scaleFactorY);
    
    // Calculate segment distance in meters
    const segmentDistance = Math.hypot(toX - fromX, toY - fromY) * SVG_TO_METER_SCALE;
    const numArrows = Math.floor(segmentDistance / ARROW_SPACING);
    
    // Calculate bearing for this segment
    const bearing = calculateBearing({x: fromX, y: fromY}, {x: toX, y: toY});
    
    // Place arrows along the segment
    for (let j = 0; j < numArrows; j++) {
      const t = (j + 1) / (numArrows + 1); // Don't place at exact start/end
      const arrowX = fromX + t * (toX - fromX);
      const arrowY = fromY + t * (toY - fromY);
      
      // Check if we have curved path (Bezier curve)
      const edge = window.extractedEdges.find(edge =>
        (edge.from === fromNode.id && edge.to === toNode.id) ||
        (edge.from === toNode.id && edge.to === fromNode.id)
      );
      
      let finalX = arrowX;
      let finalY = arrowY;
      let segmentBearing = bearing;
      
      if (edge && edge.controlPoints && edge.controlPoints.length === 2) {
        // Calculate position on Bezier curve
        const cp1 = edge.controlPoints[0];
        const cp2 = edge.controlPoints[1];
        
        const bezierPoint = calculateBezierPoint(
          {x: fromX, y: fromY},
          cp1,
          cp2,
          {x: toX, y: toY},
          t
        );
        
        finalX = bezierPoint.x;
        finalY = bezierPoint.y;
        
        // Calculate tangent direction for curved path
        const tangent = calculateBezierTangent(
          {x: fromX, y: fromY},
          cp1,
          cp2,
          {x: toX, y: toY},
          t
        );
        
        segmentBearing = Math.atan2(tangent.x, tangent.y) * (180 / Math.PI);
        
        // Adjust for north offset
        if (window.north) {
          const northOffset = getNorthOffset();
          segmentBearing = (segmentBearing - northOffset + 360) % 360;
        }
      }
      
      arrowPositions.push({
        svgX: finalX,
        svgY: finalY,
        bearing: segmentBearing,
        arCoords: svgToARCoords(finalX, finalY)
      });
    }
  }
  
  return arrowPositions;
}

// Calculate point on Bezier curve
function calculateBezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  };
}

// Calculate tangent (derivative) of Bezier curve
function calculateBezierTangent(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  
  return {
    x: -3 * mt2 * p0.x + 3 * mt2 * p1.x - 6 * mt * t * p1.x + 6 * mt * t * p2.x - 3 * t2 * p2.x + 3 * t2 * p3.x,
    y: -3 * mt2 * p0.y + 3 * mt2 * p1.y - 6 * mt * t * p1.y + 6 * mt * t * p2.y - 3 * t2 * p2.y + 3 * t2 * p3.y
  };
}

// Create arrow objects in AR scene
function createArrowObjects(arrowPositions, markerGroup) {
  const arrowGeometry = createArrowGeometry();
  const arrowMaterial = createArrowMaterial();
  
  arrowPositions.forEach((arrowPos, index) => {
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    
    // Position the arrow
    arrow.position.set(
      arrowPos.arCoords.x,
      arrowPos.arCoords.y,
      arrowPos.arCoords.z
    );
    
    // Rotate arrow to point in the correct direction
    const bearingRad = (arrowPos.bearing * Math.PI) / 180;
    arrow.rotation.y = bearingRad;
    
    // Scale the arrow
    arrow.scale.setScalar(ARROW_SCALE);
    
    // Add to marker group
    markerGroup.add(arrow);
    
    // Store reference for cleanup
    window.arrowObjects.push(arrow);
    
    console.log(`[AR Navigation] Arrow ${index} placed at:`, arrowPos.arCoords, 'bearing:', arrowPos.bearing);
  });
  
  console.log(`[AR Navigation] Created ${arrowPositions.length} navigation arrows`);
}

// Clear existing AR arrows
function clearArrowObjects() {
  window.arrowObjects.forEach(arrow => {
    if (arrow.parent) {
      arrow.parent.remove(arrow);
    }
    // Dispose of geometry and material to free memory
    if (arrow.geometry) arrow.geometry.dispose();
    if (arrow.material) arrow.material.dispose();
  });
  window.arrowObjects = [];
  console.log('[AR Navigation] Cleared all arrow objects');
}

// Main function to start AR navigation
window.startNavigation = function(destination) {
  console.log('[AR Navigation] Starting navigation to:', destination);
  
  // Stop any existing navigation
  stopNavigation();
  
  // Check if current marker ID is set
  if (!window.currentMarkerId) {
    console.error('[AR Navigation] No current marker ID set');
    return false;
  }
  
  // Call the existing goTo function to calculate and draw the path on the map
  if (typeof window.goTo === 'function') {
    console.log(`[AR Navigation] Calling goTo function for destination: ${destination}`);
    window.goTo(destination);
  } else {
    console.error('[AR Navigation] goTo function not available');
    return false;
  }
  
  // Get the calculated path - we need to access it from the dijkstra result
  const result = getLastCalculatedPath(window.currentMarkerId, destination);
  
  if (!result.path || result.path.length < 2) {
    console.error('[AR Navigation] No valid path found for AR navigation');
    return false;
  }
  
  window.currentPath = result.path;
  window.arNavigationActive = true;
  
  // Calculate arrow positions
  const arrowPositions = calculateArrowPositions(result.path);
  
  if (arrowPositions.length === 0) {
    console.warn('[AR Navigation] No arrow positions calculated');
    return false;
  }
  
  // Determine which marker to attach arrows to
  let activeMarker = null;
  if (window.markerRootHiro && window.markerRootHiro.visible) {
    activeMarker = window.markerRootHiro;
  } else if (window.markerRootKanji && window.markerRootKanji.visible) {
    activeMarker = window.markerRootKanji;
  }
  
  if (!activeMarker) {
    console.warn('[AR Navigation] No active marker detected, using Hiro marker as default');
    activeMarker = window.markerRootHiro;
  }
  
  // Create arrow objects
  createArrowObjects(arrowPositions, activeMarker);
  
  console.log(`[AR Navigation] Navigation started with ${arrowPositions.length} arrows`);
  return true;
};

// Stop AR navigation
window.stopNavigation = function() {
  console.log('[AR Navigation] Stopping navigation');
  clearArrowObjects();
  window.arNavigationActive = false;
  window.currentPath = null;
};

// Get the last calculated path (helper function to access dijkstra result)
function getLastCalculatedPath(start, end) {
  // This function replicates the dijkstra calculation to get the path
  // but relies on the graph structure already built in leaflet.js
  
  if (!window.extractedNodes || !window.extractedEdges || !window.nodeMap) {
    console.error('[AR Navigation] Graph data not available');
    return { path: null, distance: 0 };
  }
  
  // Build graph structure (same as in leaflet.js)
  let graph = {};
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
  
  // Dijkstra algorithm (same as in leaflet.js)
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

    if (graph[currentNode]) {
      for (const neighbor of graph[currentNode]) {
        const alt = distances[currentNode] + neighbor.weight;
        if (alt < distances[neighbor.node]) {
          distances[neighbor.node] = alt;
          previous[neighbor.node] = currentNode;
        }
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
    distance: (distances[end] * SVG_TO_METER_SCALE).toFixed(2),
    path: distances[end] !== Infinity ? path : null
  };
}

// Update arrow visibility based on user position (optional enhancement)
window.updateNavigationArrows = function() {
  if (!window.arNavigationActive || !window.userPosition) return;
  
  // This could be enhanced to hide arrows that are behind the user
  // or adjust arrow colors based on distance
  console.log('[AR Navigation] Updating arrow visibility based on user position:', window.userPosition);
};

// Event listeners
document.addEventListener('markerFound', (e) => {
  console.log('[AR Navigation] Marker found:', e.detail.preset);
  
  // If navigation is active, update arrow positions to the newly detected marker
  if (window.arNavigationActive && window.currentPath) {
    const preset = e.detail.preset;
    let newMarker = null;
    
    if (preset === 'hiro') {
      newMarker = window.markerRootHiro;
    } else if (preset === 'kanji') {
      newMarker = window.markerRootKanji;
    }
    
    if (newMarker && window.arrowObjects.length > 0) {
      // Move arrows to the new marker
      clearArrowObjects();
      const arrowPositions = calculateArrowPositions(window.currentPath);
      createArrowObjects(arrowPositions, newMarker);
      console.log('[AR Navigation] Moved arrows to newly detected marker:', preset);
    }
  }
});

document.addEventListener('markerLost', (e) => {
  console.log('[AR Navigation] Marker lost:', e.detail.preset);
  // Arrows will become invisible automatically when marker is lost
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('[AR Navigation] AR Navigation script loaded');
});

// Debug function
window.debugArNavigation = function() {
  console.log('[AR Navigation Debug] Active:', window.arNavigationActive);
  console.log('[AR Navigation Debug] Current path:', window.currentPath);
  console.log('[AR Navigation Debug] Arrow objects:', window.arrowObjects.length);
  console.log('[AR Navigation Debug] User position:', window.userPosition);
  console.log('[AR Navigation Debug] North offset:', window.north);
};
