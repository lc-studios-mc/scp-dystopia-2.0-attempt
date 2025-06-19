import * as mc from "@minecraft/server";
import * as vec3 from "@/utils/vec3";

const ENTITY_TYPE = "lc:scpdy_auto_frag_grenade";

export type AutoFragGrenadePath = {
	points: mc.Vector3[];
};

export function calculateAutoFragGrenadePath(
	dimension: mc.Dimension,
	origin: mc.Vector3,
	goal: mc.Vector3,
): AutoFragGrenadePath | undefined {
	const testHoleAtHeight = (height: number): boolean =>
		raycastForBlockBetween(
			dimension,
			{
				x: goal.x,
				y: height,
				z: goal.z,
			},
			{
				x: origin.x,
				y: height,
				z: origin.z,
			},
		) === undefined;

	let heightWithHole: number | undefined = undefined;

	for (let i = 0; i < 15; i++) {
		const height = origin.y + i;

		if (!testHoleAtHeight(height)) continue;

		const isThereBlockBetweenNextHeight =
			raycastForBlockBetween(
				dimension,
				{
					x: origin.x,
					y: height,
					z: origin.z,
				},
				{
					x: origin.x,
					y: height + 1,
					z: origin.z,
				},
			) !== undefined;

		if (isThereBlockBetweenNextHeight) break;

		heightWithHole = height;

		break;
	}

	if (heightWithHole === undefined) return;

	const pointA: mc.Vector3 = {
		x: origin.x,
		y: heightWithHole,
		z: origin.z,
	};

	const pointB: mc.Vector3 = {
		x: goal.x,
		y: heightWithHole,
		z: goal.z,
	};

	if (raycastForBlockBetween(dimension, pointA, pointB)) return;
	if (raycastForBlockBetween(dimension, pointB, goal)) return;

	return {
		points: [pointA, pointB],
	};
}

function raycastForBlockBetween(dimension: mc.Dimension, a: mc.Vector3, b: mc.Vector3): mc.BlockRaycastHit | undefined {
	const dir = vec3.normalize(vec3.sub(b, a));
	const raycastHit = dimension.getBlockFromRay(a, dir, {
		includePassableBlocks: false,
		includeLiquidBlocks: false,
		maxDistance: vec3.distance(a, b),
	});
	return raycastHit;
}

export type ThrowAutoFragGrenadeOpts = {
	dimension: mc.Dimension;
	from: mc.Vector3;
	goal: mc.Vector3;
	source?: mc.Entity;
};

export function throwAutoFragGrenade(opts: ThrowAutoFragGrenadeOpts): mc.Entity {
	const fragGrenade = opts.dimension.spawnEntity(ENTITY_TYPE, opts.from);
	const path = calculateAutoFragGrenadePath(opts.dimension, opts.from, opts.goal);

	if (!path) {
		fragGrenade.triggerEvent("lc:stop");
		fragGrenade.triggerEvent("lc:add_explosion_timer");
		return fragGrenade;
	}

	thrownAutoFragGrenadeDataById.set(fragGrenade.id, {
		dimension: opts.dimension,
		fragGrenade,
		path,
		source: opts.source,
		currentPointIndex: 0,
	});

	return fragGrenade;
}

type ThrownAutoFragGrenadeData = {
	dimension: mc.Dimension;
	fragGrenade: mc.Entity;
	path: AutoFragGrenadePath;
	source?: mc.Entity;
	currentPointIndex: number;
};

const thrownAutoFragGrenadeDataById = new Map<string, ThrownAutoFragGrenadeData>();

mc.system.afterEvents.scriptEventReceive.subscribe(
	(e) => {
		if (e.id !== "scpdy_auto_frag_grenade:update") return;

		const entity = e.sourceEntity;
		if (!entity) return;
		if (!entity.isValid) return;
		if (entity.typeId !== ENTITY_TYPE) return;

		onUpdate(entity);
	},
	{
		namespaces: ["scpdy_auto_frag_grenade"],
	},
);

mc.world.afterEvents.entityRemove.subscribe(
	(e) => {
		thrownAutoFragGrenadeDataById.delete(e.removedEntityId);
	},
	{
		entityTypes: [ENTITY_TYPE],
	},
);

function onUpdate(fragGrenade: mc.Entity): void {
	const data = thrownAutoFragGrenadeDataById.get(fragGrenade.id);

	if (!data) {
		explode(fragGrenade);
		return;
	}

	if (data.currentPointIndex > data.path.points.length - 1 && !fragGrenade.getProperty("lc:is_stopped")) {
		fragGrenade.triggerEvent("lc:stop");
		fragGrenade.triggerEvent("lc:add_explosion_timer");
		fragGrenade.dimension.playSound("scpdy.frag_grenade.hit", fragGrenade.location, {
			volume: 1.2,
		});
		return;
	}

	const point = data.path.points[data.currentPointIndex];

	if (!point) {
		explode(fragGrenade);
		return;
	}

	fragGrenade.teleport(point);

	data.currentPointIndex++;
}

function explode(fragGrenade: mc.Entity): void {
	fragGrenade.triggerEvent("explode");
}
