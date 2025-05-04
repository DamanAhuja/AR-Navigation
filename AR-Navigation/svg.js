document.getElementById("svgObject").addEventListener("load", function () {
    const svgDoc = this.contentDocument;
  
    // Step 1: Extract nodes
    const nodeElements = svgDoc.querySelectorAll("circle, ellipse");
    window.extractedNodes = [];
  
    nodeElements.forEach((el, index) => {
      const id = el.id || `node${index}`;
      const label = el.getAttribute("inkscape:label") || null;
      const x = parseFloat(el.getAttribute("cx") || el.getAttribute("x"));
      const y = parseFloat(el.getAttribute("cy") || el.getAttribute("y"));
      window.extractedNodes.push({ id, label, x, y });
    });
  
    // Step 2: Extract edges
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
  
    // Step 3: Build Graph
    const graph = {};
    window.extractedNodes.forEach(n => graph[n.id] = []);
    window.extractedEdges.forEach(e => {
      const fromNode = window.extractedNodes.find(n => n.id === e.from);
      const toNode = window.extractedNodes.find(n => n.id === e.to);
      if (fromNode && toNode) {
        const dx = fromNode.x - toNode.x;
        const dy = fromNode.y - toNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        graph[e.from].push({ node: e.to, weight: dist });
        graph[e.to].push({ node: e.from, weight: dist });
      }
    });
  
    // Step 4: Dijkstra's Algorithm
    //  // Step 4: Dijkstra's Algorithm
    //  function dijkstra(start, end) {
    //     const distances = {}, previous = {}, queue = new Set(Object.keys(graph));
    //     for (const node of queue) {
    //       distances[node] = Infinity;
    //       previous[node] = null;
    //     }
    //     distances[start] = 0;
  
    //     while (queue.size > 0) {
    //       let currentNode = null;
    //       let minDistance = Infinity;
    //       for (const node of queue) {
    //         if (distances[node] < minDistance) {
    //           minDistance = distances[node];
    //           currentNode = node;
    //         }
    //       }
  
    //       if (currentNode === end) break;
    //       queue.delete(currentNode);
  
    //       for (const neighbor of graph[currentNode]) {
    //         const alt = distances[currentNode] + neighbor.weight;
    //         if (alt < distances[neighbor.node]) {
    //           distances[neighbor.node] = alt;
    //           previous[neighbor.node] = currentNode;
    //         }
    //       }
    //     }
  
    //     const path = [];
    //     let curr = end;
    //     while (curr) {
    //       path.unshift(curr);
    //       curr = previous[curr];
    //     }
  
    //     return {
    //       distance: (distances[end] * 0.04254).toFixed(2),
    //       path: distances[end] !== Infinity ? path : null
    //     };

        
    //   }
    //   // Step 5: Example Usage
    //   const result = dijkstra("Kitchen", "Entrance2");
    //   console.log("Shortest path from Kitchen to Entrance2:", result.path);
    //   console.log("Total distance:", result.distance, "m");  
      
  });
  