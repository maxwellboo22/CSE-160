class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -2; // -2 = color, -1 = UV debug, 0+ = texture index
  }
  
  render() {
    var rgba = this.color;
    
    // Set texture mode for this cube
    if (u_WhichTexture !== null) {
      gl.uniform1i(u_WhichTexture, this.textureNum);
    }
    
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // ===== FRONT (z = 1) =====
    drawTriangle3DUV(
      [0,0,1, 1,1,1, 1,0,1],
      [0,0, 1,1, 1,0]
    );
    drawTriangle3DUV(
      [0,0,1, 0,1,1, 1,1,1],
      [0,0, 0,1, 1,1]
    );

    // ===== BACK (z = 0) =====
    drawTriangle3DUV(
      [0,0,0, 1,0,0, 1,1,0],
      [0,0, 1,0, 1,1]
    );
    drawTriangle3DUV(
      [0,0,0, 1,1,0, 0,1,0],
      [0,0, 1,1, 0,1]
    );

    // ===== TOP (y = 1) =====
    drawTriangle3DUV(
      [0,1,0, 0,1,1, 1,1,1],
      [0,0, 0,1, 1,1]
    );
    drawTriangle3DUV(
      [0,1,0, 1,1,1, 1,1,0],
      [0,0, 1,1, 1,0]
    );

    // ===== BOTTOM (y = 0) =====
    drawTriangle3DUV(
      [0,0,0, 1,0,0, 1,0,1],
      [0,0, 1,0, 1,1]
    );
    drawTriangle3DUV(
      [0,0,0, 1,0,1, 0,0,1],
      [0,0, 1,1, 0,1]
    );

    // ===== RIGHT (x = 1) =====
    drawTriangle3DUV(
      [1,0,0, 1,1,1, 1,0,1],
      [0,0, 1,1, 1,0]
    );
    drawTriangle3DUV(
      [1,0,0, 1,1,0, 1,1,1],
      [0,0, 0,1, 1,1]
    );

    // ===== LEFT (x = 0) =====
    drawTriangle3DUV(
      [0,0,0, 0,0,1, 0,1,1],
      [0,0, 1,0, 1,1]
    );
    drawTriangle3DUV(
      [0,0,0, 0,1,1, 0,1,0],
      [0,0, 1,1, 0,1]
    );
  }
}