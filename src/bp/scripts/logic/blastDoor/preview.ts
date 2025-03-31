import {
	getFacilityNetwork,
	MAX_FACILITY_NETWORK_COUNT,
	MAX_FACILITY_ZONE_COUNT,
} from "@logic/facilityNetwork/network";
import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

type CreateBlastDoorArgs = {
	detectRedstone: boolean;
	facilityNetwork?: {
		networkIndex: number;
		zoneIndex: number;
	};
};

const BD_PREVIEW_TYPE_TO_BLAST_DOOR_TYPE: Record<string, string> = {
	"lc:scpdy_blast_door_1_preview": "lc:scpdy_blast_door_1",
	"lc:scpdy_blast_door_2_preview": "lc:scpdy_blast_door_2",
};

const BD_PREVIEW_TYPES = Array.from(Object.keys(BD_PREVIEW_TYPE_TO_BLAST_DOOR_TYPE,),);

function isBlastDoorPreviewEntity(entity: mc.Entity): boolean {
	return entity.typeId in BD_PREVIEW_TYPE_TO_BLAST_DOOR_TYPE;
}

function createBlastDoor(previewEntity: mc.Entity, args: CreateBlastDoorArgs): void {
	const typeId = BD_PREVIEW_TYPE_TO_BLAST_DOOR_TYPE[previewEntity.typeId];

	if (typeId === undefined) throw new Error("typeId is undefined",);

	const rotate = previewEntity.getProperty("lc:rotate_door",) === true;

	const blastDoorEntity = previewEntity.dimension.spawnEntity(typeId, previewEntity.location,);

	blastDoorEntity.setProperty("lc:detect_redstone", args.detectRedstone,);

	if (args.facilityNetwork) {
		blastDoorEntity.setProperty("lc:belongs_to_facility_network", true,);
		blastDoorEntity.setProperty("lc:facility_network_index", args.facilityNetwork.networkIndex,);
		blastDoorEntity.setProperty("lc:facility_zone_index", args.facilityNetwork.zoneIndex,);
	}

	if (rotate) {
		blastDoorEntity.setDynamicProperty("yRotLock", 90,);
		blastDoorEntity.setRotation({ x: 0, y: 90 },);
	}

	blastDoorEntity.dimension.spawnParticle("minecraft:egg_destroy_emitter", {
		x: blastDoorEntity.location.x,
		y: blastDoorEntity.location.y + 0.5,
		z: blastDoorEntity.location.z,
	},);

	blastDoorEntity.dimension.playSound("scpdy.misc.boom_1", blastDoorEntity.location,);

	previewEntity.remove();
}

async function showCreationForm(previewEntity: mc.Entity, player: mc.Player): Promise<void> {
	const formData1 = new ModalFormData();
	formData1.title({ translate: "scpdy.form.blastDoorCreation.title" },);
	formData1.toggle(
		{ translate: "scpdy.form.blastDoorCreation.redstoneDetectionToggle.label" },
		false,
	);

	const facilityNetworks = Array.from(
		{
			length: MAX_FACILITY_NETWORK_COUNT,
		},
		(_, index) => getFacilityNetwork(index,),
	);

	formData1.dropdown(
		{
			translate: "scpdy.form.blastDoorCreation.facilityNetworkDropdown.label",
		},
		[
			{ translate: "scpdy.form.misc.none" },
			...facilityNetworks.map(
				({ name, index }) =>
					name ?? {
						translate: "scpdy.form.blastDoorCreation.facilityNetworkDropdown.option",
						with: [(index + 1).toString()],
					},
			),
		],
		0,
	);

	formData1.submitButton({ translate: "scpdy.form.blastDoorCreation.submitButton" },);

	const response1 = await formData1.show(player,);

	if (response1.canceled) return;
	if (!response1.formValues) return;

	const creationArgs: CreateBlastDoorArgs = {
		detectRedstone: response1.formValues[0] === true,
	};

	const facilityNetworkSelection = response1.formValues[1] as number;
	const isFacilityNetworkSpecified = facilityNetworkSelection !== 0;

	if (isFacilityNetworkSpecified) {
		const facilityNetwork = facilityNetworks[facilityNetworkSelection - 1]!;

		const zones = Array.from(
			{
				length: MAX_FACILITY_ZONE_COUNT,
			},
			(_, index) => facilityNetwork.getZone(index,),
		);

		const formData2 = new ModalFormData();
		formData2.title({ translate: "scpdy.form.blastDoorCreation.setZone.title" },);
		formData2.dropdown(
			{
				translate: "scpdy.form.blastDoorCreation.setZone.facilityZoneDropdown.label",
			},
			zones.map(
				({ name, index }) =>
					name ?? {
						translate: "scpdy.form.blastDoorCreation.setZone.facilityZoneDropdown.option",
						with: [(index + 1).toString()],
					},
			),
			0,
		);

		formData2.submitButton({ translate: "scpdy.form.blastDoorCreation.setZone.submitButton" },);

		const response2 = await formData2.show(player,);

		if (response2.canceled) return;
		if (!response2.formValues) return;

		creationArgs.facilityNetwork = {
			networkIndex: facilityNetworkSelection - 1,
			zoneIndex: response2.formValues[0] as number,
		};
	}

	createBlastDoor(previewEntity, creationArgs,);
}

mc.world.afterEvents.playerInteractWithEntity.subscribe((event) => {
	if (!isBlastDoorPreviewEntity(event.target,)) return;

	const { player, target } = event;

	if (player.isSneaking) {
		player.addTag("scpdy_read_blast_door_create_tip",);

		showCreationForm(target, player,);

		return;
	}

	if (player.addTag("scpdy_read_blast_door_create_tip",)) {
		mc.system.runTimeout(() => {
			player.playSound("random.orb",);
			player.sendMessage({
				translate: "scpdy.msg.blastDoorPreview.sneakAndInteractToCreate",
			},);
		}, 12,);
	}

	const rotateDoor = target.getProperty("lc:rotate_door",) === true;

	player.playSound("random.click",);
	player.onScreenDisplay.setActionBar({
		translate: rotateDoor
			? "scpdy.action.interact.blastDoorPreview.changeRotation.false"
			: "scpdy.action.interact.blastDoorPreview.changeRotation.true",
	},);

	target.setProperty("lc:rotate_door", !rotateDoor,);
},);

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		if (!isBlastDoorPreviewEntity(event.entity,)) return;

		if (event.eventId === "blast_door_preview:fix_rotation") {
			try {
				const rotateDoor = event.entity.getProperty("lc:rotate_door",) === true;

				event.entity.setRotation({
					x: 0,
					y: rotateDoor ? 90 : 0,
				},);
			} catch {}
		}
	},
	{
		entityTypes: BD_PREVIEW_TYPES,
	},
);

mc.world.afterEvents.entitySpawn.subscribe((event) => {
	if (!isBlastDoorPreviewEntity(event.entity,)) return;

	event.entity.teleport({
		x: Math.floor(event.entity.location.x,) + 0.5,
		y: Math.round(event.entity.location.y,),
		z: Math.floor(event.entity.location.z,) + 0.5,
	},);
},);

mc.world.afterEvents.entityDie.subscribe(
	(event) => {
		if (!isBlastDoorPreviewEntity(event.deadEntity,)) return;

		try {
			const item = new mc.ItemStack(`${event.deadEntity.typeId}_placer`, 1,);
			event.deadEntity.dimension.spawnItem(item, event.deadEntity.location,);
		} finally {
			event.deadEntity.remove();
		}
	},
	{
		entityTypes: BD_PREVIEW_TYPES,
	},
);
