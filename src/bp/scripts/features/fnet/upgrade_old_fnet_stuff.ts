/*
This script will automatically migrate the old facility network data to new ones.
*/

import { system, world } from "@minecraft/server";
import { getFnet, MAX_FNET_COUNT, MAX_FZONE_COUNT } from "./fnet";

world.afterEvents.worldLoad.subscribe(() => {
	for (let i = 0; i < MAX_FNET_COUNT; i++) {
		const newNet = getFnet(i);

		const oldNetName = world.getDynamicProperty(`scpdy_facilityNetwork_${i}_name`);

		if (typeof oldNetName === "string") newNet.setCustomName(oldNetName);

		system.run(() => {
			world.setDynamicProperty(`scpdy_facilityNetwork_${i}_name`, undefined);
		});

		for (let j = 0; j < MAX_FZONE_COUNT; j++) {
			const newZone = newNet.getZone(j);

			const oldZoneName = world.getDynamicProperty(`scpdy_facilityZone_${i}_${j}_name`);
			const oldZoneLkdnActive = world.getDynamicProperty(`scpdy_facilityZone_${i}_${j}_lockdown`);
			const oldZoneLkdnDelay = world.getDynamicProperty(
				`scpdy_facilityZone_${i}_${j}_lockdownDelay`,
			);
			const oldZoneLkdnDuration = world.getDynamicProperty(
				`scpdy_facilityZone_${i}_${j}_lockdownDuration`,
			);

			if (typeof oldZoneName === "string") newZone.setCustomName(oldZoneName);
			if (oldZoneLkdnActive === true) newZone.setLkdnActive(true);
			if (typeof oldZoneLkdnDelay === "number") newZone.setScheduledLkdnDelay(oldZoneLkdnDelay);
			if (typeof oldZoneLkdnDuration === "number") newZone.setLkdnDuration(oldZoneLkdnDuration);

			system.run(() => {
				world.setDynamicProperty(`scpdy_facilityZone_${i}_${j}_name`, undefined);
				world.setDynamicProperty(`scpdy_facilityZone_${i}_${j}_lockdown`, undefined);
				world.setDynamicProperty(`scpdy_facilityZone_${i}_${j}_lockdownDelay`, undefined);
				world.setDynamicProperty(`scpdy_facilityZone_${i}_${j}_lockdownDuration`, undefined);
			});
		}
	}
});
