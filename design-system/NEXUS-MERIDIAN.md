# NEXUS Design System — "MERIDIAN"

## Design Philosophy

**MERIDIAN** is a **warm dark observatory** aesthetic inspired by vintage NASA mission control, analog instruments, and deep-space observation stations. Deep navy backgrounds with warm amber as the sole accent. Where SIGNAL is cold/clinical and FORGE is loud/playful, MERIDIAN is **warm, sophisticated, and analog-feeling**.

### Core Principles

1. **Warm darkness** — Deep navy (#0A1628), not pure black. Everything has blue warmth.
2. **Amber is the signal** — Warm amber (#F5A623) is the only accent. Like instrument panel lights.
3. **Serif authority** — Playfair Display headings give editorial gravitas unusual for dashboards
4. **Subtle depth** — Soft inner shadows and gentle borders create depth without hard edges
5. **Instrument panel feel** — Circular gauges for stats, warm glowing indicators, analog warmth

### What Makes This Different

| Generic Dashboard | MERIDIAN |
|---|---|
| Pure black background | Deep navy (#0A1628) with warm undertone |
| Cool-toned accents (blue/purple/cyan) | Warm amber (#F5A623) — like cockpit instruments |
| Sans-serif everything | Serif headings (Playfair Display) — editorial authority |
| Sharp/angular | Gentle 8px radius, soft borders |
| Flat stat cards | Circular gauge-style stat indicators |
| High-contrast neon | Muted, warm, easy on the eyes — designed for long monitoring sessions |
| Aggressive/techy feel | Calm, sophisticated, observatory feel |

---

## Color System

```
DEEP SPACE (Backgrounds)
├── --bg-void:       #0A1628    ← Deep navy (warm dark — NOT pure black)
├── --bg-surface:    #0F1D32    ← Card surface (slightly lighter navy)
├── --bg-elevated:   #152540    ← Elevated/hover (visible step up)
├── --bg-input:      #0D1829    ← Input fields (slightly recessed)

AMBER (The only accent — warm instrument light)
├── --accent:        #F5A623    ← Primary amber
├── --accent-dim:    #D4901E    ← Darker amber for hover
├── --accent-glow:   rgba(245, 166, 35, 0.12)  ← Subtle warm tint
├── --accent-muted:  #2A1F0A    ← Very dim amber for backgrounds

TEXT
├── --text-primary:  #D4D4DC    ← Warm off-white (not cool gray)
├── --text-secondary:#8891A0    ← Warm muted
├── --text-ghost:    #4A5568    ← Dim, warm
├── --text-inverse:  #0A1628    ← Dark text on amber

STATUS
├── --status-pending:  #F5A623  ← Amber (same as accent — pending IS the primary state)
├── --status-running:  #48BB78  ← Sage green (warm green, not neon)
├── --status-done:     #63B3ED  ← Soft blue (resolved, calm)
├── --status-failed:   #FC8181  ← Soft coral red (warm, not harsh)
├── --status-idle:     #4A5568  ← Ghost

STRUCTURE
├── --border:        #1E2D45    ← Subtle navy border
├── --border-active: #F5A623    ← Amber active border
├── --border-hard:   #263550    ← Slightly more visible
```

### Color Rules

1. **No cool-toned accents** — no cyan, no purple, no blue accents. ONLY amber.
2. **Status colors are warm-shifted** — green is sage, red is coral, blue is soft. Nothing neon.
3. **Background has warmth** — deep navy, never pure black or cool gray.
4. **Amber glow is the ONLY allowed glow effect** — very subtle, on active elements only.

---

## Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-display: 'Playfair Display', serif;   /* Hero numbers, section headings */
  --font-heading: 'Playfair Display', serif;    /* ALL headings — editorial authority */
  --font-body:    'Inter', sans-serif;          /* Body, labels, UI text */
  --font-data:    'JetBrains Mono', monospace;  /* Data values, logs */
}
```

### Key Difference: Serif Headings

This is the most distinctive typographic choice. Serif headings on a dashboard are extremely rare and give MERIDIAN an editorial, sophisticated quality that no other theme has.

- **Playfair Display** for headings — elegant, high-contrast serif
- **Inter** for body — clean, highly readable, professional
- **JetBrains Mono** for data — consistent with other themes for data precision
- Headings: **Title Case** (not UPPERCASE — serif looks better in title case)
- Generous letter-spacing on body text (+0.3px) for readability

---

## Key Effects

### Warm Ambient Glow

Active elements get a very subtle amber glow (the ONLY glow allowed):

```css
.active-element {
  box-shadow: 0 0 20px rgba(245, 166, 35, 0.08);
}
```

### Circular Stat Gauges

Stats are displayed as **circular gauge indicators** instead of simple numbers:

```
    ╭──────╮
   │  47   │    ← Large Playfair Display number, centered
   │ done  │    ← Small Inter label below
    ╰──────╯
  [===----]     ← Progress arc around the circle (SVG)

The circle:
- 80px diameter
- 2px border in --border-hard
- Border-radius: 50% (the ONLY theme that uses circles)
- Active segment of the arc in status color
- Inactive segment in --border
```

### Soft Inner Shadows

Cards use a subtle inner shadow for depth instead of hard borders or offset shadows:

```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.2);
}
```

### Warm Indicator Dots

Status dots have a warm, analog-instrument feel:

```css
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 6px rgba(245, 166, 35, 0.4);  /* Warm amber glow */
}
```

---

## Component Differences from SIGNAL

### Header
- Deep navy background, 1px bottom border
- Logo: "◈ NEXUS" — ◈ (diamond) in amber, "NEXUS" in Playfair Display 600
- Subtitle: "Observatory" in Inter 300, letter-spaced
- Status: amber dot with warm glow, "System Online" in Inter

### Status Strip
- **Circular gauges** instead of rectangular stat blocks
- Each gauge is an 80px circle with SVG arc progress
- Number in Playfair Display 700, 28px
- Label in Inter 11px, title case
- Arranged horizontally with equal spacing
- Active gauge has subtle amber glow ring

### Cards
- 8px border-radius (the only theme with rounded corners)
- 1px subtle border (not hard/thick)
- Soft box-shadow for depth (not offset shadow)
- Section header: Playfair Display 600, 16px, Title Case (not UPPERCASE)
- Preceded by "◈" diamond in amber (instead of ">" prompt)

### Task Rows
- Clean rows separated by 1px border
- Priority shown as small amber-filled dot (high), half-filled (med), outline (low)
- Hover: left border 2px amber, subtle amber background tint
- Text in Inter for readability

### Log Viewer
- Deep background (slightly darker than card surface)
- 1px border, 8px radius
- No terminal pretension — clean, readable log list
- Timestamps in amber (warm highlight)
- Levels: INFO=text-secondary, WARN=amber, ERROR=coral
- Header: "System Log" in Playfair Display (not "SYSTEM LOG")

### Task Panel
- Side panel with 1px amber left border accent
- Inputs: dark bg, 1px border, 8px radius, amber focus border
- Labels: Inter 12px, title case
- Submit button: amber background, dark text, 8px radius, "Submit Task" (not bracket notation)

### Status Bar
- Deep navy, 1px top border
- Warm amber for system status text
- Items separated by "·" (middle dot, not pipe)
- Font: Inter 11px

---

## Banned Effects

- ❌ Hard offset shadows (FORGE only)
- ❌ Corner brackets (SIGNAL only)
- ❌ Thick borders (>2px)
- ❌ 0px border-radius (everything 8px in MERIDIAN)
- ❌ Uppercase headings (serif looks terrible uppercase)
- ❌ Cold-toned accents (cyan, purple, neon green)
- ❌ Neon glow effects (only subtle warm amber glow allowed)
- ❌ Scanline overlay
- ❌ Gradient backgrounds
- ❌ Pure black or pure white

---

## CSS Variables (Complete — MERIDIAN overrides)

```css
[data-theme="meridian"] {
  --bg-void: #0A1628;
  --bg-surface: #0F1D32;
  --bg-elevated: #152540;
  --bg-input: #0D1829;
  --bg-terminal: #0B1420;

  --accent: #F5A623;
  --accent-dim: #D4901E;
  --accent-glow: rgba(245, 166, 35, 0.12);
  --accent-muted: #2A1F0A;

  --text-primary: #D4D4DC;
  --text-secondary: #8891A0;
  --text-ghost: #4A5568;
  --text-inverse: #0A1628;

  --status-pending: #F5A623;
  --status-running: #48BB78;
  --status-done: #63B3ED;
  --status-failed: #FC8181;
  --status-idle: #4A5568;

  --border: #1E2D45;
  --border-active: #F5A623;
  --border-hard: #263550;

  --radius: 8px;
  --border-width: 1px;
  --shadow-x: 0px;
  --shadow-y: 2px;
  --shadow-color: rgba(0,0,0,0.2);
}
```
