# Design Guidelines: Mobile Sales Order Application

## Design Approach

**Selected Approach**: Design System-Based (Material Design for Mobile)

**Justification**: This is a utility-focused, mobile-first business application where efficiency, clarity, and reliability are paramount. The sales representatives need a tool that works flawlessly in the field with minimal learning curve. Material Design's mobile-optimized patterns, strong visual feedback, and touch-friendly components align perfectly with these requirements.

**Key Design Principles**:
- Mobile-first with touch optimization throughout
- Single-purpose screens with clear progression
- Maximum legibility and touch targets
- Professional business aesthetic
- Zero friction workflow

## Typography

**Font Family**: 
- Primary: Roboto (via Google Fonts CDN) - weights: 400 (Regular), 500 (Medium), 700 (Bold)

**Type Scale**:
- Page Title: text-2xl font-bold (24px)
- Section Headers: text-lg font-medium (18px)
- Form Labels: text-sm font-medium (14px)
- Input Text: text-base (16px) - critical for mobile to prevent zoom
- Body Text: text-base (16px)
- Button Text: text-base font-medium (16px)
- Helper Text: text-xs (12px)

## Layout System

**Spacing Primitives**: Use Tailwind units of 3, 4, 6, and 8
- Component padding: p-4 or p-6
- Section spacing: space-y-6
- Form field gaps: gap-4
- Button padding: px-6 py-4
- Page padding: p-6 or px-4 py-6

**Grid System**:
- Single column layout throughout (mobile-first)
- Container: max-w-lg mx-auto (optimized for mobile screens)
- Full viewport width on mobile, centered on larger screens

## Core Layout Structure

**Application Shell**:
- Fixed header with app title and current step indicator
- Scrollable content area with generous padding
- Fixed bottom action bar for primary CTAs
- Safe area padding for mobile notches

**Form Layout**:
- Stacked form fields with consistent spacing (gap-4)
- Full-width inputs with minimum height h-12
- Labels positioned above inputs with mb-2
- Helper text below inputs with mt-1

## Component Library

### Form Components

**Text Inputs**:
- Height: h-12 (48px minimum for touch)
- Padding: px-4
- Border radius: rounded-lg
- Border width: border-2
- Focus state: ring-2 offset-2

**Text Areas**:
- Minimum height: min-h-32
- Padding: p-4
- Same styling as text inputs

**Date Picker**:
- Native HTML5 date input styled to match other inputs
- Height: h-12
- Full width

**Buttons - Primary**:
- Size: w-full h-14 (56px for easy tapping)
- Padding: px-6 py-4
- Border radius: rounded-xl
- Font: text-base font-medium
- Shadow: shadow-lg

**Buttons - Secondary**:
- Same dimensions as primary
- Border: border-2
- No shadow

**Buttons - Icon**:
- Square: w-12 h-12
- Centered icon with p-3

### Signature Component

**Signature Canvas**:
- Aspect ratio: 16:9 or 3:2 for landscape orientation
- Minimum height: min-h-64
- Border: border-2 dashed when empty, border-2 solid when signed
- Border radius: rounded-xl
- Background hint: "Sign here" centered text when empty
- Clear button: positioned top-right corner

**Signature Actions**:
- Clear button: text-sm with icon
- Instruction text: text-sm above canvas

### Order Summary Card

**Card Container**:
- Padding: p-6
- Border radius: rounded-2xl
- Border: border-2
- Background: distinct from page background
- Spacing: space-y-4

**Summary Row**:
- Flex layout: flex justify-between items-start
- Label: text-sm font-medium
- Value: text-base
- Dividers: border-t between rows with py-3

### Status Indicators

**Step Indicator** (Top of page):
- Horizontal stepper with 4 steps
- Current step highlighted and larger
- Completed steps with checkmark icons
- Future steps muted
- Connector lines between steps

**Progress States**:
- Loading spinner: w-6 h-6 centered
- Success checkmark: w-8 h-8 in circle
- Error icon: w-8 h-8 in circle

### File Preview Cards

**PDF/Excel Preview**:
- Horizontal card layout
- Icon: w-12 h-12 (file type icon from Heroicons)
- Filename: text-sm font-medium truncate
- File size: text-xs
- Download button: icon-only, w-10 h-10
- Card padding: p-4
- Border radius: rounded-xl

### Modal/Dialog

**Confirmation Dialog**:
- Max width: max-w-sm
- Padding: p-6
- Border radius: rounded-2xl
- Shadow: shadow-2xl
- Title: text-xl font-bold mb-4
- Message: text-base mb-6
- Actions: flex gap-3 at bottom

## Navigation & Workflow

**Multi-Step Flow**:
1. Order Form (all input fields)
2. Signature Capture
3. Review & Generate
4. Send & Download

**Bottom Action Bar**:
- Fixed positioning: fixed bottom-0 left-0 right-0
- Safe area padding: pb-safe
- Shadow: shadow-2xl
- Background: distinct from page
- Padding: p-4
- Primary action button: full width

**Back Navigation**:
- Top-left icon button in header
- Only visible after step 1

## Interactive States

**Touch Feedback**:
- All interactive elements: active:scale-95 transition-transform
- Buttons: active state with reduced opacity
- Inputs: focus ring with ring-2

**Loading States**:
- Inline spinner for button loading
- Disabled state with reduced opacity
- "Generating..." or "Sending..." text updates

**Success/Error Messages**:
- Toast notifications from top
- Padding: p-4
- Border radius: rounded-xl
- Auto-dismiss after 4 seconds
- Icon + message layout

## Accessibility

**Touch Targets**:
- Minimum 44x44px (48px used throughout)
- Spacing between tappable elements: minimum 8px

**Form Accessibility**:
- All inputs have associated labels
- Error messages with aria-live="polite"
- Required field indicators with asterisk
- Focus visible on all interactive elements

**Icons**:
- Use Heroicons (solid and outline variants) via CDN
- All icons have aria-label or are decorative with aria-hidden

## Mobile Optimizations

**Viewport**:
- viewport meta tag with width=device-width, initial-scale=1
- Prevent zoom on input focus with maximum-scale=1

**Keyboard**:
- Input types: email, number, date for native keyboards
- Pattern attributes for formatting hints

**Performance**:
- Minimal animations (only essential state changes)
- Smooth scrolling: scroll-smooth
- Hardware acceleration for transforms

## Images

No images required for this application. The interface is purely functional with icons for visual hierarchy.