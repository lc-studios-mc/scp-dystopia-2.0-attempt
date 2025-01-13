export type DoorSoundInfo = {
	readonly openSound: { readonly id: string; readonly volume?: number; readonly pitch?: number };
	readonly closeSound: { readonly id: string; readonly volume?: number; readonly pitch?: number };
};

//          < Door Type ID, Door Sound Info >
const MAP = new Map<string, DoorSoundInfo>([
	[
		"lc:scpdy_boolean_door_1",
		{
			openSound: { id: "scpdy.door.classic_door_1.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.classic_door_1.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_boolean_door_2",
		{
			openSound: { id: "scpdy.door.futuristic_door.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.futuristic_door.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_boolean_door_3",
		{
			openSound: { id: "scpdy.door.futuristic_door.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.futuristic_door.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_command_door",
		{
			openSound: { id: "scpdy.door.classic_door_1.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.classic_door_1.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_lockdown_door_n1",
		{
			openSound: { id: "scpdy.door.lockdown_door.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.lockdown_door.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_lockdown_door_n2",
		{
			openSound: { id: "scpdy.door.lockdown_door.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.lockdown_door.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_lockdown_door_n3",
		{
			openSound: { id: "scpdy.door.lockdown_door.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.lockdown_door.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_lockdown_door_n4",
		{
			openSound: { id: "scpdy.door.lockdown_door.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.lockdown_door.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_lockdown_door_n5",
		{
			openSound: { id: "scpdy.door.lockdown_door.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.lockdown_door.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_mechanical_door_1",
		{
			openSound: { id: "scpdy.door.classic_door_1.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.classic_door_1.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_mechanical_door_2",
		{
			openSound: { id: "scpdy.door.classic_door_1.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.classic_door_1.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_mechanical_door_3",
		{
			openSound: { id: "scpdy.door.classic_door_3.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.classic_door_3.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_mechanical_door_4",
		{
			openSound: { id: "scpdy.door.classic_door_2.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.classic_door_2.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_mechanical_door_5",
		{
			openSound: { id: "scpdy.door.futuristic_door.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.futuristic_door.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_mechanical_door_6",
		{
			openSound: { id: "scpdy.door.classic_door_2.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.classic_door_2.close", volume: 1.1 },
		},
	],
	[
		"lc:scpdy_mechanical_door_7",
		{
			openSound: { id: "scpdy.door.futuristic_door.open", volume: 1.1 },
			closeSound: { id: "scpdy.door.futuristic_door.close", volume: 1.1 },
		},
	],
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
