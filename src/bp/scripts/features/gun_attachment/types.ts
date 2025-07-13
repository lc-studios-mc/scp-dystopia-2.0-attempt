export type AttachmentStats = {
	damageMultiplier?: number;
	markGunAsSuppressed?: boolean;
};

export type AttachmentConfig = {
	id: string;
	itemType?: string;
	name: string;
	slotType: string;
	stats: AttachmentStats;
};
