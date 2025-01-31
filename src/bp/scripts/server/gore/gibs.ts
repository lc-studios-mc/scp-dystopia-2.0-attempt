import * as mc from "@minecraft/server";
import { spreadBlood } from "./blood";
import { CONFIG } from "@server/config/configData";
import { GIB_MEDIUM_ENTITY_TYPE, GIB_SMALL_ENTITY_TYPE } from "./shared";

type GibType = "small" | "medium";

export function spawnGoreExplosion(dimension: mc.Dimension, location: mc.Vector3): void {
	dimension.playSound("scpdy.gore.explode", location, { volume: 1.6 });

	dimension.spawnParticle("lc:scpdy_body_explosion_particle", location);
	dimension.spawnParticle("lc:scpdy_blood_splash_emitter", location);

	for (let i = 0; i < 3; i++) {
		mc.system.runTimeout(() => {
			dimension.spawnParticle("lc:scpdy_blood_splash_emitter", {
				x: location.x + (Math.random() - 0.5),
				y: location.y + 0.1,
				z: location.z + (Math.random() - 0.5),
			});
		}, i);
	}

	if (CONFIG.disableGore) return;

	spreadBlood(dimension, location, true);

	const existingGibCount = dimension.getEntities({ families: ["gib"] }).length;

	for (let i = 0; i < 3; i++) {
		spawnGib("medium", dimension, location, {
			x: (Math.random() - 0.5) / 1.5,
			y: 0.1,
			z: (Math.random() - 0.5) / 1.5,
		});
	}

	let i = 0;
	let runId = -1;

	function spawnSmallGib(): void {
		spawnGib("small", dimension, location, {
			x: (Math.random() - 0.5) / 6,
			y: 0.25 * (i / 3.5) + Math.random() / 2.7,
			z: (Math.random() - 0.5) / 6,
		});
	}

	function spawnMediumGib(): void {
		spawnGib("medium", dimension, location, {
			x: (Math.random() - 0.5) / 4,
			y: 0.2 * (i / 5) + Math.random() / 3,
			z: (Math.random() - 0.5) / 4,
		});
	}

	try {
		runId = mc.system.runInterval(() => {
			if (existingGibCount < 20) {
				if (i < 7) {
					spawnSmallGib();
				} else if (i < 11) {
					spawnMediumGib();
				} else {
					mc.system.clearRun(runId);
					return;
				}
			} else if (existingGibCount < 40) {
				if (i < 4) {
					spawnSmallGib();
				} else if (i < 7) {
					spawnMediumGib();
				} else {
					mc.system.clearRun(runId);
					return;
				}
			} else if (existingGibCount < 60) {
				if (i < 2) {
					spawnSmallGib();
				} else if (i < 4) {
					spawnMediumGib();
				} else {
					mc.system.clearRun(runId);
					return;
				}
			} else {
				mc.system.clearRun(runId);
			}

			i++;
		}, 1);
	} catch {
		mc.system.clearRun(runId);
	}
}

function spawnGib(
	type: GibType,
	dimension: mc.Dimension,
	location: mc.Vector3,
	impulse?: mc.Vector3,
): void {
	const entityType = type === "medium" ? "lc:scpdy_gib_medium" : "lc:scpdy_gib_small";
	const gibEntity = dimension.spawnEntity(entityType, location);

	if (impulse) {
		gibEntity.applyImpulse(impulse);
	}
}

function onGibEntityDie(gibEntity: mc.Entity): void {
	try {
		const particleLoc: mc.Vector3 = {
			x: gibEntity.location.x,
			y: gibEntity.location.y + 0.1,
			z: gibEntity.location.z,
		};

		gibEntity.dimension.spawnParticle("lc:scpdy_blood_splash_small_emitter", particleLoc);
	} finally {
		gibEntity.remove();
	}
}

mc.world.afterEvents.entityDie.subscribe(
	(event) => {
		if (event.damageSource.cause === mc.EntityDamageCause.selfDestruct) return;
		if (event.damageSource.cause === mc.EntityDamageCause.lava) return;

		onGibEntityDie(event.deadEntity);
	},
	{
		entityTypes: [GIB_SMALL_ENTITY_TYPE, GIB_MEDIUM_ENTITY_TYPE],
	},
);

mc.world.afterEvents.playerInteractWithEntity.subscribe((event) => {
	if (!event.target.typeId.startsWith("lc:scpdy_gib")) return;

	event.player.dimension.playSound("random.eat", event.player.getHeadLocation());
	event.player.addEffect("saturation", 2, { amplifier: 1, showParticles: false });
	event.target.remove();
});

mc.system.afterEvents.scriptEventReceive.subscribe((event) => {
	if (event.id !== "scpdy:gore_explosion") return;

	const sourceDim = event.sourceEntity?.dimension ?? event.sourceBlock?.dimension;
	const sourceLoc = event.sourceEntity?.location ?? event.sourceBlock?.location;

	if (!sourceDim || !sourceLoc) return;

	spawnGoreExplosion(sourceDim, sourceLoc);
});
