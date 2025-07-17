import { Vec3 } from "@lc-studios-mc/scripting-utils";
import * as mc from "@minecraft/server";

mc.system.afterEvents.scriptEventReceive.subscribe((event) => {
	if (event.id !== "scpdy:d_party") return;

	const location = event.sourceEntity?.location ?? event.sourceBlock?.location ?? Vec3.zero;
	const dimension = event.sourceEntity?.dimension ?? event.sourceBlock?.dimension ?? mc.world.getDimension("overworld");

	for (let i = 0; i < 50; i++) {
		const entity = dimension.spawnEntity("lc:scpdy_f_classd", location);
		entity.triggerEvent("lc:become_armed");
		entity.applyImpulse(Vec3.random(-0.2, 0.1));
	}
});
