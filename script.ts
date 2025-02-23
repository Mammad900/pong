// Originally developed by @amir-kht
// Refactored and improved by @Mammad900

import { constrain, random, V2, v2add, v2dist, v2div, v2isInAreaCS, v2isInAreaTLBR, v2mag, v2mul, v2random, v2rotate, v2sub } from "./math";

let canvas = document.querySelector("canvas")!;
let gameSize: V2 = [canvas.width = document.body.clientWidth, canvas.height = document.body.clientHeight];
let ctxMain = canvas.getContext("2d")!;
let ctx = new OffscreenCanvas(...gameSize).getContext('2d')!;

//#region Constants
const debug = 1;
const frameSample = 10;
const ballRadiusDefault = 10;
const defaultBallSpeed: V2 = [7, 3];
const paddleSize: V2 = [10, 200], paddleMargin = 20;
const comboMinSpeed = 25, maxCombo = 3, comboHitSize = 0.5;
const boomMessageTime = 1000;
const hitAccel: V2 = [1.2, 1.05], maxBallDeflect = Math.PI / 12;
const boomAccel: V2 = [2, 1.6];
const dropChance = 0.001, dropSize = [20, 50], crazyDropChance = 0.25;
//#endregion

//#region Game State
let paddle1Pos: V2 = [paddleMargin, gameSize[1] / 2];
let paddle1Height = paddleSize[1];
let paddle2Pos: V2 = [gameSize[0] - paddleMargin, gameSize[1] / 2];
let paddle2Height = paddleSize[1];

let ballRadius = ballRadiusDefault;
let ballPos: V2;
let ballSpeed: V2;
let paddle1Speed = 0, paddle2Speed = 0;

let score1 = 0, score2 = 0;
let goodHit1 = 0, goodHit2 = 0;
let lastBoom = 0;
let drops: Drop[] = [];

type Drop = {
    pos: V2,
    speed: V2,
    r: number,
    isCrazy: boolean,
    delete?: boolean
}

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
    paddle1Height = paddle2Height = paddleSize[1];
    ballPos = v2div(gameSize, 2);
    ballSpeed = v2mul(defaultBallSpeed, [Math.random() > 0.5 ? -1 : 1, Math.random() > 0.5 ? -1 : 1]);

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
    gameSize = [canvas.width = ctx.canvas.width = document.body.clientWidth, canvas.height = ctx.canvas.height = document.body.clientHeight];
    paddle1Pos = [paddleMargin, gameSize[1] / 2];
    paddle2Pos = [gameSize[0] - paddleMargin, gameSize[1] / 2];
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

function update(Δt: number) {
    Δt /= 16; // Speed calculations were originally designed for 60Hz (16ms between frames). This is to compensate.

    //#region Add drops
    if (Math.random() < Δt * dropChance * (0.5 + goodHit1 + goodHit2) && drops.length < 5) {
        const r = random(dropSize[0], dropSize[1]);
        drops.push({
            pos: v2random(
                [gameSize[0] / 4 + r, r],
                [gameSize[0]*0.75 - r, gameSize[1] - r]
            ),
            speed: [Math.random() * 1 - 1, Math.random() * 1 - 1],
            r,
            isCrazy: Math.random() < crazyDropChance
        })
    }
    //#endregion

    //#region Check collision with left paddle
    function collision1(n: number, paddleScale=1) {
        // return ballPos[1] > (paddle1Pos[1]+n*gameSize[1]) - paddle1Height / 2 &&
        //        ballPos[1] < (paddle1Pos[1]+n*gameSize[1]) + paddle1Height / 2
        return v2isInAreaCS(ballPos, v2add(paddle1Pos, [0, n*gameSize[1]]), [paddleSize[0], paddle1Height*paddleScale], ballRadius)
    }
    if (
        ballSpeed[0] < 0 &&
        // ballPos[0] - ballRadius < paddle1Pos[0] &&
        (collision1(-1) || collision1(0) || collision1(1))
    ) {
        if (goodHit1 == 0) {
            updateHUD();
        }
        ballCollision(paddle1Speed);

        // A good hit is when the ball hits the center of the paddle 
        if (
            (collision1(-1, 0.5) || collision1(0, 0.5) || collision1(1, 0.5))&&
            v2mag(ballSpeed) >= comboMinSpeed
        ) {
            goodHit1++;
            updateHUD();
            comboHUD('r');
            if (goodHit1 == maxCombo) { // BOOM!
                ballSpeed = v2mul(ballSpeed, boomAccel);
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
    else if (ballSpeed[0] < 0 && ballPos[0] < 0) { // Goal
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
    function collision2(n: number, paddleScale=1) {
        // return ballY > (paddle2Y+n*gameHeight) - paddle2Height / 2 &&
        //        ballY < (paddle2Y+n*gameHeight) + paddle2Height / 2
        return v2isInAreaCS(ballPos, v2add(paddle2Pos, [0, n*gameSize[1]]), [paddleSize[0], paddle2Height*paddleScale], ballRadius)
    }
    if (
        ballSpeed[0] > 0 &&
        // ballX + ballRadius > paddle2X &&
        (collision2(-1) || collision2(0) || collision2(1))
    ) {
        if (goodHit2 == 0) {
            updateHUD();
        }
        ballCollision(paddle2Speed);

        // A good hit is when the ball hits the center of the paddle 
        if (
            (collision2(-1, 0.5) || collision2(0, 0.5) || collision2(1, 0.5))&&
            v2mag(ballSpeed) >= comboMinSpeed
        ) {
            goodHit2++;
            updateHUD();
            comboHUD('b');
            if (goodHit2 >= maxCombo) { // BOOM!
                ballSpeed = v2mul(ballSpeed, boomAccel);
                lastBoom = Date.now();
                setTimeout(() => {
                    goodHit2 = Math.max(goodHit2 - maxCombo, 0);
                    updateHUD();
                }, boomMessageTime);
            }

        } else {
            goodHit2 = 0;
            updateHUD();
        }
    }
    else if (ballSpeed[0] > 0 && ballPos[0] >= gameSize[0]) { // Goal
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
        (ballPos[1] - ballRadius < 0 && ballSpeed[1] < 0)
        || (ballPos[1] + ballRadius >= gameSize[1] - 10 && ballSpeed[1] > 0)
    ) {
        if (enableWalls)
            ballSpeed[1] *= -1;
        else
            ballPos[1] = (ballPos[1]+gameSize[1]) %gameSize[1];
    }
    //#endregion

    //#region Check Drops
    let hitDrops = []
    for (const drop of drops) {
        drop.pos = v2add(drop.pos, v2mul(drop.speed, Δt))

        // delete out of range drops
        if (v2isInAreaTLBR(drop.pos, [0,0], gameSize, drop.r)) {
            drop.delete = true;
        }

        const d = v2dist(drop.pos, ballPos);
        if (d < drop.r + ballRadius) { // Collision
            hitDrops.push(drop);
            if (drop.isCrazy) {
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
                        ballSpeed = v2mul(ballSpeed, 2);
                        lastHitDrop = "2x Ball speed!";
                        break;
                    case 1:
                        ballSpeed = v2mul(ballSpeed, -1);
                        lastHitDrop = "Invert ball speed!";
                        break;
                    case 2:
                        ballSpeed = v2mul(ballSpeed, 0.5);
                        lastHitDrop = "Half ball speed!"
                        break;
                    case 3:
                        ballSpeed[1] *= 2;
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
    ballSpeed[1] += gravity * Δt;
    ballPos = v2add(ballPos, v2mul(ballSpeed, Δt));
    if (enableWalls) {
        paddle1Pos[1] = constrain(paddle1Pos[1] + paddle1Speed * Δt, paddle1Height / 2, gameSize[1] - paddle1Height / 2);
        paddle2Pos[1] = constrain(paddle2Pos[1] + paddle2Speed * Δt, paddle2Height / 2, gameSize[1] - paddle2Height / 2);
    } else {
        paddle1Pos[1] = (paddle1Pos[1] + paddle1Speed * Δt).mod(gameSize[1])
        paddle2Pos[1] = (paddle2Pos[1] + paddle2Speed * Δt).mod(gameSize[1])
    }
    //#endregion
}
requestAnimationFrame(frame);

function ballCollision(paddleSpeed: number) {
    if (v2mag(ballSpeed) < 30) { // Maximum speed is 30
        ballSpeed = v2mul(ballSpeed, hitAccel);
    }

    ballSpeed[0] *= -1;

    if (paddleSpeed * ballSpeed[1] < 0) {
        ballSpeed[1] *= -1;
    }

    ballSpeed = v2rotate(ballSpeed, Math.random() * maxBallDeflect);
}

function updateHUD() {
    document.querySelector("#score-1")!.innerHTML = score1.toString();
    document.querySelector("#score-2")!.innerHTML = score2.toString();
    document.querySelector("#r")!.innerHTML = goodHit1 === maxCombo ? "BOOM!" : goodHit1 === 0 ? "" : `Combo x${goodHit1}`;
    document.querySelector("#b")!.innerHTML = goodHit2 === maxCombo ? "BOOM!" : goodHit2 === 0 ? "" : `Combo x${goodHit2}`;
    document.querySelector("#drop")!.innerHTML = lastHitDrop;
    document.querySelector("#drop")!.className = `${lastHitDropType} ${lastHitDropOpen?'open':''}`
}
function scoreHUD(player: 1|2) {
    const el = document.getElementById('score-' + player)!;
    el.classList.add('bump');
    setTimeout(() => {
        el.classList.remove('bump');
    }, 1000)
}
function comboHUD(player: 'b'|'r') {
    const el = document.getElementById(player)!;
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
    function drawBall(pos: V2) {
        ctx.beginPath();
        ctx.arc(...pos, ballRadius, 0, Math.PI * 2); // circle
        ctx.fill();
    }
    drawBall(ballPos);
    if (!enableWalls) {
        drawBall(v2add(ballPos, [0, gameSize[1]]));
        drawBall(v2add(ballPos, [0, -gameSize[1]]));
    }

    // Paddle 1
    ctx.fillStyle = boom1 ? `rgb(255,${Math.floor(boomPercent * 255)},${Math.floor(boomPercent * 255)})` : 'red';
    ctx.shadowColor = boom1 ? `rgba(255,0,0,${boomPercent})` : 'transparent';
    ctx.fillRect(...v2sub(paddle1Pos, [paddleSize[0], paddle1Height/2]), paddleSize[0], paddle1Height);
    if (!enableWalls) {
        ctx.fillRect(...v2sub(paddle1Pos, [paddleSize[0], paddle1Height/2 - gameSize[1]]), paddleSize[0], paddle1Height);
        ctx.fillRect(...v2sub(paddle1Pos, [paddleSize[0], paddle1Height/2 + gameSize[1]]), paddleSize[0], paddle1Height);
    }

    // Paddle 2
    ctx.fillStyle = boom2 ? `rgb(${Math.floor(boomPercent*255)},255,255)` : 'aqua';
    ctx.shadowColor = boom2 ? `rgba(0,255,255,${boomPercent})` : 'transparent';
    ctx.fillRect(...v2sub(paddle2Pos,  [0, paddle2Height / 2]), paddleSize[0], paddle2Height)
    if (!enableWalls) {
        ctx.fillRect(...v2sub(paddle2Pos,  [0, paddle2Height / 2 + gameSize[1]]), paddleSize[0], paddle2Height)
        ctx.fillRect(...v2sub(paddle2Pos,  [0, paddle2Height / 2 - gameSize[1]]), paddleSize[0], paddle2Height)
    }

    // Drops
    ctx.shadowColor = 'transparent'
    for (const drop of drops) {
        ctx.beginPath();
        ctx.arc(...drop.pos, drop.r, 0, Math.PI * 2); // circle
        ctx.fillStyle = drop.isCrazy ? "red" : "gold";
        ctx.fill();
    }
}

document.body.addEventListener('keydown', e => {
    const paddleMaxSpeed = constrain(v2mag(ballSpeed), 10, 40); // Get speed vector magnitude, and make sure its no slower than 40 idkunits
    if (e.key.toLowerCase() == "w") {
        paddle1Speed = -(paddleMaxSpeed + Math.abs(ballPos[1] - paddle1Pos[1]) * 10 / gameSize[1]);
        activityThisRound = true;
    }
    if (e.key.toLowerCase() == "s") {
        paddle1Speed = +(paddleMaxSpeed + Math.abs(ballPos[1] - paddle1Pos[1]) * 10 / gameSize[1]);
        activityThisRound = true;
    }
    if (e.key == 'ArrowUp') {
        paddle2Speed = -(paddleMaxSpeed + Math.abs(ballPos[1] - paddle2Pos[1]) * 10 / gameSize[1]);
        activityThisRound = true;
    }
    if (e.key == 'ArrowDown') {
        paddle2Speed = +(paddleMaxSpeed + Math.abs(ballPos[1] - paddle2Pos[1]) * 10 / gameSize[1]);
        activityThisRound = true;
    }
    if (e.key == '+' && debug) {
        ballSpeed = v2mul(ballSpeed, 2);
    }
    if (e.key == '-' && debug) {
        ballSpeed = v2div(ballSpeed, 2);
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
declare global {
    interface ScreenOrientation extends EventTarget {
        lock(orientation: OrientationType): Promise<void>;
    }
}
document.body.addEventListener('contextmenu', () => {
    document.body.requestFullscreen();
    screen.orientation.lock("landscape-primary");
    resetSize();
    setTimeout(() => {
        resetEverything();
    }, 5000);
})

document.body.addEventListener('touchmove', e => {
    for (const touch of e.changedTouches) {
        if (touch.clientX / gameSize[0] < 0.25) {
            paddle1Pos[1] = touch.clientY;
            activityThisRound = true;
        }
        if (touch.clientX / gameSize[0] > 0.75) {
            paddle2Pos[1] = touch.clientY;
            activityThisRound = true;
        }
    }
    draw();
})

window.addEventListener('resize', () => {
    resetSize();
})
