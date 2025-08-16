"use client"; // Enables client-side rendering for interactive components

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { CubeState, CORNER_POSITIONS, FACE_TO_POSITIONS, Face } from '@/lib/cube';

type Vec2 = { x: number; y: number };

type Puzzle = {
  startCorner: number;
  startOrientation: number;
  moves: string[];
  solution: { corner: number; orientation: number };
};

type DragPoint = { x: number; y: number };
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

const RubiksLookAheadTrainer = () => {
  // All 8 corner positions come from shared lib

  // Top face corner positions for display
  const TOP_CORNERS = [
    { idx: 0, pos: [0, 0], name: 'ULB' },
    { idx: 1, pos: [0, 2], name: 'URB' },
    { idx: 2, pos: [2, 2], name: 'URF' },
    { idx: 3, pos: [2, 0], name: 'ULF' }
  ];

  // Possible moves
  const MOVES = ['U', "U'", 'U2', 'R', "R'", 'R2', 'F', "F'", 'F2',
    'L', "L'", 'L2', 'B', "B'", 'B2', 'D', "D'", 'D2'];

  const FACE_TO_MOVES: Record<Face, string[]> = {
    U: ['U', "U'", 'U2'],
    D: ['D', "D'", 'D2'],
    R: ['R', "R'", 'R2'],
    L: ['L', "L'", 'L2'],
    F: ['F', "F'", 'F2'],
    B: ['B', "B'", 'B2']
  };
  const faceOfMove = (m: string): Face => m[0] as Face;
  const doesFaceMovePosition = (face: Face, position: number): boolean =>
    FACE_TO_POSITIONS[face].includes(position);

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [selectedOrientation, setSelectedOrientation] = useState<number>(0);
  const selectedOrientationRef = useRef<number>(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<DragPoint | null>(null);
  const [stats, setStats] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Full cube state tracking is imported from shared lib

  // Apply sequence of moves to track a specific corner
  const trackCornerThroughMoves = (startCorner: number, startOrientation: number, moves: string[], debug: boolean = false) => {
    const cube = new CubeState();
    // Set the starting corner position and orientation
    cube.corners[startCorner] = {
      position: startCorner,
      orientation: startOrientation
    };
    cube.initializePieceOrientation(startCorner, startOrientation);

    // Apply each move
    let currentCube = cube;
    if (debug) {
      const startPosName = CORNER_POSITIONS[cube.corners[startCorner].position];
      console.log('[Debug] Start corner', startCorner, 'at', startPosName, 'orientation', startOrientation);
    }
    for (const move of moves) {
      currentCube = currentCube.applyMove(move);
      if (debug) {
        const p = currentCube.corners[startCorner].position;
        const o = currentCube.corners[startCorner].orientation;
        const name = CORNER_POSITIONS[p];
        console.log('[Debug] After', move, '→', name, '(position', p + ',', 'solverOri', o + ')');
      }
    }

    // Find where our corner ended up
    const finalPosition = currentCube.corners[startCorner].position;
    const finalOrientation = currentCube.corners[startCorner].orientation;

    return { position: finalPosition, orientation: finalOrientation };
  };

  // Removed UI orientation adjustment so solver orientation matches UI directly

  // Check if a move sequence is "legal": the tracked piece returns to the top layer
  const isLegalMoveSequence = (startCorner: number, startOrientation: number, moves: string[]) => {
    const result = trackCornerThroughMoves(startCorner, startOrientation, moves);
    return result.position >= 0 && result.position <= 3;
  };

  // Generate a random puzzle that ends on top
  const generatePuzzle = useCallback(() => {
    let attempts = 0;

    while (attempts < 500) {
      // Start with a random top corner
      const startCorner = Math.floor(Math.random() * 4);
      const startOrientation = Math.floor(Math.random() * 3);

      // Generate random move sequence under constraints
      const numMoves = 2 + Math.floor(Math.random() * 4); // 2-5 moves
      const moves: string[] = [];
      let currentCube = new CubeState();
      currentCube.corners[startCorner] = {
        position: startCorner,
        orientation: startOrientation
      };
      currentCube.initializePieceOrientation(startCorner, startOrientation);
      let prevFace: Face | null = null;

      let failedThisAttempt = false;
      for (let i = 0; i < numMoves; i++) {
        const currentPos = currentCube.corners[startCorner].position;
        const candidateFaces = (['U', 'D', 'R', 'L', 'F', 'B'] as Face[])
          .filter((f) => f !== prevFace && doesFaceMovePosition(f, currentPos));

        if (candidateFaces.length === 0) {
          failedThisAttempt = true;
          break;
        }

        const face = candidateFaces[Math.floor(Math.random() * candidateFaces.length)];
        const variants = FACE_TO_MOVES[face];
        const move = variants[Math.floor(Math.random() * variants.length)];

        moves.push(move);
        currentCube = currentCube.applyMove(move);
        prevFace = face;
      }

      if (failedThisAttempt) {
        attempts++;
        continue;
      }

      // Check if sequence is legal: ends on top for this starting piece
      if (!isLegalMoveSequence(startCorner, startOrientation, moves)) {
        attempts++;
        continue;
      }

      // Track where the corner ends up
      const result = trackCornerThroughMoves(startCorner, startOrientation, moves, true);

      if (result.position >= 0 && result.position <= 3) {
        setPuzzle({
          startCorner,
          startOrientation,
          moves,
          solution: {
            corner: result.position,
            orientation: result.orientation
          }
        });
        console.log('[Puzzle] Generated:', {
          startCorner,
          startCornerName: CORNER_POSITIONS[startCorner],
          startOrientation,
          moves,
          solution: {
            corner: result.position,
            cornerName: CORNER_POSITIONS[result.position],
            orientation: result.orientation
          }
        });
        setSelectedCell(null);
        setSelectedOrientation(0);
        setFeedback(null);
        return;
      }

      attempts++;
    }

    // Fallback to simple U-only puzzle
    const startCorner = Math.floor(Math.random() * 4);
    const startOrientation = Math.floor(Math.random() * 3);
    const uMoves = ['U', "U'", 'U2'];
    const moves = [
      uMoves[Math.floor(Math.random() * uMoves.length)],
      uMoves[Math.floor(Math.random() * uMoves.length)]
    ];

    const result = trackCornerThroughMoves(startCorner, startOrientation, moves, true);
    setPuzzle({
      startCorner,
      startOrientation,
      moves,
      solution: {
        corner: result.position,
        orientation: result.orientation
      }
    });
    console.log('[Puzzle] Generated (fallback):', {
      startCorner,
      startCornerName: CORNER_POSITIONS[startCorner],
      startOrientation,
      moves,
      solution: {
        corner: result.position,
        cornerName: CORNER_POSITIONS[result.position],
        orientation: result.orientation
      }
    });
    setSelectedCell(null);
    setSelectedOrientation(0);
    setFeedback(null);
  }, []);

  // Initialize with first puzzle
  useEffect(() => {
    generatePuzzle();
  }, [generatePuzzle]);

  // Lightweight in-browser tests for cube move consistency
  useEffect(() => {
    const cloneState = (s: CubeState): CubeState => {
      const c = new CubeState();
      c.corners = s.corners.map(x => ({ position: x.position, orientation: x.orientation }));
      return c;
    };
    const statesEqual = (a: CubeState, b: CubeState): boolean => {
      for (let i = 0; i < 8; i++) {
        if (a.corners[i].position !== b.corners[i].position) return false;
        if (a.corners[i].orientation !== b.corners[i].orientation) return false;
      }
      return true;
    };
    const applyMoves = (s: CubeState, seq: string[]): CubeState => {
      let cur = s;
      for (const m of seq) cur = cur.applyMove(m);
      return cur;
    };
    const inverseOf = (m: string): string => {
      if (m.endsWith('2')) return m;
      if (m.endsWith("'")) return m[0];
      return `${m[0]}'`;
    };
    const repeat = (m: string, n: number): string[] => Array.from({ length: n }, () => m);

    const allMoves = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2'];

    const failures: string[] = [];
    for (const initialOri of [0, 1, 2]) {
      const base = new CubeState();
      for (let i = 0; i < 8; i++) {
        base.corners[i].position = i;
        base.initializePieceOrientation(i, initialOri);
      }

      for (const m of allMoves) {
        const inv = inverseOf(m);
        const identityBack = applyMoves(base, [m, inv]);
        if (!statesEqual(base, identityBack)) {
          failures.push(`Fail: ${m} + ${inv} (start ori ${initialOri})`);
        }

        const times = m.endsWith('2') ? 2 : 4;
        const around = applyMoves(base, repeat(m, times));
        if (!statesEqual(base, around)) {
          failures.push(`Fail: ${m} * ${times} (start ori ${initialOri})`);
        }
      }
    }

    // Verify face cycles for top/back/front layers
    const checkPositions = (seq: string[], expectedMap: Record<number, number>, layerPositions: number[]) => {
      const s = new CubeState();
      for (let i = 0; i < 8; i++) s.initializePieceOrientation(i, 0);
      const after = applyMoves(s, seq);
      for (const p of layerPositions) {
        const pieceAtP = after.getCornerAtPosition(expectedMap[p]);
        const startedPieceIdx = s.getCornerAtPosition(p)?.piece;
        if (pieceAtP?.piece !== startedPieceIdx) {
          failures.push(`Cycle fail ${seq.join(' ')} position ${p} -> expected ${expectedMap[p]}`);
        }
      }
    };
    // U: 0->1->2->3->0 (top layer)
    checkPositions(['U'], { 0:1, 1:2, 2:3, 3:0 }, [0,1,2,3]);
    // U': 0->3->2->1->0
    checkPositions(["U'"], { 0:3, 1:0, 2:1, 3:2 }, [0,1,2,3]);
    // B': on back layer: 1->6->7->0->1 (from earlier mapping for B')
    checkPositions(["B'"], { 1:6, 6:7, 7:0, 0:1 }, [1,6,7,0]);

    // Targeted scenario
    const scenario = () => {
      const s = new CubeState();
      s.initializePieceOrientation(0, 2);
      const end = applyMoves(s, ["B'", "U'"]);
      const pos = end.corners[0].position;
      const ori = end.corners[0].orientation;
      if (!(pos === 0 && ori === 0)) failures.push(`Scenario B' U' expected pos 0 ori 0 but got pos ${pos} ori ${ori}`);
    };
    scenario();

    if (failures.length === 0) {
      console.log('[SelfTest] All cube move identity tests passed');
    } else {
      console.warn('[SelfTest] Failures:', failures);
    }
  }, []);

  // Handle cell click
  const handleCellClick = (e: React.MouseEvent<HTMLDivElement>, row: number, col: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!puzzle || feedback) return;

    const cornerIdx = TOP_CORNERS.findIndex(c => c.pos[0] === row && c.pos[1] === col);
    if (cornerIdx !== -1) {
      setSelectedCell([row, col]);
      // Reset orientation for new selection so clicks without drag choose orientation 0
      setSelectedOrientation(0);
      selectedOrientationRef.current = 0;
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Compute orientation based on a pointer position relative to the grid
  const updateOrientationFromPointer = (clientX: number, clientY: number) => {
    if (!isDragging || !selectedCell || !gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();

    // Treat small movements as a click: keep orientation 0
    if (dragStart) {
      const moveDx = clientX - dragStart.x;
      const moveDy = clientY - dragStart.y;
      const moveDist = Math.hypot(moveDx, moveDy);
      if (moveDist < 10) {
        setSelectedOrientation(0);
        selectedOrientationRef.current = 0;
        return;
      }
    }

    const gridCols = 3;
    const gridRows = 3;
    const cellWidth = rect.width / gridCols;
    const cellHeight = rect.height / gridRows;

    const selectedCellCenterX = (selectedCell[1] + 0.5) * cellWidth;
    const selectedCellCenterY = (selectedCell[0] + 0.5) * cellHeight;

    const x = clientX - rect.left - selectedCellCenterX;
    const y = clientY - rect.top - selectedCellCenterY;

    const cornerIdx = TOP_CORNERS.findIndex(c => c.pos[0] === selectedCell[0] && c.pos[1] === selectedCell[1]);
    if (cornerIdx === -1) return;

    const len = Math.hypot(x, y);
    if (len < 6) return;

    const ux = x / len;
    const uy = y / len;

    const inwardVectors: Record<number, Vec2> = {
      0: { x: 1,  y: 1  },
      1: { x: -1, y: 1  },
      2: { x: -1, y: -1 },
      3: { x: 1,  y: -1 }
    };

    const ori1Vectors: Record<number, Vec2> = {
      0: { x: 0,  y: -1 },
      1: { x: 0,  y: -1 },
      2: { x: 0,  y: 1  },
      3: { x: 0,  y: 1  }
    };

    const ori2Vectors: Record<number, Vec2> = {
      0: { x: -1, y: 0  },
      1: { x: 1,  y: 0  },
      2: { x: 1,  y: 0  },
      3: { x: -1, y: 0  }
    };

    const normalize = (v: Vec2): Vec2 => {
      const l = Math.hypot(v.x, v.y);
      return { x: v.x / l, y: v.y / l };
    };

    const inward = normalize(inwardVectors[cornerIdx]);
    const v1 = normalize(ori1Vectors[cornerIdx]);
    const v2 = normalize(ori2Vectors[cornerIdx]);

    const sim0 = ux * inward.x + uy * inward.y;
    const sim1 = ux * v1.x + uy * v1.y;
    const sim2 = ux * v2.x + uy * v2.y;

    let newOrientation = 0;
    if (sim0 >= sim1 && sim0 >= sim2) {
      newOrientation = 0;
    } else if (sim1 >= sim2) {
      newOrientation = 1;
    } else {
      newOrientation = 2;
    }

    setSelectedOrientation(newOrientation);
    selectedOrientationRef.current = newOrientation;
  };

  // Local grid mouse move handler (works inside the grid)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !selectedCell) return;
    e.preventDefault();
    e.stopPropagation();
    updateOrientationFromPointer(e.clientX, e.clientY);
  };

  // Finish drag and check answer
  const finishDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (selectedCell && puzzle) {
      checkAnswer();
    }
  };

  // Handle mouse up (inside grid)
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    finishDrag();
  };

  // Global listeners to keep tracking outside the grid
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      updateOrientationFromPointer(e.clientX, e.clientY);
    };

    const onUp = (e: MouseEvent) => {
      e.preventDefault();
      // Ensure we capture the final pointer position (even outside the grid)
      updateOrientationFromPointer(e.clientX, e.clientY);
      finishDrag();
    };

    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp, { passive: false });

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, selectedCell, puzzle]);

  // Check answer
  const checkAnswer = () => {
    if (!selectedCell || !puzzle) return;

    const cornerIdx = TOP_CORNERS.findIndex(c =>
        c.pos[0] === selectedCell[0] && c.pos[1] === selectedCell[1]
    );

    if (cornerIdx === -1) return;

    const selectedCornerPosition = TOP_CORNERS[cornerIdx].idx;

    const orientationChosen = selectedOrientationRef.current;
    const isCorrect =
        selectedCornerPosition === puzzle.solution.corner &&
        orientationChosen === puzzle.solution.orientation;

    console.log('[Answer] User selected:', {
      corner: selectedCornerPosition,
      cornerName: CORNER_POSITIONS[selectedCornerPosition],
      orientation: orientationChosen
    }, 'Expected:', {
      corner: puzzle.solution.corner,
      cornerName: CORNER_POSITIONS[puzzle.solution.corner],
      orientation: puzzle.solution.orientation
    }, '→', isCorrect ? 'OK' : 'Mismatch');

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));

    // Auto-generate new puzzle after delay
    setTimeout(() => {
      generatePuzzle();
    }, 1000);
  };

  // Render corner piece with correct orientation based on position
  const renderCornerPiece = (row: number, col: number, orientation: number, isStart = false) => {
    const cornerData = TOP_CORNERS.find(c => c.pos[0] === row && c.pos[1] === col);
    if (!cornerData) return null;

    const cornerIdx = cornerData.idx;

    // orientation 0 = yellow on top (U face)
    // orientation 1 = yellow twisted clockwise (yellow shows on a side)
    // orientation 2 = yellow twisted counter-clockwise (yellow shows on a side)

    const SLICE_PX = isStart ? 8 : 16;
    const SLICE_GAP = isStart ? 6 : 10;

    const renderWedge = (side: 'top' | 'bottom' | 'left' | 'right') => {
      const common = `absolute bg-yellow-400 ${isStart ? 'rounded-xs' : 'rounded-sm'} z-10`;
      switch (side) {
        case 'top':
          return (
            <div
              className={common}
              style={{ left: 0, right: 0, top: -(SLICE_PX + SLICE_GAP), height: SLICE_PX }}
            />
          );
        case 'bottom':
          return (
            <div
              className={common}
              style={{ left: 0, right: 0, bottom: -(SLICE_PX + SLICE_GAP), height: SLICE_PX }}
            />
          );
        case 'left':
          return (
            <div
              className={common}
              style={{ top: 0, bottom: 0, left: -(SLICE_PX + SLICE_GAP), width: SLICE_PX }}
            />
          );
        case 'right':
          return (
            <div
              className={common}
              style={{ top: 0, bottom: 0, right: -(SLICE_PX + SLICE_GAP), width: SLICE_PX }}
            />
          );
      }
      return null;
    };

    let wedge = null;
    if (orientation === 1) {
      switch(cornerIdx) {
        case 0: wedge = renderWedge('top'); break;    // ULB → back
        case 1: wedge = renderWedge('top'); break;    // URB → back
        case 2: wedge = renderWedge('bottom'); break; // URF → front
        case 3: wedge = renderWedge('bottom'); break; // ULF → front
      }
    } else if (orientation === 2) {
      switch(cornerIdx) {
        case 0: wedge = renderWedge('left'); break;   // ULB → left
        case 1: wedge = renderWedge('right'); break;  // URB → right
        case 2: wedge = renderWedge('right'); break;  // URF → right
        case 3: wedge = renderWedge('left'); break;   // ULF → left
      }
    }

    return (
      <div className={`relative w-full h-full rounded-sm transition-all duration-200`}>
        <div className={`absolute inset-0 rounded-sm ${isStart ? 'ring-2 ring-purple-500' : ''} ${orientation === 0 ? 'bg-yellow-400' : 'bg-blue-500'}`} />
        {wedge}
      </div>
    );
  };

  return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
        <div className="max-w-2xl w-full">
          {/* Stats */}
          <div className="text-white mb-6 text-center">
            <h1 className="text-3xl font-bold mb-2">Rubik&apos;s Cube Look-Ahead Trainer</h1>
            <div className="text-lg">
              Score: {stats.correct}/{stats.total}
              {stats.total > 0 && ` (${Math.round(stats.correct / stats.total * 100)}%)`}
            </div>
          </div>

          {/* Main Grid */}
          <div className={`
          relative bg-gray-700 p-8 rounded-lg shadow-2xl transition-all duration-500
          ${feedback === 'correct' ? 'bg-green-700' : ''}
          ${feedback === 'incorrect' ? 'bg-red-700' : ''}
        `}>
            {/* Starting position display */}
            <div className="mb-6">
              <div className="text-white text-sm mb-2">Starting Position:</div>
              <div className="mx-auto p-5">
                <div className="grid grid-cols-3 gap-1 w-32 h-32 bg-black p-1 rounded-sm relative overflow-visible">
                  {[0, 1, 2].map(row => (
                      [0, 1, 2].map(col => (
                          <div
                              key={`start-${row}-${col}`}
                              className="bg-gray-600 rounded-sm relative"
                          >
                            {puzzle && (() => {
                              const corner = TOP_CORNERS.find(c => c.pos[0] === row && c.pos[1] === col);
                              return corner && corner.idx === puzzle.startCorner
                                ? renderCornerPiece(row, col, puzzle.startOrientation, true)
                                : null;
                            })()}
                          </div>
                      ))
                  ))}
                </div>
              </div>
            </div>

            {/* Move sequence */}
            <div className="mb-6 text-center">
              <div className="text-white text-sm mb-2">Moves:</div>
              <div className="text-2xl font-mono text-yellow-300 space-x-2">
                {puzzle && puzzle.moves.map((move: string, idx: number) => (
                    <span key={idx} className="inline-block px-2 py-1 bg-gray-800 rounded">
                  {move}
                </span>
                ))}
              </div>
            </div>

            {/* Answer Grid */}
            <div className="mb-4">
              <div className="text-white text-sm mb-2">Where does the piece end up?</div>
              <div className="mx-auto p-5">
                <div
                    className="grid grid-cols-3 gap-2 w-64 h-64 bg-black p-2 rounded cursor-pointer select-none relative overflow-visible"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' }}
                    ref={gridRef}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={(e) => {
                      // Don't stop dragging when mouse leaves the grid area
                      // User should be able to drag outside and come back
                      e.preventDefault();
                    }}
                    draggable={false}
                >
                  {[0, 1, 2].map(row => (
                      [0, 1, 2].map(col => {
                        const isCorner = TOP_CORNERS.some(c => c.pos[0] === row && c.pos[1] === col);
                        const isSelected = selectedCell && selectedCell[0] === row && selectedCell[1] === col;

                        return (
                            <div
                                key={`${row}-${col}`}
                                className={`
                        rounded-sm relative transition-all duration-200 select-none
                        ${isCorner ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-800'}
                        ${isSelected ? 'ring-4 ring-yellow-400 scale-110' : ''}
                      `}
                                style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' }}
                                onMouseDown={(e) => handleCellClick(e, row, col)}
                                draggable={false}
                            >
                              {isSelected && isCorner &&
                                  renderCornerPiece(row, col, selectedOrientation)
                              }
                            </div>
                        );
                      })
                  ))}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-gray-300 text-sm text-center">
              Click a corner, then drag to set orientation
            </div>

            {/* Feedback icons */}
            {feedback && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  {feedback === 'correct' ? (
                      <CheckCircle className="w-32 h-32 text-green-300 opacity-80" />
                  ) : (
                      <XCircle className="w-32 h-32 text-red-300 opacity-80" />
                  )}
                </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-6 flex justify-center gap-4">
            <button
                onClick={generatePuzzle}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              New Puzzle
            </button>
            <Link
                href="/move-debug"
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              Move Debug
            </Link>
          </div>

          {/* Debug info (remove in production) */}
          {puzzle && (
              <div className="mt-4 text-gray-400 text-xs text-center">
                Solution: {CORNER_POSITIONS[puzzle.solution.corner]} (orientation {puzzle.solution.orientation})
              </div>
          )}
        </div>
      </div>
  );
};

export default RubiksLookAheadTrainer;