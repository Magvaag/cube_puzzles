export type Face = 'U' | 'D' | 'R' | 'L' | 'F' | 'B';

export const CORNER_POSITIONS: Record<number, string> = {
  0: 'ULB', 1: 'URB', 2: 'URF', 3: 'ULF',
  4: 'DLF', 5: 'DRF', 6: 'DRB', 7: 'DLB'
};

export const FACE_TO_POSITIONS: Record<Face, number[]> = {
  U: [0, 1, 2, 3],
  D: [4, 5, 6, 7],
  R: [2, 5, 6, 1],
  L: [0, 3, 4, 7],
  F: [3, 2, 5, 4],
  B: [1, 0, 7, 6]
};

// 3x3 display coordinate mappings for top and bottom faces
export const TOP_POS_TO_RC: Record<number, [number, number]> = {
  0: [0, 0], // ULB
  1: [0, 2], // URB
  2: [2, 2], // URF
  3: [2, 0]  // ULF
};

export const BOTTOM_POS_TO_RC: Record<number, [number, number]> = {
  4: [2, 0], // DLF
  5: [2, 2], // DRF
  6: [0, 2], // DRB
  7: [0, 0]  // DLB
};

type Vec3 = { x: number; y: number; z: number };

export class CubeState {
  corners: { position: number; orientation: number }[];
  private uAxisWorld: Vec3[];
  private rAxisWorld: Vec3[];
  private fAxisWorld: Vec3[];

  private static INDEX_TO_COORD: Array<Vec3> = [
    { x: -1, y:  1, z: -1 }, // 0 ULB
    { x:  1, y:  1, z: -1 }, // 1 URB
    { x:  1, y:  1, z:  1 }, // 2 URF
    { x: -1, y:  1, z:  1 }, // 3 ULF
    { x: -1, y: -1, z:  1 }, // 4 DLF
    { x:  1, y: -1, z:  1 }, // 5 DRF
    { x:  1, y: -1, z: -1 }, // 6 DRB
    { x: -1, y: -1, z: -1 }  // 7 DLB
  ];
  private static COORD_TO_INDEX: Map<string, number> = new Map(
    CubeState.INDEX_TO_COORD.map((c, i) => [`${c.x},${c.y},${c.z}`, i])
  );

  static getCoordForPosition(posIdx: number): Vec3 {
    return this.INDEX_TO_COORD[posIdx];
  }

  constructor() {
    this.corners = Array(8).fill(null).map((_, i) => ({ position: i, orientation: 0 }));
    this.uAxisWorld = Array(8).fill(null).map((_, i) => {
      const c = CubeState.INDEX_TO_COORD[i];
      return { x: 0, y: c.y, z: 0 };
    });
    this.rAxisWorld = Array(8).fill(null).map((_, i) => {
      const c = CubeState.INDEX_TO_COORD[i];
      return { x: c.x, y: 0, z: 0 };
    });
    this.fAxisWorld = Array(8).fill(null).map((_, i) => {
      const c = CubeState.INDEX_TO_COORD[i];
      return { x: 0, y: 0, z: c.z };
    });
  }

  private getBaseTriadForPosition(posIdx: number): { u0: Vec3; r0: Vec3; f0: Vec3 } {
    const c = CubeState.INDEX_TO_COORD[posIdx];
    return {
      u0: { x: 0, y: c.y, z: 0 },
      r0: { x: c.x, y: 0, z: 0 },
      f0: { x: 0, y: 0, z: c.z }
    };
  }

  initializePieceOrientation(pieceIndex: number, orientation: number) {
    const posIdx = this.corners[pieceIndex].position;
    const { u0, r0, f0 } = this.getBaseTriadForPosition(posIdx);
    let u = u0, r = r0, f = f0;
    if (orientation === 1) { u = f0; r = u0; f = r0; }
    else if (orientation === 2) { u = r0; r = f0; f = u0; }
    this.uAxisWorld[pieceIndex] = u;
    this.rAxisWorld[pieceIndex] = r;
    this.fAxisWorld[pieceIndex] = f;
    this.corners[pieceIndex].orientation = orientation;
  }

  applyMove(move: string) {
    const newState = new CubeState();
    newState.corners = this.corners.map(c => ({ position: c.position, orientation: c.orientation }));
    newState.uAxisWorld = this.uAxisWorld.map(v => ({ x: v.x, y: v.y, z: v.z }));
    newState.rAxisWorld = this.rAxisWorld.map(v => ({ x: v.x, y: v.y, z: v.z }));
    newState.fAxisWorld = this.fAxisWorld.map(v => ({ x: v.x, y: v.y, z: v.z }));

    const rotateVec = (v: Vec3, axis: 'x'|'y'|'z', quarterTurns: number) => {
      const t = ((quarterTurns % 4) + 4) % 4;
      const out = { x: v.x, y: v.y, z: v.z };
      for (let i = 0; i < t; i++) {
        if (axis === 'x') {
          const y = out.y, z = out.z; // +90 around +X: (y,z) -> (-z, y)
          out.y = -z;
          out.z = y;
        } else if (axis === 'y') {
          const x = out.x, z = out.z; // +90 around +Y: (x,z) -> (z, -x)
          out.x = z;
          out.z = -x;
        } else {
          const x = out.x, y = out.y; // +90 around +Z: (x,y) -> (-y, x)
          out.x = -y;
          out.y = x;
        }
      }
      return out;
    };

    const f = move[0] as 'U'|'D'|'R'|'L'|'F'|'B';
    const isPrime = move.endsWith("'");
    const isDouble = move.endsWith('2');
    let axis: 'x'|'y'|'z' = 'y';
    let turns = 0;
    let layerCheck: (c: Vec3) => boolean = () => false;
    if (f === 'U') { axis = 'y'; turns = isDouble ? 2 : (isPrime ? 1 : -1); layerCheck = (c) => c.y === 1; }
    else if (f === 'D') { axis = 'y'; turns = isDouble ? 2 : (isPrime ? -1 : 1); layerCheck = (c) => c.y === -1; }
    else if (f === 'R') { axis = 'x'; turns = isDouble ? 2 : (isPrime ? 1 : -1); layerCheck = (c) => c.x === 1; }
    else if (f === 'L') { axis = 'x'; turns = isDouble ? 2 : (isPrime ? -1 : 1); layerCheck = (c) => c.x === -1; }
    else if (f === 'F') { axis = 'z'; turns = isDouble ? 2 : (isPrime ? 1 : -1); layerCheck = (c) => c.z === 1; }
    else if (f === 'B') { axis = 'z'; turns = isDouble ? 2 : (isPrime ? -1 : 1); layerCheck = (c) => c.z === -1; }

    for (let piece = 0; piece < 8; piece++) {
      const posIdx = this.corners[piece].position;
      const coord = CubeState.INDEX_TO_COORD[posIdx];
      if (!layerCheck(coord)) {
        newState.corners[piece].position = posIdx;
        newState.corners[piece].orientation = this.corners[piece].orientation;
        newState.uAxisWorld[piece] = { ...this.uAxisWorld[piece] };
        newState.rAxisWorld[piece] = { ...this.rAxisWorld[piece] };
        newState.fAxisWorld[piece] = { ...this.fAxisWorld[piece] };
        continue;
      }

      const newCoord = rotateVec(coord, axis, turns);
      const key = `${newCoord.x},${newCoord.y},${newCoord.z}`;
      const newPosIdx = CubeState.COORD_TO_INDEX.get(key);
      if (newPosIdx === undefined) {
        throw new Error('Invalid rotated coord: ' + key);
      }

      const uVec = this.uAxisWorld[piece];
      const rVec = this.rAxisWorld[piece];
      const fVec = this.fAxisWorld[piece];
      const newU = rotateVec(uVec, axis, turns);
      const newR = rotateVec(rVec, axis, turns);
      const newF = rotateVec(fVec, axis, turns);

      const { u0 } = this.getBaseTriadForPosition(newPosIdx);
      const eq = (a: Vec3, b: Vec3) => a.x === b.x && a.y === b.y && a.z === b.z;
      let newOri = 0;
      if (eq(newU, u0)) newOri = 0;
      else if (Math.abs(newU.y) === 0 && Math.abs(newU.z) === 1) newOri = 1; // U aligns to ±Z
      else if (Math.abs(newU.y) === 0 && Math.abs(newU.x) === 1) newOri = 2; // U aligns to ±X
      else {
        // Fallback
        if (Math.abs(newU.y) === 1) newOri = 0; else if (Math.abs(newU.z) === 1) newOri = 1; else newOri = 2;
      }

      newState.corners[piece].position = newPosIdx;
      newState.corners[piece].orientation = newOri;
      newState.uAxisWorld[piece] = newU;
      newState.rAxisWorld[piece] = newR;
      newState.fAxisWorld[piece] = newF;
    }

    return newState;
  }

  getCornerAtPosition(position: number) {
    const idx = this.corners.findIndex(c => c.position === position);
    if (idx === -1) return null;
    return {
      piece: idx,
      orientation: this.corners[idx].orientation
    };
  }
}


