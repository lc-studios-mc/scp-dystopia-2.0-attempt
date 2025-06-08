import { AdvancedItem, type AdvancedItemBaseConstructorArgs } from "@logic/advancedItem/AdvancedItem";
import { registerAdvancedItemProfile } from "@logic/advancedItem/profileRegistry";
import * as mc from "@minecraft/server";
import { type AmmoType, getAmmoItemType, getAmmoType, removeAmmo } from "./ammo";

const USE_DURATION = 10;

class AmmoPack extends AdvancedItem {
	private readonly playerInventoryContainer: mc.Container;
	private readonly ammoType: AmmoType;
	private useTick = -1;

	constructor(args: AdvancedItemBaseConstructorArgs) {
		super(args);

		this.playerInventoryContainer = args.player.getComponent("inventory")!.container!;

		const mainhandItemStack = args.playerMainhand.getItem()!;

		this.ammoType = getAmmoType(mainhandItemStack)!;
	}

	onTick(mainhandItemStack: mc.ItemStack): void {
		if (this.useTick === -1) return;

		if (this.player.getItemCooldown("scpdy_ammo_pack_usage") > 0) return;

		if (this.useTick <= USE_DURATION) {
			// Create string to display on actionbar
			const actionbarStringHyphenArray: string[] = [];
			const loopCount = USE_DURATION - this.useTick;
			for (let i = 0; i < loopCount; i++) {
				actionbarStringHyphenArray.push("-");
			}
			const actionbarStringHyphens = actionbarStringHyphenArray.join("");
			const actionbarString = actionbarStringHyphens + "+" + actionbarStringHyphens;

			this.player.onScreenDisplay.setActionBar(`§7${actionbarString}`);

			this.useTick++;

			return;
		}

		this.useTick = 0;

		const durabilityComponent = mainhandItemStack.getComponent("durability")!;

		if (!durabilityComponent) {
			throw new Error(`Durability component of ${mainhandItemStack.typeId} is missing.`);
		}

		this.player.startItemCooldown("scpdy_ammo_pack_usage", 5);

		const mode: "putAmmo" | "extractAmmo" = this.player.isSneaking ? "extractAmmo" : "putAmmo";

		if (mode === "putAmmo") {
			if (durabilityComponent.damage <= 0) {
				this.player.onScreenDisplay.setActionBar({
					translate: "scpdy.actionHint.ammoPack.full",
				});
				return;
			}

			const maxPutAmount = Math.min(64, durabilityComponent.damage);

			const putAmount = removeAmmo(this.playerInventoryContainer, this.ammoType, maxPutAmount, true);

			if (putAmount <= 0) {
				this.player.onScreenDisplay.setActionBar({
					translate: "scpdy.actionHint.ammoPack.noAmmoInInventory",
				});
				return;
			}

			durabilityComponent.damage -= putAmount;

			const currentLoad = durabilityComponent.maxDurability - durabilityComponent.damage;
			const textColor = durabilityComponent.damage <= 0 ? `§a` : `§f`;
			const displayText = `${textColor}${currentLoad} / ${durabilityComponent.maxDurability}`;

			this.player.onScreenDisplay.setActionBar(displayText);

			this.playerMainhand.setItem(mainhandItemStack);

			this.player.dimension.playSound("scpdy.gun.ammo_pack.load_ammo", this.player.getHeadLocation());
		} else if (mode === "extractAmmo") {
			const extractAmount = Math.min(64, durabilityComponent.maxDurability - durabilityComponent.damage);

			if (extractAmount <= 0) {
				this.player.onScreenDisplay.setActionBar({ translate: "scpdy.actionHint.ammoPack.empty" });
				return;
			}

			durabilityComponent.damage += extractAmount;

			this.playerMainhand.setItem(mainhandItemStack);

			const dropAmmoItemStack = new mc.ItemStack(getAmmoItemType(this.ammoType), extractAmount);

			// Run after a delay because inventory UI breaks when not delayed
			mc.system.runTimeout(() => {
				this.player.dimension.spawnItem(dropAmmoItemStack, this.player.getHeadLocation());
			}, 1);
		}
	}

	onRemove(): void {}

	isUsable(): boolean {
		return true;
	}

	onStartUse(event: mc.ItemStartUseAfterEvent): void {
		this.useTick = 0;
	}

	onStopUse(event: mc.ItemStopUseAfterEvent): void {
		this.useTick = -1;
	}

	onSwingArm(): void {}

	onHitEntity(event: mc.EntityHitEntityAfterEvent): void {}

	onHitBlock(event: mc.EntityHitBlockAfterEvent): void {}
}

for (const ammoPackItemType of [
	"lc:scpdy_ammo_pack_9mm",
	"lc:scpdy_ammo_pack_12shell",
	"lc:scpdy_ammo_pack_50bmg",
	"lc:scpdy_ammo_pack_338magnum",
	"lc:scpdy_ammo_pack_556mm",
	"lc:scpdy_ammo_pack_762x51",
]) {
	registerAdvancedItemProfile({
		itemTypeId: ammoPackItemType,
		createInstance: (args) => new AmmoPack(args),
	});
}
