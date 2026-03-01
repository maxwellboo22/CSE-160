// World.js - First-Person Voxel World Exploration

var VSHADER_SOURCE = `precision mediump float;

attribute vec4 a_Position;
attribute vec2 a_UV;
attribute vec3 a_Normal;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat3 u_NormalMatrix;

varying vec2 v_UV;
varying vec3 v_Normal;
varying vec3 v_WorldPos;

void main() {
  vec4 worldPos4 = u_ModelMatrix * a_Position;
  v_WorldPos = worldPos4.xyz;
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos4;
  v_UV = a_UV;
  v_Normal = normalize(u_NormalMatrix * a_Normal);
}`;

var FSHADER_SOURCE = `precision mediump float;

varying vec2 v_UV;
varying vec3 v_Normal;
varying vec3 v_WorldPos;

uniform vec4 u_FragColor;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform int  u_WhichTexture;
uniform bool u_NormalVis;
uniform bool u_LightOn;
uniform bool u_SpotOn;
uniform vec3 u_LightPos;
uniform vec3 u_LightColor;
uniform vec3 u_CameraPos;
uniform vec3 u_SpotPos;
uniform vec3 u_SpotDir;
uniform float u_SpotCutoff;

void main() {
  // ── 1. Base color ───────────────────────────────────────────────────
  vec4 baseColor;
  if (u_WhichTexture == -2) {
    baseColor = u_FragColor;
  } else if (u_WhichTexture == -1) {
    baseColor = vec4(v_UV, 1.0, 1.0);
  } else if (u_WhichTexture == 0) {
    baseColor = texture2D(u_Sampler0, v_UV);
  } else if (u_WhichTexture == 1) {
    baseColor = texture2D(u_Sampler1, v_UV);
  } else if (u_WhichTexture == 2) {
    baseColor = texture2D(u_Sampler2, v_UV);
  } else {
    baseColor = vec4(1.0, 0.0, 1.0, 1.0);
  }

  // ── 2. Normal visualization ─────────────────────────────────────────
  if (u_NormalVis) {
    gl_FragColor = vec4(normalize(v_Normal) * 0.5 + 0.5, 1.0);
    return;
  }

  // ── 3. Lighting off ─────────────────────────────────────────────────
  if (!u_LightOn) {
    gl_FragColor = baseColor;
    return;
  }

  // ── 4. Shared vectors ───────────────────────────────────────────────
  vec3 N = normalize(v_Normal);
  vec3 V = normalize(u_CameraPos - v_WorldPos);

  // ── 5. Point light Phong ────────────────────────────────────────────
  vec3 L = normalize(u_LightPos - v_WorldPos);
  vec3 R = reflect(-L, N);

  float ka      = 0.3;
  vec3  ambient = ka * u_LightColor * baseColor.rgb;

  float kd      = 0.8;
  float diff    = max(dot(N, L), 0.0);
  vec3  diffuse = kd * diff * u_LightColor * baseColor.rgb;

  float ks        = 0.5;
  float shininess = 32.0;
  float spec      = pow(max(dot(R, V), 0.0), shininess);
  vec3  specular  = ks * spec * u_LightColor;

  vec3 phong = ambient + diffuse + specular;

  // ── 6. Spotlight (adds on top of point light) ───────────────────────
  if (u_SpotOn) {
    vec3  Ls        = normalize(u_SpotPos - v_WorldPos); // surface → spot
    vec3  spotDir   = normalize(u_SpotDir);               // forward direction
    float cosTheta  = dot(-Ls, spotDir);                  // angle from cone axis

    if (cosTheta > u_SpotCutoff) {
      // Inside the cone — compute soft edge falloff
      float epsilon  = u_SpotCutoff * 0.1;               // soft fringe width
      float falloff  = clamp((cosTheta - u_SpotCutoff) / epsilon, 0.0, 1.0);

      vec3  Rs       = reflect(-Ls, N);
      float diffS    = max(dot(N, Ls), 0.0);
      float specS    = pow(max(dot(Rs, V), 0.0), shininess);

      // Spotlight uses a white tint so it's visually distinct
      vec3 spotColor = vec3(1.0, 1.0, 0.9);
      phong += falloff * (
        0.9 * diffS * spotColor * baseColor.rgb +
        0.7 * specS * spotColor
      );
    }
  }

  gl_FragColor = vec4(phong, baseColor.a);
}`;

let g_model = null;
let g_lightOn = true;
let u_LightOn;
let a_Normal;
let u_NormalVis;
let g_normalVis = false;

let g_spotOn = false;
let u_SpotOn;
let u_SpotPos;
let u_SpotDir;
let u_SpotCutoff;  // cosine of the cutoff angle

let canvas;
let gl;
let a_Position;
let a_UV;
let u_FragColor;

let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_Sampler0;
let u_Sampler1;
let u_Sampler2;
let u_WhichTexture;

// Camera
let camera;

// Textures
let g_textures = {
  sky: null,
  wall: null,
  ground: null
};
let g_texturesLoaded = 0;
let g_totalTextures = 3;

// World map (32x32 grid with heights 0-4)
let g_map = [];

// Voxel blocks in the world - rendered directly from map for performance

// FPS tracking
let g_lastFrameTime = performance.now();
let g_frameCount = 0;
let g_fps = 0;
let g_fpsStartTime = performance.now();

// Keyboard state
let g_keys = {};

// Mouse state for rotation
let g_mouseDown = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

// Game state
let g_collectedItems = 0;
let g_totalItems = 5;
let g_itemPositions = [];

let g_lightColor = [1.0, 1.0, 1.0]; // white light default
let u_LightColor;
let u_CameraPos;
let g_lightPos = [2, 3, -5];
let g_lightAnimOn = true;
let u_LightPos;
let u_NormalMatrix;
function setUpWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

function toggleLighting() {
  g_lightOn = !g_lightOn;
  document.getElementById('lightOnBtn').textContent =
    'Lighting: ' + (g_lightOn ? 'ON' : 'OFF');
}

function connectFunctionsToGLSL() {
  // initShaders MUST come first — this sets gl.program
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  // Only look up attributes/uniforms AFTER initShaders succeeds
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV       = gl.getAttribLocation(gl.program, 'a_UV');
  a_Normal   = gl.getAttribLocation(gl.program, 'a_Normal');

  u_FragColor        = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix      = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix       = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_Sampler0         = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1         = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2         = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_WhichTexture     = gl.getUniformLocation(gl.program, 'u_WhichTexture');
  u_NormalVis        = gl.getUniformLocation(gl.program, 'u_NormalVis');
  u_LightPos         = gl.getUniformLocation(gl.program, 'u_LightPos');  // NEW
  u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  u_CameraPos  = gl.getUniformLocation(gl.program, 'u_CameraPos');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  u_LightOn = gl.getUniformLocation(gl.program, 'u_LightOn');
  u_SpotOn      = gl.getUniformLocation(gl.program, 'u_SpotOn');
  u_SpotPos     = gl.getUniformLocation(gl.program, 'u_SpotPos');
  u_SpotDir     = gl.getUniformLocation(gl.program, 'u_SpotDir');
  u_SpotCutoff  = gl.getUniformLocation(gl.program, 'u_SpotCutoff');

  // Set defaults
  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
  gl.uniform1i(u_WhichTexture, -2);
  gl.uniform1i(u_NormalVis, false);
}

function toggleNormalVis() {
  g_normalVis = !g_normalVis;
  gl.uniform1i(u_NormalVis, g_normalVis);
  document.getElementById('normalVisBtn').textContent = 
    'Normal Vis: ' + (g_normalVis ? 'ON' : 'OFF');
}
function onLightColorSlider(channel, val) {
  val = parseFloat(val);
  if (channel === 'r') {
    g_lightColor[0] = val;
    document.getElementById('lightRVal').textContent = val.toFixed(2);
  } else if (channel === 'g') {
    g_lightColor[1] = val;
    document.getElementById('lightGVal').textContent = val.toFixed(2);
  } else if (channel === 'b') {
    g_lightColor[2] = val;
    document.getElementById('lightBVal').textContent = val.toFixed(2);
  }
}
function initTextures() {
  // Load sky texture
  loadTextureImage('sky.jpg', 0, function(texture) {
    g_textures.sky = texture;
    g_texturesLoaded++;
  });
  
  // Load wall texture
  loadTextureImage('wall.jpg', 1, function(texture) {
    g_textures.wall = texture;
    g_texturesLoaded++;
  });
  
  // Load ground texture
  loadTextureImage('ground.jpg', 2, function(texture) {
    g_textures.ground = texture;
    g_texturesLoaded++;
  });
}

function loadTextureImage(imagePath, textureUnit, callback) {
  var image = new Image();
  
  image.onload = function() { 
    console.log("Image loaded:", imagePath);
    
    var texture = gl.createTexture();
    
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    
    if (textureUnit === 0) {
      gl.activeTexture(gl.TEXTURE0);
    } else if (textureUnit === 1) {
      gl.activeTexture(gl.TEXTURE1);
    } else if (textureUnit === 2) {
      gl.activeTexture(gl.TEXTURE2);
    }
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    
    if (textureUnit === 0) {
      gl.uniform1i(u_Sampler0, 0);
    } else if (textureUnit === 1) {
      gl.uniform1i(u_Sampler1, 1);
    } else if (textureUnit === 2) {
      gl.uniform1i(u_Sampler2, 2);
    }
    
    console.log("Texture loaded successfully:", imagePath);
    
    if (callback) callback(texture);
  };
  
  image.onerror = function() {
    console.error("Failed to load image:", imagePath);
    // Create placeholder colored texture
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    var pixel = new Uint8Array([100 + textureUnit * 50, 100, 100, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    if (callback) callback(texture);
    g_texturesLoaded++;
  };
  
  image.src = imagePath;
}

function generateMap() {
  // Initialize 32x32 map with heights
  for (let x = 0; x < 32; x++) {
    g_map[x] = [];
    for (let z = 0; z < 32; z++) {
      g_map[x][z] = 0; // Start with empty
    }
  }
  
  // Create outer boundary walls
  for (let x = 0; x < 32; x++) {
    g_map[x][0] = 3;
    g_map[x][31] = 3;
  }
  for (let z = 0; z < 32; z++) {
    g_map[0][z] = 3;
    g_map[31][z] = 3;
  }
  
  // Create maze-like structure
  for (let x = 4; x < 28; x += 4) {
    for (let z = 2; z < 30; z++) {
      if (z % 8 !== 4) { // Leave gaps for passages
        g_map[x][z] = 2;
      }
    }
  }
  
  // Add some pillars
  for (let i = 0; i < 10; i++) {
    let x = 6 + i * 2;
    let z = 6 + (i % 3) * 8;
    if (x < 26 && z < 26) {
      g_map[x][z] = 4;
      g_map[x+1][z] = 3;
    }
  }
  
  // Create central arena (cleared area)
  for (let x = 14; x < 18; x++) {
    for (let z = 14; z < 18; z++) {
      g_map[x][z] = 0;
    }
  }
  
  // Add low walls for cover
  for (let i = 0; i < 15; i++) {
    let x = Math.floor(Math.random() * 26) + 3;
    let z = Math.floor(Math.random() * 26) + 3;
    if (g_map[x][z] === 0) {
      g_map[x][z] = 1;
    }
  }
  
  // Ensure starting area is clear
  for (let x = 1; x < 4; x++) {
    for (let z = 1; z < 4; z++) {
      g_map[x][z] = 0;
    }
  }
  
  // Place collectible items in strategic locations
  const itemSpots = [
    {x: 15, z: 15}, // Center
    {x: 5, z: 5},   // Corner
    {x: 26, z: 5},  // Corner
    {x: 5, z: 26},  // Corner
    {x: 16, z: 8},  // Mid
  ];
  
  for (let i = 0; i < Math.min(g_totalItems, itemSpots.length); i++) {
    g_itemPositions.push({
      x: itemSpots[i].x,
      y: 0.5,
      z: itemSpots[i].z,
      collected: false
    });
  }
}


function handleKeyDown(ev) {
  g_keys[ev.key.toLowerCase()] = true;
}

function handleKeyUp(ev) {
  g_keys[ev.key.toLowerCase()] = false;
}

function handleMouseDown(ev) {
  if (ev.button === 0) { // Left click
    g_mouseDown = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  } else if (ev.button === 2) { // Right click - place/remove block
    ev.preventDefault();
    handleBlockInteraction(ev.shiftKey);
  }
}

function handleMouseMove(ev) {
  if (g_mouseDown) {
    let deltaX = ev.clientX - g_lastMouseX;
    let deltaY = ev.clientY - g_lastMouseY;
    
    camera.rotateHorizontal(-deltaX * camera.mouseSensitivity);
    camera.rotateVertical(-deltaY * camera.mouseSensitivity);
    
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  }
}

function handleMouseUp(ev) {
  g_mouseDown = false;
}

function handleBlockInteraction(isRemove) {
  // Get block in front of camera
  let forward = camera.getForward();
  let checkX = Math.floor(camera.eye.elements[0] + forward.elements[0] * 2);
  let checkZ = Math.floor(camera.eye.elements[2] + forward.elements[2] * 2);
  
  // Convert to map coordinates
  let mapX = checkX + 16;
  let mapZ = checkZ + 16;
  
  if (mapX >= 0 && mapX < 32 && mapZ >= 0 && mapZ < 32) {
    if (isRemove) {
      // Remove block (decrease height)
      if (g_map[mapX][mapZ] > 0) {
        g_map[mapX][mapZ]--;
        console.log("Block removed at", mapX, mapZ, "new height:", g_map[mapX][mapZ]);
      }
    } else {
      // Add block (increase height)
      if (g_map[mapX][mapZ] < 4) {
        g_map[mapX][mapZ]++;
        console.log("Block added at", mapX, mapZ, "new height:", g_map[mapX][mapZ]);
      }
    }
  }
}

function processInput() {
  if (g_keys['w']) {
    camera.moveForward(g_map);
  }
  if (g_keys['s']) {
    camera.moveBackwards(g_map);
  }
  if (g_keys['a']) {
    camera.moveLeft(g_map);
  }
  if (g_keys['d']) {
    camera.moveRight(g_map);
  }
  if (g_keys['q']) {
    camera.panLeft();
  }
  if (g_keys['e']) {
    camera.panRight();
  }
  if (g_keys[' ']) {
    camera.jump(g_map);
  }
  
  // Update jump physics every frame (needs map for landing detection)
  camera.updateJump(g_map);
}

function checkItemCollection() {
  for (let i = 0; i < g_itemPositions.length; i++) {
    let item = g_itemPositions[i];
    if (!item.collected) {
      let dx = camera.eye.elements[0] - item.x + 16;
      let dy = camera.eye.elements[1] - item.y;
      let dz = camera.eye.elements[2] - item.z + 16;
      let distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (distance < 1.0) {
        item.collected = true;
        g_collectedItems++;
        console.log("Item collected! " + g_collectedItems + "/" + g_totalItems);
      }
    }
  }
}

function main() {
  setUpWebGL();
  connectFunctionsToGLSL();
  
  // Initialize camera
  camera = new Camera(canvas);
  camera.eye = new Vector3([0, 1, 2]);
  camera.at = new Vector3([0, 1, 0]);
  camera.updateViewMatrix();
  
  // Generate world
  generateMap();
  
  // Load textures
  initTextures();
  g_model = new Model();
  g_model.loadFromURL('bunny.obj');          // swap for your .obj filename
  g_model.color      = [0.8, 0.6, 0.4, 1.0];
  g_model.textureNum = -2;
  g_model.matrix.setTranslate(-1, 0, -2);
  g_model.matrix.scale(0.5, 0.5, 0.5);    // scale to fit scene
  // Register event handlers
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  gl.clearColor(0.5, 0.7, 1.0, 1.0); // Sky blue background

  requestAnimationFrame(tick);
}

var g_startTime = performance.now() / 1000.0;
var g_seconds = performance.now() / 1000.0 - g_startTime;

function tick() {
  g_frameCount++;
  const now = performance.now();

  if (now - g_fpsStartTime >= 1000) {
    g_fps = g_frameCount;
    g_frameCount = 0;
    g_fpsStartTime = now;
  }

  g_seconds = now / 1000.0 - g_startTime;

  // ── Animate light position ──────────────────────────
  if (g_lightAnimOn) {
    g_lightPos[0] = 5 * Math.cos(g_seconds);          // orbit X
    g_lightPos[2] = 5 * Math.sin(g_seconds) - 5;      // orbit Z

    // Sync sliders to match animation so they don't appear stale
    let slX = document.getElementById('lightX');
    let slZ = document.getElementById('lightZ');
    if (slX) slX.value = g_lightPos[0];
    if (slZ) slZ.value = g_lightPos[2];
  }
  // ───────────────────────────────────────────────────

  processInput();
  checkItemCollection();
  renderScene();
  requestAnimationFrame(tick);
}

function toggleLightAnim() {
  g_lightAnimOn = !g_lightAnimOn;
  document.getElementById('lightAnimBtn').textContent =
    'Animation: ' + (g_lightAnimOn ? 'ON' : 'OFF');
}

function onLightSlider(axis, val) {
  // Moving a slider pauses animation so manual control feels responsive
  g_lightAnimOn = false;
  document.getElementById('lightAnimBtn').textContent = 'Animation: OFF';

  val = parseFloat(val);
  if (axis === 'x') {
    g_lightPos[0] = val;
    document.getElementById('lightXVal').textContent = val.toFixed(1);
  } else if (axis === 'y') {
    g_lightPos[1] = val;
    document.getElementById('lightYVal').textContent = val.toFixed(1);
  } else if (axis === 'z') {
    g_lightPos[2] = val;
    document.getElementById('lightZVal').textContent = val.toFixed(1);
  }
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniform1i(u_LightOn, g_lightOn);

  // Remove the duplicate u_LightPos line — you have it twice currently
  gl.uniform3f(u_LightPos,   g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_LightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform3f(u_CameraPos,
    camera.eye.elements[0],
    camera.eye.elements[1],
    camera.eye.elements[2]
  );
  
gl.uniform1i(u_SpotOn,     g_spotOn);
gl.uniform3f(u_SpotPos,    camera.eye.elements[0],
                            camera.eye.elements[1],
                            camera.eye.elements[2]);

// Spotlight points wherever the camera is looking
let fwd = camera.getForward();
gl.uniform3f(u_SpotDir,    fwd.elements[0],
                            fwd.elements[1],
                            fwd.elements[2]);

// Cutoff angle of 15 degrees — pass cosine for cheap shader comparison
gl.uniform1f(u_SpotCutoff, Math.cos(15 * Math.PI / 180));
  // Upload identity normal matrix as default (overridden per-object if needed)
  gl.uniformMatrix3fv(u_NormalMatrix, false, computeNormalMatrix(new Matrix4()));

  renderSky();
  renderGround();
  renderBlocks();
  renderItems();
  renderLightCube(); // you defined this but never called it!

  if (g_model) g_model.render();
  
  let s = new Sphere();
  s.color = [1.0, 0.0, 0.0, 1.0];
  s.textureNum = -2;
  s.matrix.setTranslate(-1, 1, -5);
  s.matrix.scale(0.7, 0.7, 0.7);
  s.render();

  updateUI();
}
function computeNormalMatrix(modelMatrix) {
  var e = modelMatrix.elements;
  // Build a copy as Matrix4, invert, transpose
  var n = new Matrix4();
  n.elements.set(e);
  n.invert();
  n.transpose();
  var m = n.elements;
  // Return upper-left 3x3 as Float32Array (column-major)
  return new Float32Array([
    m[0], m[1], m[2],
    m[4], m[5], m[6],
    m[8], m[9], m[10]
  ]);
}
function renderLightCube() {
  let lightCube = new Cube();
  lightCube.color = [1.0, 1.0, 0.0, 1.0]; // bright yellow
  lightCube.textureNum = -2;               // solid color only
  lightCube.matrix.setTranslate(
    g_lightPos[0] - 0.1,   // center the 0.2-unit cube on the light pos
    g_lightPos[1] - 0.1,
    g_lightPos[2] - 0.1
  );
  lightCube.matrix.scale(0.2, 0.2, 0.2);
  lightCube.render();
}

function renderSky() {
  let sky = new Cube();
  sky.textureNum = 0;
  sky.matrix.scale(500, 500, 500);
  sky.matrix.translate(-0.5, -0.5, -0.5);
  sky.render();
}

function renderGround() {
  let ground = new Cube();
  ground.textureNum = 2;
  ground.matrix.translate(-16, -0.1, -16);
  ground.matrix.scale(32, 0.1, 32);
  ground.render();
}

function renderBlocks() {
  // Render directly from map for better performance
  // Simple frustum culling - only render blocks near camera
  const camX = Math.floor(camera.eye.elements[0] + 16);
  const camZ = Math.floor(camera.eye.elements[2] + 16);
  const renderDistance = 20; // Only render blocks within this distance
  
  for (let x = 0; x < 32; x++) {
    for (let z = 0; z < 32; z++) {
      // Simple distance check for culling
      const dx = Math.abs(x - camX);
      const dz = Math.abs(z - camZ);
      if (dx > renderDistance || dz > renderDistance) continue;
      
      let height = g_map[x][z];
      if (height > 0) {
        // Render stack of blocks
        for (let y = 0; y < height; y++) {
          let cube = new Cube();
          cube.textureNum = 1;
          cube.matrix.translate(x - 16, y, z - 16);
          cube.render();
        }
      }
    }
  }
}

function toggleSpot() {
  g_spotOn = !g_spotOn;
  document.getElementById('spotBtn').textContent =
    'Spotlight: ' + (g_spotOn ? 'ON' : 'OFF');
}

function renderItems() {
  for (let i = 0; i < g_itemPositions.length; i++) {
    let item = g_itemPositions[i];
    if (!item.collected) {
      let cube = new Cube();
      cube.textureNum = -2;
      cube.color = [1.0, 0.84, 0.0, 1.0]; // Gold color
      cube.matrix.translate(item.x - 16, item.y + Math.sin(g_seconds * 3) * 0.1, item.z - 16);
      cube.matrix.scale(0.3, 0.3, 0.3);
      cube.matrix.rotate(g_seconds * 50, 0, 1, 0);
      cube.render();
    }
  }
}

function updateUI() {
  // Simple FPS counter update - uses "numdot" from original HTML
  sendTextToHTML("fps: " + g_fps.toFixed(1), "numdot");
  
  // Update game status
  let status = "Position: (" + camera.eye.elements[0].toFixed(1) + ", " + 
            camera.eye.elements[1].toFixed(1) + ", " + 
            camera.eye.elements[2].toFixed(1) + ") | ";
  status += "Items Collected: " + g_collectedItems + "/" + g_totalItems;
  
  if (g_collectedItems === g_totalItems) {
    status += " | 🎉 YOU WIN! 🎉";
  }
  
  sendTextToHTML(status, "gameStatus");
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (htmlElm) {
    htmlElm.innerHTML = text;
  }
}