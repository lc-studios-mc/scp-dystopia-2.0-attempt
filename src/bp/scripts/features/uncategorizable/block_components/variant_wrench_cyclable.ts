import * as mc from "@minecraft/server";

mc.system.beforeEvents.startup.subscribe((event) => {
	event.blockComponentRegistry.registerCustomComponent("scpdy:variant_wrench_cyclable", COMPONENT);
});

const COMPONENT: mc.BlockCustomComponent = {
	onPlayerInteract(arg0, arg1) {
		onInteract(arg0, arg1.params);
	},
};

function onInteract(e: mc.BlockComponentPlayerInteractEvent, params: any): void {
	let variantValues = params.variantValues;
	if (!Array.isArray(variantValues))
		throw new Error("variantValues parameter is required for scpdy:wrenchable_variant component");

	let variantStateName = String(params.variantStateName).trim();
	if (variantStateName === "")
		throw new Error("variantStateName parameter is required for scpdy:wrenchable_variant component");

	const currentVariant = e.block.permutation.getState(variantStateName);
	const currentVariantIndex = variantValues.indexOf(currentVariant);

	const nextVariantIndex = (currentVariantIndex + 1) % variantValues.length;
	const nextVariant = variantValues[nextVariantIndex];

	e.block.setPermutation(e.block.permutation.withState(variantStateName, nextVariant));
}
