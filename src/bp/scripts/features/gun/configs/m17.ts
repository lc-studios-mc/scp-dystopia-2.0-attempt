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

		bulletEntityType: "lc:scpdy_custom_bullet",
		bulletForceHipfire: 15,
		bulletForceAds: 15,
		bulletQuantity: 1,
		bulletUncertainyHipfire: 1.3,
		bulletUncertainyAds: 0.2,
		bulletCreateHole: true,
		bulletMaxEntityHits: 1,
		bulletDamageCause: mc.EntityDamageCause.override,
		bulletDamageReduction: true,
		baseBulletDamage: 5,
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
