# VoltCore ERP — Arctic Light Design System

> Complete color replacement guide to migrate from the current dark/gold theme to the Arctic Light palette.

---

## 1. Design Tokens

Paste this block into your global CSS `:root`. All component styles below reference these variables.

```css
:root {
  /* Backgrounds */
  --color-bg-app:          #F0F3F8;   /* Main app canvas / outer shell */
  --color-bg-surface:      #FFFFFF;   /* Cards, sidebar, navbar, panels */
  --color-bg-hover:        #E8EEF9;   /* Card hover, row hover */
  --color-bg-accent-tint:  #EEF2FD;   /* Icon containers, selected nav bg */

  /* Borders */
  --color-border:          #D4DCF0;   /* Default — all cards, panels */
  --color-border-strong:   #B8C4E4;   /* Emphasis — input focus, dividers */

  /* Accent */
  --color-accent:          #2A4FD8;   /* Primary — buttons, active borders, links */
  --color-accent-icon:     #5070E8;   /* Module icons, interactive elements */

  /* Text */
  --color-text-primary:    #1A2647;   /* Headings, module names, body copy */
  --color-text-secondary:  #6E7DA8;   /* Sub-labels, inactive nav items */
  --color-text-hint:       #A8B4D0;   /* Placeholders, count labels, breadcrumbs */

  /* Status */
  --color-success-bg:      #EAF5EC;
  --color-success-border:  #B6DDB8;
  --color-success-text:    #1D6B25;

  --color-warning-bg:      #FEF6E7;
  --color-warning-border:  #F5D68A;
  --color-warning-text:    #8A5C00;

  --color-error-bg:        #FDEDEC;
  --color-error-border:    #F5B8B6;
  --color-error-text:      #8B1F1D;

  --color-info-bg:         #EEF2FD;
  --color-info-border:     #B8C4E4;
  --color-info-text:       #1A3CB0;
}
```

---

## 2. Full Palette Reference

| Token | Hex | Usage |
|---|---|---|
| Page background | `#F0F3F8` | App canvas, outer shell |
| Surface / cards | `#FFFFFF` | Cards, sidebar, navbar, modals |
| Hover / tinted bg | `#E8EEF9` | Card hover, row highlight |
| Accent tint | `#EEF2FD` | Icon container bg, active nav bg |
| Border default | `#D4DCF0` | All card and panel borders |
| Border emphasis | `#B8C4E4` | Input focus ring, strong dividers |
| Accent primary | `#2A4FD8` | Buttons, active card border, links |
| Accent icon | `#5070E8` | All module icons |
| Text primary | `#1A2647` | Headings, titles, body text |
| Text secondary | `#6E7DA8` | Sub-labels, inactive items |
| Text hint | `#A8B4D0` | Placeholders, breadcrumbs, counts |
| Logo background | `#2A4FD8` | "VC" logo box (replaces gold) |

---

## 3. Before → After Color Mapping

Direct find-and-replace pairs for your codebase.

| Element | Old (Dark/Gold) | New (Arctic Light) |
|---|---|---|
| App background | `#1A1D24` | `#F0F3F8` |
| Cards | `#22262F` | `#FFFFFF` |
| Sidebar | `#1C2028` | `#FFFFFF` |
| Card hover | `#2E3340` | `#E8EEF9` |
| Gold accent | `#F0A030` | `#2A4FD8` |
| Icon color | `#F0A030` | `#5070E8` |
| Icon background | `rgba(240,160,48,0.15)` | `#EEF2FD` |
| Body text | `#FFFFFF` | `#1A2647` |
| Sub-label text | `#888888` | `#6E7DA8` |
| "LIMITED ACCESS" bg | `rgba(240,160,48,0.2)` | `#EEF2FD` |
| "LIMITED ACCESS" text | `#F0A030` | `#2A4FD8` |
| Border / separator | `rgba(255,255,255,0.08)` | `#D4DCF0` |
| Navbar background | `#1C2028` | `#FFFFFF` |

---

## 4. Component-by-Component Specs

### 4.1 App Shell

```css
body, #app-root {
  background-color: var(--color-bg-app); /* #F0F3F8 */
}
```

---

### 4.2 Sidebar

```css
.sidebar {
  background:    #FFFFFF;
  border-right:  0.5px solid #D4DCF0;
  width:         220px;
}

/* Logo box */
.sidebar-logo-box {
  background:    #2A4FD8;
  border-radius: 8px;
  color:         #FFFFFF;
}

/* Logo text */
.sidebar-brand-name  { color: #1A2647; font-weight: 500; font-size: 14px; }
.sidebar-brand-sub   { color: #6E7DA8; font-size: 11px; }

/* "LIMITED ACCESS" badge */
.sidebar-badge {
  background:    #EEF2FD;
  color:         #2A4FD8;
  border:        0.5px solid #B8C4E4;
  border-radius: 20px;
  font-size:     11px;
  font-weight:   500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding:       3px 10px;
}

/* Nav items — default */
.nav-item {
  color:         #6E7DA8;
  border-radius: 6px;
  padding:       6px 10px;
}
.nav-item:hover {
  background:    #E8EEF9;
  color:         #1A2647;
}

/* Nav items — active */
.nav-item.active {
  background:    #EEF2FD;
  color:         #2A4FD8;
  font-weight:   500;
}

/* User row at bottom */
.sidebar-user-name { color: #1A2647; font-size: 13px; font-weight: 500; }
.sidebar-user-role { color: #6E7DA8; font-size: 11px; }
.sidebar-divider   { border-top: 0.5px solid #D4DCF0; }
```

---

### 4.3 Navbar / Top Bar

```css
.navbar {
  background:    #FFFFFF;
  border-bottom: 0.5px solid #D4DCF0;
  padding:       12px 24px;
}

.navbar-page-title {
  color:         #1A2647;
  font-size:     20px;
  font-weight:   500;
}

.navbar-breadcrumb {
  color:         #A8B4D0;
  font-size:     12px;
}

/* Notification / icon button */
.navbar-icon-btn {
  background:    #EEF2FD;
  border:        0.5px solid #D4DCF0;
  border-radius: 8px;
  color:         #5070E8;
}
.navbar-icon-btn:hover {
  background:    #E0E8F8;
  border-color:  #B8C4E4;
}

/* Avatar */
.navbar-avatar {
  background:    #2A4FD8;
  color:         #FFFFFF;
  border-radius: 50%;
}
```

---

### 4.4 Module Cards (Dashboard Grid)

```css
/* Default state */
.module-card {
  background:    #FFFFFF;
  border:        0.5px solid #D4DCF0;
  border-radius: 12px;
  padding:       20px;
  cursor:        pointer;
  transition:    border-color 0.15s, background 0.15s;
}

/* Hover state */
.module-card:hover {
  background:    #F5F7FD;
  border-color:  #B8C4E4;
}

/* Active / selected state */
.module-card.active {
  background:    #FFFFFF;
  border:        1.5px solid #2A4FD8;   /* thicker border, not fill */
}

/* Icon container */
.module-card .icon-wrap {
  width:         44px;
  height:        44px;
  background:    #EEF2FD;
  border-radius: 10px;
  display:       flex;
  align-items:   center;
  justify-content: center;
  margin-bottom: 14px;
}

/* Icon itself */
.module-card .icon-wrap svg,
.module-card .icon-wrap i {
  color:         #5070E8;  /* default */
}
.module-card:hover .icon-wrap svg,
.module-card:hover .icon-wrap i {
  color:         #2A4FD8;  /* darken on hover */
}
.module-card.active .icon-wrap {
  background:    #D8E2F8;
}
.module-card.active .icon-wrap svg,
.module-card.active .icon-wrap i {
  color:         #2A4FD8;
}

/* Module name */
.module-card .module-name {
  color:         #1A2647;
  font-size:     15px;
  font-weight:   500;
  margin-bottom: 4px;
}

/* Sub-module count */
.module-card .module-sub {
  color:         #6E7DA8;
  font-size:     12px;
}
.module-card.active .module-sub {
  color:         #2A4FD8;
}
```

---

### 4.5 Buttons

```css
/* Primary */
.btn-primary {
  background:    #2A4FD8;
  color:         #FFFFFF;
  border:        none;
  border-radius: 8px;
  padding:       8px 16px;
  font-size:     13px;
  font-weight:   500;
}
.btn-primary:hover  { background: #1E40C0; }
.btn-primary:active { background: #163299; }

/* Secondary / outline */
.btn-secondary {
  background:    transparent;
  color:         #2A4FD8;
  border:        0.5px solid #B8C4E4;
  border-radius: 8px;
  padding:       8px 16px;
  font-size:     13px;
}
.btn-secondary:hover {
  background:    #EEF2FD;
  border-color:  #2A4FD8;
}

/* Ghost / text */
.btn-ghost {
  background:    transparent;
  color:         #6E7DA8;
  border:        none;
}
.btn-ghost:hover { color: #2A4FD8; background: #EEF2FD; border-radius: 6px; }
```

---

### 4.6 Inputs & Form Fields

```css
.input {
  background:    #FFFFFF;
  border:        0.5px solid #D4DCF0;
  border-radius: 8px;
  color:         #1A2647;
  font-size:     14px;
  padding:       8px 12px;
}
.input::placeholder { color: #A8B4D0; }
.input:hover        { border-color: #B8C4E4; }
.input:focus        {
  border-color:  #2A4FD8;
  outline:       none;
  box-shadow:    0 0 0 3px rgba(42, 79, 216, 0.12);
}

label {
  color:         #1A2647;
  font-size:     13px;
  font-weight:   500;
  margin-bottom: 6px;
}
```

---

### 4.7 Tables

```css
.table {
  border-collapse: collapse;
  width: 100%;
}
.table thead th {
  background:    #F0F3F8;
  color:         #6E7DA8;
  font-size:     11px;
  font-weight:   500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 0.5px solid #D4DCF0;
  padding:       10px 14px;
}
.table tbody td {
  color:         #1A2647;
  font-size:     13px;
  border-bottom: 0.5px solid #D4DCF0;
  padding:       10px 14px;
}
.table tbody tr:hover td { background: #F5F7FD; }
.table tbody tr.selected td { background: #EEF2FD; }
```

---

### 4.8 Badges & Status Pills

```css
/* Generic pill */
.badge {
  font-size:     11px;
  font-weight:   500;
  padding:       3px 10px;
  border-radius: 20px;
  display:       inline-flex;
  align-items:   center;
}

.badge-success {
  background: #EAF5EC; color: #1D6B25; border: 0.5px solid #B6DDB8;
}
.badge-warning {
  background: #FEF6E7; color: #8A5C00; border: 0.5px solid #F5D68A;
}
.badge-error {
  background: #FDEDEC; color: #8B1F1D; border: 0.5px solid #F5B8B6;
}
.badge-info {
  background: #EEF2FD; color: #1A3CB0; border: 0.5px solid #B8C4E4;
}
.badge-neutral {
  background: #F0F3F8; color: #6E7DA8; border: 0.5px solid #D4DCF0;
}
```

---

### 4.9 Modals & Drawers

```css
.modal-overlay {
  background: rgba(26, 38, 71, 0.35);   /* dark navy at low opacity */
}
.modal {
  background:    #FFFFFF;
  border:        0.5px solid #D4DCF0;
  border-radius: 14px;
  box-shadow:    0 4px 24px rgba(26, 38, 71, 0.08);
}
.modal-header {
  border-bottom: 0.5px solid #D4DCF0;
  padding:       16px 20px;
}
.modal-title  { color: #1A2647; font-size: 16px; font-weight: 500; }
.modal-close  { color: #A8B4D0; }
.modal-close:hover { color: #6E7DA8; }

.drawer {
  background:    #FFFFFF;
  border-left:   0.5px solid #D4DCF0;
}
```

---

### 4.10 Dropdown Menus

```css
.dropdown-menu {
  background:    #FFFFFF;
  border:        0.5px solid #D4DCF0;
  border-radius: 10px;
  box-shadow:    0 4px 16px rgba(26, 38, 71, 0.08);
}
.dropdown-item {
  color:         #1A2647;
  font-size:     13px;
  padding:       8px 14px;
}
.dropdown-item:hover {
  background:    #EEF2FD;
  color:         #2A4FD8;
}
.dropdown-item.danger { color: #8B1F1D; }
.dropdown-item.danger:hover { background: #FDEDEC; }
.dropdown-divider { border-top: 0.5px solid #D4DCF0; margin: 4px 0; }
```

---

## 5. Typography Scale

| Element | Size | Weight | Color |
|---|---|---|---|
| Page title | 22px | 500 | `#1A2647` |
| Section heading | 18px | 500 | `#1A2647` |
| Module name | 15px | 500 | `#1A2647` |
| Body / description | 14px | 400 | `#1A2647` |
| Sub-label / count | 12px | 400 | `#6E7DA8` |
| Breadcrumb | 12px | 400 | `#A8B4D0` |
| Badge / tag label | 11px | 500 | varies by type |
| Table header | 11px | 500, uppercase | `#6E7DA8` |

---

## 6. Component State Summary

| State | Background | Border | Icon | Title | Sub-text |
|---|---|---|---|---|---|
| Card — default | `#FFFFFF` | `#D4DCF0` (0.5px) | `#5070E8` | `#1A2647` | `#6E7DA8` |
| Card — hover | `#F5F7FD` | `#B8C4E4` (0.5px) | `#2A4FD8` | `#1A2647` | `#5070E8` |
| Card — active | `#FFFFFF` | `#2A4FD8` (1.5px) | `#2A4FD8` | `#1A2647` | `#2A4FD8` |
| Nav item — default | transparent | none | `#6E7DA8` | `#6E7DA8` | — |
| Nav item — hover | `#E8EEF9` | none | `#1A2647` | `#1A2647` | — |
| Nav item — active | `#EEF2FD` | none | `#2A4FD8` | `#2A4FD8` | — |
| Input — default | `#FFFFFF` | `#D4DCF0` (0.5px) | — | `#1A2647` | `#A8B4D0` |
| Input — focus | `#FFFFFF` | `#2A4FD8` (0.5px) | — | `#1A2647` | — |
| Row — hover | `#F5F7FD` | — | — | `#1A2647` | — |
| Row — selected | `#EEF2FD` | — | — | `#1A2647` | — |

---

## 7. Status / Semantic Colors

| Type | Background | Border | Text |
|---|---|---|---|
| Success | `#EAF5EC` | `#B6DDB8` | `#1D6B25` |
| Warning | `#FEF6E7` | `#F5D68A` | `#8A5C00` |
| Error | `#FDEDEC` | `#F5B8B6` | `#8B1F1D` |
| Info | `#EEF2FD` | `#B8C4E4` | `#1A3CB0` |

---

## 8. Spacing & Radius

```css
/* Border radius */
--radius-sm:   6px;    /* pills, small badges, inner elements */
--radius-md:   8px;    /* buttons, inputs, dropdowns */
--radius-lg:   12px;   /* cards, modals */
--radius-xl:   16px;   /* large panels */
--radius-full: 9999px; /* circular badges */

/* Spacing scale */
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
```

---

## 9. Shadows

Arctic Light uses minimal shadow — only for floating elements like dropdowns and modals. Never on cards.

```css
/* Dropdowns, tooltips */
--shadow-sm: 0 2px 8px rgba(26, 38, 71, 0.07);

/* Modals, drawers */
--shadow-md: 0 4px 24px rgba(26, 38, 71, 0.08);

/* No shadow on cards — use border instead */
```

---

## 10. Tailwind Config (if using Tailwind CSS)

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        arctic: {
          bg:           '#F0F3F8',
          surface:      '#FFFFFF',
          hover:        '#E8EEF9',
          'accent-tint':'#EEF2FD',
          border:       '#D4DCF0',
          'border-strong': '#B8C4E4',
          accent:       '#2A4FD8',
          icon:         '#5070E8',
          'text-primary':   '#1A2647',
          'text-secondary': '#6E7DA8',
          'text-hint':      '#A8B4D0',
        }
      },
      borderRadius: {
        sm:  '6px',
        md:  '8px',
        lg:  '12px',
        xl:  '16px',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(26, 38, 71, 0.07)',
        md: '0 4px 24px rgba(26, 38, 71, 0.08)',
      }
    }
  }
}
```

---

## 11. Migration Checklist

- [ ] Swap app shell / body background from dark to `#F0F3F8`
- [ ] Set sidebar background to `#FFFFFF`, add `border-right: 0.5px solid #D4DCF0`
- [ ] Replace all gold (`#F0A030`) accent references with `#2A4FD8`
- [ ] Replace all icon color references with `#5070E8`
- [ ] Replace all icon background containers with `#EEF2FD`
- [ ] Update `VC` logo box background from gold to `#2A4FD8`
- [ ] Update `LIMITED ACCESS` badge — bg `#EEF2FD`, text `#2A4FD8`
- [ ] Update all card backgrounds to `#FFFFFF` with `border: 0.5px solid #D4DCF0`
- [ ] Update active card border to `1.5px solid #2A4FD8`
- [ ] Set all heading / title text to `#1A2647`
- [ ] Set all sub-label / secondary text to `#6E7DA8`
- [ ] Set all placeholder / hint text to `#A8B4D0`
- [ ] Update active sidebar nav item — bg `#EEF2FD`, text/icon `#2A4FD8`
- [ ] Replace all status colors (success / warning / error / info) with Section 7 values
- [ ] Remove all box-shadows from cards (use border only)
- [ ] Test all pages in both low-light and bright environments

---

*VoltCore ERP — Arctic Light v1.0 | Generated April 2026*