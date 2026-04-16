# Design System Strategy: Architectural Precision

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Industrial Architect."** 

In an ERP context, users aren't looking for "whimsy" or "softness." They are managing complex, high-stakes data. This system moves away from the generic, bubbly SaaS aesthetic and instead embraces the authoritative precision of high-end machinery and architectural blueprints. We achieve a signature editorial feel not through shadows and gradients, but through **monolithic surfaces, surgical linework, and high-contrast typographic hierarchy.** 

The layout breaks the "standard grid" by utilizing intentional asymmetry—heavy information density in the center balanced by wide, "breathing" sidebars and bold, oversized data markers that function as visual anchors.

## 2. Colors: The Charcoal & Gold Palette
The color strategy is built on a foundation of "Deep Logic." We use a high-contrast dark theme that minimizes eye strain while emphasizing critical status updates through gold and orange accents.

### The "Precision Line" Rule
Unlike consumer apps that rely on shadows, this system defines space through **Structural Linework**. Sections are partitioned using 1px solid borders (`outline_variant`: `#4d4635`). These lines must feel "machined"—crisp, deliberate, and never decorative. 

### Surface Hierarchy & Nesting
Depth is achieved through Tonal Step-downs. Instead of layers "floating" in space, they are "recessed" or "milled" into the interface:
*   **Base Layer:** `surface` (#101418) for the main application background.
*   **Primary Containers:** `surface_container` (#1d2025) for main workspace areas.
*   **Secondary Utility:** `surface_container_highest` (#32353a) for sidebars or property panels to create a clear "tooling" distinction.

### Accent Implementation
*   **Primary (`primary`: #fcc73a):** Reserved exclusively for "Success" states, final "Commit" actions, and high-level financial totals.
*   **Secondary (`secondary`: #ffb77d):** Used for warnings, active selection states, and interactive data nodes.

## 3. Typography: Editorial Authority
We utilize a dual-font strategy to balance character with extreme legibility.

*   **The Anchor (Manrope):** Used for `display` and `headline` scales. Its geometric construction feels engineered. Use `display-lg` (3.5rem) for hero KPIs to make data feel like a headline.
*   **The Workhorse (Inter):** Used for `title`, `body`, and `label` scales. Inter is selected for its high x-height and readability in dense data tables.

**Hierarchy Tip:** For ERP "Master-Detail" views, use `label-sm` in all-caps with increased letter spacing for table headers to create a professional, "spec-sheet" aesthetic.

## 4. Elevation & Depth: The Solid State
Per the creative direction, this system **explicitly forbids glassmorphism and ambient shadows.** Depth is "Flat-Stack."

*   **The Layering Principle:** Use the `surface_container_low` (#191c21) to create "wells" for input fields. By placing a darker container inside a lighter one, you create a sense of tactile "inset" without using a single drop shadow.
*   **The Ghost Border:** For non-interactive decorative separation, use `outline_variant` at 50% opacity. For interactive boundaries (inputs, buttons), use it at 100%.
*   **Solid Logic:** Floating menus or modals must be solid `surface_container_highest` with a 1px `primary` border. This "Gold Frame" replaces the need for a shadow to denote focus.

## 5. Components

### Buttons
*   **Primary:** Solid `primary` (#fcc73a) background with `on_primary` (#3f2e00) text. Sharp `DEFAULT` (0.25rem) corners. No gradients.
*   **Secondary:** `outline` border with `primary` text. Use for "Add" or "Export" functions.
*   **Tertiary:** Ghost style. No border, `on_surface_variant` text. High-visibility hover state using `surface_bright`.

### Data Cards
*   **Style:** Forbid the use of divider lines within a card. Use vertical white space and font-weight shifts.
*   **Border:** Use a 1px `outline_variant` border. On hover, the border should "activate" by switching to the `primary` gold.

### Input Fields
*   **State Logic:** Use `surface_container_lowest` (#0b0e13) for the input well to create an "etched" look. 
*   **Focus:** On focus, the border must transition to `primary` with zero transition-blur—it should "click" into the active state instantly.

### Chips & Tags
*   **Function:** Use `secondary_container` (#d8780f) for active filters. These should be rectangular (`sm` roundedness) to maintain the architectural feel. Avoid pill shapes.

### ERP Specific: The "Status Bar"
A 4px vertical accent line using the `primary` or `error` token should be placed on the far left of any "Active Record" or "Urgent Alert" card to provide immediate peripheral recognition.

## 6. Do's and Don'ts

### Do
*   **Do** use `headline-sm` for section titles to maintain a bold, editorial feel.
*   **Do** respect the 0.25rem (`DEFAULT`) corner radius. It is the signature of this system's "machined" look.
*   **Do** use `on_surface_variant` (#d0c5af) for secondary metadata to create a sophisticated tonal contrast against the gold accents.

### Don't
*   **Don't** use any gradients. If a surface needs to stand out, use a color shift (e.g., from `surface` to `surface_bright`).
*   **Don't** use standard "Drop Shadows." If a modal needs to pop, use a high-contrast `outline`.
*   **Don't** use "Soft" icons. Use thin-stroke, geometric icons that match the `outline` token weight.
*   **Don't** use glassmorphism. This is a "Solid State" system; background blurs suggest a lack of structural integrity.