let canvas = document.querySelector("canvas");
const gameWidth = canvas.width = document.body.clientWidth;
const gameHeight = canvas.height = document.body.clientHeight;
let c = canvas.getContext("2d");


const debug = 1;
const ballRadius = 10;
const defaultBallSpeedX = 7, defaultBallSpeedY = 3;
const paddleWidth = 10, paddleMargin = 20, paddleHeight = 200;
const comboMinSpeed = 25, maxCombo = 3, comboHitSize = 0.5;
const boomMessageTime = 1000;
const hitAccelX = 1.2, hitAccelY = 1.05;
const boomAccelX = 2, boomAccelY = 1.6;

let paddle1X = paddleMargin;
let paddle1Y = gameHeight / 2;
let paddle1Height = paddleHeight;
let paddle2X = gameWidth - paddleMargin;
let paddle2Y = gameHeight / 2;
let paddle2Height = paddleHeight;

let ballX, ballY;
let ballSpeedY, ballSpeedX;
let paddle1Speed = 0, paddle2Speed = 0;

let score1 = 0, score2 = 0;
let goodHit1 = 0, goodHit2 = 0;

let lastFrame = Date.now();

function resetBall() {
    ballX = gameWidth / 2;
    ballY = gameHeight / 2;
    ballSpeedX = defaultBallSpeedX * (Math.random() > 0.5 ? -1 : 1);
    ballSpeedY = defaultBallSpeedY * (Math.random() > 0.5 ? -1 : 1);
}
resetBall();

// Called every frame
function frame() {
    const now = Date.now();
    const d = now - lastFrame;
    lastFrame = now;
    if (d < 50) {
        update(d);
    }
    else { // Black magic to fast forward if tick was too long
        const n = (d - (d % 50)) / 50;
        for (let i = 0; i < n; i++) {
            update(50);
        }
        update(d % 50);
    }
    draw();
    requestAnimationFrame(frame);
}

function update(deltaTime) {
    deltaTime /= 16; // Speed calculations were originally designed for 60Hz (16ms between frames). This is to compensate.
    ballX += ballSpeedX * deltaTime;
    ballY += ballSpeedY * deltaTime;



    // Check collision with left paddle
    if (
        ballSpeedX < 0 &&
        ballX - ballRadius < paddle1X &&
        ballY > paddle1Y - paddle1Height / 2 &&
        ballY < paddle1Y + paddle1Height / 2
    ) {
        if (goodHit1 == 0) {
            updateHUD();
        }
        ballCollision(paddle1Speed);

        // A good hit is when the ball hits the center of the paddle 
        if (
            ballY > paddle1Y - paddle1Height * comboHitSize / 2 &&
            ballY < paddle1Y + paddle1Height * comboHitSize / 2 &&
            Math.abs(ballSpeedX) >= comboMinSpeed
        ) {
            goodHit1++;
            updateHUD();
            comboHUD('r');
            if (goodHit1 == maxCombo) {
                ballSpeedX *= boomAccelX;
                ballSpeedY *= boomAccelY;
                setTimeout(() => {
                    goodHit1 = Math.max(goodHit1 - maxCombo, 0);
                    updateHUD();
                }, boomMessageTime)
            }
        } else {
            goodHit1 = 0;
            updateHUD();
        }
    }
    else if (ballSpeedX < 0 && ballX < 0) {
        score2++
        goodHit1 = goodHit2 = 0;
        updateHUD();
        scoreHUD(2);
        resetBall();
    }



    // Check collision with right paddle
    if (
        ballSpeedX > 0 &&
        ballX + ballRadius > paddle2X &&
        ballY > paddle2Y - paddle2Height / 2 &&
        ballY < paddle2Y + paddle2Height / 2
    ) {
        if (goodHit2 == 0) {
            updateHUD();
        }
        ballCollision(paddle2Speed);

        // A good hit is when the ball hits the center of the paddle 
        if (
            ballY > paddle2Y - paddle2Height * comboHitSize / 2 &&
            ballY < paddle2Y + paddle2Height * comboHitSize / 2 &&
            Math.abs(ballSpeedX) >= comboMinSpeed
        ) {
            goodHit2++;
            updateHUD();
            comboHUD('b');
            if (goodHit2 >= maxCombo) {
                ballSpeedX *= boomAccelX;
                ballSpeedY *= boomAccelY;
                setTimeout(() => {
                    goodHit2 = Math.max(goodHit2 - maxCombo, 0);
                    updateHUD();
                }, boomMessageTime)
            }

        } else {
            goodHit2 = 0;
            updateHUD();
        }
    }
    else if (ballSpeedX > 0 && ballX >= window.innerWidth) {
        score1++
        goodHit1 = goodHit2 = 0;
        updateHUD();
        scoreHUD(1);
        resetBall();
    }

    // Collision with top and bottom
    if (
        (ballY - ballRadius < 0 && ballSpeedY < 0)
        || ballY >= window.innerHeight - 10
    ) {
        ballSpeedY *= -1;
    }


    paddle1Y = constrain(paddle1Y + paddle1Speed, paddle1Height / 2, gameHeight - paddle1Height / 2);
    paddle2Y = constrain(paddle2Y + paddle2Speed, paddle2Height / 2, gameHeight - paddle2Height / 2);
}
requestAnimationFrame(frame);

function ballCollision(paddleSpeed) {
    if (Math.abs(ballSpeedX) < 30) { // Maximum speed is 30
        ballSpeedX *= hitAccelX
        ballSpeedY *= hitAccelY
    }

    ballSpeedX *= -1;

    if (paddleSpeed * ballSpeedY < 0) {
        ballSpeedY *= -1;
    }
}

function updateHUD() {
    document.querySelector("#score-1").innerHTML = score1;
    document.querySelector("#score-2").innerHTML = score2;
    document.querySelector("#r").innerHTML = goodHit1 === 3 ? "BOOM!" : goodHit1 === 0 ? "" : `Combo x${goodHit1}`;
    document.querySelector("#b").innerHTML = goodHit2 === 3 ? "BOOM!" : goodHit2 === 0 ? "" : `Combo x${goodHit2}`;
}
function scoreHUD(player) {
    const el = document.getElementById('score-' + player);
    el.classList.add('bump');
    setTimeout(() => {
        el.classList.remove('bump');
    }, 1000)
}
function comboHUD(player) {
    const el = document.getElementById(player);
    el.classList.add('bump');
    setTimeout(() => {
        el.classList.remove('bump');
    }, 1000)
}

function draw() {
    c.clearRect(0, 0, canvas.width, canvas.height);

    // Ball
    c.beginPath();
    c.arc(ballX, ballY, ballRadius, 0, Math.PI * 2); // circle
    c.fillStyle = "white";
    c.fill();

    // Paddle 1
    c.fillStyle = "red";
    c.fillRect(paddle1X - paddleWidth, paddle1Y - paddle1Height / 2, paddleWidth, paddle1Height);

    // Paddle 2
    c.fillStyle = "aqua";
    c.fillRect(paddle2X, paddle2Y - paddle2Height / 2, paddleWidth, paddle2Height)
}

document.body.addEventListener('keydown', e => {
    const paddleMaxSpeed = Math.sqrt(Math.sqrt(ballSpeedX ** 2 + ballSpeedY ** 2) * 12); // Get speed vector magnitude, then get its geometric mean with 12
    console.log(e.key);
    if (e.key == "w") {
        paddle1Speed = -paddleMaxSpeed
    }
    if (e.key == "s") {
        paddle1Speed = +paddleMaxSpeed
    }
    if (e.key == 'ArrowUp') {
        paddle2Speed = -paddleMaxSpeed
    }
    if (e.key == 'ArrowDown') {
        paddle2Speed = +paddleMaxSpeed
    }
    if (e.key == '+' && debug) {
        ballSpeedX *= 2
        ballSpeedY *= 2
    }
    if (e.key == '-' && debug) {
        ballSpeedX /= 2
        ballSpeedY /= 2
    }
})
document.body.addEventListener('keyup', e => {
    console.log(e.key)
    if (e.key == "w") {
        paddle1Speed = 0
    }
    if (e.key == "s") {
        paddle1Speed = 0
    }
    if (e.key == 'ArrowUp') {
        paddle2Speed = 0
    }
    if (e.key == 'ArrowDown') {
        paddle2Speed = 0
    }
})

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}
function constrain(input, min, max) {
    return input < min ? min : input > max ? max : input
}