# Pong

This is an advanced pong game.

Mechanics:

- W/S to control left paddle, up/down arrow keys for right paddle
- If on a mobile device, long press the screen and drag the paddles for touch input
- Ball deflects a bit after each hit with the paddle. 
- Hitting the middle of the paddle when the ball is fast enough results in a "combo". Three combo in a row will result in a "boom", in which the ball will double its speed.
- Every once in a while a yellow "drop" will appear. (more likely if ball is high speed, especially in a "boom") If the ball hits it, a random event will happen
- There are rarer red "drops", which cause more interesting events such as gravity or the removal of walls. 

# Building 

The game is built into a single html file, which is present in the git repository. To build the game yourself:

1. You need [Bun](https://bun.sh). Install it if you haven't already.
2. Install all dependencies:
   ```
   bun install
   ```
3. Run the build script:
   ```
   bun run build
   ```
