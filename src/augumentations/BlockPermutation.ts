import { BlockPermutation } from "@minecraft/server";

declare module "@minecraft/server" {
  interface BlockPermutation {
    getState(stateName: string): boolean | number | string | undefined;
    withState(name: string, value: boolean | number | string): BlockPermutation;
  }
}
