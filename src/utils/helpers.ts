import type { Address, Hex } from "./types.js";

export const isHex = (value: string): value is Hex => /^0x[0-9a-fA-F]*$/.test(value);

export const isAddress = (value: string): value is Address => /^0x[0-9a-fA-F]{40}$/.test(value);

export const toBigIntSafe = (value: unknown, fallback: bigint = 0n): bigint => {
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(value);
    if (typeof value === "string") return BigInt(value);
    return fallback;
  } catch {
    return fallback;
  }
};

export const shallowEqual = <T extends object>(a: T, b: T): boolean => {
  if (a === b) return true;
  const aKeys = Object.keys(a) as Array<keyof T>;
  const bKeys = Object.keys(b) as Array<keyof T>;
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (
      (a as Record<string, unknown>)[key as string] !==
      (b as Record<string, unknown>)[key as string]
    ) {
      return false;
    }
  }
  return true;
};
