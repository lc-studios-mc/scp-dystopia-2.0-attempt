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
export function unflattenToCoordinates(
	flatIndex: number,
	minorRange = 4,
): { major: number; minor: number } {
	return {
		major: Math.floor(flatIndex / minorRange),
		minor: flatIndex % minorRange,
	};
}
