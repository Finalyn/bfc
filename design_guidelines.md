# Design Guidelines: BFC APP - Professional Sales Order Application

## Design Approach

**Selected Approach**: Material Design System (Mobile-Optimized)

**Justification**: Enterprise mobile application requiring efficiency, clarity, and professional credibility. The blue-accented card system provides visual hierarchy while maintaining corporate sophistication.

**Key Design Principles**:
- Corporate professionalism with blue accent system
- Signature left-border treatment on all content cards
- Mobile-first PWA with offline capability considerations
- Minimal visual noise, maximum clarity
- Trust-building through consistent, professional aesthetic

## Color System

**Primary Palette**:
- Corporate Blue: #003366 (primary brand, accents, CTAs)
- Light Blue: #0055AA (hover states, active elements)
- Pale Blue: #E8F1F8 (subtle backgrounds, disabled states)

**Neutrals**:
- Charcoal: #2C3E50 (primary text, headers)
- Medium Gray: #6B7280 (secondary text, labels)
- Light Gray: #F3F4F6 (backgrounds, dividers)
- White: #FFFFFF (cards, inputs)

**Semantic**:
- Success: #059669 (confirmations, completed states)
- Error: #DC2626 (validation errors, alerts)
- Warning: #D97706 (cautions, pending states)

## Typography

**Font Family**: Roboto (Google Fonts) - 400 (Regular), 500 (Medium), 600 (Semi-Bold)

**Hierarchy**:
- App Title: text-xl font-semibold (20px) in Corporate Blue
- Section Headers: text-lg font-medium (18px) in Charcoal
- Form Labels: text-sm font-medium (14px) in Medium Gray
- Input Text: text-base (16px) in Charcoal
- Helper Text: text-xs (12px) in Medium Gray
- Button Text: text-base font-medium (16px)

## Layout System

**Spacing**: Tailwind units 3, 4, 6, 8
- Page padding: p-6
- Card padding: p-6
- Form gaps: gap-4
- Section spacing: space-y-6
- Border accent: border-l-4 (4px blue left border)

**Container**: max-w-lg mx-auto with px-4 on mobile

## Visual Identity: Blue Accent System

**Signature Left Border Treatment**:
All major containers use 4px blue left border:
- Content cards: border-l-4 border-[#003366]
- Form sections: border-l-4 border-[#003366]
- Summary cards: border-l-4 border-[#003366]
- Modal dialogs: border-l-4 border-[#003366]
- Input groups: border-l-4 border-[#E8F1F8] (subtle), active state to Corporate Blue

**Card Styling**:
- White background with subtle shadow (shadow-sm)
- Rounded corners: rounded-lg
- Blue left accent: border-l-4
- Internal padding: p-6
- Dividers: border-[#F3F4F6]

## Component Specifications

### Application Shell
- Header: white background, border-b border-[#F3F4F6], h-16, corporate blue title
- Step indicator: horizontal dots with blue active state
- Content area: light gray background (#F3F4F6)
- Bottom action bar: white with shadow-2xl, blue primary button

### Form Components

**Inputs**:
- Height: h-12 (48px)
- White background, border border-[#E8F1F8]
- Focus: border-[#003366] with ring-2 ring-[#003366]/20
- Error: border-[#DC2626]
- Rounded: rounded-lg
- Label: text-sm font-medium text-[#6B7280] mb-2

**Buttons**:
- Primary: Full width h-14, bg-[#003366], white text, rounded-xl, shadow-md
- Secondary: Same size, white bg, border-2 border-[#003366], blue text
- Disabled: bg-[#E8F1F8], text-[#6B7280]
- Touch feedback: active:scale-[0.98]

### Signature Canvas
- Container: white card with blue left border
- Canvas: min-h-64, border-2 dashed border-[#E8F1F8] (empty) or solid border-[#003366] (signed)
- Clear button: text-[#003366] with DocumentIcon, top-right
- Rounded: rounded-lg

### Order Summary Card
- White background with border-l-4 border-[#003366]
- Padding: p-6
- Rounded: rounded-xl
- Row layout: flex justify-between
- Labels: text-sm font-medium text-[#6B7280]
- Values: text-base text-[#2C3E50]
- Total row: border-t-2 border-[#003366], pt-4, larger text (text-lg font-semibold)
- Dividers between rows: border-t border-[#F3F4F6]

### Status & Progress

**Step Indicator**:
- 4 horizontal steps with connector lines
- Active: w-10 h-10 circle, bg-[#003366], white text
- Completed: checkmark in blue circle
- Future: w-8 h-8 circle, border-[#E8F1F8], gray text
- Connectors: border-t-2 border-[#E8F1F8] (inactive) or border-[#003366] (completed)

**File Preview Cards**:
- Horizontal layout with blue left border
- Icon (DocumentIcon/TableCellsIcon): w-10 h-10 text-[#003366]
- White background, rounded-lg, p-4
- Filename: text-sm font-medium, truncate
- Download button: icon-only, text-[#003366]

### Modal/Dialog
- max-w-sm, white background, rounded-2xl
- Blue left accent: border-l-4 border-[#003366]
- Padding: p-6, shadow-2xl
- Title: text-xl font-semibold text-[#2C3E50]
- Actions: flex gap-3, full-width buttons

## Navigation Flow

**4-Step Process**:
1. Order Form → 2. Signature → 3. Review & Generate → 4. Send & Download

**Bottom Action Bar**:
- Fixed position, white bg, shadow-2xl
- Safe area padding (pb-safe)
- Primary action: full-width blue button
- Back arrow (ChevronLeftIcon) in header for steps 2-4

## Interactive States

**Touch Feedback**:
- Buttons: active:scale-[0.98], active:bg-[#0055AA] (primary)
- Inputs: focus ring with blue glow
- Cards: tap highlights (if interactive)

**Loading States**:
- Button loading: spinner icon, "Traitement..." text
- Full-screen loading: centered spinner with "Chargement..." below

**Toast Notifications**:
- Top slide-in, white card with blue left border
- Success: CheckCircleIcon in green
- Error: XCircleIcon in red
- Auto-dismiss: 4 seconds
- Padding: p-4, rounded-xl, shadow-lg

## Accessibility

- All touch targets: minimum 44x44px
- Labels for all inputs with for/id pairing
- Icons: Heroicons (outline for UI, solid for emphasis)
- Error messages: aria-live="polite"
- Focus visible: ring-2 ring-[#003366] ring-offset-2
- Color contrast: WCAG AA minimum (Corporate Blue on white: 8.59:1)

## Mobile Optimizations

- Viewport: width=device-width, initial-scale=1, maximum-scale=1
- Input types: email, number, date for native keyboards
- Smooth scrolling: scroll-smooth
- Hardware acceleration: transform transitions only
- PWA considerations: offline state messaging in blue banner

## Icons

Heroicons via CDN (outline primary, solid for emphasis):
- Navigation: ChevronLeftIcon, ArrowRightIcon
- Actions: DocumentIcon, TableCellsIcon, ArrowDownTrayIcon, XMarkIcon
- Status: CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon

## Key Visual Elements

- No images required (utility application)
- Blue left border is signature visual element throughout
- Corporate blue used sparingly for maximum impact
- Generous whitespace with light gray backgrounds
- Subtle shadows for depth (shadow-sm on cards, shadow-md on buttons)