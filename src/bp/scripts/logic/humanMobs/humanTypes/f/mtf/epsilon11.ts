import * as mc from "@minecraft/server";
import { isEntityDead } from "@lib/utils/entityUtils";
import { ensureType } from "@lib/utils/miscUtils";
import * as vec3 from "@lib/utils/vec3";
import { SCP096_ENTITY_TYPE } from "@logic/scps/scp096/shared";
import { HUMAN_MOB_TYPES } from "@logic/humanMobs/shared";

const PROP_ID = {
	state: "lc:state",
	canDeployFragGrenade: "lc:can_deploy_frag_grenade",
} as const;

/**
 * This function is called when MTF Epsilon-11 operator acquires a target.
 */
function updateCombatMode(mtfEntity: mc.Entity, target: mc.Entity): void {
	const previousState = mtfEntity.getProperty(PROP_ID.state) as number;

	switch (previousState) {
		case 1:
			mtfEntity.triggerEvent("f_mtf_epsilon11:remove_rifle_combat");
			break;
		case 2:
			mtfEntity.triggerEvent("f_mtf_epsilon11:remove_knife_stabbing");
			break;
		case 3:
			mtfEntity.triggerEvent("f_mtf_epsilon11:remove_frag_grenade_deploying");
			break;
		case 4:
			mtfEntity.triggerEvent("f_mtf_epsilon11:remove_gonna_hide_scp096_face");
			break;
		case 5:
			mtfEntity.triggerEvent("f_mtf_epsilon11:remove_hiding_scp096_face");
			break;
	}

	switch (target.typeId) {
		default:
			mtfEntity.triggerEvent("f_mtf_epsilon11:add_rifle_combat");
			mtfEntity.setProperty(PROP_ID.state, 1);
			break;
		case SCP096_ENTITY_TYPE:
			mtfEntity.triggerEvent("f_mtf_epsilon11:add_gonna_hide_scp096_face");
			mtfEntity.setProperty(PROP_ID.state, 4);
			break;
	}
}

function onTargetEscape(mtfEntity: mc.Entity): void {
	const previousState = mtfEntity.getProperty(PROP_ID.state) as number;

	switch (previousState) {
		case 1:
			mtfEntity.triggerEvent("f_mtf_epsilon11:remove_rifle_combat");
			break;
		case 2:
			mtfEntity.triggerEvent("f_mtf_epsilon11:remove_knife_stabbing");
			break;
		case 3:
			mtfEntity.triggerEvent("f_mtf_epsilon11:remove_frag_grenade_deploying");
			break;
		case 4:
			mtfEntity.triggerEvent("f_mtf_epsilon11:remove_gonna_hide_scp096_face");
			break;
		case 5:
			mtfEntity.triggerEvent("f_mtf_epsilon11:remove_hiding_scp096_face");
			break;
	}

	mtfEntity.setProperty(PROP_ID.state, 0);
	mtfEntity.setProperty(PROP_ID.canDeployFragGrenade, true);
}

function onTargetInsideKnifeRange(mtfEntity: mc.Entity, target: mc.Entity): void {
	mtfEntity.triggerEvent("f_mtf_epsilon11:remove_rifle_combat");
	mtfEntity.triggerEvent("f_mtf_epsilon11:add_knife_stabbing");
	mtfEntity.setProperty(PROP_ID.state, 2);
}

function knifeStab(mtfEntity: mc.Entity): void {
	const target = mtfEntity.target;

	if (!target) return;

	const targetDist = vec3.distance(mtfEntity.location, target.location);

	if (targetDist > 3) return;

	target.applyDamage(6, {
		cause: mc.EntityDamageCause.override,
		damagingEntity: mtfEntity,
	});

	target.addEffect("slowness", 40, {
		amplifier: 0,
	});
}

function onFinishKnifeStabbing(mtfEntity: mc.Entity): void {
	if (!mtfEntity.target) return;

	const lastFragGrenadeDeployDate =
		ensureType(mtfEntity.getDynamicProperty("lastFragGrenadeDeployDate"), "number") ?? 0;

	const dateNow = Date.now();

	mtfEntity.triggerEvent("f_mtf_epsilon11:remove_knife_stabbing");

	if (dateNow - lastFragGrenadeDeployDate > 5000 && Math.random() > 0.4) {
		mtfEntity.triggerEvent("f_mtf_epsilon11:add_frag_grenade_deploying");
		mtfEntity.setProperty(PROP_ID.state, 3);
		mtfEntity.setDynamicProperty("lastFragGrenadeDeployDate", Date.now());
	} else {
		mtfEntity.triggerEvent("f_mtf_epsilon11:add_rifle_combat");
		mtfEntity.setProperty(PROP_ID.state, 1);
	}
}

function deployFragGrenade(mtfEntity: mc.Entity): void {
	const canDeployFragGrenade = mtfEntity.getProperty(PROP_ID.canDeployFragGrenade) === true;

	if (!canDeployFragGrenade) return;

	mtfEntity.setProperty(PROP_ID.canDeployFragGrenade, false);

	mtfEntity.dimension.spawnEntity("lc:scpdy_mtf_frag_grenade", mtfEntity.location);
}

function onFinishDeployingFragGrenade(mtfEntity: mc.Entity): void {
	mtfEntity.setProperty(PROP_ID.canDeployFragGrenade, true);
	mtfEntity.triggerEvent("f_mtf_epsilon11:remove_frag_grenade_deploying");

	if (!mtfEntity.target) return;

	mtfEntity.triggerEvent("f_mtf_epsilon11:add_rifle_combat");
	mtfEntity.setProperty(PROP_ID.state, 1);
}

function onTargetInsideScp096FhRange(mtfEntity: mc.Entity): void {
	const target = mtfEntity.target;
	if (!target) return;
	if (target.typeId !== SCP096_ENTITY_TYPE) return;

	const isFaceHidden = target.getProperty("lc:is_face_hidden") === true;

	if (isFaceHidden) {
		mtfEntity.triggerEvent("f_mtf_epsilon11:remove_hiding_scp096_face");
		mtfEntity.setProperty(PROP_ID.state, 0);
		return;
	}

	mtfEntity.triggerEvent("f_mtf_epsilon11:remove_gonna_hide_scp096_face");
	mtfEntity.triggerEvent("f_mtf_epsilon11:add_hiding_scp096_face");
	mtfEntity.setProperty(PROP_ID.state, 5);
}

function hideScp096Face(mtfEntity: mc.Entity): void {
	const target = mtfEntity.target;
	if (!target) return;
	if (target.typeId !== SCP096_ENTITY_TYPE) return;

	const isFaceHidden = target.getProperty("lc:is_face_hidden") === true;

	if (isFaceHidden) {
		mtfEntity.triggerEvent("f_mtf_epsilon11:remove_hiding_scp096_face");
		mtfEntity.setProperty(PROP_ID.state, 0);
		return;
	}

	const targetDist = vec3.distance(mtfEntity.location, target.location);

	if (targetDist > 2.6) {
		mtfEntity.triggerEvent("f_mtf_epsilon11:remove_hiding_scp096_face");
		mtfEntity.triggerEvent("f_mtf_epsilon11:add_gonna_hide_scp096_face");
		mtfEntity.setProperty(PROP_ID.state, 4);
		return;
	}

	target.triggerEvent("scp096:equip_paper_bag");

	mtfEntity.triggerEvent("f_mtf_epsilon11:remove_hiding_scp096_face");
	mtfEntity.setProperty(PROP_ID.state, 0);
}

function onEntityEventTrigger(mtfEntity: mc.Entity, eventId: string): void {
	const isDead = isEntityDead(mtfEntity);

	switch (eventId) {
		case "f_mtf_epsilon11:update_combat_mode":
			if (!isDead && mtfEntity.target) {
				updateCombatMode(mtfEntity, mtfEntity.target);
			}
			break;
		case "f_mtf_epsilon11:on_target_escape":
			if (!isDead) {
				onTargetEscape(mtfEntity);
			}
			break;
		case "f_mtf_epsilon11:on_target_inside_knife_range":
			if (mtfEntity.target) {
				onTargetInsideKnifeRange(mtfEntity, mtfEntity.target);
			}
			break;
		case "f_mtf_epsilon11:knife_stab":
			knifeStab(mtfEntity);
			break;
		case "f_mtf_epsilon11:on_finish_knife_stabbing":
			onFinishKnifeStabbing(mtfEntity);
			break;
		case "f_mtf_epsilon11:deploy_frag_grenade":
			deployFragGrenade(mtfEntity);
			break;
		case "f_mtf_epsilon11:on_finish_deploying_frag_grenade":
			onFinishDeployingFragGrenade(mtfEntity);
			break;
		case "f_mtf_epsilon11:on_target_inside_scp096_fh_range":
			onTargetInsideScp096FhRange(mtfEntity);
			break;
		case "f_mtf_epsilon11:hide_scp096_face":
			hideScp096Face(mtfEntity);
			break;
	}
}

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		onEntityEventTrigger(event.entity, event.eventId);
	},
	{
		entityTypes: [HUMAN_MOB_TYPES.f_mtf_epsilon11],
	},
);
