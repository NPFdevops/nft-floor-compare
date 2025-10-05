# Swap Button Color Change

## Change Made

### **Updated Swap Button Color to #E3579A**
- ✅ **Background Color**: Changed from white (`bg-white`) to custom pink (`#E3579A`)
- ✅ **Text Color**: Changed from black (`text-black`) to white (`text-white`) for proper contrast
- ✅ **Hover State**: Added darker pink hover color (`#D1477C`) for better interaction feedback
- ✅ **Styling Method**: Used inline styles for precise color control

## Implementation Details

### **Button Styling**
```jsx
<button
  onClick={handleSwapCollections}
  className="flex items-center gap-2 px-4 py-2 border-2 border-black rounded-none text-sm font-bold text-white hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
  style={{ 
    backgroundColor: '#E3579A',
    transition: 'background-color 0.2s ease, transform 0.2s ease'
  }}
  onMouseEnter={(e) => e.target.style.backgroundColor = '#D1477C'}
  onMouseLeave={(e) => e.target.style.backgroundColor = '#E3579A'}
  title="Swap collections"
>
```

### **Color Palette**
- **Primary**: `#E3579A` (Bright pink/magenta)
- **Hover**: `#D1477C` (Darker pink for hover state)
- **Text**: `#FFFFFF` (White for high contrast)
- **Border**: `#000000` (Black, maintaining brutalist design)

## Visual Impact

### Before
- White background with black text
- Gray hover state
- Standard button appearance

### After
- **Vibrant pink background** with white text
- **Darker pink hover state** for clear interaction feedback
- **Eye-catching accent** that draws attention to the swap functionality
- **High contrast** ensuring accessibility

## Design Benefits

1. **Visual Prominence**: The pink color makes the swap button more noticeable
2. **Brand Consistency**: Uses a custom brand color instead of generic styling
3. **Better UX**: Clear visual indication of an interactive element
4. **Accessibility**: White text on pink background maintains good contrast ratio
5. **Distinctive**: Stands out from other interface elements

## Preserved Functionality
- ✅ All button interactions work identically
- ✅ Hover and focus states maintained
- ✅ Scale animation on hover preserved
- ✅ Accessibility features intact
- ✅ Responsive text behavior unchanged

The swap button now has a distinctive pink color (#E3579A) that makes it more prominent and visually appealing while maintaining all its functionality!