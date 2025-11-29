# Retro Theme Design System Guide - Quizelo

## Overview
This guide explains how to apply the retro card theme consistently across all pages in the Quizelo application. The theme features bold borders, shadow effects, pattern overlays, and a distinctive retro aesthetic with a purple color scheme.

---

## 🎨 Design Principles

### Core Visual Elements
1. **Bold Borders**: `border-[0.35em] border-[#050505]` (thick black borders)
2. **Shadow Effects**: `shadow-[0.7em_0.7em_0_#000000]` (offset black shadows)
3. **Pattern Overlays**: Grid and dots that appear on hover
4. **Accent Corners**: Rotated squares in top-right corner (optional)
5. **Decorative Elements**: Corner slices, stamps, accent shapes

### Color Scheme

#### Primary Colors (Quizelo Purple Theme)
- **Purple Primary** (`#7C65C1`): Primary actions, main theme color
- **Purple Hover** (`#6952A3`): Hover states for primary actions
- **Gray** (`#6b7280`): Secondary buttons, disabled states, neutral
- **Black** (`#050505`): Borders, text
- **White** (`#ffffff`): Backgrounds

#### Status Colors
- **Success**: `#10b981` (Green)
- **Error**: `#ef4444` (Red)
- **Warning**: `#f59e0b` (Orange)

---

## 📦 Component Patterns

### 1. Card Container Pattern

```tsx
<div className="group relative mb-6">
  {/* Pattern Grid Overlay */}
  <div 
    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
    style={{
      backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
      backgroundSize: '0.5em 0.5em'
    }}
  />
  
  {/* Main Card */}
  <div 
    className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02]"
    style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
  >
    {/* Card content here */}
  </div>
</div>
```

### 2. Title Area Pattern

```tsx
{/* Title Area */}
<div 
  className="relative px-[1.4em] py-[1.4em] text-white font-extrabold flex justify-between items-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
  style={{ 
    background: '#7C65C1',
    backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
    backgroundBlendMode: 'overlay'
  }}
>
  <span>Title Text</span>
</div>
```

### 3. Button Pattern (ButtonCool)

```tsx
import { ButtonCool } from '~/components/ui/button-cool';

<ButtonCool
  onClick={handleAction}
  text="Button Text"
  bgColor="#7C65C1"        // Primary purple
  hoverBgColor="#6952A3"   // Darker purple for hover
  borderColor="#050505"    // Always black
  textColor="#ffffff"      // White text
  size="sm"                // sm, md, lg
  isLoading={false}        // Optional loading state
  disabled={false}         // Optional disabled state
  className="w-full"       // Optional additional classes
/>
```

### 4. Retro Button (Inline Style)

For buttons that don't use ButtonCool component:

```tsx
<button
  className="w-full bg-[#7C65C1] hover:bg-[#6952A3] text-white py-3 px-6 rounded-[0.4em] font-bold border-[0.2em] border-[#050505] shadow-[0.3em_0.3em_0_#000000] hover:shadow-[0.4em_0.4em_0_#000000] hover:-translate-x-[0.1em] hover:-translate-y-[0.1em] active:translate-x-[0.1em] active:translate-y-[0.1em] active:shadow-[0.15em_0.15em_0_#000000] transition-all uppercase tracking-[0.05em]"
>
  Button Text
</button>
```

### 5. Info Box Pattern

```tsx
<div className="p-4 bg-[#f7f7f7] border-[0.15em] border-[#050505] rounded-[0.4em] shadow-[0.2em_0.2em_0_#000000]">
  <div className="text-sm text-[#050505] font-semibold">
    Information text
  </div>
</div>
```

---

## 🎯 Color Usage

### Primary Actions
- **Background**: `#7C65C1` (Purple)
- **Hover**: `#6952A3` (Darker Purple)
- **Text**: `#ffffff` (White)

### Secondary/Disabled Actions
- **Background**: `#6b7280` (Gray)
- **Hover**: `#6b7280` (Same Gray)
- **Text**: `#ffffff` (White)

### Text & Borders
- **Text**: `#050505` (Black)
- **Borders**: `#050505` (Black)
- **Background**: `#ffffff` (White) or `#f7f7f7` (Light Gray)

---

## 📝 Step-by-Step: Converting a Component to Retro Theme

### Step 1: Wrap in Card Container
Replace standard divs with retro card structure.

### Step 2: Add Title Header
Use the title area pattern with purple background.

### Step 3: Replace Buttons
Replace all standard buttons with `<ButtonCool>` or retro-styled buttons using purple color scheme.

### Step 4: Update Info Boxes
Convert info boxes to retro style with borders and shadows.

### Step 5: Add Pattern Overlays
Include grid pattern overlay that appears on hover.

---

## 📐 Spacing & Sizing Standards

- **Card Padding**: `px-[1.5em] py-[1.5em]` (body), `px-[1.4em] py-[1.4em]` (header)
- **Border Width**: `0.35em` (main), `0.15em` (small elements), `0.2em` (buttons)
- **Border Radius**: `0.6em` (cards), `0.4em` (buttons), `0.3em` (boxes)
- **Shadow Offset**: `0.7em 0.7em 0` (default), `1em 1em 0` (hover), `0.5em 0.5em 0` (active)
- **Font Sizes**: `1.2em` (titles), `0.95em` (body), `0.85em` (features), `0.6em` (tags)

---

## 💡 Tips & Best Practices

1. **Consistency**: Always use the same border width (`0.35em`), shadow offset (`0.7em`), and corner radius (`0.6em`)
2. **Color Context**: Use purple (`#7C65C1`) for primary actions, gray (`#6b7280`) for disabled/secondary
3. **Hover States**: Always include hover effects (translate, scale, shadow changes)
4. **Spacing**: Use consistent padding (`1.4em` for headers, `1.5em` for body)
5. **Typography**: Use `font-extrabold` for titles, `font-semibold` for labels
6. **Z-index**: Use z-index layers: `z-[1]` for overlays, `z-[2]` for content, `z-[3]` for buttons
7. **Loading States**: Use `isLoading` prop on ButtonCool to show loading spinner

---

## 🚀 Quick Start Template

Copy this template for new retro-themed components:

```tsx
'use client';

import { ButtonCool } from '~/components/ui/button-cool';

export const YourComponent = () => {
  return (
    <div className="group relative mb-6">
      {/* Pattern Overlays */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-[400ms] z-[1]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '0.5em 0.5em'
        }}
      />
      
      {/* Main Card */}
      <div className="relative bg-white border-[0.35em] border-[#050505] rounded-[0.6em] shadow-[0.7em_0.7em_0_#000000] transition-all duration-[400ms] overflow-hidden z-[2] group-hover:shadow-[1em_1em_0_#000000] group-hover:-translate-x-[0.4em] group-hover:-translate-y-[0.4em] group-hover:scale-[1.02]"
        style={{ boxShadow: 'inset 0 0 0 0.15em rgba(0, 0, 0, 0.05)' }}
      >
        {/* Title Area */}
        <div className="relative px-[1.4em] py-[1.4em] text-white font-extrabold flex justify-between items-center border-b-[0.35em] border-[#050505] uppercase tracking-[0.05em] z-[2]"
          style={{ 
            background: '#7C65C1',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 0.5em, transparent 0.5em, transparent 1em)',
            backgroundBlendMode: 'overlay'
          }}
        >
          <span>Your Title</span>
        </div>

        {/* Body */}
        <div className="px-[1.5em] py-[1.5em]">
          {/* Your content here */}
          
          <ButtonCool
            text="Action Button"
            bgColor="#7C65C1"
            hoverBgColor="#6952A3"
            borderColor="#050505"
            textColor="#ffffff"
            size="sm"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};
```

---

## 📖 Reference Files

- **Button Component**: `src/components/ui/button-cool.tsx`
- **Demo Component**: `src/components/Demo.tsx`
- **Main Page**: `src/app/page.tsx`

---

## ✅ Testing Checklist

After applying the theme:
- [ ] Hover effects work correctly
- [ ] Cards have proper shadows and borders
- [ ] Buttons use ButtonCool component or retro styling
- [ ] Colors match the purple theme
- [ ] Text is readable and bold
- [ ] Mobile responsive
- [ ] Pattern overlays appear on hover
- [ ] Loading states work on buttons
- [ ] Disabled states are properly styled

---

## 🚨 Common Mistakes to Avoid

1. ❌ **Don't mix old and new styles** - Fully convert or don't convert
2. ❌ **Don't use rounded-full** - Use `rounded-[0.6em]` or `rounded-[0.4em]`
3. ❌ **Don't use standard shadows** - Always use offset shadows
4. ❌ **Don't forget hover states** - All interactive elements need hover effects
5. ❌ **Don't skip pattern overlays** - They're essential for the retro feel
6. ❌ **Don't use light borders** - Always use `#050505` (black) for borders
7. ❌ **Don't forget z-index** - Proper layering is crucial
8. ❌ **Don't forget loading states** - Use `isLoading` prop on ButtonCool

---

**Happy Theming! 🎨**

