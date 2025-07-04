import type { GunConfig } from "../types";
import * as mc from "@minecraft/server";

export default {
	id: "m17",
	itemType: "lc:scpdy_gun_m17",

	ammo: {
		magType: "lc:scpdy_gun_m17_mag",
	},

	attachmentConfig: {
		compatibleAttachmentIds: {},
	},

	stats: {
		adsSwayDuration: 4,
		adsSlownessAmplifier: 0,
		showCrosshairHipfire: true,
		showCrosshairAds: false,

		pickupDuration: 4,

		fireDuration: 1,
		fireFullAuto: false,

		projectileType: "lc:scpdy_custom_bullet",
		projectileQuantity: 1,
		projectileForceHipfire: 20,
		projectileForceAds: 20,
		projectileUncertainyHipfire: 1.2,
		projectileUncertainyAds: 0.2,
		projectileCreateBulletHole: true,
		projectileMaxEntityHits: 1,
		projectileDamageCause: mc.EntityDamageCause.override,
		projectileDamageReduction: true,
		baseProjectileDamage: 5,
		damageStrategyId: "default",

		reloadDuration: 36,
		tacReloadDuration: 31,

		// TODO: Define offsets
		// muzzleOffset: Partial<mc.Vector3>,
		// muzzleOffsetAds: Partial<mc.Vector3>,
		// ejectionOffset: Partial<mc.Vector3>,
		// ejectionOffsetAds: Partial<mc.Vector3>,
		ejectionParticleId: "lc:scpdy_bullet_casing_drop_var0_particle",
	},

	sounds: {},

	timelines: {},
} satisfies GunConfig;
