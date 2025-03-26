import * as mc from "@minecraft/server";
import { clamp } from "@lib/utils/mathUtils";
import {
	UNKNOWN_BREEZE_ENTITY_TYPE,
	UNKNOWN_CORE_ENTITY_TYPE,
	UNKNOWN_GOLEM_ENTITY_TYPE,
	UNKNOWN_SPIDER_ENTITY_TYPE,
	UNKNOWN_ZOMBIE_ENTITY_TYPE,
} from "./shared";

let lastDifficulty: mc.Difficulty;
let lastWaveCount: number;
let waveEnemyArrayCache: string[];

function shuffleArray(array: any[]): void {
	for (let i = array.length - 1; i >= 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		let temp = array[i]!;
		array[i] = array[j]!;
		array[j] = temp;
	}
}

function createWaveEnemyArray_easy(waveCount: number): string[] {
	const array: string[] = [];

	if (waveCount >= 10) {
		array.push(UNKNOWN_GOLEM_ENTITY_TYPE, UNKNOWN_SPIDER_ENTITY_TYPE, UNKNOWN_CORE_ENTITY_TYPE);
	} else {
		for (let i = 0; i < waveCount; i++) {
			array.push(UNKNOWN_ZOMBIE_ENTITY_TYPE);

			if (i >= 5) {
				array.push(UNKNOWN_SPIDER_ENTITY_TYPE);
			}

			if (i >= 8) {
				array.push(UNKNOWN_GOLEM_ENTITY_TYPE);
			}
		}
	}

	lastDifficulty = mc.Difficulty.Easy;
	lastWaveCount = waveCount;
	waveEnemyArrayCache = array;

	return array;
}

function createWaveEnemyArray_normal(waveCount: number): string[] {
	const array: string[] = [];

	if (waveCount >= 10) {
		array.push(UNKNOWN_CORE_ENTITY_TYPE);
	} else {
		if (waveCount >= 5) {
			const spiderAmount = clamp(waveCount - 5, 1, 4);
			for (let i = 0; i < spiderAmount; i++) {
				array.push(UNKNOWN_SPIDER_ENTITY_TYPE);
			}

			const golemAmount = clamp(waveCount - 5, 1, 2);
			for (let i = 0; i < golemAmount; i++) {
				array.push(UNKNOWN_GOLEM_ENTITY_TYPE);
			}
		}

		if (waveCount >= 8) {
			const breezeAmount = clamp(waveCount - 8, 1, 2);
			for (let i = 0; i < breezeAmount; i++) {
				array.push(UNKNOWN_BREEZE_ENTITY_TYPE);
			}
		}

		shuffleArray(array);

		const zombieAmount = clamp(Math.floor(waveCount * 1.3), 1, 15);

		for (let i = 0; i < zombieAmount; i++) {
			array.push(UNKNOWN_ZOMBIE_ENTITY_TYPE);
		}
	}

	lastDifficulty = mc.Difficulty.Normal;
	lastWaveCount = waveCount;
	waveEnemyArrayCache = array;

	return array;
}

function createWaveEnemyArray_hard(waveCount: number): string[] {
	const array: string[] = [];

	if (waveCount >= 10) {
		array.push(
			UNKNOWN_GOLEM_ENTITY_TYPE,
			UNKNOWN_GOLEM_ENTITY_TYPE,
			UNKNOWN_GOLEM_ENTITY_TYPE,
			UNKNOWN_CORE_ENTITY_TYPE,
		);
	} else {
		{
			const spiderAmount = clamp(waveCount, 1, 6);
			for (let i = 0; i < spiderAmount; i++) {
				array.push(UNKNOWN_SPIDER_ENTITY_TYPE);
			}
		}

		if (waveCount >= 5) {
			const golemAmount = clamp(waveCount, 1, 3);
			for (let i = 0; i < golemAmount; i++) {
				array.push(UNKNOWN_GOLEM_ENTITY_TYPE);
			}
		}

		if (waveCount >= 8) {
			const breezeAmount = 2 + (waveCount - 8);
			for (let i = 0; i < breezeAmount; i++) {
				array.push(UNKNOWN_BREEZE_ENTITY_TYPE);
			}
		}

		shuffleArray(array);

		const zombieAmount = clamp(Math.floor(waveCount * 1.6), 1, 15);

		for (let i = 0; i < zombieAmount; i++) {
			array.push(UNKNOWN_ZOMBIE_ENTITY_TYPE);
		}
	}

	lastDifficulty = mc.Difficulty.Hard;
	lastWaveCount = waveCount;
	waveEnemyArrayCache = array;

	return array;
}

export function getWaveEnemyArray(waveCount: number, difficulty: mc.Difficulty): string[] {
	if (lastDifficulty === difficulty && lastWaveCount === waveCount) return waveEnemyArrayCache;

	switch (difficulty) {
		case mc.Difficulty.Easy:
			return createWaveEnemyArray_easy(waveCount);
		case mc.Difficulty.Normal:
			return createWaveEnemyArray_normal(waveCount);
		case mc.Difficulty.Hard:
			return createWaveEnemyArray_hard(waveCount);
	}

	return [];
}
