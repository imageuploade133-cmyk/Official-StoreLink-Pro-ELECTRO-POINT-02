# Camera Capture & Background Removal Features

## Overview
This document describes the camera capture and AI-powered background removal features for creating professional product mockups in StoreLink Pro.

## Features

### 1. Camera Product Photo Capture
- **Location**: Product form in inventory management
- **Access**: Click the camera icon button next to "Import Media" button
- **Functionality**:
  - Opens camera modal with rear camera on mobile devices
  - Captures high-quality product photos
  - Automatically optimizes and compresses images
  - Uploads to ImgBB image hosting

### 2. AI Background Removal (Mockup Creation)
Two ways to remove backgrounds:

#### Option A: When Taking a New Photo
1. Click camera icon to open CameraCaptureModal
2. Take photo of your product
3. Choose **"Remove Background (Make Mockup)"** button
4. AI automatically removes background
5. Transparent mockup is uploaded to gallery

#### Option B: For Existing Images
1. Hover over any product image in the gallery
2. Click the **magic wand button (✨)** with purple-pink gradient
3. AI processes and removes background
4. Original image is replaced with mockup

## Technical Implementation

### Files Modified/Created

#### New Files
1. **`src/ai/flows/background-removal-flow.ts`**
   - Server action for remove.bg API integration
   - Handles base64 image processing
   - Returns transparent PNG as data URI

2. **`src/ai/flows/index.ts`**
   - Exports all AI flow functions
   - Provides type exports for TypeScript

3. **`TODO-BackgroundRemoval.md`**
   - Documentation of background removal feature

#### Modified Files
1. **`src/components/media/CameraCaptureModal.tsx`**
   - Added `removeBackgroundFromImage` function
   - Updated UI with dual-button layout
   - Gradient button for background removal
   - Fixed callback to pass URL string

2. **`src/components/inventory/ProductImageGallery.tsx`**
   - Added `handleRemoveBackground` for existing images
   - Added magic wand button to each image card
   - Fixed image callback handling
   - Purple-pink gradient button styling

## Configuration

### Required Environment Variable
Add to `.env` file:
```bash
REMOVE_BG_API_KEY=your_api_key_here
```

### Getting API Key
1. Visit: https://www.remove.bg/api
2. Sign up for free account (50 credits/month)
3. Copy API key from dashboard
4. Add to environment variables

### API Usage
- **Free Tier**: 50 credits/month
- **Each removal**: 1 credit
- **Supported formats**: PNG, JPG, WEBP
- **Output**: Transparent PNG

## User Flow

### New Product Photo
```
1. User clicks camera icon
   ↓
2. Camera modal opens
   ↓
3. User takes photo
   ↓
4. Choose: Remove Background OR Keep Background
   ↓
5. Image is processed and uploaded
   ↓
6. Added to product gallery
```

### Existing Image Background Removal
```
1. User hovers over image in gallery
   ↓
2. Click magic wand button (✨)
   ↓
3. API removes background
   ↓
4. Image is replaced in gallery
   ↓
5. User can continue or retake
```

## UI Components

### CameraCaptureModal
- **Rear camera** auto-selected on mobile
- **Video preview** with capture button
- **After capture**:
  - Preview of captured image
  - "Remove Background (Make Mockup)" - Gradient purple-pink button
  - "Keep Background" - Outline button
  - "Retake" - Outline button

### ProductImageGallery
- Each image has **3 buttons** on hover:
  - **Magic wand (✨)** - Purple-pink gradient - Remove background
  - **Maximize** - Preview full size
  - **Trash** - Delete image

## Error Handling

### Camera Errors
- **Permission denied**: User prompted to enable camera
- **No camera found**: Shows appropriate message
- **Capture failed**: Allows retry

### Background Removal Errors
- **API key not configured**: Shows error message
- **API rate limit**: Displays appropriate warning
- **Network error**: Shows error with retry option
- **Processing failure**: Shows error, original image preserved

## Benefits

### For Merchants
1. **Professional mockups** without manual editing
2. **Time saving** - AI does the work
3. **Consistent look** across all products
4. **Flexible** - Use with or without background
5. **Easy to use** - One-click operation

### For Customers
1. **Clean product images**
2. **Better visualization** of products
3. **Professional appearance**
4. **Transparent backgrounds** for web use

## Performance

### Image Optimization
- Automatic compression before upload
- Configurable quality settings
- Max width resizing
- JPEG format for web

### Processing Time
- Camera capture: Instant
- Background removal: 2-5 seconds
- Upload time: Depends on image size

## Best Practices

1. **Good Lighting**: Ensure product is well-lit
2. **Contrast**: Product should contrast with background
3. **Clear Focus**: Keep product in sharp focus
4. **Simple Background**: Makes AI removal easier
5. **Test First**: Try with test images first

## Troubleshooting

### Camera Not Working
- Check browser permissions
- Ensure HTTPS (required for camera access)
- Try different browser

### Background Removal Fails
- Verify API key is set
- Check API credits remaining
- Ensure image format is supported
- Try with a different image

### Upload Fails
- Check ImgBB API key in settings
- Verify internet connection
- Check image size limits

## Future Enhancements

Planned improvements:
1. Batch background removal
2. Custom background templates
3. Background color replacement
4. Quality settings (preview vs final)
5. Undo/redo functionality
6. Compare original vs processed
7. Advanced editing tools

## Support

For issues or questions:
- Check TODO-BackgroundRemoval.md for details
- Review API documentation at remove.bg
- Check browser console for errors
