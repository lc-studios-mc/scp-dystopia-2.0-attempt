/**
 * Checks if a given item is a record object (and not null or an array).
 * @param item - The item to check.
 * @returns True if the item is a non-null, non-array object, false otherwise.
 */
export function isRecord(item: unknown): item is Record<string, any> {
	return item != null && typeof item === "object" && !Array.isArray(item);
}

/**
 * Deeply merges two objects.
 * @param target - The target object to merge into.
 * @param source - The source object to merge from.
 * @returns A new object representing the merged result.
 *
 * @example
 * ```typescript
 * const obj1 = { a: 1, b: { c: 2, d: 3 }, e: 5 };
 * const obj2 = { b: { c: 4, f: 6 }, g: 7, e: { h: 8 } };
 * const merged = deepMerge(obj1, obj2);
 * console.log(merged);
 * // Output: { a: 1, b: { c: 4, d: 3, f: 6 }, e: { h: 8 }, g: 7 }
 * ```
 */
export function deepMerge<T extends Record<string, any>, U extends Record<string, any>>(
	target: T,
	source: U,
): T & U {
	// Create a new object to avoid modifying the original target object.
	// We use 'as any' here because the type will be built up dynamically.
	const output: any = { ...target };

	if (isRecord(target) && isRecord(source)) {
		Object.keys(source).forEach((key) => {
			if (isRecord(source[key])) {
				if (!(key in target)) {
					// If the key doesn't exist in the target, assign the source's object directly.
					output[key] = source[key];
				} else {
					// If the key exists in both and both are objects, recursively merge them.
					output[key] = deepMerge(target[key], source[key]);
				}
			} else {
				// If the source's value is not an object, assign it directly (overwriting target's value).
				output[key] = source[key];
			}
		});
	}

	return output as T & U;
}

/**
 * Recursively compares two objects for deep equality.
 * Handles primitive types, arrays, and nested objects.
 * @param obj1 - The first object to compare.
 * @param obj2 - The second object to compare.
 * @returns `true` if the objects are deeply equal, `false` otherwise.
 */
export function areObjectsEqual(obj1: any, obj2: any): boolean {
	if (obj1 === obj2) {
		return true;
	}

	if (typeof obj1 !== "object" || obj1 === null || typeof obj2 !== "object" || obj2 === null) {
		return false;
	}

	if (Array.isArray(obj1) && Array.isArray(obj2)) {
		if (obj1.length !== obj2.length) {
			return false;
		}
		for (let i = 0; i < obj1.length; i++) {
			if (!areObjectsEqual(obj1[i], obj2[i])) {
				return false;
			}
		}
		return true;
	}

	// If one is an array but the other is not, they are not equal
	if (Array.isArray(obj1) || Array.isArray(obj2)) {
		return false;
	}

	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);

	// Check if they have the same number of keys
	if (keys1.length !== keys2.length) {
		return false;
	}

	// Check if all keys and their values are equal recursively
	for (const key of keys1) {
		// Check if key exists in obj2 and if the values are deeply equal
		if (
			!Object.prototype.hasOwnProperty.call(obj2, key) || !areObjectsEqual(obj1[key], obj2[key])
		) {
			return false;
		}
	}

	return true;
}
