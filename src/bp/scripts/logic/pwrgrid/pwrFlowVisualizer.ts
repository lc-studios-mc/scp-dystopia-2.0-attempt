import * as playerLoop from "@logic/playerLoop";
import * as mc from "@minecraft/server";

const PWR_FLOW_VISUALIZER_ITEM_TYPE_ID = "lc:scpdy_pwr_flow_visualizer";
const PWR_FLOW_VISUALIZATION_TICK_INTERVAL = 15;

playerLoop.subscribe((player, { equippableComp }) => {
	if (mc.system.currentTick % PWR_FLOW_VISUALIZATION_TICK_INTERVAL !== 0) return;

	const mainhandItemStack = equippableComp.getEquipment(mc.EquipmentSlot.Mainhand);
	const isHoldingVisualizerInMainhand = mainhandItemStack !== undefined &&
		mainhandItemStack.typeId === PWR_FLOW_VISUALIZER_ITEM_TYPE_ID;

	if (!isHoldingVisualizerInMainhand) {
		const offhandItemStack = equippableComp.getEquipment(mc.EquipmentSlot.Mainhand);
		const isHoldingVisualizerInOffhand = offhandItemStack !== undefined &&
			offhandItemStack.typeId === PWR_FLOW_VISUALIZER_ITEM_TYPE_ID;

		if (!isHoldingVisualizerInOffhand) return;
	}

	tickPwrFlowVisualization(player);
});

function tickPwrFlowVisualization(player: mc.Player): void {
}
