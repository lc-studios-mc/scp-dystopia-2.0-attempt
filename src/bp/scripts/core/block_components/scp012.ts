import { fromVec3, toVec3 } from "@/lib/vec";
import * as mc from "@minecraft/server";
import { vec3 } from "gl-matrix";

const LURE_DISTANCE = 8.0;
const PAIN_DISTANCE = 3.0;

mc.system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent("scpdy:scp012", {
		onTick(arg) {
			const center = arg.block.center();

			const targetCandidates = arg.dimension.getEntities({
				location: center,
				maxDistance: LURE_DISTANCE,
				excludeFamilies: ["inanimate", "gate_guardian"],
				excludeTypes: ["minecraft:ender_dragon"],
			});

			for (const target of targetCandidates) {
				const isPlayerAndCreativeOrSpectator =
					target instanceof mc.Player &&
					[mc.GameMode.Creative, mc.GameMode.Spectator].includes(target.getGameMode());

				if (isPlayerAndCreativeOrSpectator) continue;

				const dirToPlayerVec = vec3.sub(
					vec3.create(),
					toVec3(target.getHeadLocation()),
					toVec3(center),
				);
				vec3.normalize(dirToPlayerVec, dirToPlayerVec);

				const isRayBlocked =
					arg.dimension.getBlockFromRay(center, fromVec3(dirToPlayerVec), {
						includeLiquidBlocks: false,
						includePassableBlocks: false,
						excludeTypes: [arg.block.typeId],
						maxDistance: LURE_DISTANCE,
					}) !== undefined;

				if (isRayBlocked) return;

				const facingLocationVec = vec3.add(
					vec3.create(),
					toVec3(arg.block.bottomCenter()),
					vec3.fromValues(0, -1, 0),
				);

				target.teleport(target.location, {
					facingLocation: fromVec3(facingLocationVec),
				});

				target.addEffect("blindness", 80);

				const distBetweenCenter = vec3.dist(toVec3(target.location), toVec3(center));

				if (distBetweenCenter < PAIN_DISTANCE) {
					target.addEffect("wither", 40, { amplifier: 1 });
				}

				if (distBetweenCenter > PAIN_DISTANCE - 1) {
					mc.system.runTimeout(() => {
						const impulseVec = vec3.scale(vec3.create(), dirToPlayerVec, -0.4);
						target.applyImpulse(fromVec3(impulseVec));
					}, 1);
				}
			}
		},
	});
});
