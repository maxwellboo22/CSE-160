class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -2; // -2 = color, -1 = UV debug, 0+ = texture index
  }
  
  render() {

    if (typeof u_NormalMatrix !== 'undefined' && u_NormalMatrix) {
    gl.uniformMatrix3fv(u_NormalMatrix, false, computeNormalMatrix(this.matrix));
  }
  var rgba = this.color;
  
  if (u_WhichTexture !== null) {
    gl.uniform1i(u_WhichTexture, this.textureNum);
  }
  
  gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
  gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

  // FRONT face — normal points in +Z direction
  drawTriangle3DUVNormal(
    [0,0,1, 1,1,1, 1,0,1], [0,0, 1,1, 1,0],
    [0,0,1, 0,0,1, 0,0,1]
  );
  drawTriangle3DUVNormal(
    [0,0,1, 0,1,1, 1,1,1], [0,0, 0,1, 1,1],
    [0,0,1, 0,0,1, 0,0,1]
  );

  // BACK face — normal points in -Z direction
  drawTriangle3DUVNormal(
    [0,0,0, 1,0,0, 1,1,0], [0,0, 1,0, 1,1],
    [0,0,-1, 0,0,-1, 0,0,-1]
  );
  drawTriangle3DUVNormal(
    [0,0,0, 1,1,0, 0,1,0], [0,0, 1,1, 0,1],
    [0,0,-1, 0,0,-1, 0,0,-1]
  );

  // TOP face — normal points in +Y direction
  drawTriangle3DUVNormal(
    [0,1,0, 0,1,1, 1,1,1], [0,0, 0,1, 1,1],
    [0,1,0, 0,1,0, 0,1,0]
  );
  drawTriangle3DUVNormal(
    [0,1,0, 1,1,1, 1,1,0], [0,0, 1,1, 1,0],
    [0,1,0, 0,1,0, 0,1,0]
  );

  // BOTTOM face — normal points in -Y direction
  drawTriangle3DUVNormal(
    [0,0,0, 1,0,0, 1,0,1], [0,0, 1,0, 1,1],
    [0,-1,0, 0,-1,0, 0,-1,0]
  );
  drawTriangle3DUVNormal(
    [0,0,0, 1,0,1, 0,0,1], [0,0, 1,1, 0,1],
    [0,-1,0, 0,-1,0, 0,-1,0]
  );

  // RIGHT face — normal points in +X direction
  drawTriangle3DUVNormal(
    [1,0,0, 1,1,1, 1,0,1], [0,0, 1,1, 1,0],
    [1,0,0, 1,0,0, 1,0,0]
  );
  drawTriangle3DUVNormal(
    [1,0,0, 1,1,0, 1,1,1], [0,0, 0,1, 1,1],
    [1,0,0, 1,0,0, 1,0,0]
  );

  // LEFT face — normal points in -X direction
  drawTriangle3DUVNormal(
    [0,0,0, 0,0,1, 0,1,1], [0,0, 1,0, 1,1],
    [-1,0,0, -1,0,0, -1,0,0]
  );
  drawTriangle3DUVNormal(
    [0,0,0, 0,1,1, 0,1,0], [0,0, 1,1, 0,1],
    [-1,0,0, -1,0,0, -1,0,0]
  );
}}
