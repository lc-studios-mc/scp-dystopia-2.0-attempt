import * as mc from "@minecraft/server";

const STATE_NAME = {
	connectsN: "lc:connects_n",
	connectsS: "lc:connects_s",
	connectsE: "lc:connects_e",
	connectsW: "lc:connects_w",
	legNW: "lc:leg_nw",
	legNE: "lc:leg_ne",
	legSW: "lc:leg_sw",
	legSE: "lc:leg_se",
} as const;

function updateConnections(block: mc.Block, tableTypeId: string, iter = 0): void {
	function isConnecTable(block?: mc.Block): boolean {
		if (!block) return false;
		return block.typeId === tableTypeId;
	}

	const n = block.north();
	const s = block.south();
	const e = block.east();
	const w = block.west();

	const nConnectable = isConnecTable(n);
	const sConnectable = isConnecTable(s);
	const eConnectable = isConnecTable(e);
	const wConnectable = isConnecTable(w);

	const nw = nConnectable || wConnectable ? n?.west() : undefined;
	const ne = nConnectable || eConnectable ? n?.east() : undefined;
	const sw = sConnectable || wConnectable ? s?.west() : undefined;
	const se = sConnectable || eConnectable ? s?.east() : undefined;

	if (isConnecTable(block)) {
		block.setPermutation(
			block.permutation
				// Connections
				.withState(STATE_NAME.connectsN, nConnectable)
				.withState(STATE_NAME.connectsS, sConnectable)
				.withState(STATE_NAME.connectsE, eConnectable)
				.withState(STATE_NAME.connectsW, wConnectable)
				// Legs
				.withState(
					STATE_NAME.legNW,
					(!nConnectable && !wConnectable) || (nConnectable && wConnectable && !isConnecTable(nw)),
				)
				.withState(
					STATE_NAME.legNE,
					(!nConnectable && !eConnectable) || (nConnectable && eConnectable && !isConnecTable(ne)),
				)
				.withState(
					STATE_NAME.legSW,
					(!sConnectable && !wConnectable) || (sConnectable && wConnectable && !isConnecTable(sw)),
				)
				.withState(
					STATE_NAME.legSE,
					(!sConnectable && !eConnectable) || (sConnectable && eConnectable && !isConnecTable(se)),
				),
		);
	}

	if (iter >= 1) return;

	if (nConnectable) updateConnections(n!, tableTypeId, iter + 1);
	if (sConnectable) updateConnections(s!, tableTypeId, iter + 1);
	if (eConnectable) updateConnections(e!, tableTypeId, iter + 1);
	if (wConnectable) updateConnections(w!, tableTypeId, iter + 1);
	if (isConnecTable(nw)) updateConnections(nw!, tableTypeId, iter + 1);
	if (isConnecTable(ne)) updateConnections(ne!, tableTypeId, iter + 1);
	if (isConnecTable(sw)) updateConnections(sw!, tableTypeId, iter + 1);
	if (isConnecTable(se)) updateConnections(se!, tableTypeId, iter + 1);
}

function onPlace(arg: mc.BlockComponentOnPlaceEvent): void {
	updateConnections(arg.block, arg.block.typeId);
}

function onPlayerDestroy(arg: mc.BlockComponentPlayerDestroyEvent): void {
	updateConnections(arg.block, arg.destroyedBlockPermutation.type.id);
}

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:connec_table", {
		onPlace,
		onPlayerDestroy,
	});
});
