// ColoredPoint.js (c) 2012 matsuda

// Vertex shader program
var VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotateMatrix;
void main() {
  gl_Position = u_GlobalRotateMatrix *u_ModelMatrix * a_Position;
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

let u_ModelMatrix;
let u_GlobalRotateMatrix;

let g_selectedColor = [1.0, 0.0, 0.0, 1.0];
let g_SelectedSize = 5.0;
let g_SelectedAlpha = 1.0;

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

let g_SelectedType = POINT;
let g_SelectedSegments = 10;

var g_shapesList = [];

// Mouse rotation variables
let g_mouseRotationX = 0;
let g_mouseRotationY = 0;
let g_isDragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

// Poke animation variables
let g_pokeAnimation = false;
let g_pokeStartTime = 0;
let g_pokeDuration = 1.5; // seconds

function setUpWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

function connectFunctionsToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}
  

function addActionsforHtmlUI() {
  document.getElementById('angleSlide').addEventListener('mousemove', function () {
    g_globalAngle = this.value; renderAllShapes(); 
  });

  document.getElementById('legs').addEventListener('mousemove', function () {
    g_leg1Angle = this.value; g_leg2Angle = this.value; g_leg3Angle = this.value; g_leg4Angle = this.value; renderAllShapes();
  });
  document.getElementById('head').addEventListener('mousemove', function () {
    g_headAngle = this.value; renderAllShapes();
  });
  document.getElementById('tail').addEventListener('mousemove', function () {
    g_tailAngle = this.value; renderAllShapes();
  });

  document.getElementById('jaw').addEventListener('mousemove', function () {
    g_jawAngle = this.value; renderAllShapes();
  });

  document.getElementById('animationOnButton').onclick = function () {
    g_animationOn = true;
  };
  document.getElementById('animationOffButton').onclick = function () {
    g_animationOn = false;
  };
}

function main() {
  setUpWebGL();
  connectFunctionsToGLSL();
  addActionsforHtmlUI();

  // Register mouse event handlers
  canvas.onmousedown = handleMouseDown;
  canvas.onmousemove = handleMouseMove;
  canvas.onmouseup = handleMouseUp;
  canvas.onmouseleave = handleMouseUp;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  requestAnimationFrame(tick);
}

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;

function tick() {
  g_seconds = performance.now()/1000.0 - g_startTime;
  
  updateAnimationAngles();
  renderAllShapes();

  requestAnimationFrame(tick);
}

// Mouse rotation handlers
function handleMouseDown(ev) {
  // Check for shift+click for poke animation
  if (ev.shiftKey) {
    g_pokeAnimation = true;
    g_pokeStartTime = g_seconds;
    return;
  }
  
  // Normal rotation
  g_isDragging = true;
  g_lastMouseX = ev.clientX;
  g_lastMouseY = ev.clientY;
}

function handleMouseMove(ev) {
  if (!g_isDragging) return;
  
  var deltaX = ev.clientX - g_lastMouseX;
  var deltaY = ev.clientY - g_lastMouseY;
  
  g_mouseRotationY += deltaX * 0.5; // X mouse movement -> Y rotation
  g_mouseRotationX += deltaY * 0.5; // Y mouse movement -> X rotation
  
  g_lastMouseX = ev.clientX;
  g_lastMouseY = ev.clientY;
}

function handleMouseUp(ev) {
  g_isDragging = false;
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
  shape.color[3] = g_SelectedAlpha; 
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

function updateAnimationAngles() {
  // Check if poke animation is active
  if (g_pokeAnimation) {
  let pokeElapsed = g_seconds - g_pokeStartTime;
  let t = Math.min(pokeElapsed / g_pokeDuration, 1); // 0 → 1

  
  let ease = 1 - Math.pow(1 - t, 3);

  
  g_bodyAngle = -90 * ease;   
  

  
  g_jawAngle = 8 * ease;

  
  g_leg1Angle = -90 * ease;
  g_leg2Angle = -90 * ease;
  g_leg3Angle = 90 * ease;
  g_leg4Angle = 90 * ease;

  
  g_tailAngle = -20 * ease;

  if (t >= 1) {
    
    g_pokeAnimation = false;
  }
  } else if (g_animationOn) {
    
    g_headAngle = 5 * Math.sin(g_seconds * 2) ;
    g_tailAngle = 0 + 5 * Math.sin(g_seconds * 1.5) ;
    g_jawAngle = 10 * Math.abs(Math.sin(g_seconds * 1.5)) ;
    
    g_leg1Angle = 20 * Math.sin(g_seconds * 3) ;
    g_leg2Angle = 20 * Math.sin(g_seconds * 3 + Math.PI) ;
    g_leg3Angle = 20 * Math.sin(g_seconds * 3 + Math.PI) ;
    g_leg4Angle = 20 * Math.sin(g_seconds * 3) ;
  }
}

let g_globalAngle = 0;
let g_headAngle = 0;
let g_tailAngle = 0;
let g_leg1Angle = 0;
let g_leg2Angle = 0;
let g_leg3Angle = 0;
let g_leg4Angle = 0;
let g_jawAngle = 0;

let g_animationOn = true;

function renderAllShapes() {
  var startTime = performance.now();

  // Apply both slider rotation and mouse rotation
  var globalRotMat = new Matrix4()
    .rotate(g_globalAngle, 0, 1, 0)
    .rotate(g_mouseRotationX, 1, 0, 0)
    .rotate(g_mouseRotationY, 0, 1, 0);
  
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 

  var len = g_shapesList.length;

  // ===== BODY (main torso) - ROOT of hierarchy =====
  var body = new Cube();
  body.color = [0.4, 0.6, 0.3, 1.0];
  body.matrix.translate(-0.25, -0.5, -0.7);
  var bodyCoordinatesMat = new Matrix4(body.matrix);
  body.matrix.scale(0.5, 0.4, 1.0);
  body.render();

  // ===== FRILL (connected to body) =====
  var frill = new Cube();
  frill.color = [0.6, 0.4, 0.2, 1.0];
  frill.matrix = new Matrix4(bodyCoordinatesMat);
  frill.matrix.translate(-0.15, 0.15, 0.92);
  frill.matrix.rotate(g_headAngle, 0, 0, 1);
  var frillCoordinatesMat = new Matrix4(frill.matrix);
  frill.matrix.scale(0.8, 0.6, 0.1);
  frill.render();

  // ===== HEAD (connected to frill) =====
  var head = new Cube();
  head.color = [0.2, 0.5, 0.2, 1.0];
  head.matrix = new Matrix4(frillCoordinatesMat);
  head.matrix.translate(0.2, 0.0, 0.1);
  var headCoordinatesMat = new Matrix4(head.matrix);
  head.matrix.scale(0.4, 0.3, 0.4);
  head.render();

  // ===== JAW (connected to head) =====
  var jaw = new Cube();
  jaw.color = [0.15, 0.4, 0.15, 1.0];
  jaw.matrix = new Matrix4(headCoordinatesMat);
  jaw.matrix.translate(0.01, -0.125, 0.2);
  jaw.matrix.rotate(g_jawAngle, 1, 0, 0);
  jaw.matrix.scale(0.35, 0.15, 0.35);
  jaw.render();

  // ===== CONE HORNS (connected to head) =====
  // HORN 1 (center)
  var horn1 = new Cone();
  horn1.color = [0.8, 0.8, 0.7, 1.0];
  horn1.matrix = new Matrix4(headCoordinatesMat);
  horn1.matrix.translate(0.2, 0.15, 0.35);
  horn1.matrix.rotate(45, 1, 0, 0);
  horn1.matrix.scale(0.08, 0.3, 0.08);
  horn1.render();

  // HORN 2 (left)
  var horn2 = new Cone();
  horn2.color = [0.8, 0.8, 0.7, 1.0];
  horn2.matrix = new Matrix4(headCoordinatesMat);
  horn2.matrix.translate(0.35, 0.25, 0.25);
  horn2.matrix.rotate(30, 1, 0, 0);
  horn2.matrix.scale(0.05, 0.25, 0.05);
  horn2.render();

  // HORN 3 (right)
  var horn3 = new Cone();
  horn3.color = [0.8, 0.8, 0.7, 1.0];
  horn3.matrix = new Matrix4(headCoordinatesMat);
  horn3.matrix.translate(0.05, 0.25, 0.25);
  horn3.matrix.rotate(30, 1, 0, 0);
  horn3.matrix.scale(0.05, 0.25, 0.05);
  horn3.render();

  // ===== LEGS (connected to body) =====
  var leg1 = new Cube();
  leg1.color = [0.35, 0.55, 0.25, 1.0];
  leg1.matrix = new Matrix4(bodyCoordinatesMat);
  leg1.matrix.translate(0.35, 0.2, 0.7);
  leg1.matrix.rotate(180,1,0,0);
  leg1.matrix.rotate(g_leg1Angle, 1, 0, 0);
  leg1.matrix.scale(0.15, 0.4, 0.15);
  leg1.render();

  var leg2 = new Cube();
  leg2.color = [0.35, 0.55, 0.25, 1.0];
  leg2.matrix = new Matrix4(bodyCoordinatesMat);
  leg2.matrix.translate(0.0, 0.2, 0.7);
  leg2.matrix.rotate(180,1,0,0);
  leg2.matrix.rotate(g_leg2Angle, 1, 0, 0);
  leg2.matrix.scale(0.15, 0.4, 0.15);
  leg2.render();

  var leg3 = new Cube();
  leg3.color = [0.35, 0.55, 0.25, 1.0];
  leg3.matrix = new Matrix4(bodyCoordinatesMat);
  leg3.matrix.translate(0.35, 0.2, 0.1);
  leg3.matrix.rotate(180,1,0,0);
  leg3.matrix.rotate(g_leg3Angle, 1, 0, 0);
  leg3.matrix.scale(0.15, 0.4, 0.15);
  leg3.render();

  var leg4 = new Cube();
  leg4.color = [0.35, 0.55, 0.25, 1.0];
  leg4.matrix = new Matrix4(bodyCoordinatesMat);
  leg4.matrix.translate(0.0, 0.2, 0.1);
  leg4.matrix.rotate(180,1,0,0);
  leg4.matrix.rotate(g_leg4Angle, 1, 0, 0);
  leg4.matrix.scale(0.15, 0.4, 0.15);
  leg4.render();

  // ===== TAIL (connected to body) =====
  var tail = new Cube();
  tail.color = [0.4, 0.6, 0.3, 1.0];
  tail.matrix = new Matrix4(bodyCoordinatesMat);
  tail.matrix.translate(0.35, 0.15, 0.0);
  tail.matrix.rotate(180, 0, 1, 0);
  tail.matrix.rotate(g_tailAngle, 1, 0, 0);
  tail.matrix.scale(0.2, 0.2, 0.4);
  tail.render();

  var duration = performance.now() - startTime;
  sendTextToHTML(
    "numdot: " + len +
    " ms: " + Math.floor(duration) +
    " fps: " + Math.floor(10000 / duration) / 10,
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