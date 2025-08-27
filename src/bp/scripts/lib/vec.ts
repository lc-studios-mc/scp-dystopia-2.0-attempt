import type { Vector2, Vector3 } from "@minecraft/server";
import { vec2, vec3 } from "gl-matrix";

/**
 * Converts a Minecraft Vector2 into a gl-matrix vec2.
 *
 * @param v - The source vector.
 * @returns A new gl-matrix vec2 array.
 */
export const toVec2 = (v: Vector2): vec2 => vec2.fromValues(v.x, v.y);

/**
 * Converts a gl-matrix vec2 back to a Minecraft Vector2 object.
 *
 * @param v - The gl-matrix vector.
 * @returns A new object.
 */
export const fromVec2 = (v: vec2): Vector2 => ({ x: v[0], y: v[1] });

/**
 * Converts a Minecraft Vector3 into a gl-matrix vec3.
 *
 * @param v - The source vector.
 * @returns A new gl-matrix vec3 array.
 */
export const toVec3 = (v: Vector3): vec3 => vec3.fromValues(v.x, v.y, v.z);

/**
 * Converts a gl-matrix vec3 back to a Minecraft Vector3 object.
 *
 * @param v - The gl-matrix vector.
 * @returns A new object.
 */
export const fromVec3 = (v: vec3): Vector3 => ({ x: v[0], y: v[1], z: v[2] });
