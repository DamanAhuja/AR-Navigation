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

       // Create AR arrows function - to be added to the script
function createARArrows(navigationPoints, directionVectors) {
    // Check if mindarThree is available
    if (!window.mindarThree) {
        console.warn("MindAR not initialized yet. AR arrows will be created when MindAR is ready.");
        
        // Create a one-time event listener to create arrows when MindAR is initialized
        document.addEventListener("targetFound", function createArrowsOnceTargetFound() {
            // Only execute if we have a target and if mindarThree is now available
            if (window.mindarThree) {
                actuallyCreateARArrows(navigationPoints, directionVectors);
                // Remove this listener after first execution
                document.removeEventListener("targetFound", createArrowsOnceTargetFound);
            }
        });
        return;
    }
    
    // If MindAR is already available, create arrows directly
    actuallyCreateARArrows(navigationPoints, directionVectors);
}

// Function to actually create the AR arrows in the scene
function actuallyCreateARArrows(navigationPoints, directionVectors) {
    const scene = window.mindarThree.scene;
    const anchors = [];
    
    // Get the first anchor (assuming it's the main tracking image)
    // In a multi-marker scenario, you might need to adjust this logic
    const mainAnchor = window.mindarThree.addAnchor(0);
    
    // Keep track of all created arrow objects for potential cleanup later
    window.arNavigationArrows = window.arNavigationArrows || [];
    
    // Clear any existing navigation arrows
    if (window.arNavigationArrows.length > 0) {
        window.arNavigationArrows.forEach(arrow => {
            if (arrow.parent) arrow.parent.remove(arrow);
        });
        window.arNavigationArrows = [];
    }
    
    console.log("Creating AR arrows for navigation...");
    
    // Create a group to hold all arrows
    const arrowsGroup = new THREE.Group();
    mainAnchor.group.add(arrowsGroup);
    
    // Create arrows at each navigation point
    navigationPoints.forEach((point, index) => {
        // Skip the last point as there's no direction from it
        if (index >= directionVectors.length) return;
        
        const direction = directionVectors[index];
        
        // Create arrow geometry
        const arrowGroup = createArrow(direction.angle);
        
        // Position the arrow at the real-world coordinates
        // Convert from meters to THREE.js units
        arrowGroup.position.set(
            parseFloat(point.realWorldMeters.x), 
            0.05, // Small height above ground
            parseFloat(point.realWorldMeters.y)
        );
        
        // Add to the scene
        arrowsGroup.add(arrowGroup);
        
        // Store for potential cleanup
        window.arNavigationArrows.push(arrowGroup);
    });
    
    console.log(`Created ${window.arNavigationArrows.length} AR navigation arrows`);
    
    // Helper function to create an arrow pointing in the given direction
    function createArrow(angleDegrees) {
        // Convert degrees to radians for THREE.js
        const angleRadians = (angleDegrees * Math.PI / 180);
        
        // Create arrow group
        const arrowGroup = new THREE.Group();
        
        // Create arrow body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.075;
        arrowGroup.add(body);
        
        // Create arrow head (cone)
        const headGeometry = new THREE.ConeGeometry(0.05, 0.08, 8);
        const headMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.19;
        arrowGroup.add(head);
        
        // Rotate the arrow to point in the correct direction
        // The default arrow points up (+Y), so we need to rotate it to point in the XZ plane
        arrowGroup.rotation.set(
            Math.PI / 2, // Rotate 90 degrees around X to make arrow point forward (+Z)
            0,
            angleRadians // Rotate around Y to set the direction
        );
        
        return arrowGroup;
    }
}function drawPath(path) {
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

                // Calculate real distance in scaled pixels
                const segmentDistance = Math.hypot(x - prevPoint.x, y - prevPoint.y);
                cumulativeDistance += segmentDistance;
                
                // Store this point with its cumulative distance
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
            
            // Add the starting point of this segment with its cumulative distance
            cumulativePathPoints.push({ 
                point: [from.y, from.x], 
                distance: cumulativeDistance 
            });
            
            // Add the ending point with updated cumulative distance
            cumulativeDistance += segmentDistance;
            cumulativePathPoints.push({ 
                point: [to.y, to.x], 
                distance: cumulativeDistance 
            });
            
            const straight = L.polyline([[from.y, from.x], [to.y, to.x]], { color: 'green', weight: 4 }).addTo(map);
            pathLayers.push(straight);
        }
    }
    
    // Convert from pixel distances to meters using the scale factor (0.04254 meters per unit)
    const meterConversionFactor = 0.04254;
    const totalDistanceMeters = cumulativeDistance * meterConversionFactor;
    console.log(`Total path distance: ${totalDistanceMeters.toFixed(2)} meters`);
    
    // Second pass: Place markers at 1-meter intervals
    const arPoints = []; // Array to store points for AR arrows
    let nextMarkerDistance = 1.0; // First marker at 1m
    
    while (nextMarkerDistance < totalDistanceMeters) {
        // Find the corresponding point at this distance
        const targetDistancePixels = nextMarkerDistance / meterConversionFactor;
        
        // Find the two points that bracket our target distance
        let beforeIndex = 0;
        for (let i = 1; i < cumulativePathPoints.length; i++) {
            if (cumulativePathPoints[i].distance > targetDistancePixels) {
                beforeIndex = i - 1;
                break;
            }
        }
        
        const beforePoint = cumulativePathPoints[beforeIndex];
        const afterPoint = cumulativePathPoints[beforeIndex + 1];
        
        // Calculate the fraction of the way between these two points
        const segmentDistance = afterPoint.distance - beforePoint.distance;
        const fraction = (targetDistancePixels - beforePoint.distance) / segmentDistance;
        
        // Interpolate the position
        const lat = beforePoint.point[0] + fraction * (afterPoint.point[0] - beforePoint.point[0]);
        const lng = beforePoint.point[1] + fraction * (afterPoint.point[1] - beforePoint.point[1]);
        
        // Create a marker at this point
        const marker = L.circleMarker([lat, lng], {
            radius: 3,
            color: 'orange',
            fillColor: 'yellow',
            fillOpacity: 1
        }).addTo(map);
        marker.bindPopup(`AR Point: ${nextMarkerDistance.toFixed(1)}m`);
        pathLayers.push(marker);
        
        // Store the point for AR use
        arPoints.push({
            position: [lat, lng],
            distanceMeters: nextMarkerDistance.toFixed(1)
        });
        
        // Move to next meter mark
        nextMarkerDistance += 1.0;
    }
    
    // Convert map coordinates to real-world coordinates in meters
    // Using the same meter conversion factor used in the dijkstra algorithm
    const mapToRealWorldMeters = (mapCoords) => {
        // The meterConversionFactor is used in the dijkstra implementation (0.04254)
        const meterConversionFactor = 0.04254;
        
        // Get leaflet map coordinates
        const mapY = mapCoords[0]; // y in map space (latitude in leaflet)
        const mapX = mapCoords[1]; // x in map space (longitude in leaflet)
        
        // Get the origin point (0,0) in your map
        // This should be a reference to a known physical location in your space
        const originPoint = [0, 0]; // Bottom-left corner of the map
        
        // Calculate distance from origin in map units
        const mapUnitsX = mapX - originPoint[1];
        const mapUnitsY = mapY - originPoint[0];
        
        // Convert to meters using the same conversion factor used in the Dijkstra algorithm
        const metersX = mapUnitsX * meterConversionFactor;
        const metersY = mapUnitsY * meterConversionFactor;
        
        return {
            x: metersX.toFixed(2),
            y: metersY.toFixed(2),
            // Relative to the origin point (0,0) of the map
            // Positive x is right, positive y is up
        };
    };
    
    // Apply transformation to each point and store
    const arPointsWithRealCoordinates = arPoints.map(point => {
        const realWorldMeters = mapToRealWorldMeters(point.position);
        return {
            mapPosition: point.position,
            realWorldMeters: realWorldMeters,
            distanceAlongPath: point.distanceMeters
        };
    });
    
    // Store AR points for later use
    window.arNavigationPoints = arPointsWithRealCoordinates;
    
    // Log the points with their real-world coordinates in meters
    console.log("AR Navigation Points with Real Coordinates (meters):", arPointsWithRealCoordinates);
        
    // Log in a more readable format
    console.log("=== AR Navigation Points (Real-World Coordinates in meters) ===");
    arPointsWithRealCoordinates.forEach((point, index) => {
        console.log(`Point ${index + 1} (${point.distanceAlongPath}m along path): 
            X: ${point.realWorldMeters.x}m, Y: ${point.realWorldMeters.y}m from origin`);
    });
    
    // Calculate and store direction vectors between points
    const directionVectors = [];
    console.log("=== Direction Vectors Between Points ===");
    for (let i = 0; i < arPointsWithRealCoordinates.length - 1; i++) {
        const current = arPointsWithRealCoordinates[i];
        const next = arPointsWithRealCoordinates[i + 1];
        
        const dirX = next.realWorldMeters.x - current.realWorldMeters.x;
        const dirY = next.realWorldMeters.y - current.realWorldMeters.y;
        
        // Calculate direction angle in degrees (0° is east, 90° is north)
        const angleRad = Math.atan2(dirY, dirX);
        const angleDeg = (angleRad * 180 / Math.PI).toFixed(1);
        
        directionVectors.push({
            from: current,
            to: next,
            dirX: parseFloat(dirX.toFixed(2)),
            dirY: parseFloat(dirY.toFixed(2)),
            angle: parseFloat(angleDeg)
        });
        
        console.log(`Direction ${i + 1} to ${i + 2}: ${angleDeg}° (${dirX.toFixed(2)}m, ${dirY.toFixed(2)}m)`);
    }
    
    // Store direction vectors for AR use
    window.arDirectionVectors = directionVectors;
    
    // Create AR arrows based on the navigation points
    createARArrows(arPointsWithRealCoordinates, directionVectors);
}
        } else {
            setTimeout(waitForGraph, 100);
        }
    }

    waitForGraph();
});
