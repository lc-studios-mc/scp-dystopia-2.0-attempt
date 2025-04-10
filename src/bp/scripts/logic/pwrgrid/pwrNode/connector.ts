import * as vec3 from "@lib/utils/vec3";
import * as mc from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { connectNodes } from ".";
import { PWR_NODE_ENTITY_TYPE_ID } from "./shared";

mc.system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
	itemComponentRegistry.registerCustomComponent("scpdy:pwr_node_connector", {
		onUse,
	});
});

function onUse({ source: player, itemStack }: mc.ItemComponentUseEvent): void {
	if (!itemStack) return;

	const initialNode = getInitialNode(itemStack);

	const selectedPwrNode = player.getEntitiesFromViewDirection({
		type: PWR_NODE_ENTITY_TYPE_ID,
		maxDistance: 50,
	})[0]?.entity;

	if (!selectedPwrNode) {
		if (initialNode) {
			showInitialNodeInfoForm(player, itemStack, initialNode)
				.catch(() => {
					player.onScreenDisplay.setActionBar({ translate: "scpdy.msg.misc.somethingWentWrong" });
				});
		} else {
			player.onScreenDisplay.setActionBar({
				translate: "scpdy.actionHint.pwrNodeConnector.selectInitialNode",
			});
		}

		return;
	}

	if (!initialNode) {
		setInitialNode(itemStack, selectedPwrNode);
		tryApplyChanges(player, itemStack);

		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.pwrNodeConnector.selected",
		});

		player.playSound("random.orb", { pitch: 1.1 });

		return;
	}

	if (!connectNodes(initialNode, selectedPwrNode)) {
		player.onScreenDisplay.setActionBar({
			translate: "scpdy.actionHint.pwrNodeConnector.cannotConnect",
		});

		player.playSound("note.bass");
		return;
	}

	player.onScreenDisplay.setActionBar({
		translate: "scpdy.actionHint.pwrNodeConnector.connected",
	});

	player.playSound("random.orb", { pitch: 0.9 });

	if (player.inputInfo.getButtonState(mc.InputButton.Sneak) === mc.ButtonState.Pressed) return;

	setInitialNode(itemStack, undefined);
	tryApplyChanges(player, itemStack);
}

async function showInitialNodeInfoForm(
	player: mc.Player,
	itemStack: mc.ItemStack,
	initialNode: mc.Entity,
): Promise<void> {
	const initialNodeNameTag = initialNode.nameTag.trim();
	const initialNodeLabelWith = initialNodeNameTag !== ""
		? initialNodeNameTag
		: vec3.toString(vec3.floor(initialNode.location));

	player.playSound("random.pop");

	const response = await new ActionFormData()
		.title({ translate: "scpdy.form.pwrNodeConnector.title" })
		.body(
			{
				translate: "scpdy.form.pwrNodeConnector.initialNodeLabel",
				with: [initialNodeLabelWith],
			},
		)
		.button({ translate: "scpdy.form.pwrNodeConnector.removeInitialNodeButton" })
		.show(player);

	if (response.canceled) return;
	if (response.selection !== 0) return;

	setInitialNode(itemStack, undefined);
	tryApplyChanges(player, itemStack);

	player.onScreenDisplay.setActionBar({ translate: "scpdy.actionHint.pwrNodeConnector.removed" });
}

function tryApplyChanges(player: mc.Player, connector: mc.ItemStack): boolean {
	try {
		const mainhandSlot = player.getComponent("equippable")?.getEquipmentSlot(
			mc.EquipmentSlot.Mainhand,
		);

		if (!mainhandSlot) return false;
		if (!mainhandSlot.hasItem()) return false;
		if (mainhandSlot.typeId !== "lc:scpdy_pwr_node_connector") return false;

		mainhandSlot.setItem(connector);

		return true;
	} catch {
		return false;
	}
}

function getInitialNode(connector: mc.ItemStack): mc.Entity | null {
	try {
		const entityId = connector.getDynamicProperty("initialNodeId");

		if (typeof entityId !== "string") return null;

		const entity = mc.world.getEntity(entityId);

		return entity ?? null;
	} catch {
		return null;
	}
}

function setInitialNode(connector: mc.ItemStack, node?: mc.Entity | null): void {
	connector.setDynamicProperty("initialNodeId", node?.id);
}
