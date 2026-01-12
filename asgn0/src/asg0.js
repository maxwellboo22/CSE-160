

//DrawRectangle.js
function main() {
    // Retrieve <canvas> element
    var canvas = document.getElementById('example');
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }

// Get the rendering context for 2DCG
    var ctx = canvas.getContext('2d');
    // Draw a blue rectangle
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'; //Set a blue color
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill a rectangle with the color
}
function drawVector(v,color) {
    const canvas = document.getElementById('example');
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = color;
    ctx.lineWidth =2;

    const originX = canvas.width / 2;
    const originY = canvas.height / 2;

    const scale = 20;
    const x = v.elements[0] * scale;
    const y = v.elements[1] * scale;

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + x, originY - y);
    ctx.stroke();
}
function handleDrawEvent(){
    const canvas = document.getElementById('example');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0,0,canvas.width,canvas.height);

    const x = parseFloat(document.getElementById('X').value);
    const y = parseFloat(document.getElementById('Y').value);
    const x2 = parseFloat(document.getElementById('X2').value);
    const y2 = parseFloat(document.getElementById('Y2').value);

    let v1 = new Vector3([x,y,0]);
    let v2 = new Vector3([x2,y2,0]);
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'; //Set a blue color
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill a rectangle with the color
    drawVector(v1,'red');
    drawVector(v2,'blue');
}
function handleDrawOperationEvent(){
    const canvas = document.getElementById('example');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0,0,canvas.width,canvas.height);

    const x = parseFloat(document.getElementById('X').value);
    const y = parseFloat(document.getElementById('Y').value);
    const x2 = parseFloat(document.getElementById('X2').value);
    const y2 = parseFloat(document.getElementById('Y2').value);
    let v1 = new Vector3([x,y,0]);
    let v2 = new Vector3([x2,y2,0]);
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'; //Set a blue color
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill a rectangle with the color
    drawVector(v1,'red');
    drawVector(v2,'blue');

    const op = document.getElementById('operation').value;
    const scalar = parseFloat(document.getElementById('Scalar').value);
if (op === 'add') {
        let v3 = new Vector3([v1.elements[0], v1.elements[1], 0]);
        v3.add(v2);
        drawVector(v3, 'green');
    } else if (op === 'sub') {
        let v3 = new Vector3([v1.elements[0], v1.elements[1], 0]);
        v3.sub(v2);
        drawVector(v3, 'green');
    } else if (op === 'mul') {
        let v3 = new Vector3([v1.elements[0], v1.elements[1], 0]);
        let v4 = new Vector3([v2.elements[0], v2.elements[1], 0]);
        v3.mul(scalar);
        v4.mul(scalar);
        drawVector(v3, 'green');
        drawVector(v4, 'green');
    } else if (op === 'div') {
        let v3 = new Vector3([v1.elements[0], v1.elements[1], 0]);
        let v4 = new Vector3([v2.elements[0], v2.elements[1], 0]);
        v3.div(scalar);
        v4.div(scalar);
        drawVector(v3, 'green');
        drawVector(v4, 'green');
    } else if (op === 'angleBetween') {
        let angle = angleBetween(v1, v2);
        console.log('Angle between vectors: ' + angle);
    } else if (op === 'magnitude') {
        let mag1 = v1.magnitude();
        let mag2 = v2.magnitude();
        console.log('Magnitude of Vector 1: ' + mag1);
        console.log('Magnitude of Vector 2: ' + mag2);
    } else if (op === 'normalize') {
        let v3 = new Vector3([v1.elements[0], v1.elements[1], 0]);
        let v4 = new Vector3([v2.elements[0], v2.elements[1], 0]);
        v3.normalize();
        v4.normalize();
        drawVector(v3, 'green');
        drawVector(v4, 'green');
    } else if (op === 'cross') {
        let v3 = Vector3.cross(v1, v2);
        drawVector(v3, 'green');
    } else if (op === 'area') {
        let area = areaTriangle(v1, v2);
        console.log('Area of triangle formed by vectors: ' + area);
    }
}

function angleBetween(v1, v2) {
    const dotProd = Vector3.dot(v1, v2);
    const magV1 = v1.magnitude();
    const magV2 = v2.magnitude();
    const cosTheta = dotProd / (magV1 * magV2);
    const angleRad = Math.acos(cosTheta);
    const angleDeg = angleRad * (180 / Math.PI);
    return angleDeg;
}

function areaTriangle(v1, v2) {
    const crossProd = Vector3.cross(v1, v2);
    const area = 0.5 * crossProd.magnitude();
    return area;
}