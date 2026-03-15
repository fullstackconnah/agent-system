# NEXUS Design System — "FORGE"

## Design Philosophy

**FORGE** is a **Neo-Brutalist light-mode** design that uses cream backgrounds, thick black borders, hard offset shadows, and bold primary colors. It's loud, confident, and the polar opposite of every dark-mode dashboard. Light mode done with attitude.

### Core Principles

1. **Light is bold, not boring** — Cream canvas, not sterile white
2. **Hard offset shadows** — 4-6px solid black, no blur, no softness
3. **Thick borders** — 3px black borders on all major elements
4. **Primary color blocking** — Red, blue, yellow as status accents on neutral canvas
5. **Mechanical interaction** — Press pushes element INTO the shadow (translateX/Y matches shadow offset)

### What Makes This Different

| Generic Dashboard | FORGE |
|---|---|
| Dark background | Warm cream (#FFFDF5) light background |
| Soft shadows / glow | Hard 4px offset black shadows, zero blur |
| 1px subtle borders | 3px solid black borders |
| Rounded corners | 0px radius (brutalist) OR 999px (pill badges only) |
| Gradient buttons | Solid color blocks with black border |
| Muted, desaturated colors | Full-saturation primaries (red, blue, yellow) |
| Smooth hover transitions | Mechanical press (element moves into shadow) |
| Floating cards | Grounded, sticker-like elements |

---

## Color System

```
CANVAS
├── --bg-void:       #FFFDF5    ← Cream canvas (warm, not sterile white)
├── --bg-surface:    #FFFFFF    ← Card surface (pure white)
├── --bg-elevated:   #FFF8E7    ← Hover/active surface (warmer cream)
├── --bg-input:      #FFFFFF    ← Input fields

STRUCTURE
├── --border:        #000000    ← THE border color — always black
├── --border-active: #000000    ← Same — borders don't change color, shadows do
├── --border-hard:   #000000    ← All the same — everything is hard
├── --shadow-offset: #000000    ← Hard shadow color

ACCENT (Bold primaries)
├── --accent:        #3B82F6    ← Primary blue (buttons, active states)
├── --accent-dim:    #2563EB    ← Hover state
├── --accent-glow:   #EFF6FF    ← Light blue tint background
├── --accent-muted:  #DBEAFE    ← Badge backgrounds

TEXT
├── --text-primary:  #1A1A1A    ← Near-black text
├── --text-secondary:#6B7280    ← Muted gray
├── --text-ghost:    #9CA3AF    ← Placeholder, disabled
├── --text-inverse:  #FFFFFF    ← White text on colored backgrounds

STATUS
├── --status-pending:  #F59E0B  ← Amber (with black border)
├── --status-running:  #10B981  ← Emerald green
├── --status-done:     #3B82F6  ← Blue (matches accent)
├── --status-failed:   #EF4444  ← Bright red
├── --status-idle:     #D1D5DB  ← Light gray
```

### Color Rules

1. **Black borders on EVERYTHING** — cards, buttons, inputs, badges. The black border is the design.
2. **Status colors are FILLS, not subtle accents** — a pending badge is a solid amber block with black border.
3. **No gradients, no opacity tricks** — flat solid colors only.
4. **Canvas cream, card white** — the warmth comes from the page, cards are crisp white.

---

## Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-display: 'Space Grotesk', sans-serif;
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body:    'Space Grotesk', sans-serif;
  --font-data:    'JetBrains Mono', monospace;
}
```

- **Space Grotesk 700** for ALL headings — bold, heavy, brutalist
- **Space Grotesk 400** for body text
- **JetBrains Mono** for data/code values
- ALL headings and buttons UPPERCASE
- Letter spacing: +1px headings, +2px labels

---

## Key Effects

### Hard Offset Shadows

Every card and interactive element has a hard offset shadow:

```css
.card {
  border: 3px solid #000;
  box-shadow: 4px 4px 0px #000;
  transition: transform 100ms, box-shadow 100ms;
}

.card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0px #000;
}

.card:active {
  transform: translate(4px, 4px);
  box-shadow: 0px 0px 0px #000;  /* Shadow disappears — element "pressed in" */
}
```

### Mechanical Press

Buttons "press into" their shadow on click:

```css
.button {
  border: 3px solid #000;
  box-shadow: 4px 4px 0px #000;
}

.button:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}
```

### Slight Rotation

Some cards/badges are slightly rotated for a sticker/collage feel:

```css
.badge-rotate { transform: rotate(-1.5deg); }
.card-tilt { transform: rotate(0.5deg); }
```

Use sparingly — only on badges and decorative elements, NOT on data-dense cards.

---

## Component Differences from SIGNAL

### Header
- White background, black bottom border (3px)
- Logo: "■ NEXUS" but the ■ is a blue filled square
- Bold black text, no status indicator
- "[ + NEW TASK ]" button with blue bg, black border, hard shadow

### Status Strip
- 4 stat blocks in a row, each with:
  - 3px black border, 4px offset shadow
  - Large number in Space Grotesk 700 (not Orbitron — too sci-fi for brutalist)
  - Status color as background fill (subtle tint)
  - Label underneath, uppercase

### Cards
- White background, 3px black border, 4px 4px 0px black shadow
- NO corner brackets — full solid borders (brutalist = raw, visible structure)
- Section header: Space Grotesk 700, 14px, uppercase, with a colored left bar (4px wide, status color)

### Task Rows
- Separated by 2px black dashed border (not solid — adds texture)
- Priority shown as colored pill badge with black border (999px radius — the ONLY rounded element)
- Hover: row background fills with cream (#FFF8E7)

### Log Viewer
- White background (not terminal dark)
- Black monospace text
- 3px black border
- Log levels: colored text (no background, just colored monospace text)
- Header: "SYSTEM LOG" with a typewriter-style underline

### Task Panel
- White panel, 3px black left border
- Inputs: white bg, 3px black border, 4px shadow
- Submit: Blue background, black border, hard shadow, "[ EXECUTE ]"
- Focus state: shadow grows (4px → 6px), NOT border color change

### Status Bar
- Cream background, 3px black top border
- Black monospace text
- Status items in pill badges with colored fills + black borders

---

## Banned Effects

- ❌ Box-shadow blur (all shadows are hard offset)
- ❌ Backdrop-filter / blur
- ❌ Gradients of any kind
- ❌ Opacity below 1.0 on structural elements
- ❌ Rounded corners (except pill badges at 999px)
- ❌ Subtle/thin borders (minimum 2px, standard 3px)
- ❌ Hover scale transforms (use translate for press effect only)
- ❌ Neon/glow effects
- ❌ Dark backgrounds

---

## CSS Variables (Complete — FORGE overrides)

```css
[data-theme="forge"] {
  --bg-void: #FFFDF5;
  --bg-surface: #FFFFFF;
  --bg-elevated: #FFF8E7;
  --bg-input: #FFFFFF;
  --bg-terminal: #FFFFFF;

  --accent: #3B82F6;
  --accent-dim: #2563EB;
  --accent-glow: #EFF6FF;
  --accent-muted: #DBEAFE;

  --text-primary: #1A1A1A;
  --text-secondary: #6B7280;
  --text-ghost: #9CA3AF;
  --text-inverse: #FFFFFF;

  --status-pending: #F59E0B;
  --status-running: #10B981;
  --status-done: #3B82F6;
  --status-failed: #EF4444;
  --status-idle: #D1D5DB;

  --border: #000000;
  --border-active: #000000;
  --border-hard: #000000;

  --radius: 0px;
  --border-width: 3px;
  --shadow-x: 4px;
  --shadow-y: 4px;
  --shadow-color: #000000;
}
```
