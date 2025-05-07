import "@minecraft/server";

declare module "@minecraft/server" {
	interface BlockPermutation {
		// Allow any string as state name.
		getState(stateName: string): boolean | number | string | undefined;
		withState(name: string, value: boolean | number | string): BlockPermutation;
	}

	interface Dimension {
		// Allow any string as entity identifier.
		spawnEntity<T = never>(
			identifier: string,
			location: Vector3,
			options?: SpawnEntityOptions,
		): Entity;
	}
}
