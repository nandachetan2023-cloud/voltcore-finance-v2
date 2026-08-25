'use client';

import React from 'react';

function fmtCr(n: number | undefined | null): string {
  const v = n ?? 0;
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr';
  if (v >= 100000) return '₹' + (v / 100000).toFixed(2) + ' L';
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K';
  return '₹' + (v ?? 0).toLocaleString('en-IN');
}

const r2d = Math.PI / 180;
function donutPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = r * Math.sin(startAngle * r2d), c = -r * Math.cos(startAngle * r2d);
  const e = r * Math.sin(endAngle * r2d), c2 = -r * Math.cos(endAngle * r2d);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M${cx + s} ${cy + c} A${r} ${r} 0 ${large} 1 ${cx + e} ${cy + c2}`;
}

export function DonutChart({ data, total }: { data: { name: string; value: number; color: string }[]; total: number }) {
  const safe = data.map(d => ({ ...d, value: d.value ?? 0 }));
  const sum = safe.reduce((a, d) => a + d.value, 0) || 1;
  let current = -90;
  const innerR = 42, outerR = 64, cx = 75, cy = 75;
  return (
    <div className="flex items-center gap-4">
      <div className="w-[150px] h-[150px] shrink-0 relative">
        <svg width="150" height="150" viewBox="0 0 150 150">
          {safe.map((d, i) => {
            const slice = (d.value / sum) * 360;
            const start = current;
            const end = current + slice;
            current = end;
            return (
              <path key={i}
                d={donutPath(cx, cy, outerR, start, end) + ' ' + donutPath(cx, cy, innerR, start, end).split('A').map((p, j) => j === 0 ? p : `A${innerR} ${innerR}`).join('A') + ' Z'}
                fill={d.color} stroke="#161c24" strokeWidth={1.5}
              />
            );
          })}
          {/* inner circle background */}
          <circle cx={cx} cy={cy} r={innerR} fill="#161c24" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[9px] text-[#5a6878]">Total</span>
          <span className="text-[12px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{fmtCr(total)}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {safe.map((d, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
              <span className="text-[11px] text-[#8899aa]">{d.name}</span>
            </div>
            <span className="text-[11px] font-semibold text-[#e2e8f0]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{fmtCr(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const safe = data.map(d => ({ ...d, value: d.value ?? 0 }));
  const values = safe.map(d => d.value);
  const maxVal = values.length > 0 ? Math.max(...values, 1) : 1;
  const pad = 0.15;
  const totalWidth = safe.length * 80;
  const barWidth = 80 * (1 - 2 * pad);
  const h = 200;
  const chartW = Math.max(totalWidth, 300);
  const crFmt = (v: number) => v >= 10000000 ? (v / 10000000).toFixed(1) + 'Cr' : v >= 100000 ? (v / 100000).toFixed(0) + 'L' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : String(v);
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${chartW} ${h}`} preserveAspectRatio="xMidYMid meet">
      {safe.map((d, i) => {
        const barH = (d.value / maxVal) * (h - 40);
        const x = i * 80 + 80 * pad;
        const y = h - 30 - barH;
        return (
          <g key={i}>
            <rect x={x} y={Math.max(y, 0)} width={barWidth} height={Math.max(barH, 0)} rx={4} ry={4} fill={d.color} opacity={0.85} />
            <text x={x + barWidth / 2} y={h - 10} textAnchor="middle" fill="#8899aa" fontSize={9}>
              {d.name.length > 8 ? d.name.slice(0, 8) + '…' : d.name}
            </text>
            <text x={x + barWidth / 2} y={Math.max(y - 5, 10)} textAnchor="middle" fill="#e2e8f0" fontSize={9} fontFamily="'Share Tech Mono', monospace">
              {crFmt(d.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
