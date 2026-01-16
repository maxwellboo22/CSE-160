// ColoredPoint.js (c) 2012 matsuda

// Vertex shader program
var VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform float u_Size;
void main() {
  gl_Position = a_Position;
  gl_PointSize = u_Size;
}
`;

// Fragment shader program
var FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}
`;

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

// 🔹 Controls duck persistence
let g_showDuck = false;

function setUpWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectFunctionsToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_Size
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }
}

function addActionsforHtmlUI() {
  document.getElementById('green').onclick = function () {
    g_selectedColor = [0.0, 1.0, 0.0, 1.0];
  };

  document.getElementById('red').onclick = function () {
    g_selectedColor = [1.0, 0.0, 0.0, 1.0];
  };

  // 🔹 Clear EVERYTHING (duck + shapes)
  document.getElementById('clearButton').onclick = function () {
    g_shapesList = [];
    g_showDuck = false;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  // 🔹 Clear everything and show only the duck
  document.getElementById('drawDuck').onclick = function () {
    g_shapesList = []; // Clear all user shapes
    g_showDuck = true;
    renderAllShapes(); // This will show only the duck
  };

  document.getElementById('pointButton').onclick = function () {
    g_SelectedType = POINT;
  };

  document.getElementById('triangleButton').onclick = function () {
    g_SelectedType = TRIANGLE;
  };

  document.getElementById('circleButton').onclick = function () {
    g_SelectedType = CIRCLE;
  };

  document.getElementById('redSlider').addEventListener('mouseup', function () {
    g_selectedColor[0] = this.value / 100;
  });

  document.getElementById('greenSlider').addEventListener('mouseup', function () {
    g_selectedColor[1] = this.value / 100;
  });

  document.getElementById('blueSlider').addEventListener('mouseup', function () {
    g_selectedColor[2] = this.value / 100;
  });

  document.getElementById('sizeSlider').addEventListener('mouseup', function () {
    g_SelectedSize = this.value;
  });

  document.getElementById('segmentsSlider').addEventListener('mouseup', function () {
    g_SelectedSegments = this.value;
  });
}

function main() {
  setUpWebGL();
  connectFunctionsToGLSL();
  addActionsforHtmlUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function (ev) {
    if (ev.buttons == 1) click(ev);
  };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function click(ev) {
  let [x, y] = convertCoordinatesEventToGL(ev);
  let shape;

  if (g_SelectedType == POINT) {
    shape = new Point();
  } else if (g_SelectedType == TRIANGLE) {
    shape = new Triangle();
  } else if (g_SelectedType == CIRCLE) {
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
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return [x, y];
}

function renderAllShapes() {
  var startTime = performance.now();

  // Clear once at the start
  gl.clear(gl.COLOR_BUFFER_BIT);

  // 🔹 Draw duck first if enabled (it will be behind user shapes)
  if (g_showDuck) {
    drawDuck();
  }

  // Draw all user shapes on top
  var len = g_shapesList.length;
  for (var i = 0; i < len; i++) {
    g_shapesList[i].render();
  }

  var duration = performance.now() - startTime;
  sendTextToHTML(
    "numdot: " +
      len +
      " ms: " +
      Math.floor(duration) +
      " fps: " +
      Math.floor(10000 / duration) / 10,
    "numdot"
  );
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

function drawTriangle(vertices) {
  let vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function drawDuck() {
  // 🔹 REMOVED gl.clear() - clearing happens in renderAllShapes()
  gl.clearColor(0.5, 0.8, 1.0, 1.0); // light blue background
  gl.clear(gl.COLOR_BUFFER_BIT); // Clear with duck background color
  
  let yellowColor = [1.0, 1.0, 0.0, 1.0];
  let orangeColor = [1.0, 0.5, 0.0, 1.0];
  let oceanColor = [0.0, 0.5, 1.0, 1.0];
  let whiteColor = [1.0, 1.0, 1.0, 1.0];
  let blackColor = [0.0, 0.0, 0.0, 1.0];

  // M and B shaped clouds
  // Set white color for clouds
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

  // Duck body parts
  // Set yellow color for body and head
  gl.uniform4f(u_FragColor, yellowColor[0], yellowColor[1], yellowColor[2], yellowColor[3]);
  
  drawTriangle([-0.25, -0.35, 0.25, -0.35, 0.25, -0.1]);
  drawTriangle([-0.25, -0.35, 0.25, -0.1, -0.25, -0.1]);
  drawTriangle([0.25, -0.2, 0.45, -0.2, 0.45, 0.0]);
  drawTriangle([0.25, -0.2, 0.45, 0.0, 0.25, 0.0]);
  
  // Beak
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

