import { Player, system, world } from "@minecraft/server";
import { isPlayerModificationAvailable } from "@lib/utils/scpdyUtils";
import "@augumentations/index";
import "./advancedItem";
import "./ammo";
import "./blastDoor";
import "./cctv";
import "./commonComponents";
import "./config";
import "./construction3DBlocks";
import "./controlDevices";
import "./doorSystem";
import "./facilityNetwork";
import "./furniture";
import "./gore";
import "./humanMobs";
import "./lockdownDevices";
import "./minigameBlocks";
import "./scps";
import "./theUnknown";
import "./uncategorized";
import "./weapons";

function onInitialize(): void {
	world.sendMessage({ translate: "scpdy.msg.misc.scriptInit" });
}

function onPlayerInitialSpawn(player: Player): void {
	if (isPlayerModificationAvailable(player)) return;
	if (!player.addTag("scpdy_read_playerjson_warning")) return;

	system.runTimeout(() => {
		player.playSound("note.pling");
		player.sendMessage({
			rawtext: [
				{ translate: "scpdy.msg.warnOverriddenPlayerJson.line_1" },
				{ text: "\n" },
				{ translate: "scpdy.msg.warnOverriddenPlayerJson.line_2" },
				{ text: "\n" },
				{ translate: "scpdy.msg.warnOverriddenPlayerJson.line_3" },
				{ text: "\n" },
				{ translate: "scpdy.msg.warnOverriddenPlayerJson.line_4" },
			],
		});
	}, 100);
}

world.afterEvents.worldInitialize.subscribe(onInitialize);

world.afterEvents.playerSpawn.subscribe((event) => {
	if (event.initialSpawn) {
		onPlayerInitialSpawn(event.player);
	}
});
