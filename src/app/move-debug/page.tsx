"use client";

import React from 'react';
import Link from 'next/link';
import { CubeState, FACE_TO_POSITIONS, Face, TOP_POS_TO_RC, BOTTOM_POS_TO_RC, CORNER_POSITIONS } from '@/lib/cube';
import { CornerGrid, Marker, WedgeDir } from '@/components/CornerGrid';

export default function MoveDebugPage() {
  const faces: Face[] = ['U', 'D', 'R', 'L', 'F', 'B'];

  const renderFaceWithInitialOri = (face: Face, initialOri: number) => {
    const startPositions = FACE_TO_POSITIONS[face];

    // Start: assign colors to each affected starting position
    const startColoring: Record<number, number> = {};
    startPositions.forEach((pos, i) => { startColoring[pos] = i; });

    // After applying the move, where do those pieces land?
    const base = new CubeState();
    for (let i = 0; i < 8; i++) base.initializePieceOrientation(i, initialOri);
    const after = base.applyMove(face);

    const getCoord = (posIdx: number) => CubeState.getCoordForPosition(posIdx);
    const wedgeFor = (orientation: number, posIdx: number): WedgeDir => {
      if (orientation === 0) return 'center';
      const c = getCoord(posIdx);
      if (orientation === 1) return c.z === 1 ? 'bottom' : 'top';
      return c.x === 1 ? 'right' : 'left';
    };

    const startTop: Record<number, Marker> = {};
    const startBottom: Record<number, Marker> = {};
    Object.entries(startColoring).forEach(([posStr, colorIdx]) => {
      const pos = Number(posStr);
      const marker: Marker = { colorIdx: colorIdx as number, wedge: wedgeFor(initialOri, pos) };
      if (pos <= 3) startTop[pos] = marker; else startBottom[pos] = marker;
    });

    const endTop: Record<number, Marker> = {};
    const endBottom: Record<number, Marker> = {};
    startPositions.forEach((startPos, i) => {
      const destinationPos = after.corners[startPos].position;
      const destOri = after.corners[startPos].orientation;
      const marker: Marker = { colorIdx: i, wedge: wedgeFor(destOri, destinationPos) };
      if (destinationPos <= 3) endTop[destinationPos] = marker; else endBottom[destinationPos] = marker;
    });

    return (
      <div key={`${face}-${initialOri}`} className="bg-gray-800 rounded-lg p-4 shadow">
        <div className="text-white font-semibold mb-3">Move {face} <span className="text-xs text-gray-400">(start ori {initialOri})</span></div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-gray-300 text-xs mb-2">Start</div>
            <div className="flex gap-3">
              <div className="text-gray-400 text-xs w-10 self-center">Top</div>
              <CornerGrid positionsToMarkers={startTop} isTop={true} />
            </div>
            <div className="flex gap-3 mt-2">
              <div className="text-gray-400 text-xs w-10 self-center">Bottom</div>
              <CornerGrid positionsToMarkers={startBottom} isTop={false} />
            </div>
          </div>

          <div>
            <div className="text-gray-300 text-xs mb-2">After</div>
            <div className="flex gap-3">
              <div className="text-gray-400 text-xs w-10 self-center">Top</div>
              <CornerGrid positionsToMarkers={endTop} isTop={true} />
            </div>
            <div className="flex gap-3 mt-2">
              <div className="text-gray-400 text-xs w-10 self-center">Bottom</div>
              <CornerGrid positionsToMarkers={endBottom} isTop={false} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-2xl font-bold">Move Debugger</h1>
          <Link href="/" className="text-sm text-blue-300 hover:text-blue-200">Back to Trainer</Link>
        </div>

        <p className="text-gray-300 text-sm mb-6">Each card shows the four affected corners for a base move. Colors indicate the same piece from start to after.</p>

        <div className="mb-8">
          <div className="text-gray-200 text-sm mb-3">Initial orientation: 0</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {faces.map(face => renderFaceWithInitialOri(face, 0))}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-gray-200 text-sm mb-3">Initial orientation: +1</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {faces.map(face => renderFaceWithInitialOri(face, 1))}
          </div>
        </div>

        <div className="mt-10 p-4 bg-gray-900 rounded-lg">
          <div className="text-white font-semibold mb-3">Corner Position Reference</div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-gray-300 text-xs mb-2">Top positions</div>
              <CornerGrid
                positionsToMarkers={{}}
                isTop={true}
                labels={{
                  0: <span className="font-mono">P0</span>,
                  1: <span className="font-mono">P1</span>,
                  2: <span className="font-mono">P2</span>,
                  3: <span className="font-mono">P3</span>
                }}
                external={{
                  0: { top: <span className="font-mono">O1</span>, left: <span className="font-mono">O2</span> },
                  1: { top: <span className="font-mono">O1</span>, right: <span className="font-mono">O2</span> },
                  2: { bottom: <span className="font-mono">O1</span>, right: <span className="font-mono">O2</span> },
                  3: { bottom: <span className="font-mono">O1</span>, left: <span className="font-mono">O2</span> }
                }}
              />
            </div>
            <div>
              <div className="text-gray-300 text-xs mb-2">Bottom positions</div>
              <CornerGrid
                positionsToMarkers={{}}
                isTop={false}
                labels={{
                  4: <span className="font-mono">P4</span>,
                  5: <span className="font-mono">P5</span>,
                  6: <span className="font-mono">P6</span>,
                  7: <span className="font-mono">P7</span>
                }}
                external={{
                  4: { bottom: <span className="font-mono">O1</span>, left: <span className="font-mono">O2</span> },
                  5: { bottom: <span className="font-mono">O1</span>, right: <span className="font-mono">O2</span> },
                  6: { top: <span className="font-mono">O1</span>, right: <span className="font-mono">O2</span> },
                  7: { top: <span className="font-mono">O1</span>, left: <span className="font-mono">O2</span> }
                }}
              />
            </div>
          </div>
          <div className="text-gray-400 text-xs mt-3">
            P0..P7 denote the eight corner positions. O1/O2 marks show where the ori1 and ori2 slices sit relative to that position (O0 omitted).
          </div>
        </div>
        <div className="mt-10 p-4 bg-gray-900 rounded-lg">
          <div className="text-white font-semibold mb-3">Example Test Cases</div>
          <TestCases />
        </div>
      </div>
    </div>
  );
}

type CaseDef = {
  startPos: number; // 0..7
  startOri: 0 | 1 | 2;
  moves: string[];
  expectPos: number;
  expectOri: 0 | 1 | 2;
};

const DEFAULT_CASES: CaseDef[] = [
  { startPos: 0, startOri: 2, moves: ["B'", "U'"], expectPos: 0, expectOri: 0 },
];

function runCase(c: CaseDef) {
  const base = new CubeState();
  for (let i = 0; i < 8; i++) base.initializePieceOrientation(i, 0);
  base.corners[c.startPos].position = c.startPos;
  base.initializePieceOrientation(c.startPos, c.startOri);
  let cur = base;
  for (const m of c.moves) cur = cur.applyMove(m);
  const finalPos = cur.corners[c.startPos].position;
  const finalOri = cur.corners[c.startPos].orientation as 0 | 1 | 2;
  const ok = finalPos === c.expectPos && finalOri === c.expectOri;
  return { finalPos, finalOri, ok };
}

function TestCases({ cases = DEFAULT_CASES }: { cases?: CaseDef[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {cases.map((c, idx) => {
        const result = runCase(c);
        const topMarkers: Record<number, Marker> = {};
        const bottomMarkers: Record<number, Marker> = {};
        const labels: Record<number, React.ReactNode> = {
          0: <span className="font-mono">P0</span>,
          1: <span className="font-mono">P1</span>,
          2: <span className="font-mono">P2</span>,
          3: <span className="font-mono">P3</span>,
          4: <span className="font-mono">P4</span>,
          5: <span className="font-mono">P5</span>,
          6: <span className="font-mono">P6</span>,
          7: <span className="font-mono">P7</span>,
        };

        const highlights: Record<number, boolean> = { [c.startPos]: true };
        const dots: Record<number, 'yellow' | 'blue' | 'red'> = {};
        dots[c.startPos] = 'yellow';
        dots[c.expectPos] = 'blue';
        if (!result.ok) dots[result.finalPos] = 'red';

        return (
          <div key={idx} className="bg-gray-800 rounded-lg p-3">
            <div className="text-white text-sm font-mono mb-2">
              P{c.startPos} O{c.startOri} → {c.moves.join(' ')} → P{c.expectPos} O{c.expectOri}
              {!result.ok && (
                <span className="ml-2 text-red-400">(got P{result.finalPos} O{result.finalOri})</span>
              )}
            </div>
            <div className="flex gap-6">
              <div>
                <div className="text-gray-400 text-xs mb-1">Top</div>
                <CornerGrid positionsToMarkers={topMarkers} isTop={true} labels={labels} highlights={highlights} dots={dots} />
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">Bottom</div>
                <CornerGrid positionsToMarkers={bottomMarkers} isTop={false} labels={labels} highlights={highlights} dots={dots} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


