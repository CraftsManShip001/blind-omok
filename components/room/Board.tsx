"use client";

import { useEffect, useState } from "react";
import { BOARD_SIZE, type Coord, type Owner, type SerializedStone } from "@/lib/types";
import {
  PAD,
  PITCH,
  STAR_POINTS,
  STONE_R,
  VIEW,
  chebyshev,
  coordLabel,
  gx,
  gy,
} from "@/lib/board";

interface BoardProps {
  stones: SerializedStone[];
  lastMoveN: number | null;
  winLine: Coord[] | null;
  revealed: boolean;
  draining: boolean;
  revealOrigin: Coord;
  canPlay: boolean;
  onPlace: (x: number, y: number) => void;
  highlightN: number | null;
  showCoords: boolean;
}

// First player (index 0) is 흑(black), second (index 1) is 백(white).
function ownerColors(owner: Owner) {
  if (owner === null) return { fill: "transparent", stroke: "transparent" };
  return owner === 0
    ? { fill: "url(#blackStone)", stroke: "var(--color-black-edge)" }
    : { fill: "url(#whiteStone)", stroke: "var(--color-white-edge)" };
}

const RANGE = Array.from({ length: BOARD_SIZE }, (_, i) => i);

export function Board({
  stones,
  lastMoveN,
  winLine,
  revealed,
  draining,
  revealOrigin,
  canPlay,
  onPlace,
  highlightN,
  showCoords,
}: BoardProps) {
  const [hover, setHover] = useState<Coord | null>(null);

  useEffect(() => {
    if (!canPlay) setHover(null);
  }, [canPlay]);

  const occupied = new Set(stones.map((s) => `${s.x},${s.y}`));
  const winSet = new Set((winLine ?? []).map((c) => `${c.x},${c.y}`));

  const svgClass = [
    "board-svg",
    revealed ? "revealed" : "",
    draining ? "draining" : "",
    highlightN !== null ? "has-highlight" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const winFirst = winLine?.[0];
  const winLast = winLine?.[winLine.length - 1];

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className={svgClass}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label="오목판"
    >
      <defs>
        <linearGradient id="stoneFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-stone-top)" />
          <stop offset="1" stopColor="var(--color-stone-bottom)" />
        </linearGradient>
        <linearGradient id="blackStone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-black-top)" />
          <stop offset="1" stopColor="var(--color-black-bottom)" />
        </linearGradient>
        <linearGradient id="whiteStone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-white-top)" />
          <stop offset="1" stopColor="var(--color-white-bottom)" />
        </linearGradient>
        <radialGradient id="boardVignette" cx="50%" cy="50%" r="72%">
          <stop offset="0" stopColor="var(--color-board-center)" />
          <stop offset="1" stopColor="var(--color-board)" />
        </radialGradient>
        {winFirst && winLast && (
          <linearGradient
            id="winGradient"
            gradientUnits="userSpaceOnUse"
            x1={gx(winFirst.x)}
            y1={gy(winFirst.y)}
            x2={gx(winLast.x)}
            y2={gy(winLast.y)}
          >
            <stop offset="0" stopColor="var(--color-accent)" />
            <stop offset="1" stopColor="var(--color-accent-2)" />
          </linearGradient>
        )}
      </defs>

      {/* panel */}
      <rect
        x="0.5"
        y="0.5"
        width={VIEW - 1}
        height={VIEW - 1}
        rx="12"
        fill="url(#boardVignette)"
        stroke="var(--color-grid)"
        strokeWidth="1"
      />

      {/* grid */}
      <g stroke="var(--color-grid)" strokeWidth="1" vectorEffect="non-scaling-stroke">
        {RANGE.map((i) => (
          <line key={`v${i}`} x1={gx(i)} y1={gy(0)} x2={gx(i)} y2={gy(BOARD_SIZE - 1)} />
        ))}
        {RANGE.map((i) => (
          <line key={`h${i}`} x1={gx(0)} y1={gy(i)} x2={gx(BOARD_SIZE - 1)} y2={gy(i)} />
        ))}
      </g>

      {/* star points */}
      <g fill="var(--color-star)">
        {STAR_POINTS.map(([x, y]) => (
          <circle key={`s${x}-${y}`} cx={gx(x)} cy={gy(y)} r="3" />
        ))}
      </g>

      {/* coordinate labels */}
      {showCoords && (
        <g
          className="mono"
          fill="var(--color-muted)"
          fontSize="11"
          style={{ letterSpacing: "0.06em" }}
        >
          {RANGE.map((i) => (
            <text key={`cx${i}`} x={gx(i)} y={VIEW - 14} textAnchor="middle">
              {coordLabel(i, 0)[0]}
            </text>
          ))}
          {RANGE.map((i) => (
            <text key={`cy${i}`} x="18" y={gy(i) + 4} textAnchor="middle">
              {BOARD_SIZE - i}
            </text>
          ))}
        </g>
      )}

      {/* win line */}
      {revealed && winLine && winLine.length >= 2 && (
        <polyline
          className="win-line"
          points={winLine.map((c) => `${gx(c.x)},${gy(c.y)}`).join(" ")}
          fill="none"
          stroke="url(#winGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
        />
      )}

      {/* stones */}
      {stones.map((s) => {
        const cx = gx(s.x);
        const cy = gy(s.y);
        const dist = chebyshev(s.x, s.y, revealOrigin.x, revealOrigin.y);
        const { fill, stroke } = ownerColors(s.owner);
        const isWin = winSet.has(`${s.x},${s.y}`);
        const isHighlight = highlightN === s.n;
        const wrapClass = [
          "stone-wrap",
          isWin ? "winning" : "",
          isHighlight ? "is-highlight" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <g
            key={s.n}
            className={wrapClass}
            transform={`translate(${cx} ${cy})`}
            style={{ "--d": dist } as React.CSSProperties}
          >
            <g className="stone-enter">
              <g className="stone-discs">
                <circle
                  className="disc-base"
                  r={STONE_R}
                  fill="url(#stoneFill)"
                  stroke="var(--color-stone-edge)"
                  strokeWidth="1"
                />
                <circle
                  className="disc-owner"
                  r={STONE_R}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="1"
                />
              </g>
              {!revealed && lastMoveN === s.n && (
                <circle
                  className="last-ring"
                  r={STONE_R - 2}
                  fill="none"
                  stroke="var(--color-last)"
                  strokeWidth="1.5"
                />
              )}
              {isHighlight && (
                <circle
                  className="hl-ring"
                  r={STONE_R + 3}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="1.5"
                />
              )}
            </g>
          </g>
        );
      })}

      {/* hover preview */}
      {canPlay && hover && !occupied.has(`${hover.x},${hover.y}`) && (
        <circle
          className="hover-ring"
          cx={gx(hover.x)}
          cy={gy(hover.y)}
          r={STONE_R - 2}
          fill="none"
          stroke="var(--color-last)"
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />
      )}

      {/* interaction layer */}
      {canPlay && (
        <g>
          {RANGE.flatMap((y) =>
            RANGE.map((x) => {
              if (occupied.has(`${x},${y}`)) return null;
              return (
                <rect
                  key={`hit${x}-${y}`}
                  className="cell-hit"
                  x={gx(x) - PITCH / 2}
                  y={gy(y) - PITCH / 2}
                  width={PITCH}
                  height={PITCH}
                  fill="transparent"
                  onPointerEnter={() => setHover({ x, y })}
                  onPointerLeave={() =>
                    setHover((h) => (h && h.x === x && h.y === y ? null : h))
                  }
                  onClick={() => onPlace(x, y)}
                />
              );
            }),
          )}
        </g>
      )}
    </svg>
  );
}
