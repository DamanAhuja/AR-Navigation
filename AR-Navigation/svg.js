document.getElementById("svgObject").addEventListener("load", function () {
  const svgDoc = this.contentDocument;

  // Step 1: Extract nodes (for circles and ellipses)
  const nodeElements = svgDoc.querySelectorAll("circle, ellipse");
  window.extractedNodes = [];

  nodeElements.forEach((el, index) => {
    const id = el.id || `node${index}`;
    const label = el.getAttribute("inkscape:label") || null;
    const x = parseFloat(el.getAttribute("cx") || el.getAttribute("x"));
    const y = parseFloat(el.getAttribute("cy") || el.getAttribute("y"));
    window.extractedNodes.push({ id, label, x, y });
  });

  // Step 2: Extract edges (for paths)
  window.extractedEdges = [];
  const pathElements = svgDoc.querySelectorAll("path");

  pathElements.forEach(path => {
    const d = path.getAttribute("d");

    const match = d && d.match(
      /M\s*([\d.+-]+)[,\s]+([\d.+-]+)\s*(?:L\s*([\d.+-]+)[,\s]+([\d.+-]+)|C\s*([\d.+-]+)[,\s]+([\d.+-]+)[,\s]+([\d.+-]+)[,\s]+([\d.+-]+)[,\s]+([\d.+-]+)[,\s]+([\d.+-]+))/
    );

    if (!match) return;

    const x1 = parseFloat(match[1]);
    const y1 = parseFloat(match[2]);
    let x2, y2, cx1, cy1, cx2, cy2;

    if (match[3] && match[4]) {
      x2 = parseFloat(match[3]);
      y2 = parseFloat(match[4]);
    } else {
      cx1 = parseFloat(match[5]);
      cy1 = parseFloat(match[6]);
      cx2 = parseFloat(match[7]);
      cy2 = parseFloat(match[8]);
      x2 = parseFloat(match[9]);
      y2 = parseFloat(match[10]);
    }

    const threshold = 10;
    const fromNode = window.extractedNodes.find(n => Math.abs(n.x - x1) < threshold && Math.abs(n.y - y1) < threshold);
    const toNode = window.extractedNodes.find(n => Math.abs(n.x - x2) < threshold && Math.abs(n.y - y2) < threshold);

    if (fromNode && toNode) {
      const edge = {
        from: fromNode.id,
        to: toNode.id,
        path: path.id
      };

      if (cx1 !== undefined) {
        edge.controlPoints = [
          { x: cx1, y: cy1 },
          { x: cx2, y: cy2 }
        ];
      }

      window.extractedEdges.push(edge);
    }
  });

  console.log("Nodes:", window.extractedNodes);
  console.log("Edges:", window.extractedEdges);

  // Step 3: Extract matrix transformation values dynamically
  const transformValue = svgDoc.querySelector('text#text2')?.getAttribute('transform');
  if (transformValue) {
      const matrixMatch = transformValue.match(/matrix\(([^)]+)\)/);
      if (matrixMatch) {
          const matrixValues = matrixMatch[1].split(',').map(val => parseFloat(val.trim()));
          const [a, b, c, d, e, f] = matrixValues;
          console.log("Matrix values:", { a, b, c, d, e, f });

          // Step 4: Dynamically extract the "N" text element and apply the transformation
          const textElements = svgDoc.querySelectorAll('tspan');
          let targetTextElement = null;

          // Search for the text 'N'
          textElements.forEach(tspan => {
              if (tspan.textContent === "N") {
                  targetTextElement = tspan;
              }
          });

          if (targetTextElement) {
              // Get the x and y attributes of the 'N' text
              const originalX = parseFloat(targetTextElement.getAttribute("x"));
              const originalY = parseFloat(targetTextElement.getAttribute("y"));

              // Apply the transformation matrix to get the absolute position
              const xTransformed = a * originalX + c * originalY + e;
              const yTransformed = b * originalX + d * originalY + f;

              window.north = { x: xTransformed, y: yTransformed };

              console.log("Transformed position of N:", window.north);
          } else {
              console.log("Text 'N' not found in the SVG.");
          }
      }
  } else {
      console.log("No matrix transform found.");
  }
});
