# 블라인드 오목 — Design Spec

## MONO · "한 수 차이" (A Single Move Apart)

> Source of truth for visual design. Generated via a multi-agent design exploration
> (3 directions → judged → synthesized). Implementation should follow this.

---

## 1. Art Direction

A near-monochrome graphite-and-paper world where the entire visual personality is
held in reserve until the final reveal. The board is a **precision instrument**, not a
wooden goban: hairline geometry on a barely-raised dark panel, every stone an identical
flat-matte off-white disc so "mine vs. theirs" is *honestly* indistinguishable — the
ambiguity comes from the blind-play constraint, not decoration. The board **floats**
above the page on a soft ambient shadow + faint top-lit vignette. During play the only
color on the board is a single violet last-move ring; at game end, color floods in via a
per-stone recolor cascade while the **Memory Ledger** rewrites the game's true story
top-to-bottom in one column. Calm, exact, slightly tense.

---

## 2. Color Tokens

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#0A0A0B` | Page background, landing canvas |
| `surface` | `#141416` | Panels (side panel, room blocks, cards) |
| `surface2` | `#1B1B1E` | Raised/hover surface, segmented-control track, input fill |
| `board` | `#161618` | Board panel base fill |
| `boardCenter` | `#181819` | Board radial-vignette center |
| `gridLine` | `#2E2E33` | 1px grid hairlines, board border, panel dividers |
| `starPoint` | `#3A3A40` | 5 star-point dots (천원 + 4 corners) |
| `stone` | `#E7E7EA` | Neutral disc fill during play (both players, identical) |
| `stoneEdge` | `#9A9AA0` | 1px stone inner edge stroke; opponent ring at reveal |
| `lastMove` | `#6E56CF` | Last-move ring (violet); hover ring |
| `revealMine` | `#3DD9C4` | Your stones at reveal (teal) |
| `revealTheirs` | `#F0F0F2` | Opponent stones at reveal (bright paper) + `stoneEdge` ring |
| `accent` | `#6E56CF` | Primary accent (violet) — focus, active-player bar, win-line start |
| `accent2` | `#3DD9C4` | Secondary accent (teal) — win-line end, online pulse, success |
| `text` | `#FAFAFA` | Primary text |
| `textMuted` | `#8A8A92` | Labels, coordinates, ledger coords, sublines |
| `win` | `#3DD9C4` | Win-state text/glow |
| `danger` | `#F2555A` | Errors, resign, destructive confirm |

Reveal win-line stroke: linear gradient `accent #6E56CF` → `accent2 #3DD9C4`.

---

## 3. Typography

| Role | Font | Weights | Where |
|---|---|---|---|
| Display | **Geist** (Latin) + **Pretendard** (Hangul fallback) | 500/600/700 | Wordmark, hero, headers, win verdict, big numerals. Tracking `-0.02em` large |
| Body | **Geist** (Latin) + **Pretendard** (Hangul) | 400/500 | UI labels, names, copy, buttons. `line-height: 1.5` |
| Mono | **Geist Mono** | 400/500 | Room codes, `MOVE 23`, timers, coordinates, ledger rows, micro-labels |

- `font-variant-numeric: tabular-nums` on ALL numerals.
- Micro-labels (`YOUR TURN`, `SPECTATING`, `ROOM`): mono, ALL-CAPS, `letter-spacing: 0.12em`, 10–11px, `textMuted`.
- Implementation: Geist Sans/Mono via the `geist` package (`next/font`, self-hosted). Hangul falls
  through to Pretendard automatically (Geist lacks Hangul glyphs). Pretendard via CDN.

---

## 4. Board & Stones — SVG

| Property | Value |
|---|---|
| Grid | 15 × 15 intersections (14 cells/side) |
| Cell pitch | `36` units |
| Playing span | `504` |
| Board padding | `40` units all sides (coordinate gutter) |
| Board panel | `584 × 584`, `border-radius: 12px` |
| Grid line | `1` unit, `non-scaling-stroke`, `gridLine #2E2E33` |
| Outer border | same 1px hairline (NOT heavier) |
| Origin | top-left intersection at `(40, 40)` |

- Board fill `board #161618` + radial vignette (`#181819` center → `#161618` edge).
- Float: `box-shadow: 0 24px 60px rgba(0,0,0,.45), 0 2px 8px rgba(0,0,0,.4)`. No wood/bevel/texture.
- Star points: center `(7,7)` + `(3,3)(3,11)(11,3)(11,11)`, `circle r=3` filled `starPoint #3A3A40`.
- Coordinate labels A–O / 1–15 in gutter, 11px Geist Mono `textMuted`. Toggleable.

**Stone:** radius `16`, fill linear `#EDEDEF → #DCDCDF` (top-lit), 1px inner stroke `stoneEdge #9A9AA0`,
`drop-shadow(0 1px 2px rgba(0,0,0,.5))`. Flat-matte, NO specular, NO 3D dome.

**Placement anim:** scale `0.6 → 1.0` + opacity `0 → 1`, **140ms** `cubic-bezier(0.22,1,0.36,1)`, origin = center.

**Hover (empty):** 1px `lastMove #6E56CF` ring at 40% opacity previewing placement.

---

## 5. End-Game REVEAL (signature, ≈1.6s)

Origin = final winning stone. Per-stone delay = **Chebyshev distance** from origin.

| Phase | Time | What |
|---|---|---|
| 1 · Dim + trace | 0–240ms | Board dims to 70%. Win-line gets gradient stroke `#6E56CF→#3DD9C4` traced via `stroke-dashoffset` origin→out, 4px rounded |
| 2 · Recolor cascade | 240–1100ms | Wavefront from origin: each stone flips at `delay = dist × 22ms`; flip = 180ms scale pulse `1→1.08→1` (`cubic-bezier(0.34,1.56,0.64,1)`) + fill crossfade neutral → owner |
| 3 · Winner emphasis | 1100–1600ms | 5 winning stones get breathing `win #3DD9C4` glow `0 0 16px` + halo ring scale-out |

- Your stones → `revealMine #3DD9C4`. Opponent → `revealTheirs #F0F0F2` + `stoneEdge` ring.
- Spectators: stable two-color verdict (player 0 → teal, player 1 → paper); toggle uses same mapping.
- Impl: per-stone `transition: fill 120ms linear, transform 180ms <snap>` + `transition-delay: calc(var(--dist)*22ms)`; flip one `data-revealed` class → stagger emerges free. Glow = CSS `drop-shadow` on 5 nodes.
- Memory Ledger recolors top-to-bottom in the same rhythm.
- Spectator reveal: same cascade, origin = board center, 1.2× speed. Toggling back to BLIND reverses (drain to neutral 700ms).
- `prefers-reduced-motion`: collapse to single 200ms crossfade; win-line drawn static.

---

## 6. Last-Move Indicator

- Single 1px `lastMove #6E56CF` ring, inset 2px inside stone edge (ring radius ≈ 14).
- Marks recency only — NEVER ownership (stone stays neutral).
- Placement: ring fades in 200ms. Next move: old ring crossfades out 160ms as new fades in.
- Exactly one violet ring on the board at any time. Matching newest ledger row dot shares the ring.

---

## 7. Landing Page

Full-viewport hero on `bg #0A0A0B`, no scroll, generous negative space.

- Top-left: `MONO` wordmark, Geist 700, 14px neutral stone glyph dotting the `O`.
- Top-right: `KO / EN` toggle (mono). (KO only for v1 is fine.)
- Center stack (max-width 480px):
  1. Hero `같은 색. 다른 기억.` — 600, ~56px, tracking `-0.02em`.
  2. Subline `textMuted`: `모든 돌이 같은 색입니다. 당신의 돌을 기억하세요.`
  3. Nickname input — borderless, 1px bottom hairline `gridLine` → lights to `accent` on focus; placeholder `닉네임` mono.
  4. Actions: primary solid pill `랜덤 매칭` (bg `#FAFAFA`, text `#0A0A0B`); ghost `방 만들기` / `방 코드 입력` (1px `gridLine`, hover → `accent`).
- Background watermark: faint 15×15 grid (~6% opacity) bleeding off edges; a few neutral stones fade in/out at random intersections on a slow loop.
- Footer: mono `온라인 N` with 6px `accent2` pulse dot.
- Copy tone: terse, confident, short declaratives. No exclamation marks. `같은 색. 다른 기억.`

---

## 8. In-Room Layout

Two-column, board-dominant.

**LEFT (~68%):** board centered in `surface #141416` panel + coordinate gutter + **Memory Ledger** rail on right edge. Slim top strip: `MOVE {n}` (mono, center) + per-move turn timer.

**Memory Ledger:** vertical move-history down the board's right edge, Geist Mono. One row/move = neutral dot + coord (`H8`) `textMuted`, **newest at top**, numbered. Every dot identical `stone #E7E7EA` during play (shows sequence, never owner). 간지: hovering a row highlights that stone on the board with a 1px `accent` ring + dims the rest → mentally replay. At reveal, the rail recolors top-to-bottom in the board's cascade rhythm.

**RIGHT panel (~32%, max 360px):** `surface #141416`, 1px `gridLine` left border, 24px padding, hairline dividers. Top→bottom:
1. **ROOM** — mono code + copy icon; `SPECTATING`/`PLAYING` chip.
2. **PLAYERS** — two rows: avatar initial chip + nickname + neutral stone swatch (both identical during play). Active player row: 2px left `accent` bar + breathing pulse + mono countdown.
3. **SPECTATORS** — collapsible count `SPECTATORS · 7` → quiet name list.
4. **REVEAL TOGGLE (spectators only)** — segmented `BLIND | REVEAL`, default `BLIND`. Players never see it.
5. **Pinned bottom** — post-game: primary `재대국` pill + ghost `나가기`.

End-game: right panel shows `승리 · {nickname}` in `win #3DD9C4`; ledger fully recolored.

**Mobile:** board stacks full-width on top; panel becomes bottom sheet with turn indicator + (spectator) reveal toggle pinned.

---

## 9. Motion + 간지

| Token | Curve | Use |
|---|---|---|
| `enter` | `cubic-bezier(0.22,1,0.36,1)` | Entrances, placement scale-in |
| `exit` | `cubic-bezier(0.4,0,1,1)` | Exits, fade-outs |
| `snap` | `cubic-bezier(0.34,1.56,0.64,1)` | **Reserved** for stone placement + reveal cascade only |

Durations: micro `120ms` · default `200ms` · deliberate `320ms` · reveal-cascade `900ms`.

- Route transitions: 240ms opacity + 8px upward translate. No horizontal slides.
- Panels/modals: scale-from-98% + fade. Never bounce (bounce belongs to stones).
- Turn indicator: 2s ease-in-out breathing opacity on active player.
- Hover: 120ms, tiny — borders brighten, never grow.
- Respect `prefers-reduced-motion` everywhere (collapse to 200ms crossfade).

**THE 간지 — Memory Ledger as instrument.** The right-edge ledger turns the core tension
(remembering which stones are yours) into an interactive instrument: row-hover replays
ownership (ring + dim-the-rest); reveal recolors the whole column top-to-bottom in the
board's cascade rhythm. Concept-fit + screenshot-worthy in one component, trivially feasible.
