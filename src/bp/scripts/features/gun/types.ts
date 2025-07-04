import type { Range, TimelineRecord } from "@lc-studios-mc/scripting-utils";
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
	projectileQuantity: number | Range;
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
	magType: string;
};

export type GunAttachmentConfig = {
	compatibleAttachmentIds: Record<string, string[]>;
};

export type GunSoundConfigEntry = {
	id: string;
	pitch?: number | Range;
	volume?: number | Range;
};

export type GunSoundConfig = {
	click?: GunSoundConfigEntry;
	fire?: GunSoundConfigEntry;
	dryfire?: GunSoundConfigEntry;
	rattle?: GunSoundConfigEntry;
	[x: string]: GunSoundConfigEntry | undefined;
};

export type GunTimelineArgs = {
	handler: GunHandler;
	currentTick: number;
};

export type GunTimelineConfig = {
	pickup?: TimelineRecord<GunTimelineArgs>;
	fire?: TimelineRecord<GunTimelineArgs>;
	reload?: TimelineRecord<GunTimelineArgs>;
	tacReload?: TimelineRecord<GunTimelineArgs>;
};

export type GunConfig = {
	id: string;
	itemType: string;
	stats: GunStats;
	ammo: GunAmmoConfig;
	attachmentConfig?: GunAttachmentConfig;
	sounds: GunSoundConfig;
	timelines: GunTimelineConfig;
};
