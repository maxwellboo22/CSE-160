class Cube {
  constructor() {
    this.type = 'cube';
    //this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
  }
  
  render() {
    var rgba = this.color;
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Front face
    drawTriangle3D([0.0,0.0,0.0, 1.0,1.0,0.0, 1.0,0.0,0.0]);
    drawTriangle3D([0.0,0.0,0.0, 0.0,1.0,0.0, 1.0,1.0,0.0]);
    gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    // Back face
    drawTriangle3D([0.0,0.0,1.0, 1.0,0.0,1.0, 1.0,1.0,1.0]);
    drawTriangle3D([0.0,0.0,1.0, 1.0,1.0,1.0, 0.0,1.0,1.0]);
    
    gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    // Top face
    drawTriangle3D([0.0,1.0,0.0, 0.0,1.0,1.0, 1.0,1.0,1.0]);
    drawTriangle3D([0.0,1.0,0.0, 1.0,1.0,1.0, 1.0,1.0,0.0]);
    gl.uniform4f(u_FragColor, rgba[0]*0.7, rgba[1]*0.7, rgba[2]*0.7, rgba[3]);
    // Bottom face
    drawTriangle3D([0.0,0.0,0.0, 1.0,0.0,0.0, 1.0,0.0,1.0]);
    drawTriangle3D([0.0,0.0,0.0, 1.0,0.0,1.0, 0.0,0.0,1.0]);
    gl.uniform4f(u_FragColor, rgba[0]*0.6, rgba[1]*0.6, rgba[2]*0.6, rgba[3]);
    // Right face
    drawTriangle3D([1.0,0.0,0.0, 1.0,1.0,1.0, 1.0,0.0,1.0]);
    drawTriangle3D([1.0,0.0,0.0, 1.0,1.0,0.0, 1.0,1.0,1.0]);
    gl.uniform4f(u_FragColor, rgba[0]*0.5, rgba[1]*0.5, rgba[2]*0.5, rgba[3]);
    // Left face
    drawTriangle3D([0.0,0.0,0.0, 0.0,0.0,1.0, 0.0,1.0,1.0]);
    drawTriangle3D([0.0,0.0,0.0, 0.0,1.0,1.0, 0.0,1.0,0.0]);
  }
}