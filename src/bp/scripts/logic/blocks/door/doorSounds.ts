export type DoorSoundInfo = {
	readonly openSound: { readonly id: string; readonly volume?: number; readonly pitch?: number };
	readonly closeSound: { readonly id: string; readonly volume?: number; readonly pitch?: number };
};

//          < Door Type ID, Door Sound Info >
const MAP = new Map<string, DoorSoundInfo>([
	[
		"lc:scpdy_standard_door_1",
		{
			openSound: { id: "scpdy.door.standard_door.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.standard_door.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_standard_door_2",
		{
			openSound: { id: "scpdy.door.standard_door.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.standard_door.close_metal", volume: 1.1 },
		},
	],
]);

/**
 * Returns sound-related info of the door type.
 */
export function getDoorSoundInfo(doorBlockTypeId: string): DoorSoundInfo | undefined {
	return MAP.get(doorBlockTypeId);
}
