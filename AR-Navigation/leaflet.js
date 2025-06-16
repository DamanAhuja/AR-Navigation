window.addEventListener("load", () => {
  const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -1
  });

  const imageWidth = 230;
  const imageHeight = 450;
  window.svgHeight = 450;
  const imageBounds = [[0, 0], [imageHeight, imageWidth]];
  L.imageOverlay('RDSC.jpg', imageBounds).addTo(map);
  map.fitBounds(imageBounds);

  window.scaleFactorX = imageWidth / 230;
  window.scaleFactorY = imageHeight / 450;

  window.nodeMap = {};
  let graph = {};
  let currentMarkerId = null;
  let pathLayers = [];

  // AR arrow entities tracked here
  let arArrowEntities = [];
  let currentPath = [];

  function waitForGraph() {
    if (
      window.extractedNodes && window.extractedNodes.length > 0 &&
      window.extractedEdges && window.extractedEdges.length > 0
    ) {
      const nodes = window.extractedNodes.map(n => ({
        ...n,
        x: n.x * window.scaleFactorX,
        y: (svgHeight - n.y) * window.scaleFactorY
      }));

      nodes.forEach(n => window.nodeMap[n.id] = n);

      window.extractedEdges.forEach(edge => {
        const from = window.nodeMap[edge.from];
        const to = window.nodeMap[edge.to];
        if (from && to) {
          graph[from.id] = graph[from.id] || [];
          graph[to.id] = graph[to.id] || [];
          const weight = Math.hypot(to.x - from.x, to.y - from.y);
          graph[from.id].push({ node: to.id, weight });
          graph[to.id].push({ node: from.id, weight });
        }
      });

      nodes.forEach(node => {
        L.circleMarker([node.y, node.x], {
          radius: 5, color: 'blue', fillColor: 'lightblue', fillOpacity: 0.8
        }).addTo(map).bindPopup(node.id);
      });

      // Delay user marker creation until first scan
      let userMarker = null;
      window.userMarker = null;

      window.goTo = function(targetNodeId) {
        if (!currentMarkerId) {
          console.warn("Current user location not set.");
          return;
        }
        const result = dijkstra(currentMarkerId, targetNodeId);
        if (result.path) {
          drawPath(result.path);
          placeArrows(result.path);
          console.log(`Path:`, result.path, `Distance:`, result.distance, `m`);
        } else {
          console.warn("No path found.");
        }
      };

      window.setUserLocation = function(markerId) {
        const match = window.nodeMap[markerId];
        if (!match) {
          console.warn("Marker ID not found:", markerId);
          return;
        }

        currentMarkerId = markerId;

        if (!window.userMarker) {
          userMarker = L.circleMarker([match.y, match.x], {
            radius: 8, color: 'red', fillColor: '#f03', fillOpacity: 0.9
          }).addTo(map).bindPopup("You are here");
          window.userMarker = userMarker;
        } else {
          window.userMarker.setLatLng([match.y, match.x]);
        }
        window.userMarker.openPopup();

        clearPath();
        clearArrows();
        clearArRowEntities();

        // Persist current path to update arrows as user moves
        currentPath = currentPath;
      };

      function dijkstra(start, end) {
        const distances = {}, previous = {}, queue = new Set(Object.keys(graph));
        queue.forEach(node => (distances[node] = Infinity, previous[node] = null));
        distances[start] = 0;

        while (queue.size) {
          let minNode = [...queue].reduce((a, b) => distances[a] < distances[b] ? a : b);
          if (minNode === end) break;
          queue.delete(minNode);
          graph[minNode].forEach(neighbor => {
            const alt = distances[minNode] + neighbor.weight;
            if (alt < distances[neighbor.node]) {
              distances[neighbor.node] = alt;
              previous[neighbor.node] = minNode;
            }
          });
        }

        const path = [];
        let node = end;
        while (node) {
          path.unshift(node);
          node = previous[node];
        }

        return {
          distance: distances[end] * 0.04254.toFixed(2),
          path: distances[end] === Infinity ? null : path
        };
      }

      function clearPath() {
        pathLayers.forEach(layer => map.removeLayer(layer));
        pathLayers = [];
      }

      function clearArrows() {
        arArrowEntities = arArrowEntities.filter(ent => {
          ent.parentNode.removeChild(ent);
          return false;
        });
        arArrowEntities = [];
      }

      function clearArRowEntities() {
        clearArrows(); // just alias
      }

      function drawPath(path) {
        clearPath();
        currentPath = path;

        path.forEach((id, idx) => {
          if (idx === path.length - 1) return;
          const from = window.nodeMap[path[idx]];
          const to = window.nodeMap[path[idx + 1]];
          const poly = L.polyline([[from.y, from.x], [to.y, to.x]], { color: 'green', weight: 4 }).addTo(map);
          pathLayers.push(poly);
        });
      }

      // Adds 3D arrows in your AR scene inside <a-scene>
      function placeArrows(path) {
        clearArRowEntities();
        const scene = document.querySelector('a-scene');
        if (!scene) return;

        path.forEach((id, idx) => {
          if (idx === path.length - 1) return;
          const from = window.nodeMap[id];
          const to = window.nodeMap[path[idx+1]];

          // Midpoint in AR world coords (scaled down)
          const mx = (from.x + to.x) / 2 / 100;
          const mz = (from.y + to.y) / 2 / 100;
          const dx = to.x - from.x;
          const dz = to.y - from.y;
          const yaw = Math.atan2(dz, dx) * (180 / Math.PI);

          const arrow = document.createElement('a-entity');
          arrow.setAttribute('geometry', 'primitive: cone; radiusBottom: 0.05; height: 0.2');
          arrow.setAttribute('material', 'color: yellow; opacity:0.8');
          arrow.setAttribute('position', `${mx} 0 ${mz}`);
          arrow.setAttribute('rotation', `-90 ${-yaw} 0`);
          scene.appendChild(arrow);
          arArrowEntities.push(arrow);
        });
      }

    } else {
      setTimeout(waitForGraph, 100);
    }
  }

  waitForGraph();
});
