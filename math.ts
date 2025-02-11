/**
 * Type representing a 2D vector as a tuple of two numbers.
 */
export type V2 = [number, number];

/**
 * Adds two vectors component-wise.
 */
export function v2add([x1, y1]: V2, [x2, y2]: V2): V2 {
    return [x1 + x2, y1 + y2];
}

/**
 * Subtracts one vector from another component-wise.
 */
export function v2sub([x1, y1]: V2, [x2, y2]: V2): V2 {
    return [x1 - x2, y1 - y2];
}

/**
 * Multiplies a vector by another vector component-wise or by a scalar.
 */
export function v2mul([x1, y1]: V2, b: V2 | number): V2 {
    if (Array.isArray(b)) {
        const [x2, y2] = b;
        return [x1 * x2, y1 * y2];
    }
    else return [x1 * b, y1 * b];
}

/**
 * Divides a vector by another vector component-wise or by a scalar.
 */
export function v2div([x1, y1]: V2, b: V2 | number): V2 {
    if (Array.isArray(b)) {
        const [x2, y2] = b;
        return [x1 / x2, y1 / y2];
    }
    else return [x1 / b, y1 / b];
}

/**
 * Computes the magnitude (length) of a vector.
 */
export function v2mag(a: V2): number {
    return Math.hypot(...a);
}

/**
 * Normalizes a vector (scales it to have a length of 1).
 */
export function v2normalize(a: V2): V2 {
    return v2div(a, v2mag(a));
}

/**
 * Rotates a vector counterclockwise by a given angle (in radians).
 */
export function v2rotate([x, y]: V2, angle: number): V2 {
    return [
        x * Math.cos(angle) - y * Math.sin(angle),
        x * Math.sin(angle) + y * Math.cos(angle)
    ];
}

/**
 * Computes the dot product of two vectors.
 */
export function v2dot([x1, y1]: V2, [x2, y2]: V2): number {
    return x1 * x2 + y1 * y2;
}

/**
 * Computes the distance between two points (vectors).
 */
export function v2dist(a: V2, b: V2): number {
    return v2mag(v2sub(a, b));
}

/**
 * Linearly interpolates between two vectors by factor t (0 to 1).
 */
export function v2lerp(a: V2, b: V2, t: number): V2 {
    return v2add(v2mul(a, 1 - t), v2mul(b, t));
}

/**
 * Computes the angle (in radians) between two vectors.
 */
export function v2angle(a: V2, b: V2): number {
    return Math.acos(v2dot(a, b) / (v2mag(a) * v2mag(b)));
}

/**
 * Projects vector `a` onto vector `b`.
 */
export function v2project(a: V2, b: V2): V2 {
    return v2mul(b, v2dot(a, b) / v2dot(b, b));
}

/**
 * Computes the cross product of two 2D vectors (scalar result).
 */
export function v2cross([x1, y1]: V2, [x2, y2]: V2): number {
    return x1 * y2 - x2 * y1;
}

/**
 * Computes the slope (y/x) of a vector.
 */
export function v2slope([x, y]: V2): number {
    return y / x;
}

/**
 * Checks if two vectors are parallel (same slope).
 */
export function v2isParallel(a: V2, b: V2) {
    return v2slope(a) == v2slope(b);
}

/**
 * Reflects vector `d` across a given normal.
 */
export function v2reflect(d: V2, normal: V2) {
    return v2sub(d, v2mul(normal, v2dot(d, normal) * 2));
}

/**
 * Generates a random vector within the given min/max bounds.
 */
export function v2random(min: V2, max: V2): V2 {
    return [
        random(min[0], max[0]),
        random(min[1], max[1]),
    ];
}

/**
 * Checks if a target point is inside a rectangular area defined by top-left and bottom-right corners.
 * The padding expands the area outwards.
 */
export function v2isInAreaTLBR(target: V2, topLeft: V2, bottomRight: V2, padding = 0) {
    return (
        target[0] >= topLeft[0] - padding &&
        target[0] <= bottomRight[0] + padding &&
        target[1] >= topLeft[1] - padding &&
        target[1] <= bottomRight[1] + padding
    );
}

/**
 * Checks if a target point is inside a rectangular area defined by center and size.
 * The padding expands the area outwards.
 */
export function v2isInAreaCS(target: V2, center: V2, size: V2, padding = 0) {
    const halfSize = v2div(size, 2);
    return (
        target[0] >= center[0] - halfSize[0] - padding &&
        target[0] <= center[0] + halfSize[0] + padding &&
        target[1] >= center[1] - halfSize[1] - padding &&
        target[1] <= center[1] + halfSize[1] + padding
    );
}

/**
 * Generates a random integer within the given min/max range.
 */
export function random(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Constrains a number within a given range.
 */
export function constrain(input: number, min: number, max: number) {
    return input < min ? min : input > max ? max : input;
}

//@ts-ignore
Number.prototype.mod = function(n) {
    //@ts-ignore
    return ((this%n)+n)%n;
}
declare global {
    interface Number {
        mod(a: number): number;
    }
}