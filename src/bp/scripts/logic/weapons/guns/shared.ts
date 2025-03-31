export function getAmmoDisplayText(magAmmo: number, magAmmoMax: number, invAmmo: number): string {
	const lowAmmoCount = Math.floor(Math.max(2, Math.min(15, magAmmoMax / 3.5,),),);

	const magAmmoColor = magAmmo <= 0 ? "§c" : magAmmo < magAmmoMax / lowAmmoCount ? "§e" : "§f";
	const invAmmoColor = invAmmo <= 0 ? "§7" : "§f";
	const text = `${magAmmoColor}${magAmmo}§f | ${invAmmoColor}${invAmmo}`;

	return text;
}
