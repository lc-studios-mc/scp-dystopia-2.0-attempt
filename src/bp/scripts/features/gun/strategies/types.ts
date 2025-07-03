import * as mc from "@minecraft/server";
import type { GunStats } from "../types";
import type { AttachmentContext } from "@/features/gun_attachment/attachment_context";

export type GunDamageStrategyArgs = {
	hitEntity: mc.Entity;
	isHeadshot: boolean;
	traveledDistance: number;
	gunStats: GunStats;
	attachmentContext: AttachmentContext;
};

export type GunDamageStrategy = {
	calculateDamage(args: GunDamageStrategyArgs): number;
};
