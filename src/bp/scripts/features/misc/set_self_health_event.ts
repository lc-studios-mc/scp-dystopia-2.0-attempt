import * as mc from "@minecraft/server";

mc.system.afterEvents.scriptEventReceive.subscribe((e) => {
	if (e.id !== "scpdy:set_self_health") return;
	if (!e.sourceEntity) return;

	const healthComp = e.sourceEntity.getComponent("health");
	if (!healthComp) return;

	const newHealth = Number(e.message);

	healthComp.setCurrentValue(newHealth);
}, { namespaces: ["scpdy"] });
