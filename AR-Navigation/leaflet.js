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
    let arNavigationPoints = [];
    let currentTargetIndex = 0; // Index of the current target point in arNavigationPoints
    let navigationArrow = null; // Single AR arrow entity

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

            // Render nodes on the map
            nodes.forEach(node => {
                L.circleMarker([node.y, node.x], {
                    radius: 5,
                    color: 'blue',
                    fillColor: 'lightblue',
                    fillOpacity: 0.8
                }).addTo(map).bindPopup(node.id);
            });

            // User marker on the map
            userMarker = L.circleMarker([0, 0], {
                radius: 8,
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.9
            }).addTo(map).bindPopup("You are here");

            // Create a single navigation arrow in the AR scene
            function createNavigationArrow() {
                const scene = document.querySelector('a-scene');
                if (!scene) {
                    console.error('A-Frame scene not found');
                    return;
                }

                navigationArrow = document.createElement('a-entity');
                navigationArrow.setAttribute('geometry', 'primitive: cone; height: 0.3; radiusBottom: 0.1; radiusTop: 0');
                navigationArrow.setAttribute('material', 'color: red');
                // Position the arrow 1 meter in front of the camera (negative Z in A-Frame)
                navigationArrow.setAttribute('position', '0 0 -1');
                // Ensure the arrow points along its Y-axis (default for cone)
                navigationArrow.setAttribute('rotation', '90 0 0'); // Adjust if needed based on cone orientation

                // Add a tick component to update the arrow's rotation
                navigationArrow.setAttribute('update-direction', '');

                // Custom component to update the arrow's direction
                AFRAME.registerComponent('update-direction', {
                    tick: function () {
                        if (!arNavigationPoints.length || currentTargetIndex >= arNavigationPoints.length) {
                            // No path or reached the end
                            this.el.setAttribute('visible', false);
                            return;
                        }

                        this.el.setAttribute('visible', true);

                        // Get user's current position
                        const userPos = currentMarkerId && nodeMap[currentMarkerId]
                            ? { x: nodeMap[currentMarkerId].x, y: nodeMap[currentMarkerId].y }
                            : null;

                        if (!userPos) return;

                        // Get the current target point
                        const targetPoint = arNavigationPoints[currentTargetIndex];
                        const targetPos = {
                            x: parseFloat(targetPoint.realWorldMeters.x),
                            y: parseFloat(targetPoint.realWorldMeters.y)
                        };

                        // Check distance to the target point (in meters)
                        const dx = targetPos.x - (userPos.x * 0.04254); // Convert userPos to meters
                        const dy = targetPos.y - (userPos.y * 0.04254);
                        const distanceToTarget = Math.hypot(dx, dy);

                        // If user is within 0.5 meters of the target, move to the next point
                        if (distanceToTarget < 0.5 && currentTargetIndex < arNavigationPoints.length - 1) {
                            currentTargetIndex++;
                            console.log(`Moving to next navigation point: ${currentTargetIndex + 1}`);
                            return;
                        }

                        // Calculate direction relative to north
                        if (window.north && typeof window.north.x === "number" && typeof window.north.y === "number") {
                            const origin = { x: 112.5, y: 225 };
                            const northVector = {
                                x: window.north.x - origin.x,
                                y: origin.y - window.north.y
                            };
                            const northMag = Math.hypot(northVector.x, northVector.y);
                            const northUnit = {
                                x: northVector.x / northMag,
                                y: northVector.y / northMag
                            };

                            const dirUnit = { x: dx / distanceToTarget, y: dy / distanceToTarget };
                            const dot = dirUnit.x * northUnit.x + dirUnit.y * northUnit.y;
                            const cross = dirUnit.x * northUnit.y - dirUnit.y * northUnit.x;
                            const angleRad = Math.atan2(cross, dot);
                            const angleDeg = (angleRad * 180 / Math.PI + 360) % 360;

                            // Rotate the arrow to point toward the target
                            // The cone's tip points along its Y-axis after rotation '90 0 0', so we adjust the Y rotation
                            this.el.setAttribute('rotation', `90 ${-angleDeg} 0`);
                        } else {
                            console.warn("window.north not defined, cannot compute direction.");
                        }
                    }
                });

                scene.appendChild(navigationArrow);
            }

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
                    // Reset navigation to the first point
                    currentTargetIndex = 0;
                    // Create the navigation arrow if not already created
                    if (!navigationArrow) {
                        createNavigationArrow();
                    }
                } else {
                    console.warn("No path found.");
                    if (navigationArrow) {
                        navigationArrow.setAttribute('visible', false);
                    }
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
                if (navigationArrow) {
                    navigationArrow.setAttribute('visible', false);
                }
            };

            // Auto-set initial location and test navigation
            setTimeout(() => window.setUserLocation("Entrance"), 1000);
            setTimeout(() => window.goTo("Entrance2"), 2000);

            // Pathfinding with Dijkstra's algorithm
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
                arNavigationPoints = [];
                currentTargetIndex = 0;
                if (navigationArrow) {
                    navigationArrow.setAttribute('visible', false);
                }
            }

            function polarToARPosition(distance, angleDegrees) {
                const angleRad = angleDegrees * Math.PI / 180;
                const x = distance * Math.sin(angleRad);
                const z = -distance * Math.cos(angleRad);
                return { x, y: 0, z };
            }

            function drawPath(path) {
                clearPath();

                // Array to store all path points with their real-world distances
                let cumulativePathPoints = [];
                let cumulativeDistance = 0;

                // First pass: Calculate all path points and their cumulative distances
                for (let i = 0; i < path.length - 1; i++) {
                    const from = nodeMap[path[i]];
                    const to = nodeMap[path[i + 1]];
                    const edge = window.extractedEdges.find(edge =>
                        (edge.from === from.id && edge.to === to.id) ||
                        (edge.from === to.id && edge.to === from.id)
                    );

                    if (edge && edge.controlPoints && edge.controlPoints.length === 2) {
                        // For curved paths (Bezier)
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

                        // Start point
                        let prevPoint = { x: from.x, y: from.y };
                        cumulativePathPoints.push({
                            point: [from.y, from.x],
                            distance: cumulativeDistance
                        });

                        // Calculate points along the Bezier curve
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
                        // For straight line paths
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

                // Calculate navigation points at 1-meter intervals (for direction, not display)
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
                    const lng = beforePoint.point[1] + fraction * (afterPoint.point[1] - beforePoint.point[0]);

                    arNavigationPoints.push({
                        position: [lat, lng],
                        distanceMeters: nextMarkerDistance.toFixed(1)
                    });

                    nextMarkerDistance += 1.0;
                }

                // Convert map coordinates to real-world coordinates in meters
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

                arNavigationPoints = arNavigationPoints.map(point => {
                    const realWorldMeters = mapToRealWorldMeters(point.position);
                    return {
                        mapPosition: point.position,
                        realWorldMeters: realWorldMeters,
                        distanceAlongPath: point.distanceMeters
                    };
                });

                console.log("AR Navigation Points with Real Coordinates (meters):", arNavigationPoints);
                console.log("=== AR Navigation Points (Real-World Coordinates in meters) ===");
                arNavigationPoints.forEach((point, index) => {
                    console.log(`Point ${index + 1} (${point.distanceAlongPath}m along path): 
                        X: ${point.realWorldMeters.x}m, Y: ${point.realWorldMeters.y}m from origin`);
                });
            }
        } else {
            setTimeout(waitForGraph, 100);
        }
    }

    waitForGraph();
});
