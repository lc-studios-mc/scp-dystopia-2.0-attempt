import * as mc from "@minecraft/server";
import { ConfigBuilder } from "./ConfigBuilder";

const BUILDER = new ConfigBuilder(mc.world);

const CONFIG_INTERNAL = BUILDER.build();

export const CONFIG: Readonly<typeof CONFIG_INTERNAL> = CONFIG_INTERNAL;

export async function showConfigEditorForm(target: mc.Player): Promise<void> {
	await BUILDER.showEditorForm(target);
}
