export type AttachmentStats = {
	adsSlownessAmplifierAdd: number;
	uncertainyMultiplierAds: number;
	uncertainyMultiplierHipfire: number;
	markGunAsSuppressed: boolean;
};

export type AttachmentConfig = {
	id: string;
	name: string;
	localizationKey: string;
	stats: Partial<AttachmentStats>;
	itemType?: string;
};

export const defaultAttachmentStats: AttachmentStats = {
	adsSlownessAmplifierAdd: 0,
	uncertainyMultiplierAds: 1,
	uncertainyMultiplierHipfire: 1,
	markGunAsSuppressed: false,
};
