class Model {
  constructor() {
    this.type = 'model';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -2;

    this.vertices = [];
    this.normals  = [];

    this._vBuf = null;
    this._nBuf = null;
    this._vertexCount = 0;

    this.loaded = false;
  }

  // Load an OBJ file from a URL
  loadFromURL(url, callback) {
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch: ' + url);
        return r.text();
      })
      .then(text => {
        this._parseOBJ(text);
        this._uploadBuffers();
        this.loaded = true;
        console.log('Model loaded:', url,
          '| vertices:', this._vertexCount);
        if (callback) callback(this);
      })
      .catch(err => console.error('Model load error:', err));
  }

  _parseOBJ(text) {
    const posArr    = [];  // vec3 positions from 'v' lines
    const normArr   = [];  // vec3 normals  from 'vn' lines
    const flatVerts = [];  // final interleaved positions
    const flatNorms = [];  // final interleaved normals

    const lines = text.split('\n');

    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('v ')) {
        // Vertex position
        const p = line.split(/\s+/);
        posArr.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]);

      } else if (line.startsWith('vn ')) {
        // Vertex normal
        const n = line.split(/\s+/);
        normArr.push([parseFloat(n[1]), parseFloat(n[2]), parseFloat(n[3])]);

      } else if (line.startsWith('f ')) {
        // Face — supports triangles and quads
        // Formats: v, v/vt, v//vn, v/vt/vn
        const parts = line.split(/\s+/).slice(1);
        const faceVerts = parts.map(p => {
          const idx = p.split('/');
          return {
            v:  parseInt(idx[0]) - 1,              // position index
            vn: idx[2] ? parseInt(idx[2]) - 1 : -1 // normal index
          };
        });

        // Fan-triangulate: works for triangles and convex quads
        for (let i = 1; i < faceVerts.length - 1; i++) {
          const tri = [faceVerts[0], faceVerts[i], faceVerts[i + 1]];

          // Compute face normal as fallback if no vn indices
          let faceNorm = [0, 1, 0];
          if (tri[0].vn === -1) {
            const A = posArr[tri[0].v];
            const B = posArr[tri[1].v];
            const C = posArr[tri[2].v];
            const u = [B[0]-A[0], B[1]-A[1], B[2]-A[2]];
            const v = [C[0]-A[0], C[1]-A[1], C[2]-A[2]];
            faceNorm = [
              u[1]*v[2] - u[2]*v[1],
              u[2]*v[0] - u[0]*v[2],
              u[0]*v[1] - u[1]*v[0]
            ];
            const len = Math.hypot(...faceNorm);
            if (len > 0) faceNorm = faceNorm.map(x => x / len);
          }

          for (const corner of tri) {
            const pos  = posArr[corner.v];
            const norm = corner.vn >= 0 ? normArr[corner.vn] : faceNorm;
            flatVerts.push(...pos);
            flatNorms.push(...norm);
          }
        }
      }
    }

    this.vertices = new Float32Array(flatVerts);
    this.normals  = new Float32Array(flatNorms);
    this._vertexCount = flatVerts.length / 3;
  }

  _uploadBuffers() {
    this._vBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    this._nBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._nBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
  }

  render() {
    if (!this.loaded) return;

    gl.uniform1i(u_WhichTexture, this.textureNum);
    gl.uniform4f(u_FragColor, ...this.color);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Normal matrix
    if (u_NormalMatrix) {
      gl.uniformMatrix3fv(u_NormalMatrix, false,
        computeNormalMatrix(this.matrix));
    }

    // Position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vBuf);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // Normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this._nBuf);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    // No UV data — disable so leftover binding doesn't bleed through
    gl.disableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, this._vertexCount);
  }
}