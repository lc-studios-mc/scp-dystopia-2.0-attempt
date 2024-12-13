import { Entity, Vector3 } from "@minecraft/server";

export const ONE = {
  x: 1,
  y: 1,
  z: 1,
} as const;

export const HALF = {
  x: 0.5,
  y: 0.5,
  z: 0.5,
} as const;

export const ZERO = {
  x: 0,
  y: 0,
  z: 0,
} as const;

export const UP = {
  x: 0,
  y: 1,
  z: 0,
} as const;

export const DOWN = {
  x: 0,
  y: -1,
  z: 0,
} as const;

export const LEFT = {
  x: -1,
  y: 0,
  z: 0,
} as const;

export const RIGHT = {
  x: 1,
  y: 0,
  z: 0,
} as const;

export const FORWARD = {
  x: 0,
  y: 0,
  z: 1,
} as const;

export const BACKWARD = {
  x: 0,
  y: 0,
  z: -1,
} as const;

export function fromPartial(value: Partial<Vector3>): Vector3 {
  return {
    x: value.x === undefined ? ZERO.x : ZERO.x + value.x,
    y: value.y === undefined ? ZERO.y : ZERO.y + value.y,
    z: value.z === undefined ? ZERO.z : ZERO.z + value.z,
  };
}

export function clone(vec: Vector3): Vector3 {
  return { x: vec.x, y: vec.y, z: vec.z };
}

export function add(vec1: Vector3, ...vec2: Vector3[]): Vector3 {
  if (vec2.length === 1) {
    return {
      x: vec1.x + vec2[0]!.x,
      y: vec1.y + vec2[0]!.y,
      z: vec1.z + vec2[0]!.z,
    };
  }
  const result = { x: vec1.x, y: vec1.y, z: vec1.z };
  for (const vec of vec2) {
    result.x += vec.x;
    result.y += vec.y;
    result.z += vec.z;
  }
  return result;
}

export function sub(vec1: Vector3, ...vec2: Vector3[]): Vector3 {
  if (vec2.length === 1) {
    return {
      x: vec1.x - vec2[0]!.x,
      y: vec1.y - vec2[0]!.y,
      z: vec1.z - vec2[0]!.z,
    };
  }
  const result = { x: vec1.x, y: vec1.y, z: vec1.z };
  for (const vec of vec2) {
    result.x -= vec.x;
    result.y -= vec.y;
    result.z -= vec.z;
  }
  return result;
}

export function mul(vec1: Vector3, ...multipliers: (Vector3 | number)[]): Vector3 {
  if (multipliers.length === 0) return vec1;
  else if (multipliers.length === 1) {
    const multiplier = multipliers[0]!;

    if (typeof multiplier === "number") {
      return {
        x: vec1.x * multiplier,
        y: vec1.y * multiplier,
        z: vec1.z * multiplier,
      };
    }

    return {
      x: vec1.x * multiplier.x,
      y: vec1.y * multiplier.y,
      z: vec1.z * multiplier.z,
    };
  }

  const result = { x: vec1.x, y: vec1.y, z: vec1.z };
  for (const multiplier of multipliers) {
    if (typeof multiplier === "number") {
      result.x *= multiplier;
      result.y *= multiplier;
      result.z *= multiplier;
      continue;
    }

    result.x *= multiplier.x;
    result.y *= multiplier.y;
    result.z *= multiplier.z;
  }
  return result;
}

export function div(vec1: Vector3, ...divisors: (Vector3 | number)[]): Vector3 {
  if (divisors.length === 0) return vec1;
  else if (divisors.length === 1) {
    const divisor = divisors[0]!;

    if (typeof divisor === "number") {
      return {
        x: vec1.x / divisor,
        y: vec1.y / divisor,
        z: vec1.z / divisor,
      };
    }

    return {
      x: vec1.x / divisor.x,
      y: vec1.y / divisor.y,
      z: vec1.z / divisor.z,
    };
  }

  const result = { x: vec1.x, y: vec1.y, z: vec1.z };
  for (const divisor of divisors) {
    if (typeof divisor === "number") {
      result.x /= divisor;
      result.y /= divisor;
      result.z /= divisor;
      continue;
    }

    result.x /= divisor.x;
    result.y /= divisor.y;
    result.z /= divisor.z;
  }
  return result;
}

export function distance(vec1: Vector3, vec2: Vector3): number {
  return Math.sqrt((vec1.x - vec2.x) ** 2 + (vec1.y - vec2.y) ** 2 + (vec1.z - vec2.z) ** 2);
}

export function sqrDistance(vec1: Vector3, vec2: Vector3): number {
  return (vec1.x - vec2.x) ** 2 + (vec1.y - vec2.y) ** 2 + (vec1.z - vec2.z) ** 2;
}

export function normalize(vec: Vector3): Vector3 {
  const length: number = Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  return {
    x: vec.x / length,
    y: vec.y / length,
    z: vec.z / length,
  };
}

export function generateVectorsOnCircle(radius: number, density: () => number): Vector3[] {
  const vectors: Vector3[] = new Array(Math.ceil(Math.sqrt(2 * Math.PI * radius)));

  for (let i = 0, len = vectors.length; i < len; i++) {
    const angle = (i / len) * 2 * Math.PI;
    const x = radius * Math.cos(angle) * Math.sqrt(density());
    const y = radius * Math.sin(angle) * Math.sqrt(density());
    vectors[i] = { x, y, z: 0 };
  }

  return vectors;
}

export function random(): Vector3 {
  return { x: Math.random(), y: Math.random(), z: Math.random() };
}

export function randomDirection(): Vector3 {
  let theta = Math.random() * 2 * Math.PI;
  let phi = Math.acos(2 * Math.random() - 1);
  return {
    x: Math.sin(phi) * Math.cos(theta),
    y: Math.sin(phi) * Math.sin(theta),
    z: Math.cos(phi),
  };
}

export function randomLocationInSphere(sphereRadius: number): Vector3 {
  let direction = randomDirection();
  let randomRadius = Math.cbrt(Math.random()) * sphereRadius;
  return mul(direction, randomRadius);
}

export function rotateRad(vec: Vector3, axis: Vector3, radians: number): Vector3 {
  let cos = Math.cos(radians);
  let sin = Math.sin(radians);
  let dot = axis.x * vec.x + axis.y * vec.y + axis.z * vec.z;
  let crossX = axis.y * vec.z - axis.z * vec.y;
  let crossY = axis.z * vec.x - axis.x * vec.z;
  let crossZ = axis.x * vec.y - axis.y * vec.x;

  let x = vec.x * cos + crossX * sin + axis.x * dot * (1 - cos);
  let y = vec.y * cos + crossY * sin + axis.y * dot * (1 - cos);
  let z = vec.z * cos + crossZ * sin + axis.z * dot * (1 - cos);

  return { x, y, z };
}

export function rotateDeg(vec: Vector3, axis: Vector3, degrees: number): Vector3 {
  return rotateRad(vec, axis, (Math.PI / 180) * degrees);
}

export function changeDir(vec: Vector3, dir: Vector3): Vector3 {
  const magnitude = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);

  if (magnitude === 0) {
    // Handle zero vector case
    return vec;
  }

  const dirMagnitude = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);

  vec.x = (dir.x / dirMagnitude) * magnitude;
  vec.y = (dir.y / dirMagnitude) * magnitude;
  vec.z = (dir.z / dirMagnitude) * magnitude;

  return vec;
}

export function lerp(vec1: Vector3, vec2: Vector3, t: number): Vector3 {
  return {
    x: vec1.x + (vec2.x - vec1.x) * t,
    y: vec1.y + (vec2.y - vec1.y) * t,
    z: vec1.z + (vec2.z - vec1.z) * t,
  };
}

export function reflect(vec: Vector3, normal: Vector3): Vector3 {
  return sub(vec, mul(mul(normal, 2), dot(vec, normal)));
}

export function cross(vec1: Vector3, vec2: Vector3): Vector3 {
  return {
    x: vec1.y * vec2.z - vec1.z * vec2.y,
    y: vec1.z * vec2.x - vec1.x * vec2.z,
    z: vec1.x * vec2.y - vec1.y * vec2.x,
  };
}

export function dot(vec1: Vector3, vec2: Vector3): number {
  return vec1.x * vec2.x + vec1.y * vec2.y + vec1.z * vec2.z;
}

export function length(vec: Vector3): number {
  return Math.sqrt(vec.x ** 2 + vec.y ** 2 + vec.z ** 2);
}

export function sqrLength(vec: Vector3): number {
  return vec.x ** 2 + vec.y ** 2 + vec.z ** 2;
}

export function angle(vec1: Vector3, vec2: Vector3): number {
  return Math.acos(dot(normalize(vec1), normalize(vec2)));
}

export function midpoint(vec1: Vector3, vec2: Vector3): Vector3 {
  return {
    x: (vec1.x + vec2.x) / 2,
    y: (vec1.y + vec2.y) / 2,
    z: (vec1.z + vec2.z) / 2,
  };
}

export function clamp(vec: Vector3, min: Vector3, max: Vector3): Vector3 {
  return {
    x: Math.max(min.x, Math.min(max.x, vec.x)),
    y: Math.max(min.y, Math.min(max.y, vec.y)),
    z: Math.max(min.z, Math.min(max.z, vec.z)),
  };
}

export function floor(vec: Vector3): Vector3 {
  return { x: Math.floor(vec.x), y: Math.floor(vec.y), z: Math.floor(vec.z) };
}

export function ceil(vec: Vector3): Vector3 {
  return { x: Math.ceil(vec.x), y: Math.ceil(vec.y), z: Math.ceil(vec.z) };
}

export function round(vec: Vector3): Vector3 {
  return { x: Math.round(vec.x), y: Math.round(vec.y), z: Math.round(vec.z) };
}

export function toString<TVector extends Vector3>(
  vec: TVector,
): `(${TVector["x"]}, ${TVector["y"]}, ${TVector["z"]})` {
  return `(${vec.x}, ${vec.y}, ${vec.z})`;
}

export function toString2<TVector extends Vector3>(
  vec: TVector,
): `${TVector["x"]} ${TVector["y"]} ${TVector["z"]}` {
  return `${vec.x} ${vec.y} ${vec.z}`;
}

export function toString3<TVector extends Vector3>(
  vec: TVector,
): `x=${TVector["x"]},y=${TVector["y"]},z=${TVector["z"]}` {
  return `x=${vec.x},y=${vec.y},z=${vec.z}`;
}

const FROM_STRING_ERROR_MSG = "Failed to convert string to Vector3 object.";

/**
 * Convert string to Vector3.
 *
 * Supports `~X ~Y ~Z` syntax.
 */
export function fromString(string: string, relativeTo?: Entity | Partial<Vector3>): Vector3 {
  const trimmed = string.trim();

  if (trimmed === "") return clone(ZERO);

  let xStrArray: string[] = [];
  let yStrArray: string[] = [];
  let zStrArray: string[] = [];
  let currentMode: "space" | "num" = "space";
  let currentXYZ: "x" | "y" | "z" | undefined = undefined;
  let currentStrArray: string[] = xStrArray;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]!;

    if (currentMode === "space") {
      if (char === " ") continue;

      const matchResult = char.match(/[0-9~-]/);

      if (matchResult) {
        currentMode = "num";

        const oldXYZ = currentXYZ;

        if (oldXYZ === undefined) {
          currentXYZ = "x";
          currentStrArray = xStrArray;
        } else if (oldXYZ === "x") {
          currentXYZ = "y";
          currentStrArray = yStrArray;
        } else if (oldXYZ === "y") {
          currentXYZ = "z";
          currentStrArray = zStrArray;
        } else if (oldXYZ === "z") {
          throw new Error(FROM_STRING_ERROR_MSG);
        }
      } else {
        throw new Error(FROM_STRING_ERROR_MSG);
      }
    }

    // Number operation

    if (char === " ") {
      currentMode = "space";
      continue;
    }

    if (char === "~" && currentStrArray[0] === "~") {
      currentMode = "space";
      i--;
      continue;
    }

    if (currentStrArray.length === 0 && char === "~") {
      currentStrArray.push("~");
      continue;
    }

    const addHyphen =
      char === "-" &&
      (currentStrArray.length === 0 ||
        (currentStrArray[0] === "~" && currentStrArray.length === 1));

    if (addHyphen) {
      currentStrArray.push("-");
      continue;
    }

    const addDot = char === "." && !currentStrArray.includes(".");

    if (addDot) {
      currentStrArray.push(".");
      continue;
    }

    if (char.match(/[0-9]/)) {
      currentStrArray.push(char);
      continue;
    }

    throw new Error(FROM_STRING_ERROR_MSG);
  }

  const isRelativeToEntity = relativeTo instanceof Entity;
  const rel: Vector3 = {
    x: isRelativeToEntity ? relativeTo.location.x : relativeTo?.x ?? 0,
    y: isRelativeToEntity ? relativeTo.location.y : relativeTo?.y ?? 0,
    z: isRelativeToEntity ? relativeTo.location.z : relativeTo?.z ?? 0,
  };

  const xStr = xStrArray.join("");
  const yStr = yStrArray.join("");
  const zStr = zStrArray.join("");

  const isXRelative = xStr[0] === "~";
  const isYRelative = yStr[0] === "~";
  const isZRelative = zStr[0] === "~";

  const x = isXRelative ? (xStr === "~" ? rel.x : +xStr.substring(1) + rel.x) : +xStr;
  const y = isYRelative ? (yStr === "~" ? rel.y : +yStr.substring(1) + rel.y) : +yStr;
  const z = isZRelative ? (zStr === "~" ? rel.z : +zStr.substring(1) + rel.z) : +zStr;

  return { x, y, z };
}

export function toArray<TVector extends Vector3>(
  vec: TVector,
): [TVector["x"], TVector["y"], TVector["z"]] {
  return [vec.x, vec.y, vec.z];
}

export function chain(vec: Vector3): Chain {
  return new Chain(vec);
}

class Chain {
  private _vec: Vector3;

  constructor(vec: Vector3) {
    this._vec = vec;
  }

  add(vec2: Vector3): Chain {
    this._vec = add(this._vec, vec2);
    return this;
  }

  sub(vec2: Vector3): Chain {
    this._vec = sub(this._vec, vec2);
    return this;
  }

  mul(vec2: Vector3): Chain;

  mul(scalar: number): Chain;

  mul(value: Vector3 | number): Chain {
    this._vec = mul(this._vec, value);
    return this;
  }

  div(vec2: Vector3): Chain {
    this._vec = div(this._vec, vec2);
    return this;
  }

  lerp(vec2: Vector3, t: number): Chain {
    this._vec = lerp(this._vec, vec2, t);
    return this;
  }

  rotateRad(axis: Vector3, radians: number): Chain {
    this._vec = rotateRad(this._vec, axis, radians);
    return this;
  }

  rotateDeg(axis: Vector3, degrees: number): Chain {
    this._vec = rotateDeg(this._vec, axis, degrees);
    return this;
  }

  changeDir(direction: Vector3): Chain {
    this._vec = changeDir(this._vec, direction);
    return this;
  }

  reflect(normal: Vector3): Chain {
    this._vec = reflect(this._vec, normal);
    return this;
  }

  midpoint(vec2: Vector3): Chain {
    this._vec = midpoint(this._vec, vec2);
    return this;
  }

  clamp(min: Vector3, max: Vector3): Chain {
    this._vec = clamp(this._vec, min, max);
    return this;
  }

  normalize(): Chain {
    this._vec = normalize(this._vec);
    return this;
  }

  floor(): Chain {
    this._vec = floor(this._vec);
    return this;
  }

  ceil(): Chain {
    this._vec = ceil(this._vec);
    return this;
  }

  round(): Chain {
    this._vec = round(this._vec);
    return this;
  }

  done(): Vector3 {
    return this._vec;
  }
}
