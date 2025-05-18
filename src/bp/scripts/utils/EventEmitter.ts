/**
 * Type definitions for event handlers
 */
export type EventHandler<T = any, R = void> = (data: T) => R | Promise<R>;
export type EventMap = Record<string, any>;
export type ReturnTypeMap = Record<string, any>;

/**
 * Options for event subscription
 */
export interface SubscriptionOptions {
	/** Run the handler only once, then automatically unsubscribe */
	once?: boolean;
	/** Priority of the handler (higher numbers execute first) */
	priority?: number;
}

/**
 * Subscription object returned when subscribing to an event
 */
export interface Subscription {
	/** Unsubscribe from the event */
	unsubscribe: () => void;
	/** Pause the subscription temporarily */
	pause: () => void;
	/** Resume a paused subscription */
	resume: () => void;
	/** Check if subscription is currently active */
	isActive: () => boolean;
}

/**
 * Internal representation of a subscriber
 */
interface Subscriber<T = any, R = any> {
	handler: EventHandler<T, R>;
	once: boolean;
	priority: number;
	active: boolean;
	id: number;
}

/**
 * A flexible and type-safe event emitter supporting synchronous and asynchronous event handling,
 * handler priorities, one-time subscriptions, and subscription management (pause/resume/unsubscribe).
 *
 * @example
 * // Define your event map
 * interface MyEvents {
 *   'user:login': { username: string };
 *   'user:logout': void;
 * }
 * interface MyReturns {
 *   'user:login': boolean;
 *   'user:logout': void;
 * }
 *
 * // Create an emitter instance
 * const emitter = new EventEmitter<MyEvents, MyReturns>();
 *
 * // Subscribe to an event
 * const sub = emitter.on('user:login', (data) => {
 *   console.log(`${data.username} logged in`);
 *   return true;
 * });
 *
 * // Emit an event synchronously
 * const results = emitter.emit('user:login', { username: 'alice' });
 * // results: [true]
 *
 * // Subscribe to an event only once
 * emitter.once('user:logout', () => {
 *   console.log('User logged out');
 * });
 *
 * // Emit asynchronously (supports async handlers)
 * await emitter.emitAsync('user:logout', undefined);
 *
 * // Pause and resume a subscription
 * sub.pause();
 * sub.resume();
 *
 * // Unsubscribe
 * sub.unsubscribe();
 */
export class EventEmitter<
	Events extends EventMap = Record<string, any>,
	Returns extends ReturnTypeMap = Record<keyof Events, void>,
> {
	private subscribers: Map<keyof Events, Subscriber[]> = new Map();
	private idCounter: number = 0;

	/**
	 * Subscribe to an event
	 * @param eventName - Name of the event to subscribe to
	 * @param handler - Handler function to be called when the event is emitted
	 * @param options - Subscription options
	 * @returns Subscription object for controlling the subscription
	 */
	public on<K extends keyof Events & keyof Returns>(
		eventName: K,
		handler: EventHandler<Events[K], Returns[K]>,
		options: SubscriptionOptions = {},
	): Subscription {
		const { once = false, priority = 0 } = options;
		const id = this.idCounter++;

		const subscriber: Subscriber<Events[K], Returns[K]> = {
			handler,
			once,
			priority,
			active: true,
			id,
		};

		if (!this.subscribers.has(eventName)) {
			this.subscribers.set(eventName, []);
		}

		const eventSubscribers = this.subscribers.get(eventName)!;

		// Insert based on priority (higher priority first)
		let insertIndex = eventSubscribers.findIndex((sub) => sub.priority < priority);
		if (insertIndex === -1) {
			insertIndex = eventSubscribers.length;
		}

		eventSubscribers.splice(insertIndex, 0, subscriber);

		return {
			unsubscribe: () => this.off(eventName, id),
			pause: () => this.pauseSubscription(eventName, id),
			resume: () => this.resumeSubscription(eventName, id),
			isActive: () => this.isSubscriptionActive(eventName, id),
		};
	}

	/**
	 * Subscribe to an event and automatically unsubscribe after the first emission
	 * @param eventName - Name of the event to subscribe to
	 * @param handler - Handler function to be called when the event is emitted
	 * @param priority - Priority of the handler (higher numbers execute first)
	 * @returns Subscription object for controlling the subscription
	 */
	public once<K extends keyof Events & keyof Returns>(
		eventName: K,
		handler: EventHandler<Events[K], Returns[K]>,
		priority = 0,
	): Subscription {
		return this.on(eventName, handler, { once: true, priority });
	}

	/**
	 * Emit an event synchronously and collect results
	 * @param eventName - Name of the event to emit
	 * @param data - Data to pass to handlers
	 * @returns Array of results from all handlers
	 */
	public emit<K extends keyof Events & keyof Returns>(eventName: K, data: Events[K]): Returns[K][] {
		if (!this.subscribers.has(eventName)) {
			return [];
		}

		const subscribers = this.subscribers.get(eventName)!;
		const toRemove: number[] = [];
		const results: Returns[K][] = [];

		// Create a copy to avoid issues if handlers modify the subscribers array
		const activeSubscribers = [...subscribers].filter((sub) => sub.active);

		for (const subscriber of activeSubscribers) {
			try {
				const result = subscriber.handler(data) as Returns[K];
				results.push(result);
			} catch (error) {
				// @ts-expect-error
				console.error(`Error in event handler for "${String(eventName)}":`, error);
			}

			if (subscriber.once) {
				toRemove.push(subscriber.id);
			}
		}

		// Remove 'once' subscribers
		if (toRemove.length > 0) {
			this.subscribers.set(
				eventName,
				subscribers.filter((sub) => !toRemove.includes(sub.id)),
			);
		}

		return results;
	}

	/**
	 * Emit an event with data and collect results, including from async handlers
	 * @param eventName - Name of the event to emit
	 * @param data - Data to pass to handlers
	 * @returns Promise that resolves with an array of results from all handlers
	 */
	public async emitAsync<K extends keyof Events & keyof Returns>(eventName: K, data: Events[K]): Promise<Returns[K][]> {
		if (!this.subscribers.has(eventName)) {
			return [];
		}

		const subscribers = this.subscribers.get(eventName)!;
		const results: Array<Returns[K] | Promise<Returns[K]>> = [];
		const toRemove: number[] = [];

		// Create a copy to avoid issues if handlers modify the subscribers array
		const activeSubscribers = [...subscribers].filter((sub) => sub.active);

		for (const subscriber of activeSubscribers) {
			try {
				const result = subscriber.handler(data);
				results.push(result);
			} catch (error) {
				// @ts-expect-error
				console.error(`Error in event handler for "${String(eventName)}":`, error);
			}

			if (subscriber.once) {
				toRemove.push(subscriber.id);
			}
		}

		// Remove 'once' subscribers
		if (toRemove.length > 0) {
			this.subscribers.set(
				eventName,
				subscribers.filter((sub) => !toRemove.includes(sub.id)),
			);
		}

		// Wait for all results to resolve (whether they're promises or not)
		return Promise.all(results);
	}

	/**
	 * Remove a specific subscriber by ID or all subscribers for an event
	 * @param eventName - Name of the event
	 * @param handlerId - Optional ID of the handler to remove
	 */
	public off<K extends keyof Events>(eventName: K, handlerId?: number): void {
		if (!this.subscribers.has(eventName)) {
			return;
		}

		if (handlerId === undefined) {
			// Remove all subscribers for this event
			this.subscribers.delete(eventName);
		} else {
			// Remove specific subscriber
			const eventSubscribers = this.subscribers.get(eventName)!;
			const filteredSubscribers = eventSubscribers.filter((sub) => sub.id !== handlerId);

			if (filteredSubscribers.length === 0) {
				this.subscribers.delete(eventName);
			} else {
				this.subscribers.set(eventName, filteredSubscribers);
			}
		}
	}

	/**
	 * Remove all event subscriptions
	 */
	public removeAllListeners(): void {
		this.subscribers.clear();
	}

	/**
	 * Get the number of subscribers for a specific event
	 * @param eventName - Name of the event
	 * @returns Number of subscribers
	 */
	public listenerCount<K extends keyof Events>(eventName: K): number {
		if (!this.subscribers.has(eventName)) {
			return 0;
		}
		return this.subscribers.get(eventName)!.length;
	}

	/**
	 * Check if an event has any subscribers
	 * @param eventName - Name of the event
	 * @returns True if the event has subscribers
	 */
	public hasListeners<K extends keyof Events>(eventName: K): boolean {
		return this.listenerCount(eventName) > 0;
	}

	/**
	 * Pause a subscription
	 * @param eventName - Name of the event
	 * @param handlerId - ID of the handler to pause
	 */
	private pauseSubscription<K extends keyof Events>(eventName: K, handlerId: number): void {
		this.setSubscriptionState(eventName, handlerId, false);
	}

	/**
	 * Resume a paused subscription
	 * @param eventName - Name of the event
	 * @param handlerId - ID of the handler to resume
	 */
	private resumeSubscription<K extends keyof Events>(eventName: K, handlerId: number): void {
		this.setSubscriptionState(eventName, handlerId, true);
	}

	/**
	 * Check if a subscription is active
	 * @param eventName - Name of the event
	 * @param handlerId - ID of the handler to check
	 * @returns True if the subscription is active
	 */
	private isSubscriptionActive<K extends keyof Events>(eventName: K, handlerId: number): boolean {
		if (!this.subscribers.has(eventName)) {
			return false;
		}

		const subscriber = this.subscribers.get(eventName)!.find((sub) => sub.id === handlerId);
		return subscriber ? subscriber.active : false;
	}

	/**
	 * Set the active state of a subscription
	 * @param eventName - Name of the event
	 * @param handlerId - ID of the handler
	 * @param active - Active state to set
	 */
	private setSubscriptionState<K extends keyof Events>(eventName: K, handlerId: number, active: boolean): void {
		if (!this.subscribers.has(eventName)) {
			return;
		}

		const eventSubscribers = this.subscribers.get(eventName)!;
		const subscriber = eventSubscribers.find((sub) => sub.id === handlerId);

		if (subscriber) {
			subscriber.active = active;
		}
	}
}
