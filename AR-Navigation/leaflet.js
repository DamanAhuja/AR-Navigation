
window.addEventListener("load", () => {
  const map = L.map('map', { crs: L.CRS.Simple, minZoom: -1 });

  const imageWidth = 230, imageHeight = 450;
  window.svgHeight = imageHeight;
  const bounds = [[0, 0], [imageHeight, imageWidth]];
  L.imageOverlay('RDSC.jpg', bounds).addTo(map);
  map.fitBounds(bounds);

  window.scaleFactorX = imageWidth / 230;
  window.scaleFactorY = imageHeight / 450;

  window.nodeMap = {};
  let graph = {};
  let currentMarkerId = null;
  let pathLayers = [];
  let currentPath = [];

  let smoothedHeading = 0;
  let arArrow = null;

  function waitForGraph() {
    if (window.extractedNodes?.length && window.extractedEdges?.length) {
      const nodes = window.extractedNodes.map(n => ({
        ...n,
        x: n.x * window.scaleFactorX,
        y: (svgHeight - n.y) * window.scaleFactorY
      }));
      nodes.forEach(n => window.nodeMap[n.id] = n);

      window.extractedEdges.forEach(e => {
        const f = window.nodeMap[e.from], t = window.nodeMap[e.to];
        if (f && t) {
          graph[f.id] = graph[f.id] || [];
          graph[t.id] = graph[t.id] || [];
          const weight = Math.hypot(t.x - f.x, t.y - f.y);
          graph[f.id].push({ node: t.id, weight });
          graph[t.id].push({ node: f.id, weight });
        }
      });

      nodes.forEach(node => {
        L.circleMarker([node.y, node.x], {
          radius: 5,
          color: 'blue',
          fillColor: 'lightblue',
          fillOpacity: 0.8
        }).addTo(map).bindPopup(node.id);
      });

      let userMarker = null;
      window.userMarker = null;

      window.setUserLocation = function(markerId) {
        const match = window.nodeMap[markerId];
        if (!match) return console.warn("Marker ID not found:", markerId);

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
        currentPath = [];
        if (arArrow) { arArrow.remove(); arArrow = null; }
      };

      window.goTo = function(targetNodeId) {
        if (!currentMarkerId) return console.warn("Current user location not set.");
        const res = dijkstra(currentMarkerId, targetNodeId);
        if (res.path) {
          drawPath(res.path);
          currentPath = res.path;
          initArLoop();
          console.log(`Path: ${res.path.join(" -> ")}, Distance: ${res.distance} m`);
        } else {
          console.warn("No path found.");
        }
      };

      function dijkstra(start, end) {
        const distances = {}, prev = {}, nodes = Object.keys(graph);
        nodes.forEach(n => (distances[n] = Infinity, prev[n] = null));
        distances[start] = 0;

        while (nodes.length) {
          nodes.sort((a, b) => distances[a] - distances[b]);
          const u = nodes.shift();
          if (u === end) break;

          graph[u].forEach(nb => {
            const alt = distances[u] + nb.weight;
            if (alt < distances[nb.node]) {
              distances[nb.node] = alt;
              prev[nb.node] = u;
            }
          });
        }

        const path = [];
        let cur = end;
        while (cur) {
          path.unshift(cur);
          cur = prev[cur];
        }

        return {
          distance: (distances[end] * 0.04254).toFixed(2), // convert px to meters
          path: distances[end] !== Infinity ? path : null
        };
      }

      function clearPath() {
        pathLayers.forEach(l => map.removeLayer(l));
        pathLayers = [];
      }

      function drawPath(path) {
        clearPath();
        for (let i = 0; i < path.length - 1; i++) {
          const from = window.nodeMap[path[i]];
          const to = window.nodeMap[path[i + 1]];
          const edge = window.extractedEdges.find(e =>
            (e.from === from.id && e.to === to.id) || (e.from === to.id && e.to === from.id)
          );

          if (edge && edge.controlPoints?.length === 2) {
            const cp1 = {
              x: edge.controlPoints[0].x * window.scaleFactorX,
              y: (svgHeight - edge.controlPoints[0].y) * window.scaleFactorY
            };
            const cp2 = {
              x: edge.controlPoints[1].x * window.scaleFactorX,
              y: (svgHeight - edge.controlPoints[1].y) * window.scaleFactorY
            };

            const latlngs = [];
            const steps = 20;
            for (let t = 0; t <= 1; t += 1 / steps) {
              const x = Math.pow(1 - t, 3) * from.x +
                        3 * Math.pow(1 - t, 2) * t * cp1.x +
                        3 * (1 - t) * Math.pow(t, 2) * cp2.x +
                        Math.pow(t, 3) * to.x;
              const y = Math.pow(1 - t, 3) * from.y +
                        3 * Math.pow(1 - t, 2) * t * cp1.y +
                        3 * (1 - t) * Math.pow(t, 2) * cp2.y +
                        Math.pow(t, 3) * to.y;
              latlngs.push([y, x]);
            }

            const curve = L.polyline(latlngs, { color: 'green', weight: 4 }).addTo(map);
            pathLayers.push(curve);
          } else {
            const line = L.polyline([[from.y, from.x], [to.y, to.x]], { color: 'green', weight: 4 }).addTo(map);
            pathLayers.push(line);
          }
        }
      }

      function initArLoop() {
        if (window._arLoop) cancelAnimationFrame(window._arLoop);
        window._arLoop = requestAnimationFrame(updateArrow);
      }

      function updateArrow() {
        if (!currentPath.length) return;

        const scene = document.querySelector('a-scene');
        const pos = window.userPosition;
        const heading = window.cameraHeading;
        smoothedHeading += (heading - smoothedHeading) * 0.1;

        if (scene && pos) {
          if (arArrow) arArrow.remove();

          const [fromId, toId] = currentPath;
          const f = window.nodeMap[fromId], t = window.nodeMap[toId];
          const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2;
          let yaw = Math.atan2(t.y - f.y, t.x - f.x) * 180 / Math.PI;
          yaw -= smoothedHeading;

          arArrow = document.createElement('a-entity');
          arArrow.setAttribute('geometry', 'primitive: cone; radiusBottom: 0.05; height: 0.2');
          arArrow.setAttribute('material', 'color: yellow; opacity:0.8');
          arArrow.setAttribute('position', `${(mx - pos.x) / 80} 0.05 ${(my - pos.y) / 80}`);
          arArrow.setAttribute('rotation', `-90 ${-yaw} 0`);
          scene.appendChild(arArrow);
        }

        window._arLoop = requestAnimationFrame(updateArrow);
      }

    } else {
      setTimeout(waitForGraph, 100);
    }
  }

  waitForGraph();
});

