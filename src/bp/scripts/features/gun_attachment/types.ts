export type AttachmentStats = {
	damageMultiplier?: number;
};

export type AttachmentConfig = {
	id: string;
	itemType?: string;
	name: string;
	slotType: string;
	stats: AttachmentStats;
};
