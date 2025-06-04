import { MachineryInputEvents } from "../machinery/input/events";
import { controlBlastDoor, getNearestBlastDoor } from "./blast_door";

MachineryInputEvents.on("onActivate", (data) => {
	if (data.mode !== "ctrlBlastDoor") return;

	const nearbyBlastDoor = getNearestBlastDoor(data.dimension, data.location, 12);

	if (!nearbyBlastDoor) return;

	controlBlastDoor(nearbyBlastDoor, "switch", data.clearanceLevel === 6);
});
