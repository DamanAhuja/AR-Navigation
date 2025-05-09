window.addEventListener("load", () => {
    const map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -1
    });

    const imageWidth = 230;
    const imageHeight = 450;
    const svgHeight = 450;
    const imageBounds = [[0, 0], [imageHeight, imageWidth]];
    L.imageOverlay('RDSC.jpg', imageBounds).addTo(map);
    map.fitBounds(imageBounds);

    const scaleFactorX = imageWidth / 230;
    const scaleFactorY = imageHeight / 450;

    let nodeMap = {};
    let graph = {};
    let userMarker;
    let currentMarkerId = null;
    let pathLayers = [];

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
                    return;
                }
                const result = dijkstra(currentMarkerId, targetNodeId);
                if (result.path) {
                    drawPath(result.path);
                    console.log(`Shortest path from ${currentMarkerId} to ${targetNodeId}:`, result.path);
                    console.log("Total distance:", result.distance, "m");
                } else {
                    console.warn("No path found.");
                }
            };

            // Set user's current location and update
            window.setUserLocation = function (markerId) {
                const match = nodeMap[markerId];
                if (!match) {
                    console.warn("Marker ID not found:", markerId);
                    return;
                }
                currentMarkerId = markerId;
                userMarker.setLatLng([match.y, match.x]);
                userMarker.openPopup();
                clearPath();
            };

            // Auto-set initial location for testing
            setTimeout(() => window.setUserLocation("Entrance"), 1000);
            setTimeout(() => window.goTo("Entrance2"), 2000);

            // Pathfinding
            function dijkstra(start, end) {
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

            function clearPath() {
                pathLayers.forEach(layer => map.removeLayer(layer));
                pathLayers = [];
            }

            function drawPath(path) {
    clearPath();

    let cumulativePathPoints = [];
    let cumulativeDistance = 0;

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
            let prevPoint = { x: from.x, y: from.y };
            cumulativePathPoints.push({ 
                point: [from.y, from.x], 
                distance: cumulativeDistance 
            });

            for (let t = 1 / steps; t <= 1; t += 1 / steps) {
                const x = Math.pow(1 - t, 3) * from.x +
                    3 * Math.pow(1 - t, 2) * t * cp1.x +
                    3 * (1 - t) * Math.pow(t, 2) * cp2.x +
                    Math.pow(t, 3) * to.x;

                const y = Math.pow(1 - t, 3) * from.y +
                    3 * Math.pow(1 - t, 2) * t * cp1.y +
                    3 * (1 - t) * Math.pow(t, 2) * cp2.y +
                    Math.pow(t, 3) * to.y;

                const segmentDistance = Math.hypot(x - prevPoint.x, y - prevPoint.y);
                cumulativeDistance += segmentDistance;

                cumulativePathPoints.push({ 
                    point: [y, x], 
                    distance: cumulativeDistance 
                });

                latlngs.push([y, x]);
                prevPoint = { x, y };
            }

            const curve = L.polyline(latlngs, { color: 'green', weight: 4 }).addTo(map);
            pathLayers.push(curve);
        } else {
            const segmentDistance = Math.hypot(to.x - from.x, to.y - from.y);

            cumulativePathPoints.push({ 
                point: [from.y, from.x], 
                distance: cumulativeDistance 
            });

            cumulativeDistance += segmentDistance;
            cumulativePathPoints.push({ 
                point: [to.y, to.x], 
                distance: cumulativeDistance 
            });

            const straight = L.polyline([[from.y, from.x], [to.y, to.x]], { color: 'green', weight: 4 }).addTo(map);
            pathLayers.push(straight);
        }
    }

    const meterConversionFactor = 0.04254;
    const totalDistanceMeters = cumulativeDistance * meterConversionFactor;
    console.log(`Total path distance: ${totalDistanceMeters.toFixed(2)} meters`);

    const arPoints = [];
    let nextMarkerDistance = 1.0;

    while (nextMarkerDistance < totalDistanceMeters) {
        const targetDistancePixels = nextMarkerDistance / meterConversionFactor;

        let beforeIndex = 0;
        for (let i = 1; i < cumulativePathPoints.length; i++) {
            if (cumulativePathPoints[i].distance > targetDistancePixels) {
                beforeIndex = i - 1;
                break;
            }
        }

        const beforePoint = cumulativePathPoints[beforeIndex];
        const afterPoint = cumulativePathPoints[beforeIndex + 1];

        const segmentDistance = afterPoint.distance - beforePoint.distance;
        const fraction = (targetDistancePixels - beforePoint.distance) / segmentDistance;

        const lat = beforePoint.point[0] + fraction * (afterPoint.point[0] - beforePoint.point[0]);
        const lng = beforePoint.point[1] + fraction * (afterPoint.point[1] - beforePoint.point[1]);

        const marker = L.circleMarker([lat, lng], {
            radius: 3,
            color: 'orange',
            fillColor: 'yellow',
            fillOpacity: 1
        }).addTo(map);
        marker.bindPopup(`AR Point: ${nextMarkerDistance.toFixed(1)}m`);
        pathLayers.push(marker);

        arPoints.push({
            position: [lat, lng],
            distanceMeters: nextMarkerDistance.toFixed(1)
        });

        nextMarkerDistance += 1.0;
    }

    const mapToRealWorldMeters = (mapCoords) => {
        const meterConversionFactor = 0.04254;
        const mapY = mapCoords[0];
        const mapX = mapCoords[1];
        const originPoint = [0, 0];
        const mapUnitsX = mapX - originPoint[1];
        const mapUnitsY = mapY - originPoint[0];
        const metersX = mapUnitsX * meterConversionFactor;
        const metersY = mapUnitsY * meterConversionFactor;
        return {
            x: metersX.toFixed(2),
            y: metersY.toFixed(2),
        };
    };

    const arPointsWithRealCoordinates = arPoints.map(point => {
        const realWorldMeters = mapToRealWorldMeters(point.position);
        return {
            mapPosition: point.position,
            realWorldMeters: realWorldMeters,
            distanceAlongPath: point.distanceMeters
        };
    });

    window.arNavigationPoints = arPointsWithRealCoordinates;

    console.log("AR Navigation Points with Real Coordinates (meters):", arPointsWithRealCoordinates);
    console.log("=== AR Navigation Points (Real-World Coordinates in meters) ===");
    arPointsWithRealCoordinates.forEach((point, index) => {
        console.log(`Point ${index + 1} (${point.distanceAlongPath}m along path): 
            X: ${point.realWorldMeters.x}m, Y: ${point.realWorldMeters.y}m from origin`);
    });

    console.log("=== Direction Vectors Between Points ===");
    for (let i = 0; i < arPointsWithRealCoordinates.length - 1; i++) {
        const current = arPointsWithRealCoordinates[i];
        const next = arPointsWithRealCoordinates[i + 1];

        const dirX = next.realWorldMeters.x - current.realWorldMeters.x;
        const dirY = next.realWorldMeters.y - current.realWorldMeters.y;

        const angleRad = Math.atan2(dirY, dirX);
        const angleDeg = (angleRad * 180 / Math.PI).toFixed(1);

        console.log(`Direction ${i + 1} to ${i + 2}: ${angleDeg}° (${dirX.toFixed(2)}m, ${dirY.toFixed(2)}m)`);

        // === ARROW IN AR SCENE ===
        if (window.arScene && window.arScene.scene) {
            const arrowLength = 0.3;
            const dirVector = new THREE.Vector3(parseFloat(dirX), 0, parseFloat(dirY)).normalize();
            const origin = new THREE.Vector3(parseFloat(current.realWorldMeters.x), 0, parseFloat(current.realWorldMeters.y));
            const arrowHelper = new THREE.ArrowHelper(dirVector, origin, arrowLength, 0xff0000);
            window.arScene.scene.add(arrowHelper);
            console.log("Arrow added");
        }
    }
}

        } else {
            setTimeout(waitForGraph, 100);
        }
    }

    waitForGraph();
});
