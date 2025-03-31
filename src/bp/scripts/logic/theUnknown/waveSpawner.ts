import { clamp } from "@lib/utils/mathUtils";
import { ensureType } from "@lib/utils/miscUtils";
import * as mc from "@minecraft/server";
import { isUnknownRace, UNKNOWN_CORE_ENTITY_TYPE } from "./shared";
import { getWaveEnemyArray } from "./waves";

const UNKNOWN_WAVE_SPAWNER_ENTITY_TYPE = "lc:scpdy_the_unknown_wave_spawner";

function getNearbyPlayers(waveSpawner: mc.Entity): mc.Player[] {
	return waveSpawner.dimension.getPlayers({
		maxDistance: 80,
		location: waveSpawner.location,
	},);
}

function onNearbyPlayers(waveSpawner: mc.Entity, ...func: ((player: mc.Player) => void)[]): void {
	const players = getNearbyPlayers(waveSpawner,);

	for (let i = 0; i < players.length; i++) {
		const player = players[i]!;

		for (let j = 0; j < func.length; j++) {
			const f = func[j]!;
			f(player,);
		}
	}
}

function getDifficulty(waveSpawner: mc.Entity): mc.Difficulty {
	return waveSpawner.getProperty("lc:difficulty",) as mc.Difficulty;
}

function onSpawn(waveSpawner: mc.Entity): void {
	const difficulty = getDifficulty(waveSpawner,);

	if (difficulty === 0) {
		onNearbyPlayers(waveSpawner, (player) => {
			player.sendMessage({
				translate: "scpdy.msg.theUnknownWaveSpawner.peacefulNotSupported",
			},);
		},);

		waveSpawner.triggerEvent("despawn",);
		return;
	}

	waveSpawner.triggerEvent("the_unknown_wave_spawner:start_wave_break",);

	const scoreboardObjective = mc.world.scoreboard.addObjective(waveSpawner.id, "Scores",);

	mc.world.scoreboard.setObjectiveAtDisplaySlot(mc.DisplaySlotId.Sidebar, {
		objective: scoreboardObjective,
		sortOrder: mc.ObjectiveSortOrder.Descending,
	},);
}

function getWaveMusicId(difficulty: mc.Difficulty, waveCount: number): string {
	const music1 = "scpdy.music.the_unknown_battle_1";
	const music2 = "scpdy.music.the_unknown_battle_2";
	const music3 = "scpdy.music.the_unknown_battle_3";

	return waveCount < 5 ? music1 : waveCount < 10 ? music2 : music3;
}

function onStartWaveBreakEvent(waveSpawner: mc.Entity): void {
	const currentWave = waveSpawner.getProperty("lc:wave_count",) as number;
	const nextWave = currentWave + 1;
	const difficulty = getDifficulty(waveSpawner,);
	const waveBreakSeconds = difficulty === 3 ? 3 : difficulty === 2 ? 5 : 7;
	const msg: mc.RawMessage = {
		translate: "scpdy.msg.theUnknownWaveSpawner.waveBreakStarted",
		with: [`${currentWave}`, `${nextWave}`],
	};

	onNearbyPlayers(waveSpawner, (player) => {
		const newMusic = getWaveMusicId(difficulty, nextWave,);
		const oldMusic = player.getDynamicProperty("theUnknownBattleMusic",);

		if (oldMusic !== newMusic) {
			player.playMusic(newMusic, {
				fade: waveBreakSeconds,
				loop: true,
			},);
		}

		player.setDynamicProperty("theUnknownBattleMusic", newMusic,);

		if (currentWave === 0) return;

		player.sendMessage(msg,);
	},);
}

function onEndWaveBreakEvent(waveSpawner: mc.Entity): void {
	const currentWave = waveSpawner.getProperty("lc:wave_count",) as number;
	const nextWave = currentWave + 1;

	waveSpawner.setProperty("lc:wave_count", nextWave,);

	mc.system.runTimeout(() => {
		waveSpawner.triggerEvent("the_unknown_wave_spawner:on_tick_wave_battle",);
	}, 1,);

	const msg: mc.RawMessage = {
		translate: "scpdy.msg.theUnknownWaveSpawner.waveXStarted",
		with: [`${nextWave}`],
	};

	onNearbyPlayers(waveSpawner, (player) => {
		player.sendMessage(msg,);
	},);
}

function getLastWaveCount(difficulty: mc.Difficulty): number {
	return 10;
}

function setNextWaveEnemyIndex(waveSpawner: mc.Entity, value?: number): void {
	waveSpawner.setDynamicProperty("nextWaveEnemyIndex", value,);
}

function getNextWaveEnemyIndex(waveSpawner: mc.Entity): number {
	let value = waveSpawner.getDynamicProperty("nextWaveEnemyIndex",);
	if (typeof value !== "number") {
		value = 0;
		setNextWaveEnemyIndex(waveSpawner, 0,);
	}
	return value;
}

function getNearbyWaveEnemies(waveSpawner: mc.Entity, waveCount: number): mc.Entity[] {
	return waveSpawner.dimension
		.getEntities({
			families: ["the_unknown"],
			maxDistance: 80,
			location: waveSpawner.location,
		},)
		.filter((entity) => entity.getDynamicProperty("waveId",) === `${waveSpawner.id}_${waveCount}`);
}

function onFinishAllWaves(waveSpawner: mc.Entity): void {
	try {
		const scoreboardObjective = mc.world.scoreboard.getObjective(waveSpawner.id,);

		if (!scoreboardObjective) return;

		const winners: { identity: mc.ScoreboardIdentity; score: number }[] = [];
		const participants = scoreboardObjective.getParticipants();

		for (const participant of participants) {
			if (participant.type === mc.ScoreboardIdentityType.FakePlayer) continue;

			const score = scoreboardObjective.getScore(participant,)!;

			winners.push({
				identity: participant,
				score,
			},);
		}

		winners.sort((a, b) => b.score - a.score);

		const congratulationMsg: mc.RawMessage = {
			rawtext: [
				{ translate: "scpdy.msg.theUnknownWaveSpawner.finished" },
				{ text: "\n" },
				{ translate: "scpdy.msg.theUnknownWaveSpawner.congratsSep1" },
				{ text: "\n" },
			],
		};

		for (const winner of winners) {
			congratulationMsg.rawtext!.push(
				{ text: `${winner.identity.displayName} - ${winner.score}` },
				{ text: "\n" },
			);

			const entity = winner.identity.getEntity();

			if (entity && entity instanceof mc.Player) {
				mc.system.run(() => {
					entity.sendMessage({
						translate: "scpdy.msg.theUnknownWaveSpawner.playerScore",
						with: [`${winner.score}`],
					},);

					const xp = Math.max(1, Math.ceil(winner.score * 0.8,),);

					entity.addExperience(xp,);
				},);
			}
		}

		congratulationMsg.rawtext!.push({ translate: "scpdy.msg.theUnknownWaveSpawner.congratsSep2" },);

		mc.world.sendMessage(congratulationMsg,);
	} finally {
		mc.system.run(() => {
			waveSpawner.kill();
		},);
	}
}

function onTickWaveBattle(waveSpawner: mc.Entity): void {
	const waveCount = waveSpawner.getProperty("lc:wave_count",) as number;
	const difficulty = getDifficulty(waveSpawner,);
	const waveEnemyArray = getWaveEnemyArray(waveCount, difficulty,);
	const nextWaveEnemyIndex = getNextWaveEnemyIndex(waveSpawner,);

	if (nextWaveEnemyIndex > waveEnemyArray.length - 1) {
		const nearbyWaveEnemies = getNearbyWaveEnemies(waveSpawner, waveCount,);

		if (nearbyWaveEnemies.length > 0) return;

		if (waveCount >= getLastWaveCount(difficulty,)) {
			onFinishAllWaves(waveSpawner,);
			return;
		}

		setNextWaveEnemyIndex(waveSpawner, 0,);
		waveSpawner.triggerEvent("the_unknown_wave_spawner:start_wave_break",);

		return;
	}

	const enemyTypeId = waveEnemyArray[nextWaveEnemyIndex]!;
	const spawnLoc = enemyTypeId === UNKNOWN_CORE_ENTITY_TYPE
		? {
			x: waveSpawner.location.x,
			y: Math.floor(waveSpawner.location.y,) + 1.6,
			z: waveSpawner.location.z,
		}
		: waveSpawner.location;

	const spawnedMob = waveSpawner.dimension.spawnEntity(enemyTypeId, spawnLoc,);

	spawnedMob.setDynamicProperty("waveId", `${waveSpawner.id}_${waveCount}`,);
	spawnedMob.setDynamicProperty("waveSpawnerId", waveSpawner.id,);

	setNextWaveEnemyIndex(waveSpawner, nextWaveEnemyIndex + 1,);
}

function stopBattleMusic(player: mc.Player): boolean {
	const battleMusic = player.getDynamicProperty("theUnknownBattleMusic",);

	if (battleMusic === undefined) return false;

	player.runCommand("music stop 5",);
	player.setDynamicProperty("theUnknownBattleMusic", undefined,);

	return true;
}

function afterRemove(id: string): void {
	try {
		mc.world.scoreboard.removeObjective(id,);
	} catch {}

	for (const player of mc.world.getPlayers()) {
		stopBattleMusic(player,);
	}
}

function onPlayerDie(player: mc.Player): void {
	const waveSpawnerNearby = player.dimension.getEntities({
		closest: 1,
		type: UNKNOWN_WAVE_SPAWNER_ENTITY_TYPE,
		maxDistance: 80,
		location: player.location,
	},)[0];

	if (!waveSpawnerNearby) {
		stopBattleMusic(player,);
		return;
	}

	const scoreboardObjective = mc.world.scoreboard.getObjective(waveSpawnerNearby.id,);

	if (!scoreboardObjective) return;
	if (!scoreboardObjective.hasParticipant(player,)) return;

	scoreboardObjective.addScore(player, -100,);
}

mc.world.afterEvents.worldLoad.subscribe(() => {
	for (const player of mc.world.getPlayers()) {
		stopBattleMusic(player,);
	}
},);

mc.world.beforeEvents.playerLeave.subscribe((event) => {
	stopBattleMusic(event.player,);
},);

mc.world.afterEvents.entitySpawn.subscribe((event) => {
	if (event.entity.typeId !== UNKNOWN_WAVE_SPAWNER_ENTITY_TYPE) return;

	mc.system.run(() => {
		onSpawn(event.entity,);
	},);
},);

mc.world.afterEvents.entityRemove.subscribe(
	(event) => {
		afterRemove(event.removedEntityId,);
	},
	{
		entityTypes: [UNKNOWN_WAVE_SPAWNER_ENTITY_TYPE],
	},
);

mc.world.afterEvents.entityDie.subscribe(
	(event) => {
		onPlayerDie(event.deadEntity as mc.Player,);
	},
	{
		entityTypes: ["minecraft:player"],
	},
);

mc.world.afterEvents.entityHurt.subscribe((event) => {
	try {
		if (!event.damageSource.damagingEntity) return;
		if (!isUnknownRace(event.hurtEntity,)) return;

		const waveSpawnerId = ensureType(
			event.hurtEntity.getDynamicProperty("waveSpawnerId",),
			"string",
		);

		if (waveSpawnerId === undefined) return;

		const scoreboardObjective = mc.world.scoreboard.getObjective(waveSpawnerId,);

		if (!scoreboardObjective) return;

		const score = clamp(event.damage, 0, event.hurtEntity.getComponent("health",)!.effectiveMax,);

		scoreboardObjective.addScore(event.damageSource.damagingEntity, score,);
	} catch {}
},);

mc.world.afterEvents.dataDrivenEntityTrigger.subscribe(
	(event) => {
		switch (event.eventId) {
			case "the_unknown_wave_spawner:start_wave_break":
				onStartWaveBreakEvent(event.entity,);
				break;
			case "the_unknown_wave_spawner:on_finish_wave_break":
				onEndWaveBreakEvent(event.entity,);
				break;
			case "the_unknown_wave_spawner:on_tick_wave_battle":
				onTickWaveBattle(event.entity,);
				break;
		}
	},
	{
		entityTypes: [UNKNOWN_WAVE_SPAWNER_ENTITY_TYPE],
		eventTypes: [
			"the_unknown_wave_spawner:start_wave_break",
			"the_unknown_wave_spawner:on_finish_wave_break",
			"the_unknown_wave_spawner:on_tick_wave_battle",
		],
	},
);
