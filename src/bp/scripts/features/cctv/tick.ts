import * as playerLoop from "@logic/playerLoop";
import * as mc from "@minecraft/server";
import {
	getHeadRotation as getCctvCameraHeadRot,
	setHeadRotation as setCctvCameraHeadRot,
} from "./cctv_camera";

type PlayerCctvOptions = {
	player: mc.Player;
	cctvServer: mc.Entity;
	cctvCamera: mc.Entity;
	stopCondition?: (usageData: PlayerCctvUsageData) => boolean;
	onStop?: (usageData: PlayerCctvUsageData) => void;
};

type PlayerCctvUsageData = {
	options: PlayerCctvOptions;
	initialPlayerRotation: mc.Vector2;
	elapsedTicks: number;
};

const cctvUsageMap = new Map<mc.Player, PlayerCctvUsageData>();

export function setCctvUsage(options: PlayerCctvOptions): void {
	const oldUsageData = cctvUsageMap.get(options.player);

	if (oldUsageData) {
		removeCctvUsageInternal(options.player, oldUsageData);
	}

	const newUsageData: PlayerCctvUsageData = {
		options,
		initialPlayerRotation: options.player.getRotation(),
		elapsedTicks: 0,
	};

	cctvUsageMap.set(options.player, newUsageData);
}

function removeCctvUsageInternal(player: mc.Player, usageData: PlayerCctvUsageData): void {
	cctvUsageMap.delete(player);

	usageData.options.cctvCamera.setProperty("lc:is_active", false);

	player.camera.clear();

	player.teleport(player.location, {
		rotation: usageData.initialPlayerRotation,
	});

	usageData.options.onStop ? usageData.options.onStop(usageData) : 0;
}

export function removeCctvUsage(player: mc.Player): boolean {
	const usageData = cctvUsageMap.get(player);

	if (!usageData) return false;

	removeCctvUsageInternal(player, usageData);

	return true;
}

function onTickPlayer(player: mc.Player): void {
	const usageData = cctvUsageMap.get(player);

	if (!usageData) return;

	const stop = usageData.options.stopCondition ? usageData.options.stopCondition(usageData) : false;

	if (stop) {
		removeCctvUsageInternal(player, usageData);
		return;
	}

	// Camera control

	const { cctvCamera } = usageData.options;

	const cctvCameraRot = cctvCamera.getRotation();
	const cctvCameraHeadRot = getCctvCameraHeadRot(cctvCamera);

	if (usageData.elapsedTicks === 0) {
		cctvCamera.setProperty("lc:is_active", true);

		const newRotation: mc.Vector2 = {
			x: cctvCameraHeadRot.x,
			y: cctvCameraRot.y < 0
				? cctvCameraRot.y + cctvCameraHeadRot.y
				: cctvCameraRot.y > 0
				? cctvCameraRot.y - cctvCameraHeadRot.y
				: 0,
		};

		player.teleport(player.location, { rotation: newRotation });

		player.camera.setCamera("minecraft:free", {
			rotation: player.getRotation(),
			easeOptions: {
				easeTime: 0.0,
				easeType: mc.EasingType.Linear,
			},
			location: {
				x: cctvCamera.location.x,
				y: cctvCamera.location.y + 0.2,
				z: cctvCamera.location.z,
			},
		});
	} else {
		const playerRot = player.getRotation();

		setCctvCameraHeadRot(cctvCamera, {
			x: playerRot.x,
			y: ((playerRot.y - cctvCameraRot.y + 180) % 360) - 180,
		});

		player.camera.setCamera("minecraft:free", {
			rotation: playerRot,
			easeOptions: {
				easeTime: 0.14,
				easeType: mc.EasingType.InOutSine,
			},
			location: {
				x: cctvCamera.location.x,
				y: cctvCamera.location.y + 0.2,
				z: cctvCamera.location.z,
			},
		});
	}

	usageData.elapsedTicks++;
}

playerLoop.subscribe(onTickPlayer);

mc.world.afterEvents.entityDie.subscribe(
	(event) => {
		removeCctvUsage(event.deadEntity as mc.Player);
	},
	{
		entityTypes: ["minecraft:player"],
	},
);

mc.world.afterEvents.playerDimensionChange.subscribe((event) => {
	removeCctvUsage(event.player);
});

mc.world.beforeEvents.playerLeave.subscribe((event) => {
	removeCctvUsage(event.player);
});
