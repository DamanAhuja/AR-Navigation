document.addEventListener("load", () => {
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

            nodes.forEach(node => {
                L.circleMarker([node.y, node.x], {
                    radius: 5,
                    color: 'blue',
                    fillColor: 'lightblue',
                    fillOpacity: 0.8
                }).addTo(map).bindPopup(node.id);
            });

            userMarker = L.circleMarker([0, 0], {
                radius: 8,
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.9
            }).addTo(map).bindPopup("You are here");

            window.goTo = function (targetNodeId) {
                if (!currentMarkerId) {
                    console.warn("Current user location not set.");
                    return { success: false, error: "Current location not set" };
                }
                const result = dijkstra(currentMarkerId, targetNodeId);
                if (result.path) {
                    drawPath(result.path);
                    console.log(`Shortest path from ${currentMarkerId} to ${targetNodeId}:`, result.path);
                    console.log("Total distance:", result.distance, "m");
                    return { success: true, path: result.path, distance: result.distance };
                }
                console.warn("No path found.");
                return { success: false, error: "No path found" };
            };

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

            const scene = document.querySelector('a-scene');
            scene.addEventListener('loaded', () => {
                console.log("Scene loaded, starting initial route");
                setTimeout(() => window.setUserLocation("Entrance"), 1000);
                setTimeout(() => window.goTo("Entrance2"), 2000);
            });

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

            function polarToARPosition(distance, angleDegrees) {
                const angleRad = angleDegrees * Math.PI / 180;
                const x = distance * Math.sin(angleRad);
                const z = -distance * Math.cos(angleRad);
                return { x, y: 0.1, z }; // y: 0.1 to hover above ground
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
    
                console.log("AR Navigation Points with Real Coordinates (meters):", arPointsWithRealCoordinates);
    
                console.log("=== AR Navigation Points (Real-World Coordinates in meters) ===");
                arPointsWithRealCoordinates.forEach((point, index) => {
                    console.log(`Point ${index + 1} (${point.distanceAlongPath}m along path): 
                        X: ${point.realWorldMeters.x}m, Y: ${point.realWorldMeters.y}m from origin`);
                });
                console.log("=== Direction Vectors Between Points (Relative to Real North) ===");

                const scene = document.querySelector('a-scene');
                if (!scene) {
                    console.error("A-Frame scene not found");
                    return;
                }

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

                    arPointsWithRealCoordinates.forEach((point, index) => {
                        if (index >= arPointsWithRealCoordinates.length - 1) return;

                        const current = arPointsWithRealCoordinates[index];
                        const next = arPointsWithRealCoordinates[index + 1];

                        const dx = parseFloat(next.realWorldMeters.x) - parseFloat(current.realWorldMeters.x);
                        const dy = parseFloat(next.realWorldMeters.y) - parseFloat(current.realWorldMeters.y);

                        const mag = Math.hypot(dx, dy);
                        const dirUnit = { x: dx / mag, y: dy / mag };

                        const dot = dirUnit.x * northUnit.x + dirUnit.y * northUnit.y;
                        const cross = dirUnit.x * northUnit.y - dirUnit.y * northUnit.x;

                        const angleRad = Math.atan2(cross, dot);
                        const angleDeg = (angleRad * 180 / Math.PI + 360) % 360;

                        const distanceInMeters = Math.hypot(
                            parseFloat(current.realWorldMeters.x), 
                            parseFloat(current.realWorldMeters.y)
                        );

                        const pos = polarToARPosition(distanceInMeters / 100, angleDeg); // Scale down by 100
                        pos.z -= 1; // Place 1m in front of camera

                        const arEntity = document.createElement('a-box'); // Use box for testing
                        arEntity.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
                        arEntity.setAttribute('material', 'color: red; opacity: 1');
                        arEntity.setAttribute('scale', '0.1 0.1 0.1');
                        arEntity.setAttribute('rotation', `0 ${-angleDeg} 0`);
                        console.log(`Adding AR box at position: ${pos.x},${pos.y},${pos.z}, rotation: ${-angleDeg}`);

                        if (scene.hasLoaded) {
                            scene.appendChild(arEntity);
                        } else {
                            console.warn("Scene not loaded; retrying in 500ms");
                            setTimeout(() => scene.appendChild(arEntity), 500);
                        }
                    });
                } else {
                    console.warn("window.north is not defined; using default positions");
                    arPointsWithRealCoordinates.forEach((point, index) => {
                        const pos = {
                            x: (parseFloat(point.realWorldMeters.x) / 100),
                            y: 0.1,
                            z: -1 + (parseFloat(point.realWorldMeters.y) / 100)
                        };
                        const arEntity = document.createElement('a-box');
                        arEntity.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
                        arEntity.setAttribute('material', 'color: red; opacity: 1');
                        arEntity.setAttribute('scale', '0.1 0.1 0.1');
                        console.log(`Adding fallback AR box at: ${pos.x},${pos.y},${pos.z}`);
                        if (scene.hasLoaded) {
                            scene.appendChild(arEntity);
                        } else {
                            setTimeout(() => scene.appendChild(arEntity), 500);
                        }
                    });
                }
            }
        } else {
            setTimeout(waitForGraph, 100);
        }
    }

    waitForGraph();
});
