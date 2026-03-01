// Camera.js - First-person camera with keyboard and mouse controls

class Camera {
  constructor(canvas) {
    this.fov = 60;
    this.eye = new Vector3([0, 0.5, 3]); // Start position (slightly elevated)
    this.at = new Vector3([0, 0.5, -1]); // Looking point
    this.up = new Vector3([0, 1, 0]); // Up direction
    
    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();
    
    this.speed = 0.1; // Movement speed
    this.mouseSensitivity = 0.3; // Mouse rotation sensitivity
    
    // Jumping mechanics
    this.isJumping = false;
    this.jumpVelocity = 0;
    this.gravity = 0.015;
    this.jumpStrength = 0.35;
    this.groundHeight = 0.5; // Player height when on ground
    
    // Initialize matrices
    this.updateViewMatrix();
    this.updateProjectionMatrix(canvas);
  }
  
  updateViewMatrix() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0], this.at.elements[1], this.at.elements[2],
      this.up.elements[0], this.up.elements[1], this.up.elements[2]
    );
  }
  
  updateProjectionMatrix(canvas) {
    this.projectionMatrix.setPerspective(
      this.fov, 
      canvas.width / canvas.height, 
      0.1, 
      1000
    );
  }
  
  // Calculate forward vector (normalized direction from eye to at)
  getForward() {
    let f = new Vector3();
    f.set(this.at);
    f.sub(this.eye);
    f.normalize();
    return f;
  }
  
  // Calculate right vector (cross product of forward and up)
  getRight() {
    let f = this.getForward();
    let r = new Vector3();
    
    // r = f × up
    r.elements[0] = f.elements[1] * this.up.elements[2] - f.elements[2] * this.up.elements[1];
    r.elements[1] = f.elements[2] * this.up.elements[0] - f.elements[0] * this.up.elements[2];
    r.elements[2] = f.elements[0] * this.up.elements[1] - f.elements[1] * this.up.elements[0];
    
    r.normalize();
    return r;
  }
  
  // Check if position would collide with a wall
  checkCollision(newX, newZ, map) {
    // Convert world coordinates to map coordinates
    let mapX = Math.floor(newX + 16);
    let mapZ = Math.floor(newZ + 16);
    
    // Check bounds
    if (mapX < 0 || mapX >= 32 || mapZ < 0 || mapZ >= 32) {
      return true; // Out of bounds = collision
    }
    
    // Check if there's a wall at this position
    let wallHeight = map[mapX][mapZ];
    
    // Player can move if:
    // 1. No wall exists (wallHeight = 0), OR
    // 2. Player is jumping high enough to clear the wall
    // Player height is at eye.y, and they need head clearance
    if (wallHeight > 0 && this.eye.elements[1] < wallHeight + 0.3) {
      return true; // Wall blocks at this height
    }
    
    return false; // No collision
  }
  
  // Move camera forward with collision detection
  moveForward(map) {
    let f = this.getForward();
    f.mul(this.speed);
    
    let newX = this.eye.elements[0] + f.elements[0];
    let newZ = this.eye.elements[2] + f.elements[2];
    
    // Only move if no collision
    if (!this.checkCollision(newX, newZ, map)) {
      this.eye.elements[0] = newX;
      this.eye.elements[2] = newZ;
      
      this.at.elements[0] += f.elements[0];
      this.at.elements[2] += f.elements[2];
      
      this.updateViewMatrix();
    }
  }
  
  // Move camera backward with collision detection
  moveBackwards(map) {
    let f = this.getForward();
    f.mul(-this.speed);
    
    let newX = this.eye.elements[0] + f.elements[0];
    let newZ = this.eye.elements[2] + f.elements[2];
    
    // Only move if no collision
    if (!this.checkCollision(newX, newZ, map)) {
      this.eye.elements[0] = newX;
      this.eye.elements[2] = newZ;
      
      this.at.elements[0] += f.elements[0];
      this.at.elements[2] += f.elements[2];
      
      this.updateViewMatrix();
    }
  }
  
  // Move camera left with collision detection
  moveLeft(map) {
    let r = this.getRight();
    r.mul(-this.speed);
    
    let newX = this.eye.elements[0] + r.elements[0];
    let newZ = this.eye.elements[2] + r.elements[2];
    
    // Only move if no collision
    if (!this.checkCollision(newX, newZ, map)) {
      this.eye.elements[0] = newX;
      this.eye.elements[2] = newZ;
      
      this.at.elements[0] += r.elements[0];
      this.at.elements[2] += r.elements[2];
      
      this.updateViewMatrix();
    }
  }
  
  // Move camera right with collision detection
  moveRight(map) {
    let r = this.getRight();
    r.mul(this.speed);
    
    let newX = this.eye.elements[0] + r.elements[0];
    let newZ = this.eye.elements[2] + r.elements[2];
    
    // Only move if no collision
    if (!this.checkCollision(newX, newZ, map)) {
      this.eye.elements[0] = newX;
      this.eye.elements[2] = newZ;
      
      this.at.elements[0] += r.elements[0];
      this.at.elements[2] += r.elements[2];
      
      this.updateViewMatrix();
    }
  }
  
  // Pan camera left (rotate around up axis)
  panLeft(alpha = 5) {
    let f = this.getForward();
    
    // Create rotation matrix
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    
    // Rotate forward vector
    let f_prime = rotationMatrix.multiplyVector3(f);
    
    // Update at position
    this.at.elements[0] = this.eye.elements[0] + f_prime.elements[0];
    this.at.elements[1] = this.eye.elements[1] + f_prime.elements[1];
    this.at.elements[2] = this.eye.elements[2] + f_prime.elements[2];
    
    this.updateViewMatrix();
  }
  
  // Pan camera right (rotate around up axis)
  panRight(alpha = 5) {
    this.panLeft(-alpha);
  }
  
  // Mouse rotation - horizontal (yaw)
  rotateHorizontal(angle) {
    let f = this.getForward();
    
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(angle, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    
    let f_prime = rotationMatrix.multiplyVector3(f);
    
    this.at.elements[0] = this.eye.elements[0] + f_prime.elements[0];
    this.at.elements[1] = this.eye.elements[1] + f_prime.elements[1];
    this.at.elements[2] = this.eye.elements[2] + f_prime.elements[2];
    
    this.updateViewMatrix();
  }
  
  // Mouse rotation - vertical (pitch)
  rotateVertical(angle) {
    let f = this.getForward();
    let right = this.getRight();
    
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(angle, right.elements[0], right.elements[1], right.elements[2]);
    
    let f_prime = rotationMatrix.multiplyVector3(f);
    
    this.at.elements[0] = this.eye.elements[0] + f_prime.elements[0];
    this.at.elements[1] = this.eye.elements[1] + f_prime.elements[1];
    this.at.elements[2] = this.eye.elements[2] + f_prime.elements[2];
    
    this.updateViewMatrix();
  }
  
  // Start a jump
  jump(map) {
    // Get the height of the block we're standing on
    let mapX = Math.floor(this.eye.elements[0] + 16);
    let mapZ = Math.floor(this.eye.elements[2] + 16);
    let groundLevel = this.groundHeight;
    
    // Check if we're over a valid map position
    if (mapX >= 0 && mapX < 32 && mapZ >= 0 && mapZ < 32) {
      let blockHeight = map[mapX][mapZ];
      // Stand on top of the block (block top + player height offset)
      groundLevel = blockHeight > 0 ? blockHeight + 0.5 : this.groundHeight;
    }
    
    // Can only jump if we're on the ground (with small tolerance)
    if (!this.isJumping && Math.abs(this.eye.elements[1] - groundLevel) < 0.01) {
      this.isJumping = true;
      this.jumpVelocity = this.jumpStrength;
    }
  }
  
  // Update jump physics (call every frame)
  updateJump(map) {
    if (this.isJumping || this.eye.elements[1] > this.groundHeight) {
      // Apply gravity
      this.jumpVelocity -= this.gravity;
      
      // Store the old Y position to calculate delta
      let oldY = this.eye.elements[1];
      
      // Update Y position
      this.eye.elements[1] += this.jumpVelocity;
      
      // Calculate how much we moved vertically
      let deltaY = this.eye.elements[1] - oldY;
      
      // Move the look-at point by the same amount (preserve look direction)
      this.at.elements[1] += deltaY;
      
      // Get the height of the block we're standing on
      let mapX = Math.floor(this.eye.elements[0] + 16);
      let mapZ = Math.floor(this.eye.elements[2] + 16);
      let groundLevel = this.groundHeight;
      
      // Check if we're over a valid map position
      if (mapX >= 0 && mapX < 32 && mapZ >= 0 && mapZ < 32) {
        let blockHeight = map[mapX][mapZ];
        // Stand on top of the block (block top + player height offset)
        groundLevel = blockHeight > 0 ? blockHeight + 0.5 : this.groundHeight;
      }
      
      // Check if landed
      if (this.eye.elements[1] <= groundLevel) {
        // Calculate how much we need to adjust
        let landingAdjustment = groundLevel - this.eye.elements[1];
        
        this.eye.elements[1] = groundLevel;
        this.at.elements[1] += landingAdjustment; // Adjust look-at by the same amount
        this.jumpVelocity = 0;
        this.isJumping = false;
      }
      
      this.updateViewMatrix();
    }
  }
}