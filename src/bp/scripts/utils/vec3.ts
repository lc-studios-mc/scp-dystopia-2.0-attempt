import { Direction, type Vector3 } from "@minecraft/server";
import { randf } from "./math";

export const ONE = Object.freeze({
	x: 1,
	y: 1,
	z: 1,
});

export const HALF = Object.freeze({
	x: 0.5,
	y: 0.5,
	z: 0.5,
});

export const ZERO = Object.freeze({
	x: 0,
	y: 0,
	z: 0,
});

export const UP = Object.freeze({
	x: 0,
	y: 1,
	z: 0,
});

export const DOWN = Object.freeze({
	x: 0,
	y: -1,
	z: 0,
});

export const LEFT = Object.freeze({
	x: -1,
	y: 0,
	z: 0,
});

export const RIGHT = Object.freeze({
	x: 1,
	y: 0,
	z: 0,
});

export const FORWARD = Object.freeze({
	x: 0,
	y: 0,
	z: 1,
});

export const BACKWARD = Object.freeze({
	x: 0,
	y: 0,
	z: -1,
});

/**
 * Checks if an object is a valid Vector3.
 * @param value - The value to check.
 * @returns Whether `value` is a Vector3 object.
 */
export function isVector3(value: unknown): value is Vector3 {
	if (value == null) return false;
	if (typeof value !== "object") return false;
	if (Array.isArray(value)) return false;

	const hasXYZ =
		"x" in value &&
		typeof value.x === "number" &&
		"y" in value &&
		typeof value.y === "number" &&
		"z" in value &&
		typeof value.z === "number";

	return hasXYZ;
}

/**
 * Creates a Vector3 from a partial object, filling missing components with 0.
 * @param value - Partial vector with optional x, y, z properties.
 * @returns A complete Vector3 object.
 */
export function fromPartial(value: Partial<Vector3>): Vector3 {
	return {
		x: value?.x ?? 0,
		y: value?.y ?? 0,
		z: value?.z ?? 0,
	};
}

/**
 * Adds vecB to vecA.
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The resulting vector.
 */
export function add(vecA: Vector3, vecB: Vector3): Vector3 {
	return {
		x: vecA.x + vecB.x,
		y: vecA.y + vecB.y,
		z: vecA.z + vecB.z,
	};
}

/**
 * Subtracts vecB from vecA.
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The resulting vector.
 */
export function sub(vecA: Vector3, vecB: Vector3): Vector3 {
	return {
		x: vecA.x - vecB.x,
		y: vecA.y - vecB.y,
		z: vecA.z - vecB.z,
	};
}

/**
 * Scales a vector by a scalar or another vector.
 * @param vec - The vector to scale.
 * @param scalar - The scalar or vector to scale by.
 * @returns The scaled vector.
 */
export function scale(vec: Vector3, scalar: Vector3 | number): Vector3 {
	if (typeof scalar === "number") {
		return {
			x: vec.x * scalar,
			y: vec.y * scalar,
			z: vec.z * scalar,
		};
	}
	if (isVector3(scalar)) {
		return {
			x: vec.x * scalar.x,
			y: vec.y * scalar.y,
			z: vec.z * scalar.z,
		};
	}
	return vec;
}

/**
 * Divides a vector by a scalar or another vector.
 * @param vec - The vector to divide.
 * @param divisor - The scalar or vector to divide by.
 * @returns The divided vector.
 */
export function divide(vec: Vector3, divisor: Vector3 | number): Vector3 {
	if (typeof divisor === "number") {
		return {
			x: vec.x / divisor,
			y: vec.y / divisor,
			z: vec.z / divisor,
		};
	}
	if (isVector3(divisor)) {
		return {
			x: vec.x / divisor.x,
			y: vec.y / divisor.y,
			z: vec.z / divisor.z,
		};
	}
	return vec;
}

/**
 * Calculates the Euclidean distance between two vectors.
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The distance.
 */
export function distance(vecA: Vector3, vecB: Vector3): number {
	return Math.sqrt((vecA.x - vecB.x) ** 2 + (vecA.y - vecB.y) ** 2 + (vecA.z - vecB.z) ** 2);
}

/**
 * Calculates the squared distance between two vectors.
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The squared distance.
 */
export function sqrDistance(vecA: Vector3, vecB: Vector3): number {
	return (vecA.x - vecB.x) ** 2 + (vecA.y - vecB.y) ** 2 + (vecA.z - vecB.z) ** 2;
}

/**
 * Normalizes a vector to length 1.
 * @param vec - The vector to normalize.
 * @returns The normalized vector.
 */
export function normalize(vec: Vector3): Vector3 {
	const length = Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
	if (length === 0) return { x: 0, y: 0, z: 0 };
	return {
		x: vec.x / length,
		y: vec.y / length,
		z: vec.z / length,
	};
}

/**
 * Linearly interpolates between two vectors.
 * @param vecA - The start vector.
 * @param vecB - The end vector.
 * @param t - The interpolation factor (0-1).
 * @returns The interpolated vector.
 */
export function lerp(vecA: Vector3, vecB: Vector3, t: number): Vector3 {
	return {
		x: vecA.x + (vecB.x - vecA.x) * t,
		y: vecA.y + (vecB.y - vecA.y) * t,
		z: vecA.z + (vecB.z - vecA.z) * t,
	};
}

/**
 * Calculates the dot product of two vectors.
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The dot product.
 */
export function dot(vecA: Vector3, vecB: Vector3): number {
	return vecA.x * vecB.x + vecA.y * vecB.y + vecA.z * vecB.z;
}

/**
 * Reflects a vector off a surface with the given normal.
 * @param vec - The vector to reflect.
 * @param normal - The normal vector.
 * @returns The reflected vector.
 */
export function reflect(vec: Vector3, normal: Vector3): Vector3 {
	return sub(vec, scale(scale(normal, 2), dot(vec, normal)));
}

/**
 * Calculates the cross product of two vectors.
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The cross product vector.
 */
export function cross(vecA: Vector3, vecB: Vector3): Vector3 {
	return {
		x: vecA.y * vecB.z - vecA.z * vecB.y,
		y: vecA.z * vecB.x - vecA.x * vecB.z,
		z: vecA.x * vecB.y - vecA.y * vecB.x,
	};
}

/**
 * Calculates the length (magnitude) of a vector.
 * @param vec - The vector.
 * @returns The length.
 */
export function length(vec: Vector3): number {
	return Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
}

/**
 * Calculates the squared length of a vector.
 * @param vec - The vector.
 * @returns The squared length.
 */
export function sqrLength(vec: Vector3): number {
	return vec.x ** 2 + vec.y ** 2 + vec.z ** 2;
}

/**
 * Calculates the angle between two vectors in radians.
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The angle in radians.
 */
export function angle(vecA: Vector3, vecB: Vector3): number {
	return Math.acos(dot(normalize(vecA), normalize(vecB)));
}

/**
 * Calculates the midpoint between two vectors.
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The midpoint vector.
 */
export function midpoint(vecA: Vector3, vecB: Vector3): Vector3 {
	return {
		x: (vecA.x + vecB.x) / 2,
		y: (vecA.y + vecB.y) / 2,
		z: (vecA.z + vecB.z) / 2,
	};
}

/**
 * Clamps each component of a vector between min and max values.
 * @param vec - The vector to clamp.
 * @param min - The minimum value or vector.
 * @param max - The maximum value or vector.
 * @returns The clamped vector.
 */
export function clamp(vec: Vector3, min: Vector3 | number, max: Vector3 | number): Vector3 {
	return {
		x: Math.max(typeof min === "number" ? min : min.x, Math.min(typeof max === "number" ? max : max.x, vec.x)),
		y: Math.max(typeof min === "number" ? min : min.y, Math.min(typeof max === "number" ? max : max.y, vec.y)),
		z: Math.max(typeof min === "number" ? min : min.z, Math.min(typeof max === "number" ? max : max.z, vec.z)),
	};
}

/**
 * Applies Math.floor to each component of a vector.
 * @param vec - The vector.
 * @returns The floored vector.
 */
export function floor(vec: Vector3): Vector3 {
	return { x: Math.floor(vec.x), y: Math.floor(vec.y), z: Math.floor(vec.z) };
}

/**
 * Applies Math.round to each component of a vector.
 * @param vec - The vector.
 * @returns The rounded vector.
 */
export function round(vec: Vector3): Vector3 {
	return { x: Math.round(vec.x), y: Math.round(vec.y), z: Math.round(vec.z) };
}

/**
 * Applies Math.ceil to each component of a vector.
 * @param vec - The vector.
 * @returns The ceiled vector.
 */
export function ceil(vec: Vector3): Vector3 {
	return { x: Math.ceil(vec.x), y: Math.ceil(vec.y), z: Math.ceil(vec.z) };
}

/**
 * Generates a random vector with each component in [min, max].
 * @param min - The minimum value (default 0).
 * @param max - The maximum value (default 1).
 * @returns The random vector.
 */
export function random(min = 0, max = 1): Vector3 {
	return { x: randf(min, max), y: randf(min, max), z: randf(min, max) };
}

/**
 * Generates a random unit vector direction.
 * @returns The random direction vector.
 */
export function randomDirection(): Vector3 {
	const theta = Math.random() * 2 * Math.PI;
	const phi = Math.acos(2 * Math.random() - 1);
	return {
		x: Math.sin(phi) * Math.cos(theta),
		y: Math.sin(phi) * Math.sin(theta),
		z: Math.cos(phi),
	};
}

/**
 * Generates a random location inside a sphere of given radius.
 * @param sphereRadius - The radius of the sphere.
 * @returns The random location vector.
 */
export function randomLocationInSphere(sphereRadius: number): Vector3 {
	const direction = randomDirection();
	const randomRadius = Math.cbrt(Math.random()) * sphereRadius;
	return scale(direction, randomRadius);
}

/**
 * Generates vectors evenly distributed on a circle.
 * @param radius - The circle radius.
 * @param density - The density factor.
 * @returns Array of vectors on the circle.
 */
export function generateOnCircle(radius: number, density: number): Vector3[] {
	const vectors = new Array(Math.ceil(Math.sqrt(2 * Math.PI * radius)));

	for (let i = 0, len = vectors.length; i < len; i++) {
		const angle = (i / len) * 2 * Math.PI;
		const x = radius * Math.cos(angle) * Math.sqrt(density);
		const y = radius * Math.sin(angle) * Math.sqrt(density);
		vectors[i] = { x, y, z: 0 };
	}

	return vectors;
}

/**
 * Rotates a vector around an axis by a given angle in radians.
 * @param vec - The vector to rotate.
 * @param axis - The axis to rotate around.
 * @param radians - The angle in radians.
 * @returns The rotated vector.
 */
export function rotateRad(vec: Vector3, axis: Vector3, radians: number): Vector3 {
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	const dot = axis.x * vec.x + axis.y * vec.y + axis.z * vec.z;
	const crossX = axis.y * vec.z - axis.z * vec.y;
	const crossY = axis.z * vec.x - axis.x * vec.z;
	const crossZ = axis.x * vec.y - axis.y * vec.x;

	const x = vec.x * cos + crossX * sin + axis.x * dot * (1 - cos);
	const y = vec.y * cos + crossY * sin + axis.y * dot * (1 - cos);
	const z = vec.z * cos + crossZ * sin + axis.z * dot * (1 - cos);

	return { x, y, z };
}

/**
 * Rotates a vector around an axis by a given angle in degrees.
 * @param vec - The vector to rotate.
 * @param axis - The axis to rotate around.
 * @param degrees - The angle in degrees.
 * @returns The rotated vector.
 */
export function rotateDeg(vec: Vector3, axis: Vector3, degrees: number): Vector3 {
	return rotateRad(vec, axis, (Math.PI / 180) * degrees);
}

/**
 * Changes the direction of a vector to match another vector's direction, preserving magnitude.
 * @param vec - The original vector.
 * @param dir - The direction vector.
 * @returns The vector with changed direction.
 */
export function changeDir(vec: Vector3, dir: Vector3): Vector3 {
	const magnitude = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);

	if (magnitude === 0) {
		return { x: 0, y: 0, z: 0 };
	}

	const dirMagnitude = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);

	if (dirMagnitude === 0) {
		return { x: vec.x, y: vec.y, z: vec.z };
	}

	return {
		x: (dir.x / dirMagnitude) * magnitude,
		y: (dir.y / dirMagnitude) * magnitude,
		z: (dir.z / dirMagnitude) * magnitude,
	};
}

/**
 * Gets a location relative to an origin, rotated by a cardinal direction.
 * @param origin - The origin vector.
 * @param relative - The relative offset vector.
 * @param cardinalDirection - The cardinal direction (default North).
 * @returns The relative location vector.
 */
export function getRelativeLocation(origin: Vector3, relative: Vector3, cardinalDirection = Direction.North) {
	switch (cardinalDirection) {
		default:
		case Direction.North:
			return add(origin, relative);
		case Direction.South:
			return add(origin, rotateDeg(relative, UP, 180));
		case Direction.West:
			return add(origin, rotateDeg(relative, UP, 90));
		case Direction.East:
			return add(origin, rotateDeg(relative, UP, -90));
	}
}

/**
 * Gets a location relative to the head, based on view direction and movement.
 * @param headLocation - The head location vector.
 * @param viewDirection - The view direction vector.
 * @param move - The movement vector (partial).
 * @returns The new relative position vector.
 */
export function getRelativeToHead(headLocation: Vector3, viewDirection: Vector3, move: Partial<Vector3>): Vector3 {
	const forward = viewDirection;
	const up = { x: 0, y: 1, z: 0 };
	const right = normalize(cross(forward, up));

	// Set the amount of movement in each direction
	const rightMove = move?.x ?? 0;
	const upMove = move?.y ?? 0;
	const forwardMove = move?.z ?? 0;

	// Calculate the scaled vectors
	const rightVec = scale(right, rightMove);
	const upVec = scale(up, upMove);
	const forwardVec = scale(forward, forwardMove);

	// Combine all the vectors
	const moveVec = add(add(rightVec, upVec), forwardVec);

	// Add the movement vector to the player's position
	const newPosition = add(headLocation, moveVec);

	return newPosition;
}

/**
 * Converts a Vector3 object into a string.
 * @param vec - The Vector3 object.
 * @returns "`(x, y, z)`"
 */
export function toString<T extends Vector3>(vec: T): `(${T["x"]}, ${T["y"]}, ${T["z"]})` {
	return `(${vec.x}, ${vec.y}, ${vec.z})`;
}

/**
 * Converts a Vector3 object into a string.
 * @param vec - The Vector3 object.
 * @returns "`x y z`"
 */
export function toString2<T extends Vector3>(vec: T): `${T["x"]} ${T["y"]} ${T["z"]}` {
	return `${vec.x} ${vec.y} ${vec.z}`;
}

/**
 * Converts a Vector3 object into a string.
 * @param vec - The Vector3 object.
 * @returns "`x=x,y=y,z=z`"
 */
export function toString3<T extends Vector3>(vec: T): `x=${T["x"]},y=${T["y"]},z=${T["z"]}` {
	return `x=${vec.x},y=${vec.y},z=${vec.z}`;
}
