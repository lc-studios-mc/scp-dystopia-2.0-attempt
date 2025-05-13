/**
 * Clamps a number to ensure it falls within the specified range.
 * @param value - The number to clamp.
 * @param min - The minimum allowable value.
 * @param max - The maximum allowable value.
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Generates a random integer between the specified minimum and maximum values (inclusive).
 * @param min - The minimum value (inclusive).
 * @param max - The maximum value (inclusive).
 * @returns A random integer between min and max.
 */
export function randi(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random floating-point number between the specified minimum and maximum values.
 * @param min - The minimum value (inclusive).
 * @param max - The maximum value (exclusive).
 * @returns A random floating-point number between min and max.
 */
export function randf(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

/**
 * Converts two-dimensional coordinates (major and minor components) into a single flat index.
 *
 * @param major - The primary/major component of the coordinate
 * @param minor - The secondary/minor component of the coordinate (must be less than minorRange)
 * @param minorRange - The maximum value for the minor component plus one (defaults to 4)
 * @returns The flattened single-dimensional index
 *
 * @example
 * // Returns 6 (where minorRange=4, so this represents major=1, minor=2)
 * flattenCoordinates(1, 2);
 */
export function flattenCoordinates(major: number, minor: number, minorRange = 4): number {
	return minor + major * minorRange;
}

/**
 * Converts a flat index back into two-dimensional coordinates (major and minor components).
 * This is the inverse operation of flattenCoordinates.
 *
 * @param flatIndex - The single-dimensional index to convert
 * @param minorRange - The maximum value for the minor component plus one (defaults to 4)
 * @returns An object containing the major and minor components of the coordinate
 *
 * @example
 * // Returns { major: 1, minor: 2 }
 * unflattenToCoordinates(6);
 */
export function unflattenToCoordinates(flatIndex: number, minorRange = 4): { major: number; minor: number } {
	return {
		major: Math.floor(flatIndex / minorRange),
		minor: flatIndex % minorRange,
	};
}
