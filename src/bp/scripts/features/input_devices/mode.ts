export type InputDeviceMode = "powerRelayDoors" | "ctrlBlastDoor" | "placeRbBelow" | "placeRbBehind";

export const getInputDeviceModeFromIndex = (index: number): InputDeviceMode => {
	switch (index) {
		case 0:
			return "powerRelayDoors";
		case 1:
			return "ctrlBlastDoor";
		case 2:
			return "placeRbBelow";
		case 3:
			return "placeRbBehind";
		default:
			throw new Error(`Unknown index: ${index}`);
	}
};

export const isInputDeviceMode = (value: unknown): value is InputDeviceMode => {
	switch (value) {
		case "powerRelayDoors":
		case "ctrlBlastDoor":
		case "placeRbBelow":
		case "placeRbBehind":
			return true;
		default:
			return false;
	}
};
