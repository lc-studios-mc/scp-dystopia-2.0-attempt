import * as mc from "@minecraft/server";
import { ensureType } from "@lib/utils/miscUtils";
import { FacilityZone, getFacilityNetwork } from "@server/facilityNetwork/network";
import * as vec3 from "@lib/utils/vec3";

type BlastDoorInfo = {
	size: mc.Vector2;
	lockdownO5AccessTime: number;
};

const BLAST_DOOR_INFO_MAP = new Map<string, BlastDoorInfo>([
	[
		"lc:scpdy_blast_door_1",
		{
			size: { x: 5, y: 3 },
			lockdownO5AccessTime: 6,
		},
	],
	[
		"lc:scpdy_blast_door_2",
		{
			size: { x: 5, y: 3 },
			lockdownO5AccessTime: 6,
		},
	],
]);

const BLAST_DOOR_TYPES = Array.from(BLAST_DOOR_INFO_MAP.keys());

function getBlastDoorInfo(blastDoor: mc.Entity): BlastDoorInfo {
	const info = BLAST_DOOR_INFO_MAP.get(blastDoor.typeId);
	if (!info) throw new Error(`Blast door info of ${blastDoor.typeId} is undefined`);
	return info;
}

type ControlBlastDoorMode = "open" | "close" | "switch";

function getFacilityZoneOfBlastDoor(blastDoor: mc.Entity): FacilityZone | undefined {
	const belongsToFacilityNetwork = blastDoor.getProperty("lc:belongs_to_facility_network") === true;

	if (!belongsToFacilityNetwork) return undefined;

	const facilityNetworkIndex = blastDoor.getProperty("lc:facility_network_index") as number;
	const facilityZoneIndex = blastDoor.getProperty("lc:facility_zone_index") as number;

	const facilityNetwork = getFacilityNetwork(facilityNetworkIndex);
	const facilityZone = facilityNetwork.getZone(facilityZoneIndex);

	return facilityZone;
}

function setIsOpen(blastDoor: mc.Entity, mode: ControlBlastDoorMode): void {
	switch (mode) {
		case "open":
			blastDoor.setProperty("lc:is_open", true);
			break;
		case "close":
			blastDoor.setProperty("lc:is_open", false);
			break;
		case "switch":
			const isOpen = blastDoor.getProperty("lc:is_open") === true;
			blastDoor.setProperty("lc:is_open", !isOpen);
			break;
	}
}

export function controlBlastDoor(
	blastDoor: mc.Entity,
	mode: ControlBlastDoorMode,
	isO5Access: boolean,
): boolean {
	const blastDoorInfo = getBlastDoorInfo(blastDoor);
	const isOpen = blastDoor.getProperty("lc:is_open") === true;

	if (isOpen && mode === "open") return false;
	if (!isOpen && mode === "close") return false;

	const facilityZone = getFacilityZoneOfBlastDoor(blastDoor);

	if (facilityZone && facilityZone.isLockdownActive) {
		if (!isO5Access) {
			return false;
		}

		blastDoor.setDynamicProperty("lockdownO5AccessTime", blastDoorInfo.lockdownO5AccessTime);

		return true;
	}

	const detectRedstone = blastDoor.getProperty("lc:detect_redstone") === true;

	if (detectRedstone) return false;

	setIsOpen(blastDoor, mode);

	return true;
}

export function switchClosestBlastDoor(block: mc.Block, isO5Access = false): boolean {
	const blastDoor = block.dimension.getEntities({
		closest: 1,
		maxDistance: 7,
		location: block.center(),
		families: ["scpdy_blast_door"],
	})[0];

	if (!blastDoor) return false;

	return controlBlastDoor(blastDoor, "switch", isO5Access);
}

export function removeBlastDoor(blastDoor: mc.Entity): void {
	const info = getBlastDoorInfo(blastDoor);
	const horSizeDivided = Math.floor((info.size.x - 1) / 2);

	blastDoor.setDynamicProperty("dontHandleRemoval", true);

	try {
		blastDoor.runCommand(
			`fill ^${horSizeDivided} ^${
				info.size.y
			} ^0  ^${-horSizeDivided} ^0 ^0 air replace lc:scpdy_blast_door_dummy`,
		);
		const item = new mc.ItemStack(`${blastDoor.typeId}_preview_placer`, 1);
		blastDoor.dimension.spawnItem(item, blastDoor.location);
	} finally {
		blastDoor.remove();
	}
}

export function removeBlastDoorAtBlock(block: mc.Block): void {
	const blastDoor = block.dimension.getEntities({
		closest: 1,
		maxDistance: 1,
		location: block.center(),
		families: ["scpdy_blast_door"],
	})[0];

	if (!blastDoor) return;

	removeBlastDoor(blastDoor);
}

function isBlastDoor(entity: mc.Entity): boolean {
	return BLAST_DOOR_INFO_MAP.has(entity.typeId);
}

function beforeRemoveBlastDoor(blastDoor: mc.Entity): void {
	const dimension = blastDoor.dimension;
	const location = blastDoor.location;
	const rotation = blastDoor.getRotation();
	const entityTypeId = blastDoor.typeId;
	const isOpen = blastDoor.getProperty("lc:is_open") === true;
	const detectRedstone = blastDoor.getProperty("lc:detect_redstone") === true;
	const belongsToFacilityNetwork = blastDoor.getProperty(
		"lc:belongs_to_facility_network",
	) as boolean;
	const facilityNetworkIndex = blastDoor.getProperty("lc:facility_network_index") as number;
	const facilityZoneIndex = blastDoor.getProperty("lc:facility_zone_index") as number;
	const oldBlastDoorDynamicProps = blastDoor.getDynamicPropertyIds().map((propId) => {
		return { propId, value: blastDoor.getDynamicProperty(propId) };
	});

	mc.system.run(() => {
		const newBlastDoor = dimension.spawnEntity(entityTypeId, location);

		newBlastDoor.setRotation(rotation);
		newBlastDoor.setProperty("lc:is_open", isOpen);
		newBlastDoor.setProperty("lc:detect_redstone", detectRedstone);
		newBlastDoor.setProperty("lc:belongs_to_facility_network", belongsToFacilityNetwork);
		newBlastDoor.setProperty("lc:facility_network_index", facilityNetworkIndex);
		newBlastDoor.setProperty("lc:facility_zone_index", facilityZoneIndex);

		for (const prop of oldBlastDoorDynamicProps) {
			newBlastDoor.setDynamicProperty(prop.propId, prop.value);
		}
	});
}

function updateRotationLock(blastDoor: mc.Entity): void {
	let yRotLock = ensureType(blastDoor.getDynamicProperty("yRotLock"), "number");

	if (yRotLock === undefined) {
		const newYRotLock = Math.abs(blastDoor.getRotation().y % 90) < 45 ? 0 : 90;

		blastDoor.setDynamicProperty("yRotLock", newYRotLock);

		yRotLock = newYRotLock;
	}

	blastDoor.setRotation({ x: 0, y: yRotLock });

	blastDoor.tryTeleport({
		x: Math.floor(blastDoor.location.x) + 0.5,
		y: Math.floor(blastDoor.location.y),
		z: Math.floor(blastDoor.location.z) + 0.5,
	});
}

function checkRedstone(blastDoor: mc.Entity): boolean {
	try {
		const rbCheckLoc1 = vec3.add(blastDoor.location, {
			x: 0,
			y: -2,
			z: 0,
		});

		const rbCheckBlock1 = blastDoor.dimension.getBlock(rbCheckLoc1);

		if (rbCheckBlock1?.getRedstonePower() ?? 0 > 0) return true;

		const rbCheckLoc2 = vec3.add(blastDoor.location, {
			x: 0,
			y: 4,
			z: 0,
		});

		const rbCheckBlock2 = blastDoor.dimension.getBlock(rbCheckLoc2);

		if (rbCheckBlock2?.getRedstonePower() ?? 0 > 0) return true;

		return false;
	} catch {
		return false;
	}
}

function updateState(blastDoor: mc.Entity): void {
	const isOpen = blastDoor.getProperty("lc:is_open") === true;
	const facilityZone = getFacilityZoneOfBlastDoor(blastDoor);

	if (facilityZone) {
		if (facilityZone.isLockdownActive) {
			const lockdownO5AccessTime =
				ensureType(blastDoor.getDynamicProperty("lockdownO5AccessTime"), "number") ?? 0;

			if (lockdownO5AccessTime > 0) {
				setIsOpen(blastDoor, "open");
				blastDoor.setDynamicProperty("lockdownO5AccessTime", lockdownO5AccessTime - 1);
				return;
			}

			if (isOpen) {
				setIsOpen(blastDoor, "close");
				blastDoor.setDynamicProperty("wasClosedByLockdown", true);
			}

			return;
		}

		const wasClosedByLockdown = blastDoor.getDynamicProperty("wasClosedByLockdown") === true;

		if (wasClosedByLockdown) {
			setIsOpen(blastDoor, "open");
			blastDoor.setDynamicProperty("wasClosedByLockdown", undefined);
			blastDoor.setDynamicProperty("lockdownO5AccessTime", undefined);
		}
	}

	const detectRedstone = blastDoor.getProperty("lc:detect_redstone") === true;

	if (detectRedstone) {
		const detected = checkRedstone(blastDoor);
		setIsOpen(blastDoor, detected ? "open" : "close");
	}
}

mc.world.afterEvents.entitySpawn.subscribe((event) => {
	if (!isBlastDoor(event.entity)) return;

	mc.system.run(() => {
		updateRotationLock(event.entity);
	});
});

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		if (!isBlastDoor(event.entity)) return;

		switch (event.eventId) {
			case "blast_door:open":
				controlBlastDoor(event.entity, "open", false);
				break;
			case "blast_door:close":
				controlBlastDoor(event.entity, "close", false);
				break;
			case "blast_door:switch":
				controlBlastDoor(event.entity, "switch", false);
				break;
		}
	},
	{
		entityTypes: BLAST_DOOR_TYPES,
	},
);

mc.system.afterEvents.scriptEventReceive.subscribe(
	(event) => {
		if (!event.sourceEntity) return;
		if (!isBlastDoor(event.sourceEntity)) return;

		switch (event.id) {
			case "scpdy:blast_door_update_rotation_lock":
				updateRotationLock(event.sourceEntity);
				break;
			case "scpdy:blast_door_update_state":
				updateState(event.sourceEntity);
				break;
		}
	},
	{
		namespaces: ["scpdy"],
	},
);

mc.world.beforeEvents.entityRemove.subscribe((event) => {
	if (!isBlastDoor(event.removedEntity)) return;
	if (event.removedEntity.getDynamicProperty("dontHandleRemoval") === true) return;

	beforeRemoveBlastDoor(event.removedEntity);
});
