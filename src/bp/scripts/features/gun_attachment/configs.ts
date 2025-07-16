import type { AttachmentConfig } from "./shared";

// Import attachment configs

const attachmentConfigsByIdInternal = new Map<string, AttachmentConfig>();

export const attachmentConfigsById: ReadonlyMap<string, AttachmentConfig> = attachmentConfigsByIdInternal;

const addConfig = (config: AttachmentConfig) => attachmentConfigsByIdInternal.set(config.id, config);

addConfig({
	id: "lasersightp",
	name: "Laser Sight",
	localizationKey: "scpdy.gun.att.lasersightp",
	stats: {
		uncertainyMultiplierHipfire: 0.3,
	},
});

addConfig({
	id: "reddotsight",
	name: "Red Dot Sight",
	localizationKey: "scpdy.gun.att.reddotsight",
	stats: {
		uncertainyMultiplierAds: 0.5,
	},
});

addConfig({
	id: "suppressor",
	name: "Suppressor",
	localizationKey: "scpdy.gun.att.suppressor",
	stats: {
		uncertainyMultiplierAds: 0.8,
		uncertainyMultiplierHipfire: 0.8,
		markGunAsSuppressed: true,
	},
});
