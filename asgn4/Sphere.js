class Sphere {
  constructor() {
    this.type = 'sphere';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -2;
    
    this.stacks = 12;   // Latitude divisions
    this.slices = 24;   // Longitude divisions
    
    // Pre-build buffers once for performance
    this._initBuffers();
  }

  _initBuffers() {
    const vertices = [];
    const normals  = [];
    const uvs      = [];

    const stackStep  = Math.PI / this.stacks;           // 0 → π  (top → bottom)
    const sliceStep  = (2 * Math.PI) / this.slices;     // 0 → 2π (around)

    for (let i = 0; i < this.stacks; i++) {
      const phi1 = i       * stackStep;   // top of band
      const phi2 = (i + 1) * stackStep;   // bottom of band

      for (let j = 0; j < this.slices; j++) {
        const theta1 = j       * sliceStep;
        const theta2 = (j + 1) * sliceStep;

        // Four corners of this quad (unit sphere → Normal == Position)
        //   x = sin(phi)*cos(theta)
        //   y = cos(phi)
        //   z = sin(phi)*sin(theta)
        const p = (phi, theta) => [
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta)
        ];

        const uv = (phi, theta) => [
          theta / (2 * Math.PI),
          1 - phi / Math.PI
        ];

        const A = p(phi1, theta1),  uvA = uv(phi1, theta1);
        const B = p(phi1, theta2),  uvB = uv(phi1, theta2);
        const C = p(phi2, theta1),  uvC = uv(phi2, theta1);
        const D = p(phi2, theta2),  uvD = uv(phi2, theta2);

        // Triangle 1: A, B, C
        vertices.push(...A, ...B, ...C);
        normals .push(...A, ...B, ...C);   // Normal == Position on unit sphere
        uvs     .push(...uvA, ...uvB, ...uvC);

        // Triangle 2: B, D, C
        vertices.push(...B, ...D, ...C);
        normals .push(...B, ...D, ...C);
        uvs     .push(...uvB, ...uvD, ...uvC);
      }
    }

    this._vertexCount = vertices.length / 3;

    // Upload to GPU once — reused every frame
    this._vBuf = this._upload(new Float32Array(vertices));
    this._nBuf = this._upload(new Float32Array(normals));
    this._uvBuf = this._upload(new Float32Array(uvs));
  }

  _upload(data) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buf;
  }

  render() {
    if (typeof u_NormalMatrix !== 'undefined' && u_NormalMatrix) {
    gl.uniformMatrix3fv(u_NormalMatrix, false, computeNormalMatrix(this.matrix));
  }
    gl.uniform1i(u_WhichTexture, this.textureNum);
    gl.uniform4f(u_FragColor, ...this.color);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Bind position
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vBuf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // Bind normal  (== position on unit sphere)
    gl.bindBuffer(gl.ARRAY_BUFFER, this._nBuf);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    // Bind UV
    gl.bindBuffer(gl.ARRAY_BUFFER, this._uvBuf);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, this._vertexCount);
  }
}