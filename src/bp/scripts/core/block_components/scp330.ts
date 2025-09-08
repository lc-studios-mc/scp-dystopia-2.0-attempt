import * as mc from "@minecraft/server";

const STAGE1_INTERACTION_CD = "scpdy:scp330_interaction_1";
const STAGE2_INTERACTION_CD = "scpdy:scp330_interaction_2";

const spawnCandy = (block: mc.Block): void => {
	const candies = ["scpdy:candy_blue", "scpdy:candy_pink", "scpdy:candy_yellow"];
	const randomCandy = candies[Math.floor(Math.random() * candies.length)]!;
	const candyItem = new mc.ItemStack(randomCandy, 1);

	block.dimension.spawnItem(candyItem, block.center());
	block.dimension.playSound("random.pop", block.center());
};

const onDeadlyInteraction = (player: mc.Player): void => {
	player.camera.fade({
		fadeColor: { red: 0.5, green: 0, blue: 0 },
		fadeTime: {
			fadeInTime: 0.08,
			holdTime: 0.2,
			fadeOutTime: 0.9,
		},
	});

	player.addEffect("wither", 60 * mc.TicksPerSecond, { amplifier: 2 });

	player.applyDamage(8, {
		cause: mc.EntityDamageCause.override,
		damagingEntity: player,
	});
};

mc.system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent("scpdy:scp330", {
		onPlayerInteract({ block, player }) {
			if (!player) return;

			mc.system.run(() => {
				spawnCandy(block);
			});

			const isStage2 = player.getItemCooldown(STAGE2_INTERACTION_CD) > 0;
			if (isStage2) {
				player.startItemCooldown(STAGE2_INTERACTION_CD, 0);
				onDeadlyInteraction(player);
				return;
			}

			const isStage1 = player.getItemCooldown(STAGE1_INTERACTION_CD) > 0;
			if (isStage1) {
				player.startItemCooldown(STAGE1_INTERACTION_CD, 0);
				player.startItemCooldown(STAGE2_INTERACTION_CD, mc.TicksPerDay);
				return;
			}

			player.startItemCooldown(STAGE1_INTERACTION_CD, mc.TicksPerDay);
		},
	});
});

// Clear interaction cooldown on death
mc.world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
	if (!(deadEntity instanceof mc.Player)) return;
	deadEntity.startItemCooldown(STAGE1_INTERACTION_CD, 0);
	deadEntity.startItemCooldown(STAGE2_INTERACTION_CD, 0);
});
