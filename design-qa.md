# Neon storefront design QA

final result: passed

## Evidence
- Source visual truth: /Users/samblaha/.codex/generated_images/01a09135-8acb-7361-bf00-aaed72030e52/exec-113edad8-64be-4301-8000-2cb65b7036ac.png
- Implementation: http://127.0.0.1:4173/
- Final screenshot: output/neon-qa/desktop-final.png
- Initial screenshot: output/neon-qa/desktop.png
- Mobile evidence: output/neon-qa/mobile.png and output/neon-qa/mobile-inventory.png
- Desktop source and final capture: 1487 × 1058 pixels, CSS viewport 1487 × 1058, DPR 1; no density normalization required. Initial state, closed panels, sound off.
- Mobile CSS viewport: 390 × 844, DPR 1, entered state and filtered inventory.
- Source and rendered final screenshot were displayed together in one comparison tool result. Intermediate 1280 × 720 capture was discarded and replaced with matching viewport capture.

## Findings and comparison history
- P2: Initial overlay typography was too small (12px header / 10px footer). Increased to 14px / 12px. Final screenshot confirms readable controls and matching placement.
- P2: Dialog initial focus targeted the backdrop. Changed initial focus to the dialog close button, removed backdrops from tab order, and limited the focus trap to visible dialog controls. Tested Shift+Tab wrapping and Escape.
- P2: Golf filter omitted Golf Ball Printer because its tags lacked Golf. Included the title in category matching. Mobile post-fix evidence shows both golf projects.
- No remaining actionable P0/P1/P2 findings.

## Required fidelity surfaces
- Typography: physical lettering remains in generated art; IBM Plex Mono for sparse navigation and Space Grotesk for panels. Text remains selectable and accessible outside the physical scene signs.
- Layout: storefront silhouette, proportions, signs, and primary floor action closely preserve the selected mock. Aspect-ratio containment keeps hotspots aligned across desktop sizes. Mobile crops the decorative edges and supplies readable navigation below.
- Colors: black/violet surroundings, cyan and magenta illumination, warm workshop interior retained; panels use coordinated violet and cyan accents.
- Images: generated scene derived from exact selected image; no CSS or SVG approximations. JPEG at quality 88 retains clear signage and workshop detail. Slight tonal variation from regeneration is acceptable.
- Copy: Projects, About Sam, Build logs, Explore the lab match. Functional hint clarifies click-to-enter. Sound defaults off intentionally. Real project collection supplies all build details.
- Full-view images were readable at native resolution; no additional region crop was required for the main sign text or navigation alignment.

## Verification
- Jekyll generated successfully with Ruby 4 explicit standard-library dependencies.
- JavaScript syntax check passed.
- Project validator passed: 10 projects, 5 garage slots.
- Browser tested: Projects drawer, Golf filtering, Delta project modal, actual Delta build-log navigation, About panel, Escape, focus wrapping, sound on/off and pressed state.
- Mobile scene and inventory inspected at 390 × 844; no horizontal page overflow.
- Browser error log returned no errors during homepage checks.

## Follow-up polish and limits
- P3: The small decorative pulse logo and mouse/speaker icons from the concept are omitted in favor of readable text controls.
- This is an image-based interactive scene with bounded panning, not a freely orbitable 3D model. The limitation was communicated before implementation.
- Reduced-motion behavior is implemented, but OS-level preference switching was not manually tested.
- Public deployment is outside this local build.
