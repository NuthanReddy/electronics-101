# Electronics 101

An original, hands-on electronics learning workbench: **68 lessons across 10
chapters**, a rotatable Three.js scene, adjustable circuit experiments, conceptual
schematics and live calculations.

**Website:** https://nuthanreddy.github.io/electronics-101/

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (including `/electronics-101/`).
`npm test` runs the electrical-model and lesson-state tests.
`npm run build` type-checks the app and builds `dist/`.

## Explore

- Use the chapter selector or lesson library to navigate all 68 experiments.
- Open the Overview, Components, Circuit and Maths tabs; all share the same
  experiment controls. New sessions open the Circuit inspector. Click a
  highlighted schematic part to focus its control, or inspect a component by
  clicking its 3D body or label.
- Compare series/parallel cell banks and DC/AC sources from the schematic or
  mode control. Source geometry, diagrams and calculations use the same state;
  AC shows peak supply and RMS output/current, while DC hides frequency.
- Click a 3D knife switch or use its toggle in the lesson panel.
- Drag to pan, right-drag to rotate, and scroll to zoom. On touch screens, one
  finger rotates and two fingers pan/zoom.
- Focus the workbench for keyboard controls: WASD pans, Q/E rotates, R resets,
  +/- zooms, and Space toggles a supported circuit switch.
- Mark lessons complete. Progress and settings stay in this browser only.
  Settings includes a confirmed progress reset, animation controls and optional
  switch sounds. System reduced-motion preferences are respected.
- Browser Back/Forward restores lesson navigation. Use arrow keys to navigate
  lesson cards, then Enter to select one.
- The glossary provides English and Spanish explanations of basic terms; lessons
  are written in English.

## Models and safety

These are **idealized educational models, not SPICE**. The schematic and 3D
arrangement explain concepts and are not pin-by-pin construction guides.
Experiments include Ohm's law, series/parallel networks, dividers, fixed-drop
diodes and LEDs, capacitor energy, analytical RC transients, RC frequency
response, basic transistor behavior, sensor dividers, ideal amplifiers and
comparators, 555 timing equations and Boolean logic.

Nonlinear effects, thermal dynamics, reverse breakdown, IC quiescent currents,
contact bounce, inductive transients, parasitics and detailed physical pinouts
are not simulated. The painted resistor bands illustrate 1 kilohm; the adjustable
live values are shown in the controls. Waveforms are labeled normalized or
illustrative where appropriate. Output lamps in non-lamp experiments are visual
indicators, not additional modeled resistances.

Use only low-voltage, current-limited circuits when learning with real hardware.
Check component ratings, polarity and manufacturer documentation. Never connect a
real ammeter directly across a source or experiment with mains electricity.

## Deployment

The Pages workflow tests and builds on each push to `main`, uploads `dist/`, and
deploys using GitHub's official Pages actions. The Vite base is
`/electronics-101/`; no application server or credentials are needed.

All 3D geometry and lesson illustrations are generated locally. No analytics,
cookies or accounts are used. Google Fonts is requested for typography; the app
has system-font fallbacks. Application code and models are bundled rather than
loaded from a third-party CDN.

Wires are routed from terminal anchors attached to each component's metal lead
or contact geometry. Lesson topology chooses which terminals connect; rotations
and scene transforms do not change their alignment. The geometry regression
tests cover the cell, resistor, LED, switch and other lesson layouts without
requiring WebGL.
The camera fits component and label bounds on lesson changes, reset, top view
and viewport resize. The canvas occupies a separate layout row so zooming never
paints over the heading, status or controls.

## Inspiration and authorship

Inspired by the interactive-workbench presentation of
[Electronics 101](https://electronics-101-six.vercel.app/).
This repository is an independent implementation: its source, explanatory
writing and procedural geometry were created for this project, not copied from
the reference's production bundles or proprietary assets. The reference's
creator did not author or design this implementation.
