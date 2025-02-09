// Originally developed by @amir-kht
// Refactored and improved by @Mammad900

let canvas = document.querySelector("canvas");
let gameWidth = canvas.width = document.body.clientWidth;
let gameHeight = canvas.height = document.body.clientHeight;
let ctxMain = canvas.getContext("2d");
let ctx = new OffscreenCanvas(gameWidth, gameHeight).getContext('2d');

//#region Constants
const debug = 1;
const frameSample = 10;
const ballRadiusDefault = 10;
const defaultBallSpeedX = 7, defaultBallSpeedY = 3;
const paddleWidth = 10, paddleMargin = 20, paddleHeight = 200;
const comboMinSpeed = 25, maxCombo = 3, comboHitSize = 0.5;
const boomMessageTime = 1000;
const hitAccelX = 1.2, hitAccelY = 1.05, maxBallDeflect = Math.PI / 12;
const boomAccelX = 2, boomAccelY = 1.6;
const dropChance = 0.001, dropSize = [20, 50], crazyDropChance = 0.25;
//#endregion

//#region Game State
let paddle1X = paddleMargin;
let paddle1Y = gameHeight / 2;
let paddle1Height = paddleHeight;
let paddle2X = gameWidth - paddleMargin;
let paddle2Y = gameHeight / 2;
let paddle2Height = paddleHeight;

let ballRadius = ballRadiusDefault;
let ballX, ballY;
let ballSpeedY, ballSpeedX;
let paddle1Speed = 0, paddle2Speed = 0;

let score1 = 0, score2 = 0;
let goodHit1 = 0, goodHit2 = 0;
let lastBoom = 0;
let drops = [];

let gravity = 0; // positive: down, negative: up
let enableWalls = true;
let lastHitDrop = "", lastHitDropType = "normal", lastHitDropOpen = false;

let activityThisRound = false;
//#endregion

let lastFrame = Date.now();
ctxMain.globalCompositeOperation = "lighter";
ctxMain.globalAlpha = 2 / frameSample;

function resetBall() {
    ballRadius = ballRadiusDefault;
    paddle1Height = paddle2Height = paddleHeight;
    ballX = gameWidth / 2;
    ballY = gameHeight / 2;
    ballSpeedX = defaultBallSpeedX * (Math.random() > 0.5 ? -1 : 1);
    ballSpeedY = defaultBallSpeedY * (Math.random() > 0.5 ? -1 : 1);

    gravity = 0;
    enableWalls = true;
    goodHit1 = goodHit2 = lastBoom = 0

    activityThisRound = false;
}
resetBall();
function resetEverything() {
    resetSize();
    score1 = score2 = 0;
    drops = [];
    resetBall();
}

function resetSize() {
    gameWidth = canvas.width = document.body.clientWidth;
    gameHeight = canvas.height = document.body.clientHeight;
    paddle1X = paddleMargin;
    paddle1Y = paddle1Y = gameHeight / 2;
    paddle2X = gameWidth - paddleMargin;
}

// Called every frame
function frame() {
    const now = Date.now();
    const d = Math.min(now - lastFrame, 30) / frameSample; // dont jump too much when not being rendered
    lastFrame = now;
    ctxMain.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < frameSample; i++) {
        update(d);
        draw();
        ctxMain.drawImage(ctx.canvas, 0, 0)
    }
    requestAnimationFrame(frame);
}

function update(deltaTime) {
    deltaTime /= 16; // Speed calculations were originally designed for 60Hz (16ms between frames). This is to compensate.

    //#region Add drops
    if (Math.random() < deltaTime * dropChance * (0.5 + goodHit1 + goodHit2) && drops.length < 5) {
        const r = random(dropSize[0], dropSize[1]);
        drops.push({
            x: random(gameWidth / 4 + r, gameWidth - gameWidth / 4 - r),
            y: random(r, gameHeight - r),
            vx: Math.random() * 1 - 1,
            vy: Math.random() * 1 - 1,
            r,
            crazy: Math.random() < crazyDropChance
        })
    }
    //#endregion

    //#region Check collision with left paddle
    function collision1(n) {
        return ballY > (paddle1Y+n*gameHeight) - paddle1Height / 2 &&
               ballY < (paddle1Y+n*gameHeight) + paddle1Height / 2
    }
    if (
        ballSpeedX < 0 &&
        ballX - ballRadius < paddle1X &&
        (collision1(-1) || collision1(0) || collision1(1))
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
                lastBoom = Date.now();
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
    else if (ballSpeedX < 0 && ballX < 0) { // Goal
        if (activityThisRound) {
            score2++;
            scoreHUD(2);
        }
        goodHit1 = goodHit2 = 0;
        updateHUD();
        resetBall();
    }
    //#endregion

    //#region Check collision with right paddle
    function collision2(n) {
        return ballY > (paddle2Y+n*gameHeight) - paddle2Height / 2 &&
               ballY < (paddle2Y+n*gameHeight) + paddle2Height / 2
    }
    if (
        ballSpeedX > 0 &&
        ballX + ballRadius > paddle2X &&
        (collision2(-1) || collision2(0) || collision2(1))
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
                lastBoom = Date.now();
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
    else if (ballSpeedX > 0 && ballX >= window.innerWidth) { // Goal
        if (activityThisRound) {
            score1++;
            scoreHUD(1);
        }
        goodHit1 = goodHit2 = 0;
        updateHUD();
        resetBall();
    }
    //#endregion

    //#region Collision with top and bottom
    if (
        (ballY - ballRadius < 0 && ballSpeedY < 0)
        || (ballY + ballRadius >= gameHeight - 10 && ballSpeedY > 0)
    ) {
        if (enableWalls)
            ballSpeedY *= -1;
        else
            ballY = (ballY+gameHeight) %gameHeight;
    }
    //#endregion

    //#region Check Drops
    let hitDrops = []
    for (const drop of drops) {
        drop.x += drop.vx * deltaTime;
        drop.y += drop.vy * deltaTime;

        // delete out of range drops
        if (drop.x + drop.r < 0 ||
            drop.y + drop.r < 0 ||
            drop.x - drop.r > gameWidth ||
            drop.y - drop.r > gameHeight
        ) {
            drop.delete = true;
        }

        const d = Math.hypot(drop.x - ballX, drop.y - ballY);
        if (d < drop.r + ballRadius) { // Collision
            hitDrops.push(drop);
            if (drop.crazy) {
                switch (random(0, 1)) {
                    case 0:
                        gravity = Math.random() / 2 - 0.5;
                        lastHitDrop = "Gravity!";
                        break;
                    case 1:
                        enableWalls = false;
                        lastHitDrop = "No walls!"
                        break;
                }
                lastHitDropType = 'crazy';
            }
            else {
                switch (random(0, 8)) {
                    case 0:
                        ballSpeedX *= 2;
                        lastHitDrop = "2x Ball speed!";
                        break;
                    case 1:
                        ballSpeedX *= -1;
                        lastHitDrop = "Invert ball speed!";
                        break;
                    case 2:
                        ballSpeedX *= 0.5;
                        lastHitDrop = "Half ball speed!"
                        break;
                    case 3:
                        ballSpeedY *= 2;
                        lastHitDrop = "2x Vertical ball speed!"
                        break;
                    case 4:
                        paddle1Height /= 1.5;
                        lastHitDrop = "Red paddle shrink!"
                        break;
                    case 5:
                        paddle1Height *= 1.5;
                        lastHitDrop = "Red paddle grow!"
                        break;
                    case 6:
                        paddle2Height /= 1.5;
                        lastHitDrop = "Blue paddle shrink!"
                        break;
                    case 7:
                        paddle2Height *= 1.5;
                        lastHitDrop = "Blue paddle grow!"
                        break;
                    case 8:
                        ballRadius *= 2;
                        lastHitDrop = "Bigger ball!"
                        break;

                    default:
                        break;
                }
                lastHitDropType = 'normal';
            }
            lastHitDropOpen = true;
            updateHUD();
            setTimeout(() => {
                lastHitDropOpen = false;
                updateHUD()
            }, 2000);
            setTimeout(() => {
                lastHitDrop = '';
                updateHUD()
            }, 2500);
        }
    }
    drops = drops.filter(drop => (!hitDrops.includes(drop)) && (!drop.delete));
    //#endregion

    //#region Ball and paddle movement
    ballSpeedY += gravity * deltaTime;
    ballX += ballSpeedX * deltaTime;
    ballY += ballSpeedY * deltaTime;
    if (enableWalls) {
        paddle1Y = constrain(paddle1Y + paddle1Speed * deltaTime, paddle1Height / 2, gameHeight - paddle1Height / 2);
        paddle2Y = constrain(paddle2Y + paddle2Speed * deltaTime, paddle2Height / 2, gameHeight - paddle2Height / 2);
    } else {
        paddle1Y = (paddle1Y + paddle1Speed * deltaTime).mod(gameHeight)
        paddle2Y = (paddle2Y + paddle2Speed * deltaTime).mod(gameHeight)
    }
    //#endregion
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

    const rotate = Math.random() * maxBallDeflect;
    // Rotation matrix
    const vx = ballSpeedX * Math.cos(rotate) - ballSpeedY * Math.sin(rotate);
    const vy = ballSpeedX * Math.sin(rotate) + ballSpeedY * Math.cos(rotate);
    ballSpeedX = vx;
    ballSpeedY = vy;
}

function updateHUD() {
    document.querySelector("#score-1").innerHTML = score1;
    document.querySelector("#score-2").innerHTML = score2;
    document.querySelector("#r").innerHTML = goodHit1 === maxCombo ? "BOOM!" : goodHit1 === 0 ? "" : `Combo x${goodHit1}`;
    document.querySelector("#b").innerHTML = goodHit2 === maxCombo ? "BOOM!" : goodHit2 === 0 ? "" : `Combo x${goodHit2}`;
    document.querySelector("#drop").innerHTML = lastHitDrop;
    document.querySelector("#drop").className = `${lastHitDropType} ${lastHitDropOpen?'open':''}`
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const boom1 = goodHit1 == maxCombo;
    const boom2 = goodHit2 == maxCombo;
    const boomPercent = lastBoom == 0 ? 0 : 1-Math.min((Date.now() - lastBoom)/1000, 1)

    // Ball
    ctx.fillStyle = "white";
    ctx.shadowColor = lastBoom ? 'white' : 'transparent';
    ctx.shadowBlur = 20;
    function drawBall(x, y) {
        ctx.beginPath();
        ctx.arc(x, y, ballRadius, 0, Math.PI * 2); // circle
        ctx.fill();
    }
    drawBall(ballX, ballY);
    if (!enableWalls) {
        drawBall(ballX, ballY + gameHeight);
        drawBall(ballX, ballY - gameHeight);
    }

    // Paddle 1
    ctx.fillStyle = boom1 ? `rgb(255,${Math.floor(boomPercent * 255)},${Math.floor(boomPercent * 255)})` : 'red';
    ctx.shadowColor = boom1 ? `rgba(255,0,0,${boomPercent})` : 'transparent';
    ctx.fillRect(paddle1X - paddleWidth, paddle1Y - paddle1Height / 2, paddleWidth, paddle1Height);
    if (!enableWalls) {
        ctx.fillRect(paddle1X - paddleWidth, (paddle1Y - paddle1Height / 2) - gameHeight, paddleWidth, paddle1Height);
        ctx.fillRect(paddle1X - paddleWidth, (paddle1Y - paddle1Height / 2) + gameHeight, paddleWidth, paddle1Height);
    }

    // Paddle 2
    ctx.fillStyle = boom2 ? `rgb(${Math.floor(boomPercent*255)},255,255)` : 'aqua';
    ctx.shadowColor = boom2 ? `rgba(0,255,255,${boomPercent})` : 'transparent';
    ctx.fillRect(paddle2X, paddle2Y - paddle2Height / 2, paddleWidth, paddle2Height)
    if (!enableWalls) {
        ctx.fillRect(paddle2X, (paddle2Y - paddle2Height / 2) - gameHeight, paddleWidth, paddle2Height);
        ctx.fillRect(paddle2X, (paddle2Y - paddle2Height / 2) + gameHeight, paddleWidth, paddle2Height);
    }

    // Drops
    ctx.shadowColor = 'transparent'
    for (const drop of drops) {
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.r, 0, Math.PI * 2); // circle
        ctx.fillStyle = drop.crazy ? "red" : "gold";
        ctx.fill();
    }
}

document.body.addEventListener('keydown', e => {
    const paddleMaxSpeed = constrain(Math.hypot(ballSpeedX, ballSpeedY), 10, 40); // Get speed vector magnitude, and make sure its no slower than 40 idkunits
    if (e.key.toLowerCase() == "w") {
        paddle1Speed = -(paddleMaxSpeed + Math.abs(ballY-paddle1Y)*10/gameHeight)
        activityThisRound = true;
    }
    if (e.key.toLowerCase() == "s") {
        paddle1Speed = +(paddleMaxSpeed + Math.abs(ballY-paddle1Y)*10/gameHeight)
        activityThisRound = true;
    }
    if (e.key == 'ArrowUp') {
        paddle2Speed = -(paddleMaxSpeed + Math.abs(ballY-paddle2Y)*10/gameHeight);
        activityThisRound = true;
    }
    if (e.key == 'ArrowDown') {
        paddle2Speed = +(paddleMaxSpeed + Math.abs(ballY-paddle2Y)*10/gameHeight)
        activityThisRound = true;
    }
    if (e.key == '+' && debug) {
        ballSpeedX *= 2
        ballSpeedY *= 2
    }
    if (e.key == '-' && debug) {
        ballSpeedX /= 2
        ballSpeedY /= 2
    }
    if (e.key == 'b' && debug) {
        goodHit1 = maxCombo; lastBoom = Date.now();
        setTimeout(() => {
            goodHit1 = Math.max(goodHit1 - maxCombo, 0);
            updateHUD();
        }, boomMessageTime)
    }
    if (e.key == 'd' && debug) {
        goodHit2 = maxCombo; lastBoom = Date.now();
        setTimeout(() => {
            goodHit2 = Math.max(goodHit2 - maxCombo, 0);
            updateHUD();
        }, boomMessageTime)
    }
})
document.body.addEventListener('keyup', e => {
    if (e.key.toLowerCase() == "w") {
        paddle1Speed = 0
    }
    if (e.key.toLowerCase() == "s") {
        paddle1Speed = 0
    }
    if (e.key == 'ArrowUp') {
        paddle2Speed = 0
    }
    if (e.key == 'ArrowDown') {
        paddle2Speed = 0
    }
})

document.body.addEventListener('contextmenu', () => {
    document.body.requestFullscreen();
    screen.orientation.lock("landscape-primary");
    isFullscreen = true;
    resetSize();
    setTimeout(() => {
        resetEverything();
    }, 5000);
})

document.body.addEventListener('touchmove', e => {
    for (const touch of e.changedTouches) {
        if (touch.clientX / gameWidth < 0.25) {
            paddle1Y = touch.clientY;
        }
        if (touch.clientX / gameWidth > 0.75) {
            paddle2Y = touch.clientY;
        }
    }
    draw();
})

window.addEventListener('resize', () => {
    resetSize();
})

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}
function constrain(input, min, max) {
    return input < min ? min : input > max ? max : input
}
Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
}
