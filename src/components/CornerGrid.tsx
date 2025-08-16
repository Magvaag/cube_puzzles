"use client";

import React from 'react';
import { BOTTOM_POS_TO_RC, TOP_POS_TO_RC } from '@/lib/cube';

export type WedgeDir = 'center' | 'top' | 'bottom' | 'left' | 'right';
export type Marker = { colorIdx: number; wedge: WedgeDir };

const COLORS = ['bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-orange-500'];

function Wedge({ colorIdx, dir }: { colorIdx: number; dir: WedgeDir }) {
  const color = COLORS[colorIdx % COLORS.length];
  if (dir === 'center') {
    return <div className={`absolute inset-0 m-auto ${color}`} style={{ width: 10, height: 10, borderRadius: 2 }} />;
  }
  if (dir === 'top') {
    return <div className={`absolute ${color}`} style={{ left: 2, right: 2, top: 2, height: 6, borderRadius: 2 }} />;
  }
  if (dir === 'bottom') {
    return <div className={`absolute ${color}`} style={{ left: 2, right: 2, bottom: 2, height: 6, borderRadius: 2 }} />;
  }
  if (dir === 'left') {
    return <div className={`absolute ${color}`} style={{ top: 2, bottom: 2, left: 2, width: 6, borderRadius: 2 }} />;
  }
  return <div className={`absolute ${color}`} style={{ top: 2, bottom: 2, right: 2, width: 6, borderRadius: 2 }} />;
}

type ExternalLabels = { top?: React.ReactNode; bottom?: React.ReactNode; left?: React.ReactNode; right?: React.ReactNode };

export function CornerGrid({ positionsToMarkers, isTop, labels, external, highlights, dots }: { positionsToMarkers: Record<number, Marker>; isTop: boolean; labels?: Record<number, React.ReactNode>; external?: Record<number, ExternalLabels>; highlights?: Record<number, boolean>; dots?: Record<number, 'blue' | 'red' | 'yellow'> }) {
  return (
    <div className="grid grid-cols-3 gap-1 w-28 h-28 bg-black p-1 rounded-sm">
      {[0, 1, 2].map(row => (
        [0, 1, 2].map(col => {
          const posMap = isTop ? TOP_POS_TO_RC : BOTTOM_POS_TO_RC;
          const rcToPos: Record<string, number> = Object.fromEntries(
            Object.entries(posMap).map(([p, rc]) => [`${(rc as [number,number])[0]},${(rc as [number,number])[1]}`, Number(p)])
          );
          const posIdx = rcToPos[`${row},${col}`];
          const marker = posIdx !== undefined ? positionsToMarkers[posIdx] : undefined;
          const label = posIdx !== undefined && labels ? labels[posIdx] : undefined;
          const ext = posIdx !== undefined && external ? external[posIdx] : undefined;
          const isHighlight = posIdx !== undefined && highlights ? !!highlights[posIdx] : false;
          const dotColor = posIdx !== undefined && dots ? dots[posIdx] : undefined;
          return (
            <div key={`${row}-${col}`} className="rounded-sm bg-gray-700 relative overflow-visible">
              {isHighlight && (
                <div className="absolute inset-0 bg-yellow-400/70 rounded-sm" />
              )}
              {marker && <Wedge colorIdx={marker.colorIdx} dir={marker.wedge} />}
              {label !== undefined && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/90 font-mono">
                  {label}
                </div>
              )}
              {dotColor && (
                <div className={`absolute inset-0 m-auto rounded-full ${dotColor === 'blue' ? 'bg-blue-400' : dotColor === 'red' ? 'bg-red-500' : 'bg-yellow-400'}`} style={{ width: 8, height: 8 }} />
              )}
              {ext?.top && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-white/80 font-mono">{ext.top}</div>
              )}
              {ext?.bottom && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white/80 font-mono">{ext.bottom}</div>
              )}
              {ext?.left && (
                <div className="absolute top-1/2 -left-3 -translate-y-1/2 text-[10px] text-white/80 font-mono">{ext.left}</div>
              )}
              {ext?.right && (
                <div className="absolute top-1/2 -right-3 -translate-y-1/2 text-[10px] text-white/80 font-mono">{ext.right}</div>
              )}
            </div>
          );
        })
      ))}
    </div>
  );
}


