export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value,),);
}

export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1),) + min;
}

export function randomFloat(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

export function randomFloatSpread(range: number): number {
	return Math.random() * range - range * 0.5;
}

export function getIndexOfClosestValue(arr: number[], target: number): number {
	if (arr.length === 0) return -1;

	let closestIndex = 0;
	let diff = Math.abs(target - arr[0]!,);

	for (let i = 1; i < arr.length; i++) {
		let newDiff = Math.abs(target - arr[i]!,);
		if (newDiff < diff) {
			diff = newDiff;
			closestIndex = i;
		}
	}

	return closestIndex;
}

export function getIndexOfClosestLargerValue(arr: number[], target: number): number {
	let closestIndex = -1;
	for (let i = 0; i < arr.length; i++) {
		if (
			arr[i]! > target &&
			(closestIndex === -1 || Math.abs(target - arr[i]!,) < Math.abs(target - arr[closestIndex]!,))
		) {
			closestIndex = i;
		}
	}
	return closestIndex;
}

export function getIndexOfClosestSmallerValue(arr: number[], target: number): number {
	let closestIndex = -1;
	for (let i = 0; i < arr.length; i++) {
		if (
			arr[i]! < target &&
			(closestIndex === -1 || Math.abs(target - arr[i]!,) < Math.abs(target - arr[closestIndex]!,))
		) {
			closestIndex = i;
		}
	}
	return closestIndex;
}

export function isAlmostEqual(n1: number, n2: number, epsilon = 0.0001): boolean {
	return Math.abs(n1 - n2,) < epsilon;
}
