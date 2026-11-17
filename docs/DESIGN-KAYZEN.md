---
version: alpha
name: Kayzen-lyon
description: |
  KAYZEN's design system balances premium agency sophistication with
  approachable modernity, grounded in a deep, confident colour story of navy and
  burnt orange. The visual language favors bold typography and generous
  whitespace, creating an air of professional competence while maintaining
  warmth through accent colours. Micro-interactions—subtle scales, shadows, and
  opacity shifts—add refinement without distraction. The aesthetic is decidedly
  Swiss-influenced in its grid discipline and type hierarchy, yet feels
  contemporary through rounded pill-shaped buttons and soft, flowing gradients.
  Every element communicates clarity and conversion: this is a design system
  built for a web agency that sells solutions with confidence.
source:
  url: "https://www.kayzen-lyon.com/"
  pagesAnalyzed: 1
  extractedAt: 2026-10-31
  tokensMeasured: true
colors:
  primary: "#B7481F"
  accent: "#1F2937"
  link: "#F3BD49"
  canvas: "#FFFFFF"
  surface: "#F2F5F7"
  on-primary: "#FFFFFF"
  ink: "#1F2937"
  body: "#586474"
  hairline: "#E0E5EB"
  accent-1: "#1F3B61"
  accent-2: "#132944"
  accent-3: "#7D8CA1"
typography:
  display-xl:
    fontFamily: Outfit
    fontSize: 68px
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: -1.9px
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: -1.2px
  display-md:
    fontFamily: Outfit
    fontSize: 44px
    fontWeight: 800
    lineHeight: 1.14
    letterSpacing: -0.97px
  heading-xl:
    fontFamily: Outfit
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.11
    letterSpacing: -0.9px
  heading-lg:
    fontFamily: Outfit
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.75px
  heading-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: -0.53px
  heading-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: -0.28px
  heading-xs:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.56
    letterSpacing: -0.18px
  heading-xs-tight:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.56
    letterSpacing: -0.25px
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.56
    letterSpacing: 0px
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.65
    letterSpacing: 0px
  body-sm:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.63
    letterSpacing: 0px
  body-sm-tight:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0px
  body-sm-strong:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.43
    letterSpacing: 0px
  body-sm-uppercase:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.43
    letterSpacing: 1.4px
    textTransform: uppercase
  button:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: -0.34px
  label:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.43
    letterSpacing: 0px
  caption-xs:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0px
  caption-xs-strong:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: 0px
  caption-xs-uppercase:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: 1.2px
    textTransform: uppercase
rounded:
  none: 0px
  xs: 2px
  sm: 12px
  md: 16px
  lg: 24px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
  section: 44px
  band: 48px
borderWidths:
  thin: 1px
  medium: 2px
shadows:
  sm: "rgba(31, 59, 97, 0.08) 0px 12px 36px 0px"
  md: "rgba(36, 49, 66, 0.06) 0px 4px 12px 0px, rgba(36, 49, 66, 0.04) 0px 1px 3px 0px"
  lg: "rgb(224, 229, 235) 0px 0px 0px 1px"
  xl: "rgba(31, 59, 97, 0.1) 0px 12px 36px 0px"
elevationStrategy: layered-micro
themes:
  derived: dark   # the other theme is the site's measured palette
  light:
    bg: "#FFFFFF"
    surface: "#F2F5F7"
    surfaceRaised: "#EAEDEF"
    text: "#1F2937"
    textMuted: "#586474"
    border: "#E0E5EB"
    accent: "#B7481F"
    accentFg: "#FFFFFF"
    focusRing: "#B7481F"
    elevation: shadow
  dark:
    bg: "#130E0C"
    surface: "#211C1B"
    surfaceRaised: "#2D2927"
    text: "#FCF8F6"
    textMuted: "#A39F9D"
    border: "#393533"
    accent: "#DA5625"
    accentFg: "#0B0B0C"
    focusRing: "#B7481F"
    elevation: "border+surface"
gradients:
  - context: section
    kind: radial
    value: "radial-gradient(380px, rgba(255, 255, 255, 0.22), rgba(0, 0, 0, 0) 62%)"
  - context: section
    kind: linear
    value: "linear-gradient(rgb(255, 255, 255), rgb(248, 250, 252) 40px, rgb(248, 250, 252) calc(100% - 40px), rgb(255, 255, 255))"
components:
  button-filled:
    typography: "{typography.label}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.accent-3}"
    height: 44px
    padding: "0px 24px 0px 24px"
    rounded: "{rounded.full}"
    backgroundColor: "{colors.surface}"
  button-primary:
    typography: "{typography.body-md}"
    textColor: "{colors.on-primary}"
    height: 56px
    padding: "0px 32px 0px 32px"
    rounded: "{rounded.full}"
    backgroundColor: "{colors.primary}"
  button-primary-sm:
    typography: "{typography.label}"
    textColor: "{colors.on-primary}"
    height: 48px
    padding: "14px 24px 14px 24px"
    boxShadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(36, 49, 66, 0.06) 0px 2px 6px 0px, rgba(36, 49, 66, 0.04) 0px 1px 2px 0px"
    rounded: "{rounded.full}"
    backgroundColor: "{colors.primary}"
  button-filled-sm:
    typography: "{typography.caption-xs-strong}"
    textColor: "{colors.on-primary}"
    border: "1px solid rgba(255, 255, 255, 0.15)"
    height: 30px
    padding: "6px 12px 6px 12px"
    rounded: "{rounded.full}"
    backgroundColor: "rgba(255, 255, 255, 0.1)"
  card:
    textColor: "{colors.ink}"
    fontSize: 16px
    fontFamily: "Plus Jakarta Sans"
    fontWeight: 400
    lineHeight: 1.65
    rounded: "{rounded.sm}"
    backgroundColor: "{colors.surface}"
  card-sm:
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline}"
    padding: "32px 32px 32px 32px"
    fontSize: 16px
    boxShadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(36, 49, 66, 0.18) 0px 24px 48px -16px, rgba(36, 49, 66, 0.06) 0px 4px 12px 0px"
    fontFamily: "Plus Jakarta Sans"
    fontWeight: 400
    lineHeight: 1.65
    rounded: "{rounded.lg}"
    backgroundColor: "{colors.canvas}"
  badge-icon:
    textColor: "{colors.on-primary}"
    height: 24px
    fontSize: 16px
    fontFamily: "Plus Jakarta Sans"
    fontWeight: 400
    lineHeight: 1.65
  navigation:
    textColor: "{colors.ink}"
    height: 80px
    padding: "0px 24px 0px 24px"
    fontSize: 16px
    fontFamily: "Plus Jakarta Sans"
    fontWeight: 400
    lineHeight: 1.65
  footer:
    textColor: "{colors.on-primary}"
    fontSize: 16px
    fontFamily: "Plus Jakarta Sans"
    fontWeight: 400
    lineHeight: 1.65
    backgroundColor: "{colors.accent-2}"
  link:
    textColor: "rgba(255, 255, 255, 0.75)"
    fontSize: 16px
    fontFamily: "Plus Jakarta Sans"
    fontWeight: 400
    lineHeight: 1.65
    rounded: "{rounded.sm}"
    backgroundColor: "rgba(255, 255, 255, 0.1)"
  link-lg:
    typography: "{typography.label}"
    textColor: "{colors.ink}"
    border: "2px solid rgba(31, 41, 55, 0.15)"
    padding: "0px 28px 0px 28px"
    rounded: "{rounded.full}"
states:
  other-focus-visible:
    target: other
    state: focus-visible
    rounded: 6px
  other-focus:
    target: other
    state: focus
    outline: none
  link-focus:
    target: link
    state: focus
    transform: none
  card-hover:
    target: card
    state: hover
    transform: "scale(1.03)"
  button-hover:
    target: button
    state: hover
    opacity: 1
  button-focus-visible:
    target: button
    state: focus-visible
    opacity: 1
  other-hover:
    target: other
    state: hover
    opacity: 1
  card-focus-visible:
    target: card
    state: focus-visible
    opacity: 1
  link-hover:
    target: link
    state: hover
    transform: "scaleX(1)"
  link-focus-visible:
    target: link
    state: focus-visible
    transform: "scaleX(1)"
  other-disabled:
    target: other
    state: disabled
    opacity: 0.4
breakpoints:
  - width: 375
    containerWidth: 343
    gridColumns: 4
    navLinksVisible: 31
    menuToggleVisible: true
    headingPx: 36
    bodyPx: 16
    sectionPaddingX: 16
  - width: 768
    containerWidth: 720
    gridColumns: 4
    navLinksVisible: 31
    menuToggleVisible: true
    headingPx: 48
    bodyPx: 16
    sectionPaddingX: 24
  - width: 1024
    containerWidth: 896
    gridColumns: 4
    navLinksVisible: 39
    menuToggleVisible: true
    headingPx: 55
    bodyPx: 16
    sectionPaddingX: 24
  - width: 1280
    containerWidth: 896
    gridColumns: 4
    navLinksVisible: 39
    menuToggleVisible: true
    headingPx: 64
    bodyPx: 16
    sectionPaddingX: 24
  - width: 1440
    containerWidth: 1280
    gridColumns: 4
    navLinksVisible: 39
    menuToggleVisible: true
    headingPx: 68
    bodyPx: 16
    sectionPaddingX: 24
coverage:
  statesFound: 61
  gradientsFound: 2
  rolesUnassigned: 3
  archetypesUnnamed: 0
  archetypesDetected: 0
  responsiveMeasured: true
  stylesheetsBlocked: false
  semanticRampDeclared: false
---

# Design System Inspired by KAYZEN

## 1. Visual Theme & Atmosphere

KAYZEN's design system balances premium agency sophistication with approachable modernity, grounded in a deep, confident colour story of navy and burnt orange. The visual language favors bold typography and generous whitespace, creating an air of professional competence while maintaining warmth through accent colours. Micro-interactions—subtle scales, shadows, and opacity shifts—add refinement without distraction. The aesthetic is decidedly Swiss-influenced in its grid discipline and type hierarchy, yet feels contemporary through rounded pill-shaped buttons and soft, flowing gradients. Every element communicates clarity and conversion: this is a design system built for a web agency that sells solutions with confidence.

**Key Characteristics**
- Deep navy (`{colors.accent}` — `#1F2937`) and warm burnt orange (`{colors.primary}` — `#B7481F`) as the dominant duo
- Generous use of whitespace and soft surfaces (`{colors.surface}` — `#F2F5F7`)
- Bold, tightly tracked display typography (Outfit, up to 68px with −1.9px letter-spacing)
- Fully rounded pill-shaped buttons and interactive elements (`{rounded.full}`)
- Layered micro-shadows and soft gradients for depth without heaviness
- Premium feel achieved through restraint: limited colour palette, deliberate hierarchy, measured motion
- No semantic status colours; the palette is purely functional and brand-driven

## 2. Color Palette & Roles

### Primary
- **Brand Accent** (`{colors.primary}` — `#B7481F`): Primary call-to-action buttons, brand mark, active states, and hero accents. Warm, energetic burnt orange that commands attention without aggression.

### Accent Colors
- **Ink / Heading Text** (`{colors.accent}` — `#1F2937`): Dark navy used for primary text, headings, and hero sections. The system's emotional anchor—sophisticated and trustworthy.
- **Link / Highlight** (`{colors.link}` — `#F3BD49`): Golden yellow for inline links and secondary accents. Warm and inviting, guides the eye through content.
- **Decorative – Dark Navy** (`{colors.accent-1}` — `#1F3B61`): No measured semantic role; used for surface variation and decorative layering in hero bands and backgrounds.
- **Decorative – Deeper Navy** (`{colors.accent-2}` — `#132944`): No measured semantic role; reserves depth in multi-layer backgrounds and overlay compositions.
- **Decorative – Muted Slate** (`{colors.accent-3}` — `#7D8CA1`): No measured semantic role; provides visual rhythm in layered sections without competing with primary content.

### Neutral Scale
- **Canvas** (`{colors.canvas}` — `#FFFFFF`): Default page background and primary surface. Pure white, used as text colour on branded surfaces.
- **Surface** (`{colors.surface}` — `#F2F5F7`): Card and panel backgrounds. Barely-off-white, provides subtle visual separation from canvas.
- **Body Text** (`{colors.body}` — `#586474`): Secondary body copy and supporting text. Muted blue-grey, readable against white without the weight of pure black.
- **Hairline** (`{colors.hairline}` — `#E0E5EB`): 1px borders and dividers. Extremely light, creates structure without visual clutter.

### Status & Semantic
**No semantic colours are declared.** The site does not expose error, success, warning, or info states in its measured styles.

## 3. Typography Rules

### Font Family
- **Primary: Outfit** — Bold, geometric sans-serif. Used for all headings, buttons, and labels. Tight tracking throughout. Fallback: `Outfit, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Secondary: Plus Jakarta Sans** — Open, friendly sans-serif. Used for body text, captions, and long-form content. Fallback: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|-----------------|-------|
| Display XL | Outfit | 68px | 800 | 1.06 | −1.9px | Hero headlines; h1 |
| Display LG | Outfit | 48px | 700 | 1 | −1.2px | Major section headers; h2 |
| Display MD | Outfit | 44px | 800 | 1.14 | −0.97px | Large display accent |
| Heading XL | Outfit | 36px | 700 | 1.11 | −0.9px | Primary section title |
| Heading LG | Outfit | 30px | 700 | 1.2 | −0.75px | Prominent subheading; h3 |
| Heading MD | Outfit | 24px | 700 | 1.33 | −0.53px | Card and block titles |
| Heading SM | Outfit | 20px | 700 | 1.4 | −0.28px | Subsection title |
| Heading XS | Outfit | 18px | 700 | 1.56 | −0.18px | Label and tag text; h4 |
| Button | Outfit | 16px | 600 | 1.5 | −0.34px | CTA and form buttons |
| Body MD (strong) | Outfit | 16px | 700 | 1.65 | 0px | Emphasized body and label |
| Body LG | Outfit | 18px | 700 | 1.56 | 0px | Extended content |
| Body SM (strong) | Outfit | 14px | 600 | 1.43 | 0px | Smaller emphasis |
| Body SM (uppercase) | Outfit | 14px | 600 | 1.43 | 1.4px | Uppercase label, all caps |
| Body SM | Plus Jakarta Sans | 14px | 400 | 1.63 | 0px | Standard body copy |
| Body SM (tight) | Plus Jakarta Sans | 14px | 400 | 1.43 | 0px | Condensed body |
| Label | Outfit | 14px | 700 | 1.43 | 0px | Table header and form label |
| Caption XS (strong) | Outfit | 12px | 600 | 1.33 | 0px | Bold annotation |
| Caption XS (uppercase) | Outfit | 12px | 700 | 1.33 | 1.2px | Uppercase annotation |
| Caption XS | Plus Jakarta Sans | 12px | 400 | 1.33 | 0px | Footnote and metadata |

### Principles
- **Tight Tracking on Display:** All Outfit display and heading sizes use negative letter-spacing (−1.9px to −0.18px), creating a premium, compressed feel. Never normalize this tracking to 0.
- **Weight Hierarchy:** Outfit-driven text uses 800/700/600 weights to establish clear hierarchy. Body content in Plus Jakarta Sans is 400 for openness and readability.
- **Line Height Variation:** Tighter line-height (1.0–1.2) on display; looser (1.43–1.65) on body. Display text is condensed; body is breathable.
- **Case and Spacing:** Uppercase text is spaced out (1.2–1.4px) to compensate for visual weight and improve legibility.
- **System Consistency:** Every heading must use Outfit; every long-form body paragraph must use Plus Jakarta Sans. Buttons are Outfit `{typography.button}` (16px, 600, −0.34px).

## 4. Component Stylings

### Buttons

**Primary Button (Large)**
- Background: `{colors.primary}` (`#B7481F`)
- Text color: `{colors.canvas}` (`#FFFFFF`)
- Typography: `{typography.button}` (16px, weight 600, line-height 1.5, letter-spacing −0.34px, Outfit)
- Padding: `{spacing.md}` left/right (16px), `{spacing.lg}` top/bottom (20px)
- Height: 56px
- Border: none
- Border-radius: `{rounded.full}` (9999px — pill shape)
- Box-shadow: none (flat fill)
- Hover: Scale up shadow to `0 18px 40px -14px hsl(var(--primary) / .55), 0 4px 12px -4px hsl(var(--primary) / .35)`, opacity 1
- Active: `transform: scale(0.97)` (subtle press feedback)
- Focus-visible: Same shadow as hover; outline: 2px solid with 4px background ring

**Primary Button (Small)**
- Background: `{colors.primary}` (`#B7481F`)
- Text color: `{colors.canvas}` (`#FFFFFF`)
- Typography: 14px weight 700, line-height 1.43, Outfit
- Padding: 14px left/right, `{spacing.md}` top/bottom (16px)
- Height: 48px
- Border: none
- Border-radius: `{rounded.full}` (9999px)
- Box-shadow: `rgba(36, 49, 66, 0.06) 0px 2px 6px 0px, rgba(36, 49, 66, 0.04) 0px 1px 2px 0px`
- Hover/Focus: Same shadow and scale behaviour as primary large

**Secondary Button (Filled)**
- Background: `{colors.surface}` (`#F2F5F7`)
- Text color: `{colors.accent}` (`#1F2937`)
- Typography: 14px weight 700, line-height 1.43, Outfit
- Padding: `{spacing.md}` (16px)
- Height: 44px
- Border: 1px solid `{colors.accent-3}` (`#7D8CA1`)
- Border-radius: `{rounded.full}` (9999px)
- Box-shadow: none
- Hover: Opacity 1, border colour lightens or matches primary accent
- Active: Scale 0.97

**Ghost Button (Secondary Outline)**
- Background: transparent
- Text color: `{colors.accent}` (`#1F2937`)
- Typography: 14px weight 700, line-height 1.43, Outfit
- Padding: `{spacing.md}` (16px)
- Height: 48px
- Border: 2px solid `rgba(31, 41, 55, 0.15)` (translucent ink)
- Border-radius: `{rounded.full}` (9999px)
- Box-shadow: none
- Hover: Border-color shifts to `{colors.accent}` or primary; background subtle tint

**Tertiary Button (Filled Small, on Dark)**
- Background: `rgba(255, 255, 255, 0.1)` (translucent white on brand)
- Text color: `{colors.canvas}` (`#FFFFFF`)
- Typography: 12px weight 600, line-height 1.33, Outfit
- Padding: `{spacing.sm}` (12px)
- Height: 30px
- Border: 1px solid `rgba(255, 255, 255, 0.15)`
- Border-radius: `{rounded.full}` (9999px)
- Box-shadow: none
- Hover: Opacity 1, background slightly more opaque

### Cards & Containers

**Card (Surface)**
- Background: `{colors.surface}` (`#F2F5F7`)
- Border: none
- Border-radius: `{rounded.sm}` (12px)
- Padding: 0px (content padding is internal)
- Box-shadow: none (flat)
- Hover: `transform: scale(1.03)` (subtle lift)

**Card (Elevated – Bordered)**
- Background: `{colors.canvas}` (`#FFFFFF`)
- Border: 1px solid `{colors.hairline}` (`#E0E5EB`)
- Border-radius: `{rounded.lg}` (24px)
- Padding: `{spacing.xxl}` (32px) on all sides
- Box-shadow: `rgba(36, 49, 66, 0.18) 0px 24px 48px -16px, rgba(36, 49, 66, 0.06) 0px 4px 12px 0px` (layered micro-shadow)
- Hover: Opacity 1; no scale (card content is stable)

**Section Container (Hero / Band)**
- Background: Colour varies (navy, white, or surface); may include gradient overlay `linear-gradient(rgb(255, 255, 255), rgb(248, 250, 252) 40px, rgb(248, 250, 252) calc(100% - 40px), rgb(255, 255, 255))`
- Radial accent: `radial-gradient(380px, rgba(255, 255, 255, 0.22), rgba(0, 0, 0, 0) 62%)` for depth
- Padding: `{spacing.band}` (48px) top/bottom; `{spacing.xxxl}` (40px) left/right; adjusted per breakpoint
- Border-radius: 0px (full-width sections)

### Inputs & Forms

**Text Input**
- Background: `{colors.canvas}` (`#FFFFFF`)
- Text color: `{colors.body}` (`#586474`)
- Border: 1px solid `{colors.hairline}` (`#E0E5EB`)
- Border-radius: `{rounded.sm}` (12px)
- Padding: `{spacing.md}` (16px) on all sides
- Typography: `{typography.body-sm}` (14px, weight 400, Plus Jakarta Sans)
- Focus: Border colour shifts to `{colors.primary}` (`#B7481F`); box-shadow ring applied
- Placeholder text: `{colors.body}` at 0.6 opacity

**Select / Dropdown**
- Same as text input; arrow indicator on the right
- Border-radius: `{rounded.sm}` (12px)

**Checkbox / Radio**
- When checked: background `{colors.primary}` (`#B7481F`), border none
- When unchecked: background `{colors.canvas}`, border 1px `{colors.hairline}` (`#E0E5EB`)
- Border-radius: `{rounded.xs}` (2px for checkbox), fully rounded for radio
- Focus: Outline 2px offset ring

### Navigation

**Header Navigation**
- Background: `{colors.canvas}` (`#FFFFFF`) or transparent (per page context)
- Height: 80px
- Padding: `{spacing.md}` (16px) left/right at mobile; `{spacing.xl}` (24px) at desktop
- Typography: 16px weight 400 or 600, Plus Jakarta Sans
- Border: none
- Border-radius: 0px
- Link colour: `{colors.accent}` (`#1F2937`) or `{colors.body}` (`#586474`)
- Link hover: colour shifts to `{colors.primary}` (`#B7481F`); subtle underline or scale-x transform

**Navigation Link (Text)**
- Text color: Inherited from context
- Typography: 14–16px weight 400–600, Plus Jakarta Sans
- Border-bottom: 2px solid transparent
- Hover: Border-bottom becomes `{colors.primary}` (`#B7481F`); `transform: scaleX(1)` (grows from center)
- Focus-visible: Outline 3px solid navy; 2px offset ring

**Footer Navigation**
- Background: Deep navy (`#132944` or `#1F2937` variant)
- Text colour: `{colors.canvas}` (`#FFFFFF`) at 0.75 opacity
- Typography: 14px weight 400, Plus Jakarta Sans
- Link hover: Opacity 1, text white

### Badges

**Icon Badge (24×24)**
- Background: transparent
- Border: none
- Border-radius: 0px (no rounding on icon badges)
- Padding: 0px
- Typography: 16px, Plus Jakarta Sans
- Used for info icons, indicators

### Accessibility Features

**Focus Visible States**
- Outline: 2px solid with 4px offset ring background
- Applied to buttons, links, form inputs
- Color: Brand primary (`{colors.primary}`) or system ring colour as defined

## 5. Layout Principles

### Spacing System

Base unit: **4px** (`{spacing.xxs}`). All spacing tokens scale from this foundation:
- `{spacing.xxs}` = 4px — micro-spacing, internal padding on very small components
- `{spacing.xs}` = 8px — tight padding, small icons, badge margins
- `{spacing.sm}` = 12px — button internal horizontal padding (smaller buttons)
- `{spacing.md}` = 16px — standard padding, form inputs, nav horizontal margin
- `{spacing.lg}` = 20px — component separation, card padding
- `{spacing.xl}` = 24px — section internal margins, larger card padding
- `{spacing.xxl}` = 32px — premium card padding, major section separation
- `{spacing.xxxl}` = 40px — large section horizontal padding, container gutters
- `{spacing.section}` = 44px — inter-section vertical breathing room
- `{spacing.band}` = 48px — full-width band vertical padding (hero, feature sections)

**Usage Context:**
- Buttons use `{spacing.md}` (16px) horizontally, `{spacing.lg}` (20px) vertically for large; reduced for small
- Cards use `{spacing.xxl}` (32px) on elevated variants, 0px padding on surface-only cards
- Sections use `{spacing.band}` (48px) top/bottom, `{spacing.xxxl}` (40px) left/right; mobile reduces to `{spacing.xl}` (24px)

### Grid & Container

**Desktop Max Width:** 1280px
- Desktop content column: 1280px wide (1440px viewport shows this at center with equal gutters)
- Gutter on desktop: 24px left/right (`{spacing.xl}`)
- Content sits within an invisible 1280px container; sections extend full-width

**Mobile / Tablet:**
- Tablet (768px): 720px content column; 24px gutters; 4-column grid layout
- Mobile (375px): 343px content column; 16px gutters; 4-column grid layout (tokens collapse for single-column prose)

**Grid Strategy:** 4-column responsive grid throughout. No change to column count across breakpoints; instead, column width and gutters adapt.

**Section Patterns:**
- Full-width hero sections with centred content container
- Side-by-side image + text at desktop; stacked on mobile
- Card grids: single column mobile, 2–4 columns desktop depending on card size
- Feature sections alternate left/right image placement

### Whitespace Philosophy

Whitespace is a premium feature, not a filler. Generous `{spacing.band}` (48px) separates major sections vertically. Within sections, `{spacing.section}` (44px) creates breathing room between block-level elements. The system avoids cramped layouts; every component has space to breathe. Smaller, tighter spacing (`{spacing.md}` to `{spacing.lg}`) is reserved for internal component structure (button padding, form field gaps). The overall impression is one of exclusivity and clarity: less visual noise, more impact per element.

### Border Radius Scale

- `{rounded.none}` = 0px — Images, full-width sections, sharp edges where sharpness signals strength
- `{rounded.xs}` = 2px — Minimal rounding on very tight UI; checkboxes and micro-interactions
- `{rounded.sm}` = 12px — Standard card radius; input fields; moderate softness
- `{rounded.md}` = 16px — Slightly more generous card radius; panels with more visual weight
- `{rounded.lg}` = 24px — Premium card radius; large elevated surfaces; generous softness
- `{rounded.full}` = 9999px — Pill-shaped buttons, navigation links, interactive elements. This is the system's signature button aesthetic

**Component Context:**
- Buttons: `{rounded.full}` (9999px) — fully rounded, pill-shaped
- Standard cards: `{rounded.sm}` (12px) — modest softness
- Elevated cards: `{rounded.lg}` (24px) — premium softness
- Images: `{rounded.none}` (0px) — sharp, no rounding
- Form inputs: `{rounded.sm}` (12px) — consistent with cards

### Border Widths

- **Thin** — 1px: Default for card borders, input outlines, dividers. Used on `{colors.hairline}` (`#E0E5EB`) for subtlety
- **Medium** — 2px: Secondary button borders; link underlines; stronger visual definition than thin, used sparingly

**Where They Apply:**
- 1px borders on cards with `{colors.hairline}`
- 1px borders on text inputs (default state)
- 2px borders on ghost/outline buttons
- 1px borders on secondary filled buttons

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (0) | No shadow | Images, flat badges, backgrounds, section fills |
| Micro (1) | `rgba(36, 49, 66, 0.06) 0px 4px 12px 0px, rgba(36, 49, 66, 0.04) 0px 1px 3px 0px` | Small buttons, light cards, subtle separation |
| Small (2) | `rgba(31, 59, 97, 0.08) 0px 12px 36px 0px` | Standard cards, modest lift |
| Medium (3) | `rgba(36, 49, 66, 0.18) 0px 24px 48px -16px, rgba(36, 49, 66, 0.06) 0px 4px 12px 0px` | Elevated cards, premium surfaces |
| Custom (4) | `rgb(224, 229, 235) 0px 0px 0px 1px` | Bordered accent (hairline depth, not shadow) |
| Large (5) | `rgba(31, 59, 97, 0.1) 0px 12px 36px 0px` | Maximum depth, modal-like surfaces |

**Shadow Philosophy:**

KAYZEN uses a **layered-micro** elevation strategy. Shadows are barely there—multiple near-transparent layers rather than a single dark drop. This keeps the interface feeling light and premium. The system never uses harsh, opaque shadows; instead, colour-blocking (surface background changes) provides most depth cues. Shadows exist to signal interactivity and hover state, not to dramatically separate layers. The overall effect is flat-design-forward with gentle depth on demand.

### Opacity Levels

- **72% (0.72)** — Standard opacity for slightly desaturated text or soft overlays; primary link text on branded backgrounds
- **22% (0.22)** — Very light overlay for decorative radial gradients and background accents

### Z-index / Layering

| Layer | Z-index | Use |
|-------|---------|-----|
| Base / Content | 0–1 | All page content, default stacking |
| Dropdown / Menu | 10–50 | Dropdown menus, expand panels, layer 2 above base |
| Floating | 60–80 | Sticky headers, side widgets, persistent UI |
| Toast / Alert | 10000 | Toast notifications, high-priority alerts; always on top |

The stacking order is conservative. Most UI lives at z-index 0–10. Dropdowns and popovers are 10–50. Sticky navigation occupies 60–80. Toasts sit at 10000 to ensure they are never obscured. Do not create intermediate z-index values; use the table above.

## 7. Do's and Don'ts

### Do

- **Use Outfit for all headings and buttons.** Maintain the tightly tracked, premium display feel. Never substitute Plus Jakarta Sans for display text.
- **Maintain tight letter-spacing on large type.** The −1.9px tracking on display-xl is not an error—it is intentional brand signature. Preserve negative letter-spacing on all display and heading roles.
- **Employ pill-shaped buttons (`{rounded.full}` — 9999px).** This is the system's interactive signature. All primary CTAs and most buttons are fully rounded.
- **Build with generous whitespace.** Use `{spacing.band}` (48px) between major sections. The brand feels premium because content has room to breathe.
- **Layer shadows subtly.** Use micro-shadows (multiple transparent layers) rather than single dark drops. Prefer colour-blocking for depth.
- **Group colours semantically.** Primary `{colors.primary}` (`#B7481F`) is for CTAs and brand moments. Accent `{colors.accent}` (`#1F2937`) is for headings and structure. Link `{colors.link}` (`#F3BD49`) is for inline navigation.
- **Test all text at actual font size.** Outfit's tight tracking looks intentional at 68px; squinting at 12px screenshots misses the brand voice.
- **Respect the 4px base grid.** All spacing, border-radius, and layout decisions snap to the spacing scale. No arbitrary padding values.

### Don't

- **Do not round button corners to less than `{rounded.full}` (9999px).** Partial rounding breaks the pill aesthetic. If a button is rounded, it is fully pill-shaped.
- **Do not add letter-spacing to Outfit text.** The system uses negative tracking (−1.9px to −0.18px) on display and headings. Do not normalize it or add space—the compression is intentional.
- **Do not use Plus Jakarta Sans for headings.** It is reserved for body text. All display, heading, and button text must be Outfit.
- **Do not invent new shadow values.** Stick to the five elevation levels in the table. No custom box-shadow values unless explicitly in this document.
- **Do not skip hover states on buttons.** Buttons must show shadow lift and/or scale feedback. The system is interactive; flat buttons feel unresponsive.
- **Do not use `{colors.hairline}` (`#E0E5EB`) as a text colour.** It is exclusively for borders and dividers. Body text is `{colors.body}` (`#586474`) or darker.
- **Do not create new semantic colours.** The palette is fixed: primary, accent, link, and three decorative shades. If a new role emerges, refer to the closest existing colour rather than inventing a new one.
- **Do not reduce section padding below `{spacing.xl}` (24px) on mobile.** Sections feel cramped; maintain breathing room even at small viewports.
- **Do not disable focus-visible styles.** All interactive elements (buttons, links, inputs) must have a visible focus outline for accessibility.
- **Do not mix typefaces within a component.** Buttons are all Outfit; body paragraphs are all Plus Jakarta Sans. Hybrid text loses clarity.

## 8. Responsive Behavior

### Breakpoints

| Viewport | Max Width | Gutter (L/R) | Heading (Display) | Body | Change |
|----------|-----------|--------------|-------------------|------|--------|
| 375px (Mobile) | 343px | 16px | 36px (`{typography.heading-xl}`) | 16px (`{typography.body-sm}`) | Base mobile; single-column layout; nav menu toggle active |
| 768px (Tablet) | 720px | 24px | 48px (`{typography.display-lg}`) | 16px (`{typography.body-sm}`) | Content column widens; 24px gutters; nav menu toggle still active |
| 1024px (Desktop) | 896px | 24px | 55px (interpolated) | 16px | Content column grows; most nav links now visible; still some menu toggle |
| 1280px (Desktop L) | 896px | 24px | 64px (interpolated) | 16px | Max constrained width; all nav links visible; max content column locked at 896px |
| 1440px (Desktop XL) | 1280px | 24px | 68px (`{typography.display-xl}`) | 16px | Full layout width; all nav visible; hero and sections fill available space |

**Breakpoint Strategy:**
- Mobile-first. Base styles at 375px.
- Tablet breakpoint at 768px: column widens, gutters increase.
- Desktop breakpoint at 1024px: full nav becomes visible, heading sizes grow.
- Max-width container: content constrained to 1280px (1440px viewport); wider screens show equal side gutters.
- No column count change: always a 4-column grid; columns widen and narrow per breakpoint.

### Touch Targets

**Minimum interactive area:** 48px × 48px (phone), 44px × 44px (desktop)
- Buttons: 56px height (primary), 48px height (secondary small)
- Link hit areas: padded with `{spacing.md}` (16px) to ensure 48px+ vertical space
- Form inputs: 48px minimum height (text input, select)
- Tap-friendly spacing between adjacent buttons: `{spacing.md}` (16px) or greater

### Collapsing Strategy

**Mobile (375px):**
- Full-width layout, single content column
- Section padding-x reduces to `{spacing.md}` (16px)
- Heading sizes drop: display-xl → heading-xl (36px)
- Navigation collapses to hamburger menu toggle
- Side-by-side layouts (image + text) stack vertically
- Cards stack in single column

**Tablet (768px–1023px):**
- Content column widens to 720px
- Section padding-x increases to `{spacing.xl}` (24px)
- Display heading sizes return (48px range)
- Nav menu toggle remains active
- Two-column card grids appear
- Images and text may align side-by-side on wider tablets

**Desktop (1024px+):**
- Content column reaches max width (896px at 1280px; full 1280px at 1440px+)
- Section padding-x locked at `{spacing.xl}` (24px)
- Display heading at full 68px
- Nav menu collapses; full horizontal navigation visible
- Multi-column card grids (3–4 columns) appear
- Large images + text layouts lock to side-by-side

**Key Transitions:**
- Heading size does not drop continuously; it remains `{typography.display-lg}` (48px) or above from 768px up
- At 1024px+, nav items shift from menu toggle to horizontal list
- Section gutters max out at `{spacing.xl}` (24px) and do not grow further, even on 1440px+

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA / Brand Accent:** {colors.primary} (`#B7481F`) — warm burnt orange for buttons, brand mark, active states
- **Heading / Ink:** {colors.accent} (`#1F2937`) — deep navy for text and structure
- **Link / Highlight:** {colors.link} (`#F3BD49`) — golden yellow for inline links
- **Background:** {colors.canvas} (`#FFFFFF`) — white, default page background
- **Surface / Card:** {colors.surface} (`#F2F5F7`) — off-white for cards and panels
- **Body Text:** {colors.body} (`#586474`) — muted blue-grey for body copy
- **Border / Divider:** {colors.hairline} (`#E0E5EB`) — light grey for 1px lines

### Iteration Guide

1. **Always use Outfit for buttons and headings; Plus Jakarta Sans for body.** Do not mix. Every h1–h4 and every CTA is Outfit with negative letter-spacing. Every paragraph and label is Plus Jakarta Sans at 400 weight (body) or 600 weight (label/emphasis).

2. **Button radius is `{rounded.full}` (9999px).** Every button is a pill. No exceptions. If you see a button in the screenshots, round it fully.

3. **Button primary colour is `{colors.primary}` (`#B7481F`).** All primary CTAs (Lancer le projet, Tout accepter) use this shade. On hover, add shadow lift: `0 18px 40px -14px {primary} / .55`.

4. **Section vertical padding is `{spacing.band}` (48px).** Between major content blocks, always use 48px top/bottom spacing unless explicitly mobile, in which case reduce to `{spacing.xxl}` (32px) or `{spacing.xl}` (24px).

5. **Card background on light pages is `{colors.surface}` (`#F2F5F7`); on dark pages is `{colors.canvas}` (`#FFFFFF`) with `{colors.hairline}` border.** Elevated cards have shadow md or lg from the elevation table.

6. **Headings use tight tracking.** Display-xl is −1.9px, display-lg is −1.2px, heading-xl is −0.9px. Preserve every negative value exactly; do not round to 0.

7. **Focus states must be visible.** Outline 2px solid with 4px offset ring. Test keyboard navigation.

8. **Opacity for disabled or inactive:** 0.4–0.5. For overlays and soft accents: 0.72 (slightly desaturated) or 0.22 (very faint). Do not invent intermediate values.

9. **Z-index discipline:** 0 for base, 10–80 for interactive layers, 10000 for toasts. Do not create z-index values outside this range.

10. **Mobile responsive:** At 375px, drop heading size to heading-xl (36px), reduce section padding-x to 16px, stack layouts vertically, hide nav links (show toggle only). At 768px and above, restore display sizes and two-column+ layouts.

## 10. Known Gaps

- **No semantic status colours.** The extraction found no error, success, warning, or info colour declarations. If a status state is needed, choose the closest semantic replacement from the brand palette (e.g., use primary for positive/active, accent for neutral/info).

- **Three colours have no measured semantic role:** `{colors.accent-1}` (`#1F3B61`), `{colors.accent-2}` (`#132944`), and `{colors.accent-3}` (`#7D8CA1`) appear only in decorative contexts (gradients, background layers, hero band accents). They are not assigned to specific component roles; treat them as visual accent layers only.

- **Interaction states are partial.** The extraction captured button hover/active/focus-visible, card hover/scale, and link focus/underline, but did not measure:
  - Disabled button appearance (assumed 0.4–0.5 opacity; not explicitly styled)
  - Input error state styling
  - Form validation states
  - Dropdown open/closed transitions
  - Menu animation timings

- **Dark mode not observed.** The site is light-mode only in the extraction. No dark-mode or theme-switching palette was measured. If dark mode is required, refer to the notes under Known Gaps rather than inventing a derived theme.

- **Animation/transition timings not extracted.** The system has motion (button scale, link underline, card lift), but exact durations (e.g., 200ms, 300ms) were not measured. Implement standard CSS transitions (150–300ms) as reasonable defaults.

- **Single page analysed.** This document is based on the homepage only. Internal pages, authenticated surfaces, and off-brand templates may differ. Surfaces behind login were not accessed.

- **Component state completeness.** Not all component variant combinations may exist on the captured page. For example, if a button variant (e.g., disabled, loading) does not appear in the screenshots, it is not documented here. Refer to the measured variants in Section 4 as the source of truth.

- **Typography fallback rendering.** Outfit font may not load on all clients. The fallback stack provided (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`) is a best guess; actual fallback appearance on low-bandwidth or offline scenarios is untested.