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
      console.log(event.alpha);
      if (typeof event.alpha === "number") {
        // Top of device faces alpha, back camera faces (alpha + 270) % 360
        const heading = (event.alpha + 270) % 360;
        console.log(heading);
        window.removeEventListener("deviceorientationabsolute", handleOrientation);
        callback(heading);
      }
      else
      {
        console.log("No if");
      }
    };
    window.addEventListener("deviceorientationabsolute", handleOrientation, { once: true });
  }

  function placeNavigationPath(destinationId) {
  clearNavigation();
  if (!window.userPosition || !window.goTo || !window.nodeMap) return;

  const result = window.goTo(destinationId);

  const pathNodes = result.path.map(id => window.nodeMap[id]);

  // Get SVG->North offset (in degrees)
  const svgNorthOffset = getNorthOffsetAngleDegrees();
  console.log(svgNorthOffset);

  getCameraHeadingDegrees((deviceHeadingDegrees) => {
    const correctionDegrees = deviceHeadingDegrees - svgNorthOffset;
    const correctionRadians = THREE.MathUtils.degToRad(correctionDegrees);
    const origin = window.worldOrigin.worldPosition.clone();

    console.log(origin);
    
    let totalDistance = 0;
    let nextArrowAt = ARROW_SPACING_METERS;

    for (let i = 0; i < pathNodes.length - 1; i++) {
      const fromSvg = pathNodes[i];
      console.log(fromSvg);
      const toSvg = pathNodes[i + 1];

      const dx = toSvg.x - fromSvg.x;
      const dy = toSvg.y - fromSvg.y;
      const distSvg = Math.hypot(dx, dy);
      const distM = distSvg * window.svgToMeters.x;

      //if (distM === 0) continue;

      const direction = new THREE.Vector2(dx, dy).normalize();
      console.log(direction);

      while (totalDistance + distM >= nextArrowAt) {
        const distIntoSegment = nextArrowAt - totalDistance;
        const distIntoSegmentSvg = distIntoSegment / window.svgToMeters.x;

        const x = fromSvg.x + direction.x * distIntoSegmentSvg;
        const y = window.svgHeight - (fromSvg.y + direction.y * distIntoSegmentSvg);

        const originalPos = svgToWorld(x, y);

        // Rotate position around origin by correction angle
        const relativePos = originalPos.clone().sub(origin);
        const rotatedPos = relativePos.applyAxisAngle(new THREE.Vector3(0, 1, 0), correctionRadians);
        const finalPos = origin.clone().add(rotatedPos);
        console.log(`[Arrow] SVG Position: (${x.toFixed(2)}, ${y.toFixed(2)})`);
        console.log(`[Arrow] World Position: (${finalPos.x.toFixed(2)}, ${finalPos.y.toFixed(2)}, ${finalPos.z.toFixed(2)})`);

        // Compute forward direction (small step forward)
        const nextSvgX = x + direction.x * 0.01;
        const nextSvgY = y + direction.y * 0.01;
        const nextPos = svgToWorld(nextSvgX, nextSvgY);

        console.log(nextPos);

        // Rotate forward vector the same way
        const forwardVec = nextPos.clone().sub(originalPos).normalize();
        const rotatedForward = forwardVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), correctionRadians);
        const lookTarget = finalPos.clone().add(rotatedForward);

        const arrow = createArrowMesh();
        arrow.position.copy(finalPos);
        arrow.lookAt(lookTarget);
        arrow.rotateX(Math.PI / 2);
        arrow.scale.set(2, 2, 2);

        window.scene?.add(arrow);
        arrows.push(arrow);

        nextArrowAt += ARROW_SPACING_METERS;
        console.log("Arrow spacing");
      }

      totalDistance += distM;
    }

    console.log(`[AR Navigation] Placed ${arrows.length} arrows aligned to real-world North.`);
  });
}

  // Expose to global
  window.arNavigation = {
    placeNavigationPath,
    clearNavigation
  };
})();
