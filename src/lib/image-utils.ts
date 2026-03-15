
'use client';

/**
 * Client-side image compression and resizing utility.
 * Helps reduce bandwidth usage and storage costs by normalizing images before upload.
 */
export async function compressAndResizeImage(
  dataUri: string, 
  quality: number = 80, 
  maxWidth: number = 1920
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Basic validation
    if (!dataUri || !dataUri.startsWith('data:image/')) {
        resolve(dataUri);
        return;
    }

    const img = new window.Image();
    img.src = dataUri;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions if necessary
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context for image optimization.'));
        return;
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw original image to canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG for robust quality control across all browsers
      // (Even if original was PNG, conversion to JPEG is best for web compression)
      const compressedDataUri = canvas.toDataURL('image/jpeg', quality / 100);
      resolve(compressedDataUri);
    };

    img.onerror = (err) => {
        console.error("Image loading error for compression:", err);
        reject(new Error('Failed to load image for optimization.'));
    };
  });
}
