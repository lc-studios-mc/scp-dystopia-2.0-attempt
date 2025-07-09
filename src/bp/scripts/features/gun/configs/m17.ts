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
		baseBulletDamage: 4,
		damageStrategyId: "default",

		reloadDuration: 19,
		tacReloadDuration: 14,

		muzzleOffset: { x: 0.13, z: 1.0 },
		muzzleOffsetAds: { y: 0.07, z: 1.2 },
		muzzleFlashParticleId: "lc:scpdy_muzzle_flash_particle",
		muzzleSmokeParticleId: "lc:scpdy_muzzle_smoke_emitter",
		ejectionOffset: { x: 0.2, y: 0.06, z: 0.5 },
		ejectionOffsetAds: { x: 0.05, y: 0.06, z: 0.7 },
		ejectionParticleId: "lc:scpdy_bullet_casing_drop_var0_particle",
	},

	sounds: {
		click: { id: "scpdy.gun.click" },
		dryfire: { id: "scpdy.gun.dryfire", volume: 1.5 },
		fire: { id: "scpdy.gun.m17.fire", volume: 2.0, pitch: { min: 0.95, max: 1.05 } },
		pickup: { id: "scpdy.gun.unholster_1", volume: 1.2, pitch: { min: 0.97, max: 1.03 } },
		rattle: { id: "scpdy.gun.rattle", volume: 1.5 },
		magRemove: { id: "scpdy.gun.mag_remove_1" },
		magAdd: { id: "scpdy.gun.mag_add_1" },
		slideRelease: { id: "scpdy.gun.load_1" },
	},

	timelines: {
		fire: {
			0.0: (args) => {
				args.handler.isAds ? args.handler.shakeCamera(0.02, 0.04) : args.handler.shakeCamera(0.03, 0.04);
				args.handler.emitMuzzleFlash();
				args.handler.emitMuzzleSmoke();
				args.handler.emitEjection();
			},
		},
		reload: {
			0.2: (args) => args.handler.playSound("magRemove"),
			0.4: (args) => args.handler.playSound("magAdd"),
			0.6: (args) => {
				args.handler.playSound("slideRelease");
				args.handler.shakeCamera(0.02, 0.04);
			},
		},
		tacReload: {
			0.1: (args) => args.handler.playSound("magRemove"),
			0.4: (args) => args.handler.playSound("magAdd"),
			0.5: (args) => args.handler.shakeCamera(0.02, 0.04),
		},
	},
} satisfies GunConfig;
