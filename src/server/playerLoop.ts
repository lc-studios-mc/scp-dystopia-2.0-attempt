import * as mc from "@minecraft/server";

type PlayerLoopCallback = (player: mc.Player) => void;

const EVENT_LISTENERS = new Set<PlayerLoopCallback>();

export function subscribe(callback: PlayerLoopCallback): PlayerLoopCallback {
  if (EVENT_LISTENERS.has(callback)) throw new Error("The callback is already subscribed!");

  EVENT_LISTENERS.add(callback);

  return callback;
}

export function unsubscribe(callback: PlayerLoopCallback): boolean {
  return EVENT_LISTENERS.delete(callback);
}

function loop(): void {
  const players = mc.world.getPlayers();

  for (let i = 0; i < players.length; i++) {
    const player = players[i]!;

    for (const callback of EVENT_LISTENERS) {
      callback(player);
    }
  }
}

mc.system.runInterval(loop, 1);
