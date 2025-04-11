import * as vec3 from "@lib/utils/vec3";
import * as playerLoop from "@logic/playerLoop";
import * as mc from "@minecraft/server";
import {
	getChildNodes,
	getPowered as isNodePowered,
	isAttachedToUnlitLamp as isPwrNodeAttachedToUnlitLamp,
} from "./pwrNode";
import { PWR_NODE_ENTITY_TYPE_ID } from "./pwrNode/shared";

const PWR_FLOW_VISUALIZER_ITEM_TYPE_ID = "lc:scpdy_pwr_flow_visualizer";
const PWR_FLOW_VISUALIZATION_TICK_INTERVAL = 12;
const ACTIVE_ARROW_COLOR: mc.RGB = { red: 1, green: 1, blue: 0 } as const;
const INACTIVE_ARROW_COLOR: mc.RGB = { red: 0.2, green: 0.2, blue: 0.2 } as const;

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
	const nearbyNodesEqo: mc.EntityQueryOptions = {
		type: PWR_NODE_ENTITY_TYPE_ID,
		maxDistance: 24,
		closest: 15,
		location: player.getHeadLocation(),
	};

	const nearbyNodes = player.dimension.getEntities(nearbyNodesEqo);

	if (nearbyNodes.length <= 0) return;

	player.onScreenDisplay.setActionBar({
		translate: "scpdy.actionHint.pwrFlowVisualizer",
		with: [
			vec3.toString(vec3.floor(nearbyNodes[0]!.location)),
		],
	});

	for (let i = 0; i < nearbyNodes.length; i++) {
		const node = nearbyNodes[i]!;
		try {
			visualizePwrFlow(player, node);
		} catch {}
	}
}

function visualizePwrFlow(player: mc.Player, pwrNode: mc.Entity): void {
	const active = isNodePowered(pwrNode) && !isPwrNodeAttachedToUnlitLamp(pwrNode);
	const childs = getChildNodes(pwrNode);

	for (let i = 0; i < childs.length; i++) {
		const child = childs[i];

		if (child == null) continue;

		const from = vec3.add(pwrNode.location, { x: 0, y: 0.2, z: 0 });
		const to = vec3.add(child.location, { x: 0, y: 0.2, z: 0 });

		spawnPwrFlorArrowParticlesBetween(player, from, to, active);
	}
}

async function spawnPwrFlorArrowParticlesBetween(
	player: mc.Player,
	from: mc.Vector3,
	to: mc.Vector3,
	active: boolean,
): Promise<void> {
	const density = Math.floor(vec3.distance(from, to));
	const points = calculateDistributedPoints(from, to, density);
	const dir = vec3.normalize(vec3.sub(to, from));
	const molangVars = new mc.MolangVariableMap();
	molangVars.setColorRGB("color", active ? ACTIVE_ARROW_COLOR : INACTIVE_ARROW_COLOR);
	molangVars.setVector3("direction", dir);

	for (let i = 0; i < points.length; i++) {
		const point = points[i]!;

		player.spawnParticle("lc:scpdy_pwr_flow_arrow_particle", point, molangVars);

		if (i % 2 === 0) {
			await mc.system.waitTicks(1);
		}
	}
}

function calculateDistributedPoints(
	pointA: mc.Vector3,
	pointB: mc.Vector3,
	numPoints: number = 5,
): mc.Vector3[] {
	// Create array to store intermediate points
	const points: mc.Vector3[] = [];

	// Calculate the difference vector between points
	const deltaX = pointB.x - pointA.x;
	const deltaY = pointB.y - pointA.y;
	const deltaZ = pointB.z - pointA.z;

	// Generate only the intermediate points
	// We start at 1 and end at numPoints to exclude start and end points
	for (let i = 1; i <= numPoints; i++) {
		// Calculate the interpolation factor between 0 and 1
		const t = i / (numPoints + 1);

		// Create new point using linear interpolation
		const point: mc.Vector3 = {
			x: pointA.x + deltaX * t,
			y: pointA.y + deltaY * t,
			z: pointA.z + deltaZ * t,
		};

		points.push(point);
	}

	return points;
}
