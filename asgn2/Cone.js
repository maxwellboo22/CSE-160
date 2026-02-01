// Cone.js - A cone primitive for WebGL
// Similar to Cube.js but generates cone geometry

class Cone {
  constructor() {
    this.type = 'cone';
    this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;
    this.segments = 16; // Number of segments around the cone
    this.matrix = new Matrix4();
    
    // Pre-generate cone vertices for performance
    this.vertices = null;
    this.vertexBuffer = null;
  }

  // Generate cone vertices
  generateVertices() {
    let vertices = [];
    let angleStep = 360 / this.segments;
    
    // Cone properties:
    // - Base centered at (0, 0, 0) in XZ plane
    // - Apex at (0, 1, 0)
    // - Radius = 1 (will be scaled by matrix)
    
    let apex = [0, 1, 0]; // Top point
    let baseCenter = [0, 0, 0]; // Center of base
    
    // Generate triangular faces from base to apex
    for (let i = 0; i < this.segments; i++) {
      let angle1 = i * angleStep * Math.PI / 180;
      let angle2 = ((i + 1) % this.segments) * angleStep * Math.PI / 180;
      
      // Points on the base circle
      let x1 = Math.cos(angle1);
      let z1 = Math.sin(angle1);
      let x2 = Math.cos(angle2);
      let z2 = Math.sin(angle2);
      
      // Side triangle (from base edge to apex)
      vertices.push(x1, 0, z1);  // Base point 1
      vertices.push(x2, 0, z2);  // Base point 2
      vertices.push(apex[0], apex[1], apex[2]); // Apex
      
      // Base triangle (to close the bottom)
      vertices.push(baseCenter[0], baseCenter[1], baseCenter[2]); // Center
      vertices.push(x2, 0, z2);  // Base point 2
      vertices.push(x1, 0, z1);  // Base point 1
    }
    
    return new Float32Array(vertices);
  }

  render() {
    var rgba = this.color;

    // Pass the matrix to vertex shader
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Draw the cone with color
    drawCone(rgba, this.segments);
  }
  
  // Alternative method for direct rendering with matrix and color
  static draw(matrix, color, segments = 16) {
    gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
    drawCone(color, segments);
  }
}

// Global cone cache for different segment counts
var g_coneCache = {};

function drawCone(color, segments) {
  // Pass color to fragment shader
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);

  // Check if we have cached this cone configuration
  let cacheKey = 'cone_' + segments;
  
  if (!g_coneCache[cacheKey]) {
    // Generate vertices
    let vertices = [];
    let angleStep = 360 / segments;
    
    let apex = [0, 1, 0];
    let baseCenter = [0, 0, 0];
    
    for (let i = 0; i < segments; i++) {
      let angle1 = i * angleStep * Math.PI / 180;
      let angle2 = ((i + 1) % segments) * angleStep * Math.PI / 180;
      
      let x1 = Math.cos(angle1);
      let z1 = Math.sin(angle1);
      let x2 = Math.cos(angle2);
      let z2 = Math.sin(angle2);
      
      // Side triangle
      vertices.push(x1, 0, z1);
      vertices.push(x2, 0, z2);
      vertices.push(apex[0], apex[1], apex[2]);
      
      // Base triangle
      vertices.push(baseCenter[0], baseCenter[1], baseCenter[2]);
      vertices.push(x2, 0, z2);
      vertices.push(x1, 0, z1);
    }
    
    // Create and cache buffer
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    
    g_coneCache[cacheKey] = {
      buffer: buffer,
      vertexCount: segments * 6
    };
  }
  
  // Use cached cone
  let cached = g_coneCache[cacheKey];
  gl.bindBuffer(gl.ARRAY_BUFFER, cached.buffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, cached.vertexCount);
}