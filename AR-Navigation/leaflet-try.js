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

            // Replace the createARArrows function with this improved version
function createARArrows(navigationPoints) {
    // Log that we're starting the AR creation process
    console.log("Initializing AR navigation with", navigationPoints.length, "points");
    
    // Store the navigation points globally for AR system to access
    window.arNavigationPoints = navigationPoints;
    
    // Initialize AR only if not already initialized
    if (!window.arInitialized) {
        initializeAR();
    } else {
        // If AR is already initialized, just update the navigation points
        updateARNavigation(navigationPoints);
    }
}

function initializeAR() {
    // Check if AR is supported
    if (!window.XR || !navigator.xr) {
        console.error("WebXR not supported in this browser");
        alert("AR is not supported in your browser");
        return;
    }
    
    console.log("Setting up WebXR AR session...");
    
    // Create an XR session for AR
    navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'anchors']
    }).then(session => {
        window.arSession = session;
        
        // Set up XR rendering
        const canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '1000';
        
        const gl = canvas.getContext('webgl', { xrCompatible: true });
        session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
        
        // Set up Three.js for rendering
        const renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            context: gl,
            alpha: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        
        // Create AR scene
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera();
        
        // Add lights
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(0, 10, 0);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040));
        
        // Store references
        window.arScene = scene;
        window.arRenderer = renderer;
        window.arCamera = camera;
        
        // Create arrow objects group
        window.arArrowsGroup = new THREE.Group();
        scene.add(window.arArrowsGroup);
        
        // Create reference coordinate system
        window.arReferenceSpace = null;
        
        // Set up session start
        session.requestReferenceSpace('local').then(referenceSpace => {
            window.arReferenceSpace = referenceSpace;
            
            // Start rendering loop
            renderer.setAnimationLoop((timestamp, frame) => {
                if (!frame) return;
                
                // Update camera
                const pose = frame.getViewerPose(referenceSpace);
                if (pose) {
                    camera.matrix.fromArray(pose.transform.matrix);
                    camera.matrixWorldNeedsUpdate = true;
                }
                
                // Render scene
                renderer.render(scene, camera);
            });
            
            // AR is now initialized
            window.arInitialized = true;
            console.log("WebXR AR session initialized");
            
            // If we have navigation points, create the arrows
            if (window.arNavigationPoints) {
                updateARNavigation(window.arNavigationPoints);
            }
        });
        
        // Handle session end
        session.addEventListener('end', () => {
            console.log("AR session ended");
            window.arInitialized = false;
        });
    }).catch(error => {
        console.error("Error starting AR session:", error);
        alert("Failed to start AR: " + error.message);
    });
}

function updateARNavigation(navigationPoints) {
    if (!window.arInitialized || !window.arScene || !window.arArrowsGroup) {
        console.error("AR not initialized");
        return;
    }
    
    // Clear existing arrows
    while (window.arArrowsGroup.children.length > 0) {
        window.arArrowsGroup.remove(window.arArrowsGroup.children[0]);
    }
    
    console.log("Creating", navigationPoints.length, "AR navigation arrows");
    
    // Origin reference - this should match your map's (0,0) in real-world space
    // This might require calibration based on your specific location
    const originAnchor = new THREE.Object3D();
    window.arScene.add(originAnchor);
    
    // Set the origin anchor position using device's current GPS if available
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            window.arOriginGPS = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            console.log("Origin GPS coordinates set:", window.arOriginGPS);
        });
    }
    
    // Create arrows for each navigation point
    navigationPoints.forEach((point, index) => {
        // Create arrow geometry
        const arrowGroup = createArrow();
        
        // Position the arrow in real-world space (coordinates in meters from origin)
        arrowGroup.position.set(
            parseFloat(point.realWorldMeters.x),
            0.5, // Height above ground in meters
            -parseFloat(point.realWorldMeters.y) // Negate Y for correct orientation in AR space
        );
        
        // Add distance label
        const distanceLabel = createTextLabel(point.distanceAlongPath + "m");
        distanceLabel.position.y = 0.3; // Position above arrow
        arrowGroup.add(distanceLabel);
        
        // Calculate direction to next point if not the last point
        if (index < navigationPoints.length - 1) {
            const nextPoint = navigationPoints[index + 1];
            const dx = parseFloat(nextPoint.realWorldMeters.x) - parseFloat(point.realWorldMeters.x);
            const dy = parseFloat(nextPoint.realWorldMeters.y) - parseFloat(point.realWorldMeters.y);
            
            // Calculate angle and rotate arrow to point in that direction
            const angle = Math.atan2(dx, dy);
            arrowGroup.rotation.y = angle;
        }
        
        // Add arrow to group
        window.arArrowsGroup.add(arrowGroup);
        
        console.log(`Created AR arrow ${index + 1} at position:`, 
            arrowGroup.position.x, arrowGroup.position.y, arrowGroup.position.z);
    });
    
    // Attach the arrows group to origin
    originAnchor.add(window.arArrowsGroup);
    
    // Function to create an AR arrow
    function createArrow() {
        const arrowGroup = new THREE.Group();
        
        // Arrow body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            emissive: 0x004400,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.15;
        arrowGroup.add(body);
        
        // Arrow head (cone)
        const headGeometry = new THREE.ConeGeometry(0.05, 0.1, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            emissive: 0x004400,
            roughness: 0.3
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.35;
        arrowGroup.add(head);
        
        // Rotate to point forward by default
        arrowGroup.rotation.x = Math.PI / 2;
        
        return arrowGroup;
    }
    
    // Function to create text label
    function createTextLabel(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        // Draw background
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        context.fillStyle = 'white';
        context.font = 'Bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.5, 0.25, 1);
        
        return sprite;
    }
}

// Add button to activate AR navigation
function addARButton() {
    // Create AR button
    const arButton = document.createElement('button');
    arButton.textContent = 'Start AR Navigation';
    arButton.style.position = 'fixed';
    arButton.style.bottom = '20px';
    arButton.style.left = '50%';
    arButton.style.transform = 'translateX(-50%)';
    arButton.style.padding = '12px 20px';
    arButton.style.backgroundColor = '#4285F4';
    arButton.style.color = 'white';
    arButton.style.border = 'none';
    arButton.style.borderRadius = '4px';
    arButton.style.fontWeight = 'bold';
    arButton.style.zIndex = '1000';
    
    // Add click handler
    arButton.addEventListener('click', () => {
        if (window.arNavigationPoints && window.arNavigationPoints.length > 0) {
            if (!window.arInitialized) {
                initializeAR();
            }
        } else {
            alert('Please select a destination first');
        }
    });
    
    // Add to document
    document.body.appendChild(arButton);
}

// Call this function after the page loads
window.addEventListener('load', () => {
    addARButton();
});

// Add calibration feature to align the virtual and real world
function calibrateAROrigin() {
    if (!window.arInitialized) {
        console.error("AR not initialized");
        return;
    }
    
    // Create UI for calibration
    const calibrationUI = document.createElement('div');
    calibrationUI.style.position = 'fixed';
    calibrationUI.style.top = '20px';
    calibrationUI.style.left = '20px';
    calibrationUI.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    calibrationUI.style.color = 'white';
    calibrationUI.style.padding = '15px';
    calibrationUI.style.borderRadius = '5px';
    calibrationUI.style.zIndex = '1001';
    
    calibrationUI.innerHTML = `
        <h3>AR Calibration</h3>
        <p>Stand at the entrance and align the virtual world:</p>
        <div>
            <button id="calibrate-set">Set Current Position as Origin</button>
            <button id="calibrate-rotate">Rotate World</button>
            <input type="range" id="calibrate-angle" min="-180" max="180" value="0">
            <span id="angle-value">0°</span>
        </div>
        <button id="calibrate-done">Done</button>
    `;
    
    document.body.appendChild(calibrationUI);
    
    // Set up event handlers
    document.getElementById('calibrate-set').addEventListener('click', () => {
        // Reset the origin to current position
        if (window.arReferenceSpace) {
            window.arReferenceSpace = window.arReferenceSpace.getOffsetReferenceSpace(
                new XRRigidTransform({x: 0, y: 0, z: 0})
            );
            console.log("Origin reset to current position");
        }
    });
    
    document.getElementById('calibrate-angle').addEventListener('input', (e) => {
        const angle = parseInt(e.target.value);
        document.getElementById('angle-value').textContent = angle + '°';
        
        // Rotate the AR arrows group
        if (window.arArrowsGroup) {
            window.arArrowsGroup.rotation.y = angle * Math.PI / 180;
        }
    });
    
    document.getElementById('calibrate-done').addEventListener('click', () => {
        document.body.removeChild(calibrationUI);
    });
}

// Add calibration button
function addCalibrationButton() {
    const calibrateButton = document.createElement('button');
    calibrateButton.textContent = 'Calibrate AR';
    calibrateButton.style.position = 'fixed';
    calibrateButton.style.top = '20px';
    calibrateButton.style.right = '20px';
    calibrateButton.style.padding = '8px 12px';
    calibrateButton.style.backgroundColor = '#FF5722';
    calibrateButton.style.color = 'white';
    calibrateButton.style.border = 'none';
    calibrateButton.style.borderRadius = '4px';
    calibrateButton.style.zIndex = '1000';
    
    calibrateButton.addEventListener('click', calibrateAROrigin);
    document.body.appendChild(calibrateButton);
}

// Initialize everything after page load
window.addEventListener('load', () => {
    addARButton();
    addCalibrationButton();
});
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
    
    // You might want to calculate and log the direction vectors between points
    // This would be useful for orienting AR arrows
    console.log("=== Direction Vectors Between Points ===");
    for (let i = 0; i < arPointsWithRealCoordinates.length - 1; i++) {
        const current = arPointsWithRealCoordinates[i];
        const next = arPointsWithRealCoordinates[i + 1];
        
        const dirX = next.realWorldMeters.x - current.realWorldMeters.x;
        const dirY = next.realWorldMeters.y - current.realWorldMeters.y;
        
        // Calculate direction angle in degrees (0° is east, 90° is north)
        const angleRad = Math.atan2(dirY, dirX);
        const angleDeg = (angleRad * 180 / Math.PI).toFixed(1);
        
        console.log(`Direction ${i + 1} to ${i + 2}: ${angleDeg}° (${dirX.toFixed(2)}m, ${dirY.toFixed(2)}m)`);
    }
    
    // Create AR arrows at each navigation point
    createARArrows(arPointsWithRealCoordinates);
}
        } else {
            setTimeout(waitForGraph, 100);
        }
    }

    waitForGraph();
});
