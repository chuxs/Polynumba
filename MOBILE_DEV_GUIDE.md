# Mobile Development Quick Reference Guide

## Responsive Breakpoints

Use these breakpoints consistently across the application:

```css
/* Desktop First Approach */
@media (max-width: 1200px) { /* Tablet Landscape */ }
@media (max-width: 968px)  { /* Tablet Portrait */ }
@media (max-width: 768px)  { /* Mobile Landscape */ }
@media (max-width: 640px)  { /* Mobile Portrait (Large) */ }
@media (max-width: 480px)  { /* Mobile Portrait (Standard) */ }
@media (max-width: 360px)  { /* Small Mobile */ }
```

## CSS Best Practices

### Touch Targets
```css
/* Minimum 44x44px for all interactive elements on mobile */
@media (max-width: 768px) {
    button, a, input[type="button"] {
        min-height: 44px;
        min-width: 44px;
    }
}
```

### Touch Optimization
```css
.interactive-element {
    touch-action: manipulation; /* Prevents double-tap zoom */
    -webkit-tap-highlight-color: rgba(230, 57, 70, 0.3); /* iOS tap feedback */
}
```

### Smooth Scrolling
```css
.scrollable-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch; /* iOS momentum scrolling */
}
```

## HTML Meta Tags

Required meta tags for all pages:

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0f1419">
```

## Mobile Menu Implementation

### HTML Structure
```html
<!-- Mobile Menu Toggle Button -->
<button class="mobile-menu-toggle" id="mobile-menu-toggle">☰</button>

<!-- Mobile Menu Overlay -->
<div class="mobile-menu-overlay" id="mobile-menu-overlay"></div>

<!-- Mobile Menu -->
<div class="mobile-menu" id="mobile-menu">
    <div class="mobile-menu-header">
        <div class="logo">...</div>
        <button class="mobile-menu-close">×</button>
    </div>
    <div class="mobile-menu-content">
        <nav>...</nav>
    </div>
</div>
```

### JavaScript
```javascript
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const mobileMenuClose = document.getElementById('mobile-menu-close');
const mobileMenu = document.getElementById('mobile-menu');
const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');

function openMobileMenu() {
    mobileMenu.classList.add('active');
    mobileMenuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    mobileMenu.classList.remove('active');
    mobileMenuOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

mobileMenuToggle?.addEventListener('click', openMobileMenu);
mobileMenuClose?.addEventListener('click', closeMobileMenu);
mobileMenuOverlay?.addEventListener('click', closeMobileMenu);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
        closeMobileMenu();
    }
});
```

## Font Size Guidelines

### Minimum Font Sizes
- **Body Text**: 14px (0.875rem)
- **Input Fields**: 16px (1rem) - prevents zoom on iOS
- **Labels**: 11px (0.6875rem)
- **Buttons**: 13px (0.8125rem)

### Scaling Pattern
```css
/* Desktop */
.heading { font-size: 2rem; }

/* Tablet */
@media (max-width: 768px) {
    .heading { font-size: 1.75rem; } /* -12.5% */
}

/* Mobile */
@media (max-width: 480px) {
    .heading { font-size: 1.5rem; } /* -25% */
}
```

## Grid Layouts for Mobile

### Number Input Grid
```css
.number-inputs {
    display: grid;
    gap: 12px;
}

/* Desktop: 4 columns */
.number-inputs {
    grid-template-columns: repeat(4, 1fr);
}

/* Mobile: 2 columns */
@media (max-width: 768px) {
    .number-inputs {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }
}
```

### Quick Bet Buttons
```css
.quick-bet-buttons {
    display: grid;
    gap: 8px;
}

/* Desktop: 4 columns */
.quick-bet-buttons {
    grid-template-columns: repeat(4, 1fr);
}

/* Mobile: 2 columns */
@media (max-width: 768px) {
    .quick-bet-buttons {
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
    }
}
```

## Modal Optimization

### Mobile-Friendly Modal
```css
.modal-content {
    width: 90%;
    max-width: 500px;
}

@media (max-width: 768px) {
    .modal-content {
        width: 95%;
        max-width: 95vw;
        max-height: 85vh;
        overflow-y: auto;
    }
}
```

## Table Scrolling

### Horizontal Scroll for Tables
```css
.table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

@media (max-width: 768px) {
    .table {
        min-width: 700px; /* Maintains readability */
    }
}
```

## Common Patterns

### Hide Elements on Mobile
```css
/* Show on desktop, hide on mobile */
@media (max-width: 968px) {
    .desktop-only {
        display: none;
    }
}
```

### Stack Elements on Mobile
```css
.flex-container {
    display: flex;
    gap: 16px;
}

@media (max-width: 768px) {
    .flex-container {
        flex-direction: column;
    }
}
```

### Reduce Padding on Mobile
```css
.container {
    padding: 40px;
}

@media (max-width: 768px) {
    .container {
        padding: 20px;
    }
}

@media (max-width: 480px) {
    .container {
        padding: 16px;
    }
}
```

## Testing Checklist

When adding new features, test on:

### Viewports
- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone 12/13)
- [ ] 390px (iPhone 14)
- [ ] 414px (iPhone Plus models)
- [ ] 768px (iPad)
- [ ] 1024px (iPad Pro)

### Interactions
- [ ] All buttons are easily tappable (44px minimum)
- [ ] Form inputs don't cause zoom on focus
- [ ] Scrolling is smooth
- [ ] Modals fit within viewport
- [ ] Tables scroll horizontally if needed
- [ ] Touch feedback is visible

### Performance
- [ ] No layout shifts on load
- [ ] Animations run at 60fps
- [ ] Images are appropriately sized
- [ ] No horizontal scroll (except tables)

## CSS Variables

Use these CSS variables for consistency:

```css
:root {
    --bg-primary: #0f1419;
    --bg-secondary: #1a1f2e;
    --bg-card: #1e2432;
    --text-primary: #ffffff;
    --text-secondary: #a8b3c4;
    --accent-red: #e63946;
    --accent-green: #10b981;
    --accent-blue: #3b82f6;
    --border-color: #2d3748;
}
```

## Accessibility Tips

### ARIA Labels
```html
<button aria-label="Open menu">☰</button>
<button aria-label="Close menu">×</button>
```

### Focus Management
```css
button:focus-visible {
    outline: 2px solid var(--accent-red);
    outline-offset: 2px;
}
```

### Color Contrast
- Ensure minimum contrast ratio of **4.5:1** for normal text
- Ensure minimum contrast ratio of **3:1** for large text (18px+)

## Performance Tips

1. **Use CSS transforms** for animations (GPU accelerated):
   ```css
   transform: translateX(-100%); /* Good */
   left: -100%; /* Avoid - causes reflow */
   ```

2. **Minimize repaints**:
   ```css
   will-change: transform; /* Use sparingly */
   ```

3. **Optimize touch events**:
   ```javascript
   element.addEventListener('touchstart', handler, { passive: true });
   ```

## Common Issues and Solutions

### Issue: Input zoom on iOS
**Solution**: Use font-size >= 16px for inputs

### Issue: Sticky hover states on mobile
**Solution**: Use `@media (hover: hover)` for hover styles

### Issue: 100vh includes URL bar on mobile
**Solution**: Use `min-height: 100vh` or JavaScript to calculate actual height

### Issue: Click delay on iOS
**Solution**: Use `touch-action: manipulation`

## Version Control

When making mobile changes:
1. Test on actual devices, not just browser DevTools
2. Document breakpoint changes
3. Update this guide if adding new patterns
4. Check performance impact
5. Verify accessibility

## Resources

- [MDN Web Docs - Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Web.dev - Mobile Best Practices](https://web.dev/mobile/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design - Touch Targets](https://material.io/design/usability/accessibility.html#layout-typography)

