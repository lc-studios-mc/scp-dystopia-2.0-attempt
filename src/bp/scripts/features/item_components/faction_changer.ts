import * as mc from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

const FACTION_TAG_CI = "scpdy_faction_ci";
const FACTION_TAG_SCPF = "scpdy_faction_scpf";

const onUse = async ({ source: player }: mc.ItemComponentUseEvent): Promise<void> => {
	const isCi = player.hasTag(FACTION_TAG_CI);
	const isScpf = player.hasTag(FACTION_TAG_SCPF);

	const formData = new ModalFormData()
		.title({ translate: "scpdy.faction_changer" })
		.toggle({ translate: "scpdy.faction_changer.joinCi" }, { defaultValue: isCi })
		.toggle({ translate: "scpdy.faction_changer.joinScpf" }, { defaultValue: isScpf });

	const response = await formData.show(player);

	if (response.canceled) return;
	if (!response.formValues) return;

	const changeTagState = (tag: string, before: boolean, after: boolean): void => {
		after ? player.addTag(tag) : player.removeTag(tag);
		player.sendMessage(`§7[${tag}] §f${before} §8-> §f${after}`);
	};

	player.sendMessage({ translate: "scpdy.faction_changer.updatedTags" });

	changeTagState(FACTION_TAG_CI, isCi, response.formValues[0] === true);
	changeTagState(FACTION_TAG_SCPF, isScpf, response.formValues[1] === true);
};

mc.system.beforeEvents.startup.subscribe((e) => {
	e.itemComponentRegistry.registerCustomComponent("scpdy:faction_changer", {
		onUse,
	});
});
