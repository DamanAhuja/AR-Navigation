window.addEventListener("load", () => {
    const map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -1
    });

    const imageWidth = 600;
    const imageHeight = 900;
    const svgHeight = 900;
    const imageBounds = [[0, 0], [imageHeight, imageWidth]];
    L.imageOverlay('RDSC.jpg', imageBounds).addTo(map);
    map.fitBounds(imageBounds);

    const scaleFactorX = imageWidth / 600;
    const scaleFactorY = imageHeight / 900;
    const distanceScaleFactor = 7.4 / 600; // 0.012333 meters per SVG unit

    let nodeMap = {};
    let graph = {};
    let userMarker;
    let currentMarkerId = null;
    let pathLayers = [];
    let currentPath = [];

    function waitForGraph() {
        if (
            window.extractedNodes && window.extractedNodes.length > 0 &&
            window.extractedEdges && window.extractedEdges.length > 0
        ) {
            const nodes = window.extractedNodes.map(n => ({
                ...n,
                x: n.x * scaleFactorX,
                y: (svgHeight - n.y) * scaleFactorY
            }));

            nodes.forEach(n => nodeMap[n.id] = n);

            // Build graph
            window.extractedEdges.forEach(edge => {
                const from = nodeMap[edge.from];
                const to = nodeMap[edge.to];
                if (from && to) {
                    if (!graph[from.id]) graph[from.id] = [];
                    if (!graph[to.id]) graph[to.id] = [];
                    const weight = Math.hypot(to.x - from.x, to.y - from.y);
                    graph[from.id].push({ node: to.id, weight });
                    graph[to.id].push({ node: from.id, weight });
                }
            });

            // Render nodes
            nodes.forEach(node => {
                L.circleMarker([node.y, node.x], {
                    radius: 5,
                    color: 'blue',
                    fillColor: 'lightblue',
                    fillOpacity: 0.8
                }).addTo(map).bindPopup(node.id);
            });

            // User marker
            userMarker = L.circleMarker([0, 0], {
                radius: 8,
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.9
            }).addTo(map).bindPopup("You are here");

            // Expose a global function to go to a destination
            window.goTo = function (targetNodeId) {
                if (!currentMarkerId) {
                    console.warn("Current user location not set.");
                    alert("Please scan a marker to determine your position");
                    return;
                }
                const path = window.findPath(currentMarkerId, targetNodeId);
                if (path && path.length > 0) {
                    currentPath = path.map(node => node.id);
                    drawPath(currentPath);
                    let totalDistance = 0;
                    for (let i = 0; i < path.length - 1; i++) {
                        const from = nodeMap[path[i].id];
                        const to = nodeMap[path[i + 1].id];
                        totalDistance += Math.hypot(to.x - from.x, to.y - from.y);
                    }
                    totalDistance *= distanceScaleFactor;
                    console.log(`Shortest path from ${currentMarkerId} to ${targetNodeId}:`, path);
                    console.log("Total distance:", totalDistance.toFixed(2), "m");
                } else {
                    console.warn("No path found.");
                    alert("No path found to the destination");
                }
            };

            // Set user's current location and update
            window.setUserLocation = function (markerId) {
                const match = nodeMap[markerId];
                if (!match) {
                    console.warn("Marker ID not found:", markerId);
                    alert("Marker ID not found: " + markerId);
                    return;
                }
                currentMarkerId = markerId;
                userMarker.setLatLng([match.y, match.x]);
                userMarker.openPopup();
                clearPath();
            };

            // Expose globals
            window.nodeMap = nodeMap;
            window.currentMarkerId = currentMarkerId;
            window.currentPath = currentPath;
        } else {
            setTimeout(waitForGraph, 100);
        }
    }

    function clearPath() {
        pathLayers.forEach(layer => map.removeLayer(layer));
        pathLayers = [];
    }

    function drawPath(path) {
        clearPath();

        // Add start and end markers
        const startNode = nodeMap[path[0]];
        const endNode = nodeMap[path[path.length - 1]];
        const startMarker = L.circleMarker([startNode.y, startNode.x], {
            radius: 8,
            color: 'green',
            fillColor: 'lightgreen',
            fillOpacity: 0.9
        }).addTo(map).bindPopup("Start");
        const endMarker = L.circleMarker([endNode.y, endNode.x], {
            radius: 8,
            color: 'red',
            fillColor: 'pink',
            fillOpacity: 0.9
        }).addTo(map).bindPopup("Destination");
        pathLayers.push(startMarker, endMarker);

        for (let i = 0; i < path.length - 1; i++) {
            const from = nodeMap[path[i]];
            const to = nodeMap[path[i + 1]];
            const edge = window.extractedEdges.find(edge =>
                (edge.from === from.id && edge.to === to.id) ||
                (edge.from === to.id && edge.to === from.id)
            );

            if (edge && edge.controlPoints && edge.controlPoints.length === 2) {
                const cp1 = {
                    x: edge.controlPoints[0].x * scaleFactorX,
                    y: (svgHeight - edge.controlPoints[0].y) * scaleFactorY
                };
                const cp2 = {
                    x: edge.controlPoints[1].x * scaleFactorX,
                    y: (svgHeight - edge.controlPoints[1].y) * scaleFactorY
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
                const straight = L.polyline([[from.y, from.x], [to.y, to.x]], { color: 'green', weight: 4 }).addTo(map);
                pathLayers.push(straight);
            }
        }
    }

    waitForGraph();
});
