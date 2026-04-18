# Design System Specification: Architectural Lucidity

## 1. Overview & Creative North Star
The "Architectural Lucidity" ethos governs this design system. In the high-stakes world of KYC (Know Your Customer) and identity verification, trust is not built through decorative elements, but through **unrivaled clarity and structural intent.**

We are moving away from the "standard SaaS dashboard" look. Instead, we embrace an **Editorial Authority**—a style that feels like a premium financial journal or a high-end architectural firm. We break the rigid, boxed-in grid by utilizing intentional asymmetry, expansive white space, and a high-contrast typographic scale. The goal is to make the user feel like they are being guided through a secure, vaulted gallery rather than filling out a digital form.

**Creative North Star: The Secure Monolith.** 
The UI should feel solid, grounded, and transparent. We use "physical" layering and tonal depth to guide the eye, ensuring the complex KYC process feels effortless and undeniably secure.

---

## 2. Colors & Surface Logic
The palette is rooted in deep, authoritative tones and clinical success states. However, the application of these colors is what defines the premium feel.

### The "No-Line" Rule
Standard UI relies on 1px borders to separate content. **In this system, 1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined solely through background color shifts or tonal transitions. For instance, a `surface-container-low` (#eff4ff) card should sit on a `surface` (#f8f9ff) background to create a soft, organic edge.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to create nested depth:
*   **Base:** `surface` (#f8f9ff)
*   **Lower Level:** `surface-container-low` (#eff4ff) for subtle grouping.
*   **Active Elements:** `surface-container-highest` (#d3e4fe) for high-priority interactive zones.

### Glass & Signature Textures
To escape the "flat" look, use Glassmorphism for floating overlays (like modal dialogs or sticky headers). 
*   **The Glass Rule:** Use `surface-container-lowest` (#ffffff) at 80% opacity with a `backdrop-filter: blur(12px)`.
*   **Signature Gradients:** For primary CTAs, use a subtle linear gradient from `primary` (#000000) to `primary-container` (#131b2e). This adds a "weighted" feel that flat hex codes lack.

---

## 3. Typography
We use **Inter** not as a utility font, but as a brand signifier. The hierarchy relies on extreme scale contrast to create an editorial rhythm.

*   **Display Scale:** Use `display-lg` (3.5rem) and `display-md` (2.75rem) for welcome states and success milestones. These should be tight-leaded (letter-spacing: -0.02em) to feel like a premium headline.
*   **Headline & Title:** `headline-sm` (1.5rem) serves as the anchor for form sections. It provides a sense of "The Document" rather than "The App."
*   **Body & Labels:** `body-md` (0.875rem) is our workhorse. For technical metadata or security timestamps, use `label-sm` (0.6875rem) in `on-surface-variant` (#45464d) to provide a sophisticated, "small-print" look without sacrificing legibility.

---

## 4. Elevation & Depth
In this system, depth is a functional tool for security, not just an aesthetic choice.

### The Layering Principle
Depth is achieved by "stacking" surface tiers. Place a `surface-container-lowest` card on top of a `surface-container-low` section. This creates a natural "lift" that mimics high-quality paper stock.

### Ambient Shadows
When an element must float (e.g., a critical verification modal), use **Ambient Shadows**:
*   **Blur:** 30px to 60px.
*   **Opacity:** 4% - 8%.
*   **Color:** Use the `on-surface` (#0b1c30) token rather than pure black to ensure the shadow feels like a natural extension of the UI’s lighting.

### The "Ghost Border" Fallback
If a border is required for extreme accessibility needs, use a **Ghost Border**: the `outline-variant` (#c6c6cd) at 15% opacity. It should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** High-contrast `primary` (#000000) with `on-primary` (#ffffff) text. Use `xl` (0.75rem) rounded corners.
*   **Secondary:** `surface-container-highest` (#d3e4fe) background with `on-secondary-container` (#57657b) text.
*   **Interaction:** On hover, use a subtle shift in tonal depth rather than a color change.

### Input Fields (The Verification Cell)
*   **Style:** No borders. Use `surface-container-low` (#eff4ff) as the field background. 
*   **Focus State:** A 2px solid `primary-fixed` (#dae2fd) outer ring with a 100% opacity `primary` (#000000) text cursor.
*   **Error:** Use `error` (#ba1a1a) text only for helper messages; the field itself should use a subtle `error-container` (#ffdad6) background.

### KYC Progress Stepper
Avoid standard "circles and lines." Use an editorial approach: Large `title-lg` numbers in `primary-fixed-dim` (#bec6e0) that transition to `tertiary` (#000000) when active.

### Identity Cards & Lists
*   **Constraint:** Forbid divider lines. Use vertical white space (32px or 48px) or subtle background shifts between items.
*   **Verification Status Chips:** Use `tertiary-fixed` (#6ffbbe) for "Verified" states with `on-tertiary-fixed-variant` (#005236) text. The high contrast signals "Go" with professional authority.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts (e.g., a wide left column for text and a narrow right column for actions) to create a custom, high-end feel.
*   **Do** leverage `surface-dim` (#cbdbf5) for footer areas or inactive background panels to ground the design.
*   **Do** prioritize "negative space" as a way to reduce cognitive load during complex data entry.

### Don't
*   **Don't** use 100% black shadows.
*   **Don't** use "default" 1px borders to separate content cards. Use tonal layering instead.
*   **Don't** cram information. If a KYC step feels heavy, split it across two "Architectural Layers."
*   **Don't** use bright, neon colors. Stick to the professional navy, slate, and emerald tokens provided to maintain "The Secure Monolith" feel.