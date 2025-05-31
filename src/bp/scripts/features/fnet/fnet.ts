import { EventEmitter } from "@/utils/EventEmitter";
import * as mc from "@minecraft/server";

export const LkdnEvents = new EventEmitter<{
	onStart: {
		fzone: Fzone;
		duration?: number;
	};
	onStop: {
		fzone: Fzone;
	};
	onScheduled: {
		fzone: Fzone;
		delay: number;
		duration?: number;
	};
	onScheduleCanceled: {
		fzone: Fzone;
	};
}>();

export const MAX_FNET_COUNT = 5;
export const MAX_FZONE_COUNT = 10;

let fnets: Fnet[] | undefined = undefined;

mc.world.afterEvents.worldLoad.subscribe(() => {
	fnets = Array.from({ length: MAX_FNET_COUNT }, (_, index) => new Fnet(index));
});

/**
 * Creates an {@link Fnet} (facility network) object or retrieves a cached one from previous call.
 * @param index - The index of the facility network (zero-based).
 * @returns Facility network.
 */
export function getFnet(index: number): Fnet {
	if (!fnets) throw new Error("fnets are not available yet");

	index = Math.floor(index);

	throwIfFnetIndexIsInvalid(index);

	const fnet = fnets[index]!;

	return fnet;
}

/**
 * Gets all available Fnet (facility network) objects.
 * @returns Array of Fnet objects.
 */
export function getAllFnets(): readonly Fnet[] {
	if (!fnets) throw new Error("fnets are not available yet");

	return fnets;
}

function throwIfFnetIndexIsInvalid(index: number): void {
	if (index < 0) throw new Error(`Provided index (${index}) is less than 0.`);
	if (index > MAX_FNET_COUNT)
		throw new RangeError(`Provided index (${index}) exceeds the maximum facility network count.`);
}

function throwIfFzoneIndexIsInvalid(index: number): void {
	if (index < 0) throw new Error(`Provided index (${index}) is less than 0.`);
	if (index > MAX_FZONE_COUNT)
		throw new RangeError(`Provided index (${index}) exceeds the maximum facility zone count.`);
}

mc.world.afterEvents.worldLoad.subscribe(() => {
	mc.system.runInterval(() => {
		for (let i = 0; i < MAX_FNET_COUNT; i++) {
			const fnet = getFnet(i);

			for (let i = 0; i < MAX_FZONE_COUNT; i++) {
				const fzone = fnet.getZone(i);

				updateZoneStates(fzone);
			}
		}
	}, 20);
});

function updateZoneStates(zone: Fzone): void {
	const lkdnDuration = zone.getLkdnDuration();
	const scheduledLkdnDelay = zone.getScheduledLkdnDelay();

	if (scheduledLkdnDelay != undefined && scheduledLkdnDelay > 0) {
		const next = scheduledLkdnDelay - 1;

		zone.setScheduledLkdnDelay(next);

		if (next <= 0) {
			zone.startLkdn(lkdnDuration);
		}

		return; // Dont remove this return
	}

	if (lkdnDuration != undefined && lkdnDuration > 0) {
		const next = lkdnDuration - 1;
		zone.setLkdnDuration(next);
	}

	if (lkdnDuration == undefined) {
		zone.stopLkdn();
	}
}

/**
 * Allows access to the properties of a facility network at a particular index.
 *
 * @example
 * ```typescript
 * // After the world is initialized
 * let fnet = new Fnet(0)
 * fnet.setCustomName("My SCP Facility")
 * world.sendMessage(fnet.getCustomName()) // "My SCP Facility"
 * ```
 */
export class Fnet {
	readonly index: number;
	private cachedZones: Fzone[] = new Array(MAX_FZONE_COUNT);

	/** @param index - The index of the facility network (zero-based). */
	constructor(index: number) {
		index = Math.floor(index);

		throwIfFnetIndexIsInvalid(index);

		this.index = index;
	}

	get name(): mc.RawMessage {
		const customName = this.getCustomName();

		let value: mc.RawMessage;
		if (customName == undefined) {
			value = {
				translate: "scpdy.fnet.nonameX",
				with: [`${this.index + 1}`],
			};
		} else {
			value = {
				translate: "scpdy.fnet.customNameX",
				with: [`${this.index + 1}`, customName],
			};
		}

		return value;
	}

	prefix(value: string): string {
		return `fnet_${this.index}_${value}`;
	}

	getCustomName(): string | undefined {
		const propId = this.prefix("name");

		const value = mc.world.getDynamicProperty(propId);

		return value == undefined ? undefined : String(value).trim();
	}

	setCustomName(value?: string): void {
		const propId = this.prefix("name");

		if (value == undefined || value.trim() === "") value = undefined;

		mc.world.setDynamicProperty(propId, value);
	}

	/**
	 * Creates an {@link Fzone} (facility zone) object or retrieves a cached one from previous call.
	 * @param index - The index of the facility zone (zero-based).
	 * @returns Facility zone.
	 */
	getZone(index: number): Fzone {
		index = Math.floor(index);

		throwIfFzoneIndexIsInvalid(index);

		let fzone = this.cachedZones[index];

		if (!fzone) {
			fzone = new Fzone(index, this);
			this.cachedZones[index] = fzone;
		}

		return fzone;
	}

	/**
	 * Retrieves all available Fzones (facility zones) that belong to this facility network.
	 * @returns Array of Fzone objects.
	 */
	getAllZones(): readonly Fzone[] {
		for (let i = 0; i < MAX_FZONE_COUNT; i++) {
			this.getZone(i); // Update cache
		}

		return this.cachedZones;
	}
}

/**
 * Allow access to properties of one facility zone that belongs to a specific facility network.
 *
 * @example 1
 * ```typescript
 * let fnet = new Fnet(2)
 * let fzone = fnet.getZone(3) // Facility zone object will be cached
 * ```
 *
 * @example 2
 * ```typescript
 * let fzone = new Fzone(3, new Fnet(2)) // Shorter but no caching
 * ```
 */
export class Fzone {
	readonly index: number;
	readonly fnet: Fnet;

	/**
	 * @param index - The index of the facility network (zero-based).
	 * @param fnet - The facility network this zone belongs to.
	 **/
	constructor(index: number, fnet: Fnet) {
		index = Math.floor(index);

		throwIfFzoneIndexIsInvalid(index);

		this.index = index;
		this.fnet = fnet;
	}

	/** Alias for {@link getLkdnActive}. */
	get isLkdnActive(): boolean {
		return this.getLkdnActive() === true;
	}

	/** Whether the value returned from {@link getScheduledLkdnDelay} is greater than 0. */
	get isLkdnScheduled(): boolean {
		return Boolean(this.getScheduledLkdnDelay());
	}

	get name(): mc.RawMessage {
		const customName = this.getCustomName();

		let value: mc.RawMessage;
		if (customName == undefined) {
			value = {
				translate: "scpdy.fzone.nonameX",
				with: [`${this.index + 1}`],
			};
		} else {
			value = {
				translate: "scpdy.fzone.customNameX",
				with: [`${this.index + 1}`, customName],
			};
		}

		return value;
	}

	prefix(value: string): string {
		return this.fnet.prefix(`fzone_${this.index}_${value}`);
	}

	getCustomName(): string | undefined {
		const propId = this.prefix("name");

		const value = mc.world.getDynamicProperty(propId);

		return value == undefined ? undefined : String(value).trim();
	}

	setCustomName(value?: string): void {
		const propId = this.prefix("name");

		if (value == undefined || value.trim() === "") value = undefined;

		mc.world.setDynamicProperty(propId, value);
	}

	/** Gets whether the lockdown is active in this facility zone. */
	getLkdnActive(): boolean | undefined {
		const propId = this.prefix("isLkdnActive");
		const value = mc.world.getDynamicProperty(propId);

		return typeof value == "boolean" ? value : undefined;
	}

	/**
	 * Sets whether the lockdown is active in this facility zone.
	 *
	 * **Do not call this method directly!**
	 * Use {@link startLkdn} instead.
	 **/
	setLkdnActive(value?: boolean): void {
		const propId = this.prefix("isLkdnActive");

		if (value == undefined || value == false) value = undefined;

		mc.world.setDynamicProperty(propId, value);
	}

	/** Gets the scheduled delay (in seconds) before this facility zone is locked down. */
	getScheduledLkdnDelay(): number | undefined {
		const propId = this.prefix("lkdnDelay");
		const value = mc.world.getDynamicProperty(propId);

		return typeof value == "number" ? (value === 45451919 ? Infinity : value) : undefined;
	}

	/**
	 * Sets the scheduled delay (in seconds) before this facility zone is locked down.
	 *
	 * **Do not call this method directly!**
	 * Use {@link scheduleLkdn} instead.
	 **/
	setScheduledLkdnDelay(value?: number): void {
		const propId = this.prefix("lkdnDelay");

		if (value == undefined || value <= 0) value = undefined;
		else if (value === Infinity) value = 45451919;

		mc.world.setDynamicProperty(propId, value);
	}

	/** Gets the duration (in seconds) for which this facility zone will be locked down. */
	getLkdnDuration(): number | undefined {
		const propId = this.prefix("lkdnDuration");
		const value = mc.world.getDynamicProperty(propId);

		return typeof value == "number" ? (value === 45451919 ? Infinity : value) : undefined;
	}

	/**
	 * Sets the duration (in seconds) for which this facility zone will be locked down.
	 *
	 * **Do not call this method directly!**
	 * Use {@link startLkdn} or {@link scheduleLkdn} instead.
	 **/
	setLkdnDuration(value?: number): void {
		const propId = this.prefix("lkdnDuration");

		if (value == undefined || value <= 0) value = undefined;
		else if (value === Infinity) value = 45451919;

		mc.world.setDynamicProperty(propId, value);
	}

	/**
	 * Starts the lockdown of this facility zone immediately.
	 *
	 * If `duration` is set, the lockdown will automatically stop once that period has elapsed.
	 * You can also stop it manually by calling {@link stopLkdn}.
	 *
	 * @param duration - Duration (in seconds) for which this facility zone will be locked down.
	 * @returns Whether the lockdown was successfully started.
	 */
	startLkdn(duration = Infinity): boolean {
		if (this.getLkdnActive()) return false;

		if (duration != undefined && duration > 0) {
			this.setLkdnDuration(duration);
		}

		this.cancelScheduledLkdn(); // Before starting the lockdown immediately, the scheduled one should be canceled first.
		this.setLkdnActive(true);

		LkdnEvents.emit("onStart", {
			fzone: this,
			duration,
		});

		return true;
	}

	/**
	 * Stops the lockdown of this facility zone.
	 * @returns Whether the lockdown was successfully stopped.
	 */
	stopLkdn(): boolean {
		if (!this.getLkdnActive()) return false;

		// These properties should be set to undefined for the sake of clean data space.
		this.setLkdnActive(undefined);
		this.setScheduledLkdnDelay(undefined);
		this.setLkdnDuration(undefined);

		LkdnEvents.emit("onStop", {
			fzone: this,
		});

		return true;
	}

	/**
	 * Schedules a future lockdown.
	 * @param delay - Delay (in seconds) before the lockdown begins..
	 * @param duration - Duration (in seconds) for which this facility zone will be locked down.
	 * @returns Whether the lockdown was scheduled successfully.
	 */
	scheduleLkdn(delay: number, duration = Infinity): boolean {
		if (this.getLkdnActive()) return false;

		this.setScheduledLkdnDelay(delay);

		if (duration != undefined && duration > 0) {
			this.setLkdnDuration(duration);
		}

		LkdnEvents.emit("onScheduled", {
			fzone: this,
			delay,
		});

		return true;
	}

	/**
	 * Clears the currently scheduled lockdown.
	 * @returns Whether the scheduled lockdown was cleared successfully.
	 */
	cancelScheduledLkdn(): boolean {
		if (this.getLkdnActive()) return false;

		const delay = this.getScheduledLkdnDelay();

		if (delay == undefined || delay <= 0) return false;

		this.setScheduledLkdnDelay(undefined);

		LkdnEvents.emit("onScheduleCanceled", {
			fzone: this,
		});

		return true;
	}
}
