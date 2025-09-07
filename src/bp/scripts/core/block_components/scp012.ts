import { fromVec3, toVec3 } from "@/lib/vec";
import * as mc from "@minecraft/server";
import { vec3 } from "gl-matrix";

const LURE_DISTANCE = 8.0;
const PAIN_DISTANCE = 3.0;

mc.system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent("scpdy:scp012", {
		onTick(arg) {
			const center = arg.block.center();

			const nearbyPlayers = arg.dimension.getPlayers({
				location: center,
				maxDistance: LURE_DISTANCE,
				excludeGameModes: [mc.GameMode.Creative, mc.GameMode.Spectator],
			});

			for (const player of nearbyPlayers) {
				const dirToPlayerVec = vec3.sub(
					vec3.create(),
					toVec3(player.getHeadLocation()),
					toVec3(center),
				);
				vec3.normalize(dirToPlayerVec, dirToPlayerVec);

				const isBlocked =
					arg.dimension.getBlockFromRay(center, fromVec3(dirToPlayerVec), {
						includeLiquidBlocks: false,
						includePassableBlocks: false,
						excludeTypes: [arg.block.typeId],
						maxDistance: LURE_DISTANCE,
					}) !== undefined;

				if (isBlocked) return;

				const facingLocationVec = vec3.add(
					vec3.create(),
					toVec3(arg.block.bottomCenter()),
					vec3.fromValues(0, -1, 0),
				);

				player.teleport(player.location, {
					facingLocation: fromVec3(facingLocationVec),
				});

				player.addEffect("blindness", 80);

				const distBetweenCenter = vec3.dist(toVec3(player.location), toVec3(center));

				if (distBetweenCenter < PAIN_DISTANCE) {
					player.addEffect("wither", 40, { amplifier: 1 });
				}

				if (distBetweenCenter > PAIN_DISTANCE - 0.2) {
					mc.system.runTimeout(() => {
						const impulseVec = vec3.scale(vec3.create(), dirToPlayerVec, -0.3);
						player.applyImpulse(fromVec3(impulseVec));
					}, 1);
				}
			}
		},
	});
});
