export default function (map, canvas, polygonGeom) {
  const { width, height } = map.getContainer().getBoundingClientRect();
  const ctx = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the polygon
  if (polygonGeom && polygonGeom.coordinates && polygonGeom.coordinates[0]) {
    const coordinates = polygonGeom.coordinates[0];
    
    // Start a new path for the outer boundary
    ctx.beginPath();
    
    // Project and draw each coordinate
    const projectedCoords = coordinates.map(coord => {
      return map.project(coord);
    });
    
    if (projectedCoords.length > 0) {
      ctx.moveTo(projectedCoords[0].x, projectedCoords[0].y);
      for (let i = 1; i < projectedCoords.length; i++) {
        ctx.lineTo(projectedCoords[i].x, projectedCoords[i].y);
      }
      ctx.closePath();
    }

    // Fill the polygon with semi-transparent white
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.strokeStyle = "rgba(255,255,255,0)";
    ctx.lineWidth = 0.1;
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    // Draw the outline
    ctx.beginPath();
    ctx.moveTo(projectedCoords[0].x, projectedCoords[0].y);
    for (let i = 1; i < projectedCoords.length; i++) {
      ctx.lineTo(projectedCoords[i].x, projectedCoords[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw a center point
    const center = map.getCenter();
    const centerPoint = map.project(center.toArray());
    ctx.beginPath();
    ctx.arc(centerPoint.x, centerPoint.y, 4, 0, 2 * Math.PI, true);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerPoint.x, centerPoint.y, 2, 0, 2 * Math.PI, true);
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fill();
  }
}

