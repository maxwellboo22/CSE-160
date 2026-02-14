// World.js - First-Person Voxel World Exploration

// Vertex shader program
var VSHADER_SOURCE = 
`precision mediump float;
attribute vec4 a_Position;
attribute vec2 a_UV;
varying vec2 v_UV;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
}`;

// Fragment shader program
var FSHADER_SOURCE = 
`precision mediump float;
varying vec2 v_UV;
uniform vec4 u_FragColor; 
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform int u_WhichTexture;

void main() {
  if (u_WhichTexture == -2) {
    gl_FragColor = u_FragColor;
  } else if (u_WhichTexture == -1) {
    gl_FragColor = vec4(v_UV, 1.0, 1.0);
  } else if (u_WhichTexture == 0) {
    gl_FragColor = texture2D(u_Sampler0, v_UV);
  } else if (u_WhichTexture == 1) {
    gl_FragColor = texture2D(u_Sampler1, v_UV);
  } else if (u_WhichTexture == 2) {
    gl_FragColor = texture2D(u_Sampler2, v_UV);
  } else {
    gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
  }
}`;

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
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }
  
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
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

  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');

  u_WhichTexture = gl.getUniformLocation(gl.program, 'u_WhichTexture');
  if (!u_WhichTexture) {
    console.log('Failed to get the storage location of u_WhichTexture');
    return;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
  gl.uniform1i(u_WhichTexture, -2);
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
  
  processInput();
  checkItemCollection();
  renderScene();

  requestAnimationFrame(tick);
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Set camera matrices
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);

  // Render sky box
  renderSky();
  
  // Render ground plane
  renderGround();
  
  // Render blocks
  renderBlocks();
  
  // Render collectible items
  renderItems();
  
  // Update UI
  updateUI();
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