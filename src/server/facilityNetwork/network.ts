import { system, world } from "@minecraft/server";
import { ensureType } from "@lib/utils/miscUtils";

export type FacilityZone = {
	readonly index: number;
	name?: string;
	readonly isLockdownActive: boolean;
	lockdownDelay?: number;
	startLockdown: (delay?: number, duration?: number) => boolean;
	stopLockdown: () => boolean;
};

export type FacilityNetwork = {
	readonly index: number;
	name?: string;
	getZone: (index: number) => FacilityZone;
};

class _FacilityZone implements FacilityZone {
	constructor(
		public readonly network: _FacilityNetwork,
		public readonly index: number,
	) {}

	get name(): string | undefined {
		return ensureType(
			world.getDynamicProperty(`scpdy_facilityZone_${this.network.index}_${this.index}_name`),
			"string",
		);
	}

	set name(value: string | undefined) {
		world.setDynamicProperty(`scpdy_facilityZone_${this.network.index}_${this.index}_name`, value);
	}

	get isLockdownActive(): boolean {
		return (
			world.getDynamicProperty(
				`scpdy_facilityZone_${this.network.index}_${this.index}_lockdown`,
			) === true
		);
	}

	private set isLockdownActive(value: boolean | undefined) {
		world.setDynamicProperty(
			`scpdy_facilityZone_${this.network.index}_${this.index}_lockdown`,
			value,
		);
	}

	get lockdownDelay(): number | undefined {
		return ensureType(
			world.getDynamicProperty(
				`scpdy_facilityZone_${this.network.index}_${this.index}_lockdownDelay`,
			),
			"number",
		);
	}

	set lockdownDelay(value: number | undefined) {
		const val = value !== undefined && value > 0 ? Math.max(0, Math.floor(value)) : undefined;

		world.setDynamicProperty(
			`scpdy_facilityZone_${this.network.index}_${this.index}_lockdownDelay`,
			val,
		);
	}

	get lockdownDuration(): number | undefined {
		return ensureType(
			world.getDynamicProperty(
				`scpdy_facilityZone_${this.network.index}_${this.index}_lockdownDuration`,
			),
			"number",
		);
	}

	set lockdownDuration(value: number | undefined) {
		const val = value !== undefined && value > 0 ? Math.max(0, Math.floor(value)) : undefined;

		world.setDynamicProperty(
			`scpdy_facilityZone_${this.network.index}_${this.index}_lockdownDuration`,
			val,
		);
	}

	startLockdown(delay?: number, duration?: number): boolean {
		if (this.isLockdownActive) return false;

		this.lockdownDuration = duration;

		if (delay === undefined || delay <= 0) {
			this.isLockdownActive = true;
			return true;
		}

		this.lockdownDelay = delay;

		return true;
	}

	stopLockdown(): boolean {
		this.isLockdownActive = undefined;
		this.lockdownDelay = undefined;
		this.lockdownDuration = undefined;

		return true;
	}
}

class _FacilityNetwork implements FacilityNetwork {
	private zones: _FacilityZone[];

	constructor(public readonly index: number) {
		this.zones = Array(MAX_FACILITY_ZONE_COUNT);
	}

	get name(): string | undefined {
		return ensureType(
			world.getDynamicProperty(`scpdy_facilityNetwork_${this.index}_name`),
			"string",
		);
	}

	set name(value: string | undefined) {
		world.setDynamicProperty(`scpdy_facilityNetwork_${this.index}_name`, value);
	}

	getZone(index: number): _FacilityZone {
		if (index < 0 || index >= MAX_FACILITY_ZONE_COUNT) {
			throw new Error(`Invalid zone index: ${index}`);
		}

		let zone = this.zones[index];
		if (zone) return zone;

		zone = new _FacilityZone(this, index);
		this.zones[index] = zone;

		return zone;
	}
}

export const MAX_FACILITY_NETWORK_COUNT = 5; // This is the maximum number of facility networks that can be created.
export const MAX_FACILITY_ZONE_COUNT = 10; // This is the maximum number of zones that can be created in a facility network.

const FACILITY_NETWORKS: _FacilityNetwork[] = Array(MAX_FACILITY_NETWORK_COUNT); // An array of facility networks.

/**
 * Returns the FacilityNetwork at the given index.
 * @throws If the index is out of the index is invalid (less than 0 or greater than/equal to MAX_NETWORK_COUNT)
 * @param {number} index The index of the network to retrieve.
 * @returns {_FacilityNetwork} The network at the given index.
 */
export function getFacilityNetwork(index: number): _FacilityNetwork {
	if (index < 0 || index >= MAX_FACILITY_NETWORK_COUNT) {
		throw new Error(`Invalid network index: ${index}`);
	}

	let network = FACILITY_NETWORKS[index];
	if (network) return network;

	network = new _FacilityNetwork(index);
	FACILITY_NETWORKS[index] = network;

	return network;
}

function updateZoneLockdownTimers(): void {
	for (let i = 0; i < MAX_FACILITY_NETWORK_COUNT; i++) {
		const network = getFacilityNetwork(i);

		for (let j = 0; j < MAX_FACILITY_ZONE_COUNT; j++) {
			const zone = network.getZone(j);
			const lockdownDuration = zone.lockdownDuration;
			const lockdownDelay = zone.lockdownDelay;

			if (lockdownDelay !== undefined && lockdownDelay > 0) {
				const val = lockdownDelay - 1;

				if (val > 0) {
					zone.lockdownDelay = val;
					continue; // Don't update lockdown duration yet.
				} else {
					zone.lockdownDelay = undefined;
					zone.startLockdown();
				}
			}

			if (lockdownDuration !== undefined && lockdownDuration > 0) {
				const val = lockdownDuration - 1;

				if (val > 0) {
					zone.lockdownDuration = val;
				} else {
					zone.lockdownDuration = undefined;
					zone.stopLockdown();
				}
			}
		}
	}
}

world.afterEvents.worldInitialize.subscribe(() => {
	system.runInterval(updateZoneLockdownTimers, 20);
});
