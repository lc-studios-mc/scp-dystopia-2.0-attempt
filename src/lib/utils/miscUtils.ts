import * as mc from "@minecraft/server";

/**
 * Convert {@link mc.Vector2} to {@link mc.Direction}
 */
export function rotationToDirection(
	rotation: mc.Vector2,
	ignoreX = false,
	ignoreY = false,
): mc.Direction {
	if (!ignoreX) {
		if (rotation.x > 50) {
			return mc.Direction.Down;
		}

		if (rotation.x < -50) {
			return mc.Direction.Up;
		}
	}

	if (!ignoreY) {
		const y: number = rotation.y;

		if (y >= -45 && y < 45) {
			return mc.Direction.North;
		}

		if (y >= 45 && y < 135) {
			return mc.Direction.East;
		}

		if ((y >= 135 && y <= 180) || (y >= -180 && y <= -135)) {
			return mc.Direction.South;
		}

		if (y >= -135 && y < -45) {
			return mc.Direction.West;
		}
	}

	return mc.Direction.North;
}

/**
 * @returns First container slot (matching condition)
 */
export function getContainerSlot(
	container: mc.Container,
	condition?: (slot: mc.ContainerSlot) => boolean,
): mc.ContainerSlot | undefined {
	for (let i = 0; i < container.size; i++) {
		const slot = container.getSlot(i);

		if (condition !== undefined && !condition(slot)) continue;

		return slot;
	}
}

/**
 * @returns All container slots (matching condition)
 */
export function getAllContainerSlots(
	container: mc.Container,
	condition?: (slot: mc.ContainerSlot) => boolean,
): mc.ContainerSlot[] {
	const array = [];

	for (let i = 0; i < container.size; i++) {
		const slot = container.getSlot(i);

		if (condition !== undefined && !condition(slot)) continue;

		array.push(slot);
	}

	return array;
}

type EnsureableType = boolean | number | string | mc.Vector3;
type EnsureableTypeAsString = "boolean" | "number" | "string" | "Vector3";
type EnsureTypeResult<T> = T extends "boolean"
	? boolean | undefined
	: T extends "number"
		? number | undefined
		: T extends "string"
			? string | undefined
			: T extends "Vector3"
				? mc.Vector3 | undefined
				: undefined;

/**
 * @returns Unchanged 'value' if its type is same as 'type', otherwise undefined.
 */
export function ensureType<T1 extends EnsureableType, T2 extends EnsureableTypeAsString>(
	value: T1 | undefined,
	type: T2,
): EnsureTypeResult<T2> {
	switch (type) {
		case "boolean":
			return (typeof value === "boolean" ? value : undefined) as EnsureTypeResult<T2>;
		case "number":
			return (typeof value === "number" ? value : undefined) as EnsureTypeResult<T2>;
		case "string":
			return (typeof value === "string" ? value : undefined) as EnsureTypeResult<T2>;
		case "Vector3": {
			if (typeof value !== "object") return undefined!;

			return (
				"x" in value && "y" in value && "z" in value ? value : undefined
			) as EnsureTypeResult<T2>;
		}
	}

	return undefined!;
}
