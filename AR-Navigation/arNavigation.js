(() => {
  const ARROW_SPACING_METERS = 1;
  let arrows = [];

  function clearNavigation() {
    arrows.forEach(a => window.scene?.remove(a));
    arrows = [];
    console.log('[AR Navigation] Navigation cleared');
  }

  function svgToWorld(svgX, svgY) {
    const svgToMetersX = window.svgToMeters?.x || 1;
    const svgToMetersY = window.svgToMeters?.y || 1;
    if (!window.worldOrigin || !window.worldOrigin.worldPosition) return new THREE.Vector3();
    return new THREE.Vector3(
      svgX * svgToMetersX + window.worldOrigin.worldPosition.x,
      0,
      -svgY * svgToMetersY + window.worldOrigin.worldPosition.z
    );
  }

  function createArrowMesh() {
    const geometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cone = new THREE.Mesh(geometry, material);
    return cone;
  }

  function getNorthOffsetAngleDegrees() {
    if (!window.north || !window.worldOrigin) return 0;

    const originWorld = window.worldOrigin.worldPosition;
    const northWorld = svgToWorld(window.north.x, window.north.y);

    const dx = northWorld.x - originWorld.x;
    const dz = northWorld.z - originWorld.z;

    const angleRadians = Math.atan2(dx, dz);
    const angleDegrees = THREE.MathUtils.radToDeg(angleRadians);

    return angleDegrees;
  }

  function getCameraHeadingDegrees(callback) {
    const handleOrientation = (event) => {
      if (typeof event.alpha === "number") {
        // Top of device faces alpha, back camera faces (alpha + 270) % 360
        const heading = (event.alpha + 270) % 360;
        window.removeEventListener("deviceorientationabsolute", handleOrientation);
        callback(heading);
      }
    };
    window.addEventListener("deviceorientationabsolute", handleOrientation, { once: true });
  }

  function placeNavigationPath(destinationId) {
    clearNavigation();
    if (!window.userPosition || !window.goTo || !window.nodeMap) return;

    const result = window.goTo(destinationId);
    if (!result?.path || result.path.length < 2) return;

    const pathNodes = result.path.map(id => window.nodeMap[id]);

    if (!pathNodes || pathNodes.length < 2) return;

    const worldPositions = pathNodes.map(p => svgToWorld(p.x, p.y));

    // Compute angle to rotate based on user's heading and SVG north
    const northOffset = getNorthOffsetAngleDegrees();
    getCameraHeadingDegrees((cameraHeading) => {
      const rotationDelta = THREE.MathUtils.degToRad(northOffset - cameraHeading);
      const rotatedPositions = worldPositions.map(pos => {
        const offset = pos.clone().sub(window.worldOrigin.worldPosition);
        const rotated = offset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationDelta);
        return rotated.add(window.worldOrigin.worldPosition);
      });

      let totalLength = 0;
      for (let i = 0; i < rotatedPositions.length - 1; i++) {
        const start = rotatedPositions[i];
        const end = rotatedPositions[i + 1];
        const segment = new THREE.Vector3().subVectors(end, start);
        const length = segment.length();
        const direction = segment.clone().normalize();

        let distance = 0;
        while (totalLength + distance < totalLength + length) {
          const pos = start.clone().add(direction.clone().multiplyScalar(distance));
          const arrow = createArrowMesh();
          arrow.position.copy(pos);
          arrow.lookAt(pos.clone().add(direction));
          arrow.rotateX(Math.PI / 2);
          arrow.scale.set(1, 1, 1);
          window.scene?.add(arrow);
          arrows.push(arrow);
          distance += ARROW_SPACING_METERS;
        }

        totalLength += length;
      }
    });
  }

  // Expose to global
  window.arNavigation = {
    placeNavigationPath,
    clearNavigation
  };
})();
