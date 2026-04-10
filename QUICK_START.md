# Quick Start Guide: Camera & Background Removal

## Setup (One-Time)

### 1. Get API Key
- Visit: https://www.remove.bg/api
- Sign up (free)
- Copy your API key

### 2. Add to Environment
Add to `.env` file:
```bash
REMOVE_BG_API_KEY=your_key_here
```

### 3. Restart Server
```bash
npm run dev
```

## How to Use

### Capture New Product Photo with Background Removal
1. Go to: Dashboard → Inventory → Add Product
2. Click camera icon (📷) next to "Import Media"
3. Take photo of product
4. Click "Remove Background (Make Mockup)" button
5. Wait 2-5 seconds
6. Done! Transparent mockup is in your gallery

### Remove Background from Existing Image
1. Go to any product edit page
2. Hover over any image in gallery
3. Click magic wand button (✨) - purple-pink gradient
4. Wait for processing
5. Image is automatically replaced with mockup

### Upload Photo Without Background Removal
1. Capture photo with camera
2. Click "Keep Background" instead
3. Or use "Import Media" to upload existing files

## Button Guide

### CameraCaptureModal (After Capturing)
- **🪄 Remove Background (Make Mockup)** - Purple gradient, creates transparent PNG
- **↺ Retake** - Take photo again
- **✓ Keep Background** - Upload as-is

### ProductImageGallery (Image Buttons on Hover)
- **🪄 Magic Wand (✨)** - Purple-pink gradient, remove background
- **⤢ Maximize** - Preview full size
- **🗑️ Trash** - Delete image

## Tips for Best Results

1. **Good Lighting** - Ensure product is well-lit
2. **Contrast** - Product should contrast with background
3. **Focus** - Keep product in sharp focus
4. **Simple Background** - Easier for AI to remove
5. **Test First** - Try with test images

## Troubleshooting

### Camera Not Working?
- Check browser camera permissions
- Ensure using HTTPS (required)
- Try different browser

### Background Removal Fails?
- Verify API key is set in .env
- Check remaining credits at remove.bg
- Try different image

### Button Not Appearing?
- Ensure image is uploaded (hover over it)
- Check if disabled (isUploading state)
- Refresh page and try again

## API Credits

- **Free Tier**: 50 credits/month
- **Cost**: 1 credit per image
- **Check Balance**: https://www.remove.bg/dashboard
- **Upgrade**: Available for higher volume

## Support

- Full Guide: See `CAMERA_AND_BG_REMOVAL.md`
- Implementation: See `IMPLEMENTATION_SUMMARY.md`
- Feature Docs: See `TODO-BackgroundRemoval.md`
