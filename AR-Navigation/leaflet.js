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
    // Keep track of AR objects for cleanup
    let arPathObjects = [];
    let arInitialized = false;

    // Flag to indicate if AR is ready
    window.arReady = false;

    // Initialize AR scene
    function waitForMindAR() {
        const check = setInterval(() => {
            if (window.mindarThree && window.mindarThree.scene) {
                clearInterval(check);
                initializeAR();
            }
        }, 500);

        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(check);
            console.warn("MindAR initialization timed out.");
        }, 10000);
        
        return true;
    }
    
    function initializeAR() {
        // Add an event listener for when AR targets are found
        document.addEventListener("targetFound", (event) => {
            const targetIndex = event.detail.targetIndex;
            console.log(`Target found: ${targetIndex}`);
            
            // Make sure the path is visible when a target is found
            arPathObjects.forEach(obj => {
                obj.visible = true;
            });
        });
        
        // Add an event listener for when AR targets are lost
        document.addEventListener("targetLost", (event) => {
            const targetIndex = event.detail.targetIndex;
            console.log(`Target lost: ${targetIndex}`);
        });
        
        arInitialized = true;
        window.arReady = true;
        console.log("AR initialized successfully");
        return true;
    }

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

            // Try to initialize AR
            if (!arInitialized) {
                // Try to initialize AR now
                waitForMindAR();
                
                // Also set up a periodic check to initialize AR if not ready yet
                const arCheckInterval = setInterval(() => {
                    if (!arInitialized) {
                        if (waitForMindAR()) {
                            clearInterval(arCheckInterval);
                            console.log("AR initialized after waiting");
                        }
                    } else {
                        clearInterval(arCheckInterval);
                    }
                }, 1000);
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
                    
                    // Try to draw AR path - if AR isn't ready yet, queue it up
                    if (arInitialized) {
                        drawARPath(result.path);
                    } else {
                        console.log("AR not ready, queueing AR path drawing");
                        const pathToDisplay = result.path;
                        const checkARAndDraw = setInterval(() => {
                            if (arInitialized) {
                                drawARPath(pathToDisplay);
                                clearInterval(checkARAndDraw);
                            }
                        }, 1000);
                        
                        // Stop checking after 10 seconds
                        setTimeout(() => {
                            clearInterval(checkARAndDraw);
                            console.warn("AR initialization timed out");
                        }, 10000);
                    }
                    
                    console.log(`Shortest path from ${currentMarkerId} to ${targetNodeId}:`, result.path);
                    console.log("Total distance:", result.distance, "m");
                    return result; // Return the result for other uses
                } else {
                    console.warn("No path found.");
                    return null;
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
                clearARPath();
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

            // Create Three.js objects for AR path
            function drawARPath(path) {
                clearARPath();
                
                if (!window.mindarScene) {
                    console.error("MindAR scene not initialized - cannot draw AR path");
                    return;
                }

                // Create a group for all path objects
                const pathGroup = new THREE.Group();
                window.mindarScene.add(pathGroup);
                arPathObjects.push(pathGroup);

                // Convert from 2D map coordinates to AR space
                // This conversion will need tuning based on your scene scale
                const AR_SCALE = 0.01; // Scale factor to convert from map units to AR units
                const AR_HEIGHT = 0; // Height above the ground in AR space

                console.log("Drawing AR path with", path.length, "nodes");
                
                for (let i = 0; i < path.length - 1; i++) {
                    const fromNode = nodeMap[path[i]];
                    const toNode = nodeMap[path[i + 1]];
                    
                    // Calculate direction vector
                    const dirVec = new THREE.Vector3(
                        toNode.x - fromNode.x,
                        0,
                        toNode.y - fromNode.y  // y in 2D becomes z in 3D
                    );
                    
                    // Normalize for direction
                    dirVec.normalize();
                    
                    // Create arrow as cone geometry
                    const arrowGeometry = new THREE.ConeGeometry(0.03, 0.1, 8);
                    
                    // Rotate to point in direction of travel
                    arrowGeometry.rotateX(Math.PI / 2);
                    
                    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
                    
                    // Position at midpoint between nodes
                    const midpoint = {
                        x: (fromNode.x + toNode.x) / 2,
                        y: (fromNode.y + toNode.y) / 2
                    };
                    
                    arrow.position.set(
                        midpoint.x * AR_SCALE, 
                        AR_HEIGHT, 
                        midpoint.y * AR_SCALE
                    );
                    
                    // Make arrow point in the direction of the path
                    arrow.lookAt(
                        toNode.x * AR_SCALE,
                        AR_HEIGHT,
                        toNode.y * AR_SCALE
                    );
                    
                    // Add to group
                    pathGroup.add(arrow);
                    
                    // Add line between nodes
                    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                        new THREE.Vector3(fromNode.x * AR_SCALE, AR_HEIGHT, fromNode.y * AR_SCALE),
                        new THREE.Vector3(toNode.x * AR_SCALE, AR_HEIGHT, toNode.y * AR_SCALE)
                    ]);
                    
                    const line = new THREE.Line(lineGeometry, lineMaterial);
                    pathGroup.add(line);
                }
                
                // Make sure the group is visible
                pathGroup.visible = true;
                
                console.log("AR path created with", pathGroup.children.length, "objects");
            }

            function clearARPath() {
                if (window.mindarScene) {
                    arPathObjects.forEach(obj => {
                        window.mindarScene.remove(obj);
                        // Properly dispose of geometries and materials
                        if (obj.children) {
                            obj.children.forEach(child => {
                                if (child.geometry) child.geometry.dispose();
                                if (child.material) child.material.dispose();
                            });
                        }
                    });
                }
                arPathObjects = [];
            }

            // Expose a function to manually initialize AR
            window.initializeAR = function() {
                return waitForMindAR();
            };
            
            // Expose a function to check AR status
            window.checkARStatus = function() {
                console.log("AR initialized:", arInitialized);
                console.log("AR ready:", window.arReady);
                if (window.mindarScene) {
                    console.log("AR scene exists with", window.mindarScene.children.length, "objects");
                } else {
                    console.log("AR scene does not exist");
                }
                console.log("AR path objects:", arPathObjects.length);
            };
            
        } else {
            setTimeout(waitForGraph, 100);
        }
    }
    
    waitForGraph();
});
