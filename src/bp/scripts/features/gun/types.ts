import { Timeline, utils } from "@lc-studios-mc/scripting-utils";
import type * as mc from "@minecraft/server";
import type { GunHandler } from "./gun_handler";

export type GunStats = {
	adsSwayDuration: number;
	adsSlownessAmplifier: number;
	showCrosshairHipfire: boolean;
	showCrosshairAds: boolean;

	pickupDuration: number;

	fireDuration: number;
	fireFullAuto: boolean;

	projectileType: string;
	projectileQuantity: number | utils.Range;
	projectileForceHipfire: number;
	projectileForceAds: number;
	projectileUncertainyHipfire: number;
	projectileUncertainyAds: number;
	projectileCreateBulletHole: boolean;
	projectileMaxEntityHits: number;
	projectileDamageCause: mc.EntityDamageCause;
	projectileDamageReduction: boolean;
	baseProjectileDamage: number;
	damageStrategyId: "default" | (string & {});

	reloadDuration: number;
	tacReloadDuration: number;

	muzzleOffset?: Partial<mc.Vector3>;
	muzzleOffsetAds?: Partial<mc.Vector3>;
	ejectionOffset?: Partial<mc.Vector3>;
	ejectionOffsetAds?: Partial<mc.Vector3>;
	ejectionParticleId?: string;
};

export type GunAmmoConfig = {
	magType: number;
};

export type GunAttachmentConfig = {
	compatibleAttachmentIds: string[];
};

export type GunSoundConfig = {
	[x: string]:
		| {
				id: string;
				pitch?: number | utils.Range;
				volume?: number | utils.Range;
		  }
		| undefined;
};

export type GunTimelineArgs = {
	handler: GunHandler;
	currentTick: number;
};

export type GunTimelineConfig = {
	pickup?: Timeline.TimelineRecord<GunTimelineArgs>;
	fire?: Timeline.TimelineRecord<GunTimelineArgs>;
	reload?: Timeline.TimelineRecord<GunTimelineArgs>;
	tacReload?: Timeline.TimelineRecord<GunTimelineArgs>;
};

export type GunConfig = {
	id: string;
	itemType: string;
	stats: GunStats;
	ammo: GunAmmoConfig;
	attachmentConfig?: GunAttachmentConfig;
	timelines: GunTimelineConfig;
};
