document.addEventListener("DOMContentLoaded", function () {
    if (typeof AFRAME !== 'undefined') {
        AFRAME.registerComponent('markerhandler', {
            init: function () {
                this.el.sceneEl.addEventListener('targetFound', (e) => {
                    const targetIndex = e.detail.targetIndex;

                    // Check if the targetIndex is valid for the mindFiles array
                    if (targetIndex < mindFiles.length) {
                        
                        // Now get the corresponding marker ID from the extractedNodes array
                        const svgNodes = window.extractedNodes || [];
                        const markerId = svgNodes[targetIndex]?.id;  // Get marker ID by index

                        console.log("Detected marker index:", targetIndex, "-> Marker ID:", markerId);

                        if (markerId && typeof window.setUserLocation === 'function') {
                            // Pass the markerId to the setUserLocation function
                            window.setUserLocation(markerId);
                        }
                    } else {
                        console.error("Invalid target index:", targetIndex);
                    }
                });
            }
        });

        // Attach the markerhandler component to the scene
        const scene = document.querySelector('a-scene');
        scene.setAttribute('MarkerHandler', '');
        
        
    } else {
        console.error("AFRAME is not loaded");
    }
});