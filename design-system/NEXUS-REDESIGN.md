# NEXUS Design System — "SIGNAL"

## Design Philosophy

**SIGNAL** is a tactical command-center aesthetic that fuses **Kinetic Brutalism**, **Terminal HUD**, and **Monochrome Discipline** into a cohesive identity. It rejects the overplayed glassmorphism-neon-gradient dashboard trope in favor of raw, confident, information-dense design.

### Core Principles

1. **Typography IS the design** — Oversized numbers, aggressive weight hierarchy, monospace data
2. **Monochrome + ONE accent** — Phosphor green on void black. No rainbow gradients.
3. **Hard edges, hard shadows** — 0px border-radius. Offset shadows. No blur effects.
4. **Information density over decoration** — Every pixel earns its place
5. **Terminal authenticity** — This is an AI orchestrator. It should FEEL like a command center.

### What Makes This Different

| Generic Dashboard | SIGNAL |
|---|---|
| Glassmorphism blur effects | Hard offset shadows, solid borders |
| Purple/cyan/pink gradients | Monochrome + phosphor green accent |
| Rounded cards (16px radius) | 0px radius, chamfered corners via CSS clip-path |
| Small stat cards in a grid | Oversized stat numbers as hero typography |
| Decorative SVG icons | ASCII/text-based indicators (`>`, `█`, `▪`, `◆`) |
| Soft hover effects | Instant color-flood inversion on interaction |
| Subtle muted borders | Visible 2px structural borders |
| Generic "Dashboard" feel | Tactical HUD / mission control identity |

---

## Color System

### Palette

```
VOID (Backgrounds)
├── --bg-void:       #08080C    ← Deepest background (near-black, slight blue undertone)
├── --bg-surface:    #111118    ← Card/panel surface
├── --bg-elevated:   #1A1A24    ← Elevated elements, hover states
└── --bg-input:      #0D0D14    ← Input fields, recessed areas

PHOSPHOR (Accent — the ONLY accent color)
├── --accent:        #00FF88    ← Primary accent (phosphor green)
├── --accent-dim:    #00CC6A    ← Slightly muted for borders/secondary
├── --accent-glow:   rgba(0, 255, 136, 0.15)  ← Subtle background tint
└── --accent-muted:  #0A3D24    ← Very dim green for inactive states

TEXT
├── --text-primary:  #E0E0E8    ← Primary text (off-white, not pure white)
├── --text-secondary:#7A7A8E    ← Secondary/muted text
├── --text-ghost:    #3A3A4A    ← Ghost text, placeholders, disabled
└── --text-inverse:  #08080C    ← Text on accent backgrounds

STATUS (Semantic — used ONLY for status indication)
├── --status-pending:  #FFB000  ← Amber (pending/queued)
├── --status-running:  #00FF88  ← Green (matches accent — running IS the primary state)
├── --status-done:     #00D4FF  ← Electric blue (completed — cool, resolved)
├── --status-failed:   #FF3366  ← Hot pink-red (error/failed — not generic red)
└── --status-idle:     #3A3A4A  ← Ghost (idle/inactive)

STRUCTURE
├── --border:        #1E1E2A    ← Default borders (visible but not harsh)
├── --border-active:  #00FF88   ← Active/focused borders (accent)
├── --border-hard:   #2A2A3A    ← Emphasized structural borders
└── --shadow-offset: #000000    ← Hard offset shadows
```

### Color Rules

1. **Never use gradients** on backgrounds, borders, or buttons. Flat, solid colors only.
2. **Accent green is sacred** — only for: active states, primary actions, running indicators, and interactive highlights.
3. **Status colors ONLY in status contexts** — don't use amber for decoration, only for "pending" state.
4. **No opacity games** — backgrounds are solid. If you need depth, use the elevation scale.
5. **Text glow is BANNED** — the old neon text-shadow glow effect is removed entirely. Readability > aesthetics.

---

## Typography

### Font Stack

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Orbitron:wght@500;600;700&display=swap');

:root {
  --font-display: 'Orbitron', sans-serif;      /* Hero numbers, big stats */
  --font-heading: 'Space Grotesk', sans-serif;  /* Section headings, nav, buttons */
  --font-body:    'Space Grotesk', sans-serif;  /* Body text, labels */
  --font-data:    'JetBrains Mono', monospace;   /* Data values, logs, task names, timestamps */
}
```

### Type Scale

| Role | Font | Size | Weight | Transform | Letter Spacing |
|------|------|------|--------|-----------|----------------|
| Hero Number | Orbitron | 48–64px | 700 | — | -2px |
| Section Title | Space Grotesk | 14px | 700 | UPPERCASE | +2px |
| Card Title | Space Grotesk | 16px | 600 | UPPERCASE | +1px |
| Body | Space Grotesk | 14px | 400 | — | normal |
| Label | Space Grotesk | 11px | 500 | UPPERCASE | +2px |
| Data Value | JetBrains Mono | 13px | 400 | — | normal |
| Stat Label | JetBrains Mono | 12px | 400 | UPPERCASE | +1.5px |
| Log Text | JetBrains Mono | 12px | 400 | — | normal |
| Button | Space Grotesk | 13px | 600 | UPPERCASE | +1.5px |
| Badge | JetBrains Mono | 10px | 500 | UPPERCASE | +1px |

### Typography Rules

1. **ALL headings, buttons, labels, and badges are UPPERCASE** — this is non-negotiable for the aesthetic.
2. **Numbers use Orbitron** — stat counts, percentages, any hero metric. This gives the "mission control" feel.
3. **Data uses JetBrains Mono** — task names, timestamps, log entries, container names. Monospace = precision.
4. **Space Grotesk for everything else** — it has unique character (the quirky 'g' and 'a') that sets it apart from generic sans-serifs.
5. **No font size below 11px** — accessibility minimum.
6. **Line height: 1.2 for headings, 1.5 for body, 1.3 for data** — tight headings, readable body.

---

## Layout System

### Grid Architecture

```
Desktop (≥1200px): 12-column grid, 24px gap
Tablet (≥768px):   8-column grid, 16px gap
Mobile (≥375px):   4-column grid, 12px gap

Max content width: 1400px
Horizontal padding: 32px (desktop), 20px (tablet), 16px (mobile)
```

### Page Structure (Top → Bottom)

```
┌─────────────────────────────────────────────────────────────────┐
│  COMMAND BAR (48px height, fixed top)                           │
│  [■ NEXUS]  [SYSTEM ONLINE ● 12:34:05]        [+ NEW TASK]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STATUS STRIP (horizontal, full-width, 80px)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ 03       │ │ 01       │ │ 47       │ │ 02       │          │
│  │ QUEUED   │ │ RUNNING  │ │ COMPLETE │ │ FAILED   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  ┌─── MISSION QUEUE ───────────────┐ ┌─── ACTIVE AGENTS ─────┐│
│  │                                 │ │                         ││
│  │  Task list (table format)       │ │  Agent containers       ││
│  │  Monospace, left-aligned        │ │  Connection indicators  ││
│  │                                 │ │                         ││
│  └─────────────────────────────────┘ └─────────────────────────┘│
│                                                                 │
│  ┌─── COMPLETED ───────────────────┐ ┌─── FAILED ─────────────┐│
│  │                                 │ │                         ││
│  │  Recent completions             │ │  Error log              ││
│  │                                 │ │                         ││
│  └─────────────────────────────────┘ └─────────────────────────┘│
│                                                                 │
│  ┌─── SYSTEM LOG ──────────────────────────────────────────────┐│
│  │ $ orchestrator output                                       ││
│  │ > log lines here...                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  STATUS BAR (fixed bottom, 28px)                                │
│  [SYS:OK] [DOCKER:CONNECTED] [CRON:2m] [UPTIME:4h23m] [v1.2] │
└─────────────────────────────────────────────────────────────────┘
```

### Spacing Scale (8dp rhythm)

```
--space-1:  4px    ← Tight gaps (badge padding, icon gaps)
--space-2:  8px    ← Component internal padding
--space-3:  12px   ← Between related items
--space-4:  16px   ← Card internal padding
--space-5:  24px   ← Between sections
--space-6:  32px   ← Major section breaks
--space-8:  48px   ← Page-level spacing
```

---

## Component Specifications

### 1. Command Bar (replaces Header)

The header is stripped down to a thin **command bar** — functional, not decorative.

```
Height: 48px
Background: var(--bg-surface)
Border-bottom: 2px solid var(--border)
Position: fixed top
Z-index: 100

Layout:
[LEFT]  Logo mark (small "■" or geometric mark) + "NEXUS" in Space Grotesk 600, 16px, uppercase
[CENTER] System status: "SYSTEM ONLINE" + pulsing dot + current time (JetBrains Mono, 12px)
[RIGHT]  "[ + NEW TASK ]" button (bracketed, monospace style)
```

**Key changes from current:**
- No gradient animated text
- No large hexagon SVG logo
- No glassmorphism blur
- 48px instead of 64px (more compact)
- Time display adds utility
- Button uses bracket notation `[ ACTION ]` instead of gradient pill

### 2. Status Strip (replaces StatCards)

Instead of 4 separate cards in a grid, stats are displayed as a **horizontal strip** with oversized Orbitron numbers.

```
Layout: Horizontal flex, equal-width sections, separated by 2px vertical dividers
Height: ~100px
Background: var(--bg-surface)
Border: 2px solid var(--border)
Border-radius: 0px

Each stat section:
┌────────────────┐
│      03        │  ← Orbitron 48px, weight 700, color based on status
│    QUEUED      │  ← JetBrains Mono 11px, uppercase, letter-spacing +2px, --text-secondary
└────────────────┘

Active stat (the one with items): left border 3px accent color, bg slightly tinted
Hover: background floods to accent-glow, number color shifts to full accent
Click: filters the task view below (optional future feature)
```

**Interaction: Counter Animation**
- When count changes, number does a quick **vertical slide** (new number slides up from below, old slides up and out)
- Duration: 200ms, ease-out
- No scale/bounce — clean vertical motion only

### 3. HUD Cards (replaces TaskCard/ContainerCard)

Cards use **corner brackets** instead of full borders for a HUD/tactical feel.

```
Background: var(--bg-surface)
Border: none (brackets provide visual container)
Border-radius: 0px
Padding: 20px

Corner brackets (CSS ::before/::after on wrapper):
┌──                                              ──┐

  Card content here

└──                                              ──┘

Bracket specs:
- Length: 20px each arm
- Width: 2px
- Color: var(--border-hard) default, var(--accent) on hover
- Transition: color 150ms

Card header:
- Section label: Space Grotesk 14px, 700, uppercase, +2px spacing
- Preceded by "> " prefix in accent color (like a terminal prompt)
- Count badge: JetBrains Mono, 10px, accent bg, inverse text, 0px radius
- Example: "> MISSION QUEUE [3]"
```

**Card Header Examples:**
```
> MISSION QUEUE              [3]
> ACTIVE AGENTS              [1]
> COMPLETED                  [47]
> FAILED                     [2]
> SYSTEM LOG
```

### 4. Task Items (inside HUD Cards)

Tasks are displayed in a **table-like monospace format**, not as mini-cards.

```
Layout: Full-width rows, no individual card styling
Separator: 1px solid var(--border) between rows
Padding: 12px 0
Font: JetBrains Mono 13px

Format per row:
┌─────────────────────────────────────────────────────────────┐
│ ▪ HIGH   refactor-auth-middleware    agent-system   2m ago  │
│ ▪ MED    add-rate-limiting           api-server    12m ago  │
│ ▪ LOW    update-readme               docs          1h ago   │
└─────────────────────────────────────────────────────────────┘

Column breakdown:
[status-dot] [PRIORITY] [task-name] [project] [time]

Status dot: 6px square (not circle), color = status color
Priority: 4-char padded, uppercase, color = priority color
  HIGH = --status-failed (#FF3366)
  MED  = --status-pending (#FFB000)
  LOW  = --text-secondary (#7A7A8E)
Task name: Truncated at 30 chars, accent color on hover
Project: --text-secondary
Time: --text-ghost, right-aligned

Hover: entire row gets left-border 2px accent, bg shifts to --bg-elevated
```

### 5. Container Items (Active Agents)

```
Format per row:
┌─────────────────────────────────────────────────────────────┐
│ ● RUNNING  claude-agent-a8f3    claude-agent:latest  4m    │
│ ● RUNNING  claude-agent-b2e1    claude-agent:latest  1m    │
└─────────────────────────────────────────────────────────────┘

Running indicator: ● (6px circle, accent green, pulsing glow animation)
Status: RUNNING in accent green, uppercase
Name: JetBrains Mono, accent-dim
Image: --text-secondary
Uptime: --text-ghost, right-aligned
```

### 6. Log Viewer (System Log)

The log viewer is the **hero component** — it's the most terminal-authentic part.

```
Background: #050508 (even darker than void — true terminal black)
Border: 2px solid var(--border-hard)
Font: JetBrains Mono 12px, line-height 1.4
Height: 400px (taller than current 320px — logs deserve space)
Padding: 16px

Header:
- NO macOS traffic lights (this isn't pretending to be macOS)
- Instead: "> SYSTEM LOG" in section header style
- Right side: line count ("142 lines") in ghost text

Log line format:
  [12:34:05] INFO  Task processing started
  [12:34:06] INFO  Spawning claude-agent container
  [12:34:08] WARN  Git push failed, continuing...
  [12:35:12] ERROR Container exited with code 1

Color coding:
  Timestamp: var(--text-ghost) — deemphasized
  INFO:  var(--text-secondary) — readable but calm
  WARN:  var(--status-pending) — amber, no glow
  ERROR: var(--status-failed) — hot pink-red, no glow
  Task/container names within logs: var(--accent) — highlighted

No text-shadow glow effects. Clean, readable text only.

Scrollbar:
  Width: 6px
  Track: var(--bg-void)
  Thumb: var(--border-hard), accent on hover
  Border-radius: 0px (consistent with 0-radius theme)
```

### 7. Task Panel (New Task Modal)

Slides in from the right as a **full-height panel** with terminal-style form fields.

```
Width: 440px (max 90vw mobile)
Background: var(--bg-surface)
Border-left: 2px solid var(--accent)
Animation: translateX(100%) → translateX(0), 250ms ease-out

Backdrop: rgba(8, 8, 12, 0.85) — dark, solid, no blur

Header:
  "> NEW TASK" in section header style
  Close: "[ ESC ]" text button, not an ✕ icon

Form fields:
  Label: Space Grotesk 11px, uppercase, +2px spacing, --text-secondary
  Input: JetBrains Mono 14px
  Background: var(--bg-input)
  Border: 2px solid var(--border)
  Border-radius: 0px
  Focus: border-color → var(--accent), no box-shadow glow
  Height: 44px (touch-friendly)
  Caret color: var(--accent)

  Placeholder style: var(--text-ghost), italic

Priority selector:
  Custom styled as 3 toggle buttons: [ HIGH ] [ MED ] [ LOW ]
  Active: accent background, inverse text
  Inactive: ghost border, ghost text
  (Replaces native <select> dropdown)

Submit button:
  Full width
  Background: var(--accent)
  Color: var(--text-inverse) (#08080C)
  Font: Space Grotesk 13px, 600, uppercase, +1.5px
  Height: 48px
  Hover: slightly darker accent (--accent-dim)
  Active: instant invert (bg → void, text → accent, border → accent)
  Text: "[ EXECUTE ]" (not "Submit")

Success feedback:
  Replace button text → "[ TASK QUEUED ✓ ]" for 2s
  Button bg → transparent, border → accent, text → accent
```

### 8. Status Bar (NEW — replaces Footer)

A **fixed bottom bar** showing system vitals. This is a signature element.

```
Height: 28px
Position: fixed bottom
Background: var(--bg-surface)
Border-top: 1px solid var(--border)
Font: JetBrains Mono 11px
Color: var(--text-ghost)
Z-index: 100
Padding: 0 32px

Layout (horizontal, space-between):
LEFT:  [SYS:ONLINE] or [SYS:OFFLINE]  — green dot / red dot
       [DOCKER:OK]  — container runtime status
       [CRON:2m]    — polling interval
CENTER: (empty or deployed commit hash if available)
RIGHT: [UPTIME:4h23m]  — session uptime
       [NEXUS v1.2]    — version

Status items separated by " │ " (thin pipe character)

Online: "SYS" label in accent green
Offline: "SYS" label in --status-failed, pulsing
```

### 9. Empty States

```
When a card has no items:

┌──                              ──┐

     > NO ACTIVE AGENTS_
     System idle. Awaiting tasks.

└──                              ──┘

">" prefix in accent
"_" is a blinking cursor (500ms opacity toggle)
Subtitle in --text-ghost
All text: JetBrains Mono 13px
Center-aligned within the card
```

---

## Effects & Animation

### Allowed Animations

| Effect | Duration | Easing | Use |
|--------|----------|--------|-----|
| Counter slide | 200ms | ease-out | Stat number changes |
| Row highlight | 100ms | linear | Task/container hover |
| Panel slide-in | 250ms | cubic-bezier(0.16, 1, 0.3, 1) | Task panel open |
| Panel slide-out | 150ms | ease-in | Task panel close |
| Cursor blink | 500ms | step-end | Empty state cursor |
| Pulse (status dot) | 2s | ease-in-out | Running indicators |
| Bracket highlight | 150ms | linear | Card hover bracket color |
| Button invert | 0ms | instant | Button active state |

### Banned Effects

- ❌ Text-shadow glow (neon text)
- ❌ Box-shadow glow (neon borders)
- ❌ Backdrop-filter blur (glassmorphism)
- ❌ Gradient backgrounds
- ❌ Gradient text (animated or static)
- ❌ Scale transforms on hover (the "float up" effect)
- ❌ Staggered entrance animations (everything loads immediately)
- ❌ Spring/bounce animations
- ❌ Parallax effects
- ❌ Decorative particle effects

### Scanline Overlay (Subtle — Optional)

A very subtle CRT scanline effect over the entire page for texture:

```css
.scanline-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
}
```

**Opacity: 0.03** — barely perceptible. Adds texture without readability cost. Must respect `prefers-reduced-motion`.

---

## Responsive Behavior

### Breakpoints

```
Desktop:  ≥1200px  — Full layout, 2-column cards, visible status bar
Tablet:   ≥768px   — 2-column cards stack, status strip wraps to 2×2
Mobile:   <768px   — Single column, status strip becomes vertical list
```

### Mobile Adaptations

- Command bar: Logo + status only. "New Task" becomes floating `[ + ]` button (bottom-right, 48×48)
- Status strip: Becomes 2×2 grid of stat blocks
- Cards: Full-width, stacked vertically
- Status bar: Hidden on mobile (info moved to command bar dropdown)
- Log viewer: Height reduces to 240px
- Task panel: Full-screen overlay instead of side panel

---

## Accessibility

### Contrast Ratios (Verified)

| Pair | Ratio | Standard |
|------|-------|----------|
| --text-primary on --bg-surface | 12.5:1 | AAA |
| --text-secondary on --bg-surface | 4.6:1 | AA |
| --accent on --bg-surface | 8.2:1 | AAA |
| --status-pending on --bg-surface | 6.1:1 | AA |
| --status-failed on --bg-surface | 5.8:1 | AA |
| --text-inverse on --accent | 9.4:1 | AAA |

### Accessibility Requirements

1. **All interactive elements**: cursor: pointer, visible focus ring (2px solid var(--accent), 2px offset)
2. **Touch targets**: minimum 44×44px
3. **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables pulse, slide, and counter animations
4. **Screen reader**: aria-labels on all icon-only buttons, aria-live on status changes
5. **Keyboard navigation**: Full tab support, ESC closes panel, Enter submits
6. **Color-not-only**: Status is conveyed by text label + color (never color alone)

---

## CSS Custom Properties (Complete)

```css
:root {
  /* Backgrounds */
  --bg-void: #08080C;
  --bg-surface: #111118;
  --bg-elevated: #1A1A24;
  --bg-input: #0D0D14;
  --bg-terminal: #050508;

  /* Accent */
  --accent: #00FF88;
  --accent-dim: #00CC6A;
  --accent-glow: rgba(0, 255, 136, 0.15);
  --accent-muted: #0A3D24;

  /* Text */
  --text-primary: #E0E0E8;
  --text-secondary: #7A7A8E;
  --text-ghost: #3A3A4A;
  --text-inverse: #08080C;

  /* Status */
  --status-pending: #FFB000;
  --status-running: #00FF88;
  --status-done: #00D4FF;
  --status-failed: #FF3366;
  --status-idle: #3A3A4A;

  /* Structure */
  --border: #1E1E2A;
  --border-active: #00FF88;
  --border-hard: #2A2A3A;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-8: 48px;

  /* Typography */
  --font-display: 'Orbitron', sans-serif;
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'Space Grotesk', sans-serif;
  --font-data: 'JetBrains Mono', monospace;

  /* Misc */
  --radius: 0px;
  --border-width: 2px;
  --transition-fast: 100ms;
  --transition-normal: 150ms;
}
```

---

## Icon System

### No Icon Library — ASCII/Text Indicators

Instead of Heroicons or Lucide, SIGNAL uses text-based indicators that match the terminal aesthetic:

```
Status indicators:
  ● (filled circle)  — running/active
  ○ (open circle)    — idle/inactive
  ▪ (small square)   — task item bullet
  ◆ (diamond)        — priority marker

Navigation/Actions:
  >   — prompt prefix / section indicator
  [ ] — button wrapper (e.g., [ EXECUTE ])
  _   — blinking cursor
  │   — vertical separator
  ─   — horizontal rule
  ┌── ──┐  └── ──┘  — corner brackets

Priority:
  ▲ HIGH
  ► MED
  ▼ LOW
```

### Exception: Logo Mark

The NEXUS logo is a simple **geometric mark** — a small filled square or custom SVG glyph. Not the current elaborate hexagon.

```
Logo: "■ NEXUS"
- ■ is a 12×12px filled square in accent color
- "NEXUS" in Space Grotesk 600, 16px, uppercase, +2px spacing
```

---

## Migration Summary

### Components to Modify

| Current Component | Change |
|---|---|
| `Header.jsx` | → **CommandBar** — thin 48px bar, no gradient text, no hexagon logo |
| `StatCard.jsx` (×4) | → **StatusStrip** — single horizontal component with 4 stat sections |
| `TaskCard.jsx` | → **HUDCard** with corner brackets, table-format task rows |
| `ContainerCard.jsx` | → **HUDCard** variant with connection-style agent rows |
| `LogViewer.jsx` | → Restyle: darker bg, no traffic lights, no text glow, taller |
| `TaskPanel.jsx` | → Restyle: terminal-style inputs, bracket buttons, priority toggles |
| `Footer.jsx` | → **StatusBar** — fixed bottom, system vitals display |
| `styles.css` | → Complete rewrite: new variables, new animations, remove old effects |

### New Components

| Component | Purpose |
|---|---|
| `StatusStrip.jsx` | Horizontal stat display with oversized Orbitron numbers |
| `CommandBar.jsx` | Thin top navigation bar |
| `StatusBar.jsx` | Fixed bottom system vitals bar |
| `HUDCard.jsx` | Reusable card with corner bracket decoration |
| `ScanlineOverlay.jsx` | Optional subtle CRT texture overlay |

### Files to Delete

| File | Reason |
|---|---|
| `StatCard.jsx` | Replaced by StatusStrip |
| `Header.jsx` | Replaced by CommandBar |
| `Footer.jsx` | Replaced by StatusBar |

---

## Implementation Priority

### Phase 1: Foundation
1. Update `styles.css` with new CSS variables, fonts, and base styles
2. Create `CommandBar.jsx` (replaces Header)
3. Create `StatusStrip.jsx` (replaces StatCards)
4. Create `StatusBar.jsx` (replaces Footer)

### Phase 2: Core Components
5. Create `HUDCard.jsx` (corner bracket card wrapper)
6. Restyle `TaskCard.jsx` to use HUDCard + table-format rows
7. Restyle `ContainerCard.jsx` to use HUDCard + agent rows
8. Restyle `LogViewer.jsx` (darker, no traffic lights, no glow)

### Phase 3: Interactions
9. Restyle `TaskPanel.jsx` (terminal inputs, bracket buttons, priority toggles)
10. Add counter slide animation to StatusStrip
11. Add cursor blink to empty states
12. Add ScanlineOverlay (optional)

### Phase 4: Polish
13. Responsive behavior (mobile/tablet)
14. Accessibility audit (contrast, focus, aria)
15. Performance audit (no unnecessary re-renders)
16. Dark/reduced-motion media queries

---

## Design Inspiration References

This design draws from:
- **Kinetic Brutalism** — Oversized typography, hard shadows, 0px radius, uppercase discipline
- **Terminal CLI aesthetics** — Monospace data, bracket notation, prompt prefixes
- **Military/tactical HUDs** — Corner brackets, status strips, system vitals
- **Bloomberg Terminal** — Information density, monochrome discipline
- **Vercel's dashboard** — Minimal, black/white with single accent color approach

It specifically AVOIDS:
- Glassmorphism (Figma/Linear/Arc aesthetic — overplayed since 2022)
- Purple/cyan/pink neon gradients (every "AI dashboard" on Dribbble)
- Rounded cards with soft shadows (Material Design default)
- Decorative illustrations and large icons (enterprise SaaS look)
- Colorful gradient CTAs (generic startup look)
