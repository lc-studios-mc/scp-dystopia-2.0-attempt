import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

const DEFAULT_DAMAGE = 100;
const DEFAULT_MULTIPLIER = 1;

const ensurePlayerIsOperator = (player: mc.Player): boolean => {
	const isOp = player.playerPermissionLevel >= mc.PlayerPermissionLevel.Operator;
	if (!isOp) {
		player.onScreenDisplay.setActionBar({ translate: "scpdy.misc.only_op_may_use_this_item" });
	}
	return isOp;
};

const onUse = ({ source, itemStack }: mc.ItemComponentUseEvent): void => {
	if (!itemStack) return;

	if (!ensurePlayerIsOperator(source)) return;

	const equippable = source.getComponent("equippable");
	if (!equippable) throw new Error("Failed to get player equippable component");

	const currentDamage = Number(itemStack.getDynamicProperty("damage") ?? DEFAULT_DAMAGE);
	const currentMultiplier = Number(
		itemStack.getDynamicProperty("multiplier") ?? DEFAULT_MULTIPLIER,
	);

	const form = new ModalFormData()
		.title({ translate: "scpdy.entity_damager.configuration_form_title" })
		.label({ translate: "scpdy.entity_damager.form_label" })
		.slider({ translate: "scpdy.entity_damager.damage_slider_label" }, 1, 9999, {
			defaultValue: currentDamage,
			valueStep: 1,
		})
		.slider({ translate: "scpdy.entity_damager.multiplier_slider_label" }, 1, 9999, {
			defaultValue: currentMultiplier,
		});

	equippable.setEquipment(mc.EquipmentSlot.Mainhand, undefined);

	form
		.show(source)
		.then((response) => {
			if (response.canceled || !response.formValues) return;

			const newDamage = Number(response.formValues[1]);
			const newMultiplier = Number(response.formValues[2]);

			itemStack.setDynamicProperty("damage", newDamage);
			itemStack.setDynamicProperty("multiplier", newMultiplier);

			itemStack.setLore([`DAMAGE: ${newDamage}`, `MULTIPLIER: ${newMultiplier}`]);
		})
		.finally(() => {
			source.dimension.spawnItem(itemStack, source.getHeadLocation());
		});
};

const onHitEntity = ({
	itemStack,
	attackingEntity,
	hitEntity,
}: mc.ItemComponentHitEntityEvent): void => {
	if (!itemStack) return;

	const source = attackingEntity;
	if (!(source instanceof mc.Player)) return;
	if (!ensurePlayerIsOperator(source)) return;

	try {
		const damage = Number(itemStack.getDynamicProperty("damage") ?? DEFAULT_DAMAGE);
		const multiplier = Number(itemStack.getDynamicProperty("multiplier") ?? DEFAULT_MULTIPLIER);

		const finalDamage = Math.floor(damage * multiplier);

		const appliedDamage = hitEntity.applyDamage(finalDamage, {
			cause: mc.EntityDamageCause.override,
		});

		if (appliedDamage) {
			source.onScreenDisplay.setActionBar({
				translate: "scpdy.entity_damager.applied_x_damage",
				with: [`${finalDamage}`],
			});
		} else {
			source.onScreenDisplay.setActionBar({
				translate: "scpdy.entity_damager.could_not_apply_damage",
			});
		}
	} catch (error) {
		source.onScreenDisplay.setActionBar(`§c${error}`);
	}
};

mc.system.beforeEvents.startup.subscribe((event) => {
	event.itemComponentRegistry.registerCustomComponent("scpdy:entity_damager", {
		onUse,
		onHitEntity,
	});
});
