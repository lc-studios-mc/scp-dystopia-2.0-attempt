import * as vec3 from "@lib/utils/vec3";
import * as playerLoop from "@logic/playerLoop";
import * as mc from "@minecraft/server";
import { SCP427_1_ENTITY_TYPE } from "./scp427_1";

const SCP427_CLOSED_ITEM_TYPE_ID = "lc:scpdy_scp427";
const SCP427_OPEN_ITEM_TYPE_ID = "lc:scpdy_scp427_open";
const SCP427_TICK_INTERVAL = 8;

const SCP427_1_PROGRESS_OMEN_TICKS: number[] = [60, 90, 140, 180, 220];
const SCP427_1_PROGRESS_COMPLETE_TICK = 250;

let scp427CurrentTick = 0;

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:scp427", {
		onUse(arg) {
			if (!arg.itemStack) return;

			const newItemTypeId =
				arg.itemStack.typeId === SCP427_CLOSED_ITEM_TYPE_ID
					? SCP427_OPEN_ITEM_TYPE_ID
					: SCP427_CLOSED_ITEM_TYPE_ID;

			const newItemStack = new mc.ItemStack(newItemTypeId, 1);
			newItemStack.nameTag = arg.itemStack.nameTag;

			const equippable = arg.source.getComponent("equippable")!;

			equippable.setEquipment(mc.EquipmentSlot.Mainhand, newItemStack);

			arg.source.dimension.playSound(
				"scpdy.interact.pick_item.2",
				vec3.add(arg.source.getHeadLocation(), arg.source.getViewDirection()),
			);
		},
	});
});

playerLoop.subscribe((player, { healthComp, mainhandSlot }) => {
	if (mc.system.currentTick % SCP427_TICK_INTERVAL !== 0) return; // Delay to reduce lags
	if ([mc.GameMode.creative, mc.GameMode.spectator].includes(player.getGameMode())) return;

	scp427CurrentTick++;

	if (healthComp.currentValue <= 0) return;

	const scp427TotalTime = (player.getDynamicProperty("scp427TotalTime") as number) ?? 0;
	const scp427_1_progress = (player.getDynamicProperty("scp427_1_progress") as number) ?? 0;

	if (scp427TotalTime >= 200) {
		if (scp427TotalTime > 220 && !player.getEffect("speed")) {
			player.addEffect("speed", 9999, { amplifier: 1, showParticles: false });
		}

		if (scp427TotalTime > 300 && !player.getEffect("resistance")) {
			player.addEffect("resistance", 9999, { amplifier: 1, showParticles: false });
		}

		if (scp427TotalTime > 350 && !player.getEffect("health_boost")) {
			player.addEffect("health_boost", 9999, { amplifier: 1, showParticles: false });
		}

		if (scp427TotalTime > 400 && !player.getEffect("strength")) {
			player.addEffect("strength", 9999, { amplifier: 0, showParticles: false });
		}

		if (scp427TotalTime > 450 && !player.getEffect("saturation")) {
			player.addEffect("saturation", 10, { amplifier: 0, showParticles: false });
		}
	}

	if (scp427TotalTime > 50) {
		const progressionInterval =
			scp427TotalTime < 100
				? 10
				: scp427TotalTime < 250
					? 6
					: scp427TotalTime < 350
						? 4
						: scp427TotalTime < 400
							? 3
							: scp427TotalTime < 450
								? 2
								: 1;

		if (scp427CurrentTick % progressionInterval === 0) {
			const newProgress = scp427_1_progress + 1;
			player.setDynamicProperty("scp427_1_progress", newProgress);

			if (SCP427_1_PROGRESS_OMEN_TICKS.includes(newProgress)) {
				player.playSound("scpdy.scp427.heartbeat");
				player.addEffect("darkness", 20, {
					showParticles: false,
				});
			} else if (newProgress === SCP427_1_PROGRESS_COMPLETE_TICK - 6) {
				player.camera.fade({
					fadeColor: { red: 0.8, green: 0, blue: 0 },
					fadeTime: {
						fadeInTime: 1.7,
						holdTime: 1.0,
						fadeOutTime: 0.8,
					},
				});
			} else if (newProgress === SCP427_1_PROGRESS_COMPLETE_TICK) {
				player.dimension.playSound("scpdy.gore.explode", player.getHeadLocation(), {
					volume: 1.2,
					pitch: 0.9,
				});

				player.dimension.spawnEntity(SCP427_1_ENTITY_TYPE, player.location, {
					initialRotation: player.getRotation().y,
				});

				player.kill();
			}
		}
	}

	const isHoldingOpenScp427 =
		mainhandSlot.hasItem() && mainhandSlot.typeId === SCP427_OPEN_ITEM_TYPE_ID;

	if (!isHoldingOpenScp427) return;

	player.setDynamicProperty("scp427TotalTime", scp427TotalTime + 1);

	if (healthComp.currentValue < healthComp.effectiveMax && !player.getEffect("regeneration")) {
		const amplifier =
			scp427TotalTime < 150 ? 1 : scp427TotalTime < 300 ? 2 : scp427TotalTime < 500 ? 3 : 4;

		player.addEffect("regeneration", 40, { amplifier });
	}
});

mc.world.afterEvents.entityDie.subscribe(
	(event) => {
		clearScp427RelatedDynamicProperties(<mc.Player>event.deadEntity);
	},
	{
		entityTypes: ["minecraft:player"],
	},
);

mc.world.beforeEvents.playerGameModeChange.subscribe((event) => {
	if (![mc.GameMode.creative, mc.GameMode.spectator].includes(event.toGameMode)) return;

	clearScp427RelatedDynamicProperties(event.player);
});

function clearScp427RelatedDynamicProperties(player: mc.Player): void {
	player.setDynamicProperty("scp427TotalTime", undefined);
	player.setDynamicProperty("scp427_1_progress", undefined);
}
