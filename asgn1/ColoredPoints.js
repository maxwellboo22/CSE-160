// ColoredPoint.js (c) 2012 matsuda

// Vertex shader program
var VSHADER_SOURCE =`
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }`;

// Fragment shader program
var FSHADER_SOURCE =`
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`;

let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

let g_selectedColor = [1.0, 0.0, 0.0, 1.0];
let g_SelectedSize = 5.0;

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

let g_SelectedType = POINT;
let g_SelectedSegments = 10;

var g_shapesList = [];

// 🔹 NEW: controls duck persistence
let g_showDuck = false;

function setUpWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectFunctionsToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get a_Position');
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
}

function addActionsforHtmlUI() {
  document.getElementById('green').onclick = function() {
    g_selectedColor = [0.0, 1.0, 0.0, 1.0];
  };

  document.getElementById('red').onclick = function() {
    g_selectedColor = [1.0, 0.0, 0.0, 1.0];
  };

  // 🔹 Clear EVERYTHING (duck + shapes)
  document.getElementById('clearButton').onclick = function() {
    g_shapesList = [];
    g_showDuck = false;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  // 🔹 Persistent duck
  document.getElementById('drawDuck').onclick = function() {
    g_showDuck = true;
    renderAllShapes();
  };

  document.getElementById('pointButton').onclick = function() {
    g_SelectedType = POINT;
  };

  document.getElementById('triangleButton').onclick = function() {
    g_SelectedType = TRIANGLE;
  };

  document.getElementById('circleButton').onclick = function() {
    g_SelectedType = CIRCLE;
  };

  document.getElementById('redSlider').onmouseup = function() {
    g_selectedColor[0] = this.value / 100;
  };

  document.getElementById('greenSlider').onmouseup = function() {
    g_selectedColor[1] = this.value / 100;
  };

  document.getElementById('blueSlider').onmouseup = function() {
    g_selectedColor[2] = this.value / 100;
  };

  document.getElementById('sizeSlider').onmouseup = function() {
    g_SelectedSize = this.value;
  };

  document.getElementById('segmentsSlider').onmouseup = function() {
    g_SelectedSegments = this.value;
  };
}

function main() {
  setUpWebGL();
  connectFunctionsToGLSL();
  addActionsforHtmlUI();

  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) {
    if (ev.buttons == 1) click(ev);
  };

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function click(ev) {
  let [x, y] = convertCoordinatesEventToGL(ev);

  let shape;
  if (g_SelectedType == POINT) shape = new Point();
  else if (g_SelectedType == TRIANGLE) shape = new Triangle();
  else {
    shape = new Circle();
    shape.segments = g_SelectedSegments;
  }

  shape.position = [x, y];
  shape.color = g_selectedColor.slice();
  shape.size = g_SelectedSize;

  g_shapesList.push(shape);
  renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
  let rect = ev.target.getBoundingClientRect();
  let x = ((ev.clientX - rect.left) - canvas.width / 2) / (canvas.width / 2);
  let y = (canvas.height / 2 - (ev.clientY - rect.top)) / (canvas.height / 2);
  return [x, y];
}

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  // 🔹 Redraw duck every frame if enabled
  if (g_showDuck) {
    drawDuck();
  }

  for (let i = 0; i < g_shapesList.length; i++) {
    g_shapesList[i].render();
  }
}

function drawTriangle(vertices) {
  let vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function drawDuck() {
  gl.clearColor(0.5, 0.8, 1.0, 1.0); // light blue background
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  let yellowColor = [1.0, 1.0, 0.0, 1.0];
  let orangeColor = [1.0, 0.5, 0.0, 1.0];
  let oceanColor = [0.0, 0.5, 1.0, 1.0];
  let whiteColor = [1.0, 1.0, 1.0, 1.0];
  let blackColor = [0.0, 0.0, 0.0, 1.0];
  
  

  // M and B shaped clouds
  //set white color for clouds
  gl.uniform4f(u_FragColor, whiteColor[0], whiteColor[1], whiteColor[2], whiteColor[3]);
  
  
  drawTriangle([-0.85, 0.6, -0.78, 0.6, -0.78, 0.88]);
  drawTriangle([-0.85, 0.6, -0.78, 0.88, -0.85, 0.88]);
  drawTriangle([-0.78, 0.88, -0.65, 0.7, -0.72, 0.88]);
  drawTriangle([-0.78, 0.88, -0.65, 0.7, -0.68, 0.7]);
  drawTriangle([-0.65, 0.7, -0.52, 0.88, -0.58, 0.88]);
  drawTriangle([-0.65, 0.7, -0.52, 0.88, -0.62, 0.7]);
  drawTriangle([-0.52, 0.6, -0.45, 0.6, -0.45, 0.88]);
  drawTriangle([-0.52, 0.6, -0.45, 0.88, -0.52, 0.88]);
  drawTriangle([0.5, 0.6, 0.57, 0.6, 0.57, 0.9]);
  drawTriangle([0.5, 0.6, 0.57, 0.9, 0.5, 0.9]);
  drawTriangle([0.57, 0.82, 0.67, 0.82, 0.67, 0.9]);
  drawTriangle([0.57, 0.82, 0.67, 0.9, 0.57, 0.9]);
  drawTriangle([0.67, 0.82, 0.73, 0.85, 0.67, 0.9]);
  drawTriangle([0.67, 0.82, 0.73, 0.85, 0.7, 0.82]);
  drawTriangle([0.7, 0.77, 0.73, 0.77, 0.73, 0.85]);
  drawTriangle([0.7, 0.77, 0.73, 0.85, 0.7, 0.82]);
  drawTriangle([0.67, 0.75, 0.7, 0.75, 0.7, 0.77]);
  drawTriangle([0.67, 0.75, 0.7, 0.77, 0.67, 0.77]);
  drawTriangle([0.57, 0.74, 0.65, 0.74, 0.65, 0.77]);
  drawTriangle([0.57, 0.74, 0.65, 0.77, 0.57, 0.77]);
  drawTriangle([0.57, 0.6, 0.7, 0.6, 0.7, 0.68]);
  drawTriangle([0.57, 0.6, 0.7, 0.68, 0.57, 0.68]);
  drawTriangle([0.7, 0.68, 0.75, 0.68, 0.75, 0.74]);
  drawTriangle([0.7, 0.68, 0.75, 0.74, 0.7, 0.74]);

  //Duck body parts
  // Set yellow color for body and head
  gl.uniform4f(u_FragColor, yellowColor[0], yellowColor[1], yellowColor[2], yellowColor[3]);
  
  drawTriangle([-0.25, -0.35, 0.25, -0.35, 0.25, -0.1]);
  drawTriangle([-0.25, -0.35, 0.25, -0.1, -0.25, -0.1]);
  drawTriangle([0.25, -0.2, 0.45, -0.2, 0.45, 0.0]);
  drawTriangle([0.25, -0.2, 0.45, 0.0, 0.25, 0.0]);
  
  //Beak
  // Set orange color for beak
  gl.uniform4f(u_FragColor, orangeColor[0], orangeColor[1], orangeColor[2], orangeColor[3]);
  
  drawTriangle([0.45, -0.15, 0.58, -0.13, 0.45, -0.08]);
  
  // Eye 
  // Set black color for eye
  gl.uniform4f(u_FragColor, blackColor[0], blackColor[1], blackColor[2], blackColor[3]);
  drawTriangle([0.32, -0.08, 0.37, -0.08, 0.37, -0.03]);
  drawTriangle([0.32, -0.08, 0.37, -0.03, 0.32, -0.03]);

  // ocean
  // Set blue color for water
  gl.uniform4f(u_FragColor, oceanColor[0], oceanColor[1], oceanColor[2], oceanColor[3]);
  
  drawTriangle([-1.0, -1.0, 1.0, -1.0, -1.0, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0, -0.9, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0, -0.8, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0, -0.7, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0, -0.6, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0, -0.5, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0, -0.4, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0, -0.3, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0, -0.2, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0, -0.3, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0, -0.2, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0, -0.1, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0,  0.0, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0,  0.1, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0,  0.2, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0,  0.3, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0,  0.4, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0,  0.5, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0,  0.6, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0,  0.7, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0,  0.8, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0,  0.9, -0.3]);
  drawTriangle([-1.0, -1.0, 1.0, -1.0,  1.0, -0.3]);

  gl.clearColor(0.0, 0.0, 0.0, 1.0); // reset clear color to black
}
