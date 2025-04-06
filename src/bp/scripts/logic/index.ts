import { isPlayerModificationAvailable } from "@lib/utils/scpdyUtils";
import { ItemStack, Player, system, world } from "@minecraft/server";
import "./advancedItem";
import "./ammo";
import "./blastDoor";
import "./blocks";
import "./cctv";
import "./components";
import "./config";
import "./controlDevices";
import "./facilityNetwork";
import "./gore";
import "./humanMobs";
import "./scps";
import "./theUnknown";
import "./uncategorized";
import "./weapons";

function onInitialize(): void {
	world.sendMessage({ translate: "scpdy.msg.misc.scriptInit" });
}

async function onPlayerInitialSpawn(player: Player): Promise<void> {
	let isWorldLeader = false;
	const allPlayers = world.getPlayers();
	if (
		world.getDynamicProperty("scpdy_world_leader") === undefined &&
		allPlayers.length === 1 &&
		allPlayers[0] === player
	) {
		world.setDynamicProperty("worldLeaderId", player.id);
		player.addTag("scpdy_world_leader");
		isWorldLeader = true;
	}

	await system.waitTicks(200);

	if (player.addTag("scpdy_welcomed")) {
		player.playSound("random.orb");
		player.sendMessage({
			rawtext: [
				{ translate: "scpdy.msg.welcome.line_1" },
				{ text: "\n" },
				{ translate: "scpdy.msg.welcome.line_2" },
				{ text: "\n" },
				{ translate: "scpdy.msg.welcome.line_3" },
			],
		});
	}

	if (!isWorldLeader) return;

	await system.waitTicks(60);

	if (player.addTag("scpdy_read_world_leader_notice")) {
		player.playSound("note.hat");
		player.sendMessage({
			rawtext: [
				{ translate: "scpdy.msg.youAreNowLeader.line_1" },
				{ text: "\n" },
				{ translate: "scpdy.msg.youAreNowLeader.line_2" },
				{ text: "\n" },
				{ translate: "scpdy.msg.youAreNowLeader.line_3" },
			],
		});

		const configItemStack = new ItemStack("lc:scpdy_config", 1);

		player.getComponent("inventory")!.container!.addItem(configItemStack);
	}

	if (isPlayerModificationAvailable(player)) return;
	if (!player.addTag("scpdy_read_playerjson_warning")) return;

	await system.waitTicks(60);

	player.playSound("note.pling");
	player.sendMessage({
		rawtext: [
			{ translate: "scpdy.msg.warnOverriddenPlayerJson.line_1" },
			{ text: "\n" },
			{ translate: "scpdy.msg.warnOverriddenPlayerJson.line_2" },
			{ text: "\n" },
			{ translate: "scpdy.msg.warnOverriddenPlayerJson.line_3" },
		],
	});
}

world.afterEvents.worldLoad.subscribe(onInitialize);

world.afterEvents.playerSpawn.subscribe((event) => {
	if (event.initialSpawn) {
		onPlayerInitialSpawn(event.player);
	}
});

system.afterEvents.scriptEventReceive.subscribe((event) => {
	if (event.id !== "scpdy:clear_world_leader_id") return;

	const worldLeaderId = world.getDynamicProperty("worldLeaderId");

	world.setDynamicProperty("worldLeaderId", undefined);

	if (!event.sourceEntity) return;
	if (!(event.sourceEntity instanceof Player)) return;

	event.sourceEntity.sendMessage({
		rawtext: [
			{ translate: "scpdy.msg.clearWorldLeaderId.line_1" },
			{ text: "\n" },
			{ translate: "scpdy.msg.clearWorldLeaderId.line_2", with: [`${worldLeaderId}`] },
			{ text: "\n" },
			{ translate: "scpdy.msg.clearWorldLeaderId.line_3", with: [`${event.sourceEntity.id}`] },
		],
	});
});
