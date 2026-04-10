# Background Removal & Mockup Feature

## Overview
Added AI-powered background removal functionality to create professional product mockups from camera-captured images.

## Features Implemented

### 1. Fixed Camera Capture
- **Issue**: CameraCaptureModal was passing image data incorrectly
- **Solution**: Fixed the callback to pass the uploaded URL string instead of expecting a Blob
- **Component**: `CameraCaptureModal.tsx` now properly uploads and returns image URLs

### 2. Background Removal for Captured Photos
When taking a photo with the camera, users now have two options:
- **Remove Background (Make Mockup)**: Uses AI to remove the background and create a transparent mockup
- **Keep Background**: Upload the image as-is with the background

**Implementation**:
- New AI flow: `background-removal-flow.ts` using remove.bg API
- Added button with gradient styling (purple to pink) to highlight the feature
- Shows loading state during background removal
- Automatic upload of background-removed image to ImgBB

### 3. Background Removal for Existing Images
Each product image in the gallery now has a **magic wand button** (✨) that:
- Removes background from existing product images
- Creates professional mockups
- Replaces the original image in the gallery
- Works for both primary and gallery images

## Technical Details

### Background Removal API
- **Service**: remove.bg API
- **Environment Variable**: `REMOVE_BG_API_KEY` (must be set in .env)
- **Supported Formats**: PNG, JPG, and other image formats
- **Output**: Transparent PNG with background removed

### Integration Points
1. **CameraCaptureModal** (`src/components/media/CameraCaptureModal.tsx`)
   - Added `removeBackgroundFromImage` function
   - Updated UI with two-button layout after capture
   - Primary button: "Remove Background (Make Mockup)"
   - Secondary buttons: "Retake" and "Keep Background"

2. **ProductImageGallery** (`src/components/inventory/ProductImageGallery.tsx`)
   - Added `handleRemoveBackground` function for existing images
   - Added magic wand button to each image card
   - Button styled with gradient (purple to pink)
   - Properly updates gallery state after background removal

3. **Background Removal Flow** (`src/ai/flows/background-removal-flow.ts`)
   - Server action using Genkit AI framework
   - Handles base64 encoding/decoding
   - Calls remove.bg API
   - Returns data URI of processed image

## Usage

### For New Photos
1. Click camera icon in ProductImageGallery
2. Take photo with camera
3. Choose "Remove Background (Make Mockup)" for professional mockup
4. Or choose "Keep Background" for standard image

### For Existing Images
1. Hover over any product image in the gallery
2. Click the magic wand button (✨)
3. Wait for AI to remove background
4. Image is automatically replaced in gallery

## Configuration

### Required Environment Variable
Add to `.env` file:
```
REMOVE_BG_API_KEY=your_remove_bg_api_key_here
```

### API Key Setup
1. Get API key from: https://www.remove.bg/api
2. Free tier: 50 credits/month
3. Add to Firestore settings or environment variable

## Error Handling
- If API key is not configured, shows appropriate error message
- Handles network errors gracefully
- Shows loading state during processing
- Reverts to original image on failure

## Benefits
1. **Professional Mockups**: Create clean, transparent product images
2. **Time Saving**: No need for manual photo editing
3. **Consistency**: All product images have uniform look
4. **Flexibility**: Use background or mockup as needed
5. **Quality**: AI-powered accurate background detection

## Future Enhancements
- Batch background removal for multiple images
- Custom background replacement
- Background templates (studio, gradient, etc.)
- Background removal quality settings
- Preview before applying changes
