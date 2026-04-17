'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Camera, Image, Zap, X, Check, RotateCcw, Circle, Wand2, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { compressAndResizeImage } from '@/lib/image-utils';
import { useSettings } from '@/contexts/settings-context';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCaptured: (imageUrl: string) => void;
}

export function CameraCaptureModal({ isOpen, onClose, onImageCaptured }: CameraCaptureModalProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const { settings } = useSettings();

  const startCamera = useCallback(async () => {
    try {
      setIsCapturing(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasPermission(true);
      }
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError' 
        ? 'Camera access denied. Please enable permissions.' 
        : err.name === 'NotFoundError' 
        ? 'No camera found. Please check device.' 
        : err.message || 'Camera access failed';
      setError(msg);
      toast({ variant: 'destructive', title: 'Camera Error', description: msg });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageDataUri = canvas.toDataURL('image/jpeg', 0.85);

      // Optimize before upload
      const optimizedImage = await compressAndResizeImage(
        imageDataUri, 
        settings?.imageUploadQuality || 85, 
        settings?.imageMaxWidth || 1920
      );

      setCapturedImage(optimizedImage);
      stopCamera();
    }
  }, [stopCamera, settings]);

  const uploadCapturedImage = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    try {
      const result = await uploadImage({ imageDataUri: capturedImage });
      onImageCaptured(result.display_url);
      toast({ title: 'Product Photo Added', description: 'Image uploaded and optimized successfully.' });
      onClose();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const removeBackgroundFromImage = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    try {
      const { removeBackground } = await import('@/ai/flows/background-removal-flow');
      const result = await removeBackground({ imageDataUri: capturedImage });

      // Upload the background-removed image
      const uploadResult = await uploadImage({ imageDataUri: result.display_url });
      onImageCaptured(uploadResult.display_url);
      toast({ 
        title: 'Background Removed!', 
        description: 'Product mockup created and uploaded successfully.' 
      });
      onClose();
    } catch (err: any) {
      console.error('Background removal error:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Background Removal Failed', 
        description: err.message || 'Could not remove background. API key may not be configured.' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage, startCamera, stopCamera]);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h flex flex-col rounded-none border-none mt-0">
        <DrawerHeader className="p-6 pb-4 border-b shrink-0">
          <DrawerTitle className="flex items-center gap-3 font-black text-2xl">
            <Camera className="h-8 w-8 text-primary" />
            Capture Product Photo
          </DrawerTitle>
          <DrawerDescription className="text-sm">
            Take a clear photo of your product. Rear camera auto-selected.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 p-4 overflow-hidden flex flex-col justify-center bg-black/5">
          <canvas ref={canvasRef} className="hidden" />
          {error ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8 bg-background rounded-3xl ">
              <Camera className="h-20 w-20 text-muted-foreground opacity-30" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-destructive">{error}</h3>
                <p className="text-sm text-muted-foreground mb-6">Camera permission needed for photo capture.</p>
              </div>
              <Button onClick={startCamera} className="gap-2 px-8 py-6 rounded-full text-lg font-bold">
                <Zap className="h-5 w-5" />
                Try Again
              </Button>
            </div>
          ) : capturedImage ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
              <div className="relative w-full aspect-square max-w-sm rounded overflow-hidden  border-4 border-white">
                <img 
                  src={capturedImage} 
                  alt="Captured product" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-black text-primary uppercase tracking-widest">Perfect capture!</p>
                <p className="text-sm text-muted-foreground">Choose how to process your product image.</p>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-sm">
                <Button 
                  className="w-full h-16 gap-2 font-black text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-2xl  -500/20" 
                  onClick={removeBackgroundFromImage} 
                  disabled={isUploading}
                >
                  {isUploading ? <Circle className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                  Remove Background
                </Button>
                <div className="flex gap-3 w-full">
                  <Button variant="outline" onClick={retakePhoto} className="flex-1 h-14 gap-2 rounded-2xl font-bold border-2">
                    <RotateCcw className="h-5 w-5" />
                    Retake
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1 h-14 gap-2 font-bold rounded-2xl" 
                    onClick={uploadCapturedImage} 
                    disabled={isUploading}
                  >
                    {isUploading ? <Circle className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                    Keep Original
                  </Button>
                </div>
              </div>
            </div>
          ) : isCapturing ? (
            <div className="relative w-full aspect max-h md:max-h-none md:flex-1 rounded overflow-hidden  border-4 border-primary/20 bg-black">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover"
                playsInline 
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-white/20 rounded-3xl animate-pulse" />
              </div>
              <Button
                onClick={capturePhoto}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full bg-white hover:bg-white/90  border border-primary/20 flex items-center justify-center active:scale-90 transition-all group"
              >
                <div className="h-16 w-16 rounded-full border-4 border-primary/10 group-hover:border-primary/20 transition-all flex items-center justify-center">
                    <Camera className="h-10 w-10 text-primary" />
                </div>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground bg-background rounded-3xl">
              <div className="text-center">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-30 animate-bounce" />
                <p className="text-lg font-bold mb-2">Starting Camera...</p>
                <p className="text-sm">Initializing rear camera.</p>
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="p-6 pt-4 border-t bg-background shrink-0">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            className="w-full h-12 rounded-xl text-muted-foreground font-bold"
            disabled={isUploading}
          >
            <X className="h-5 w-5 mr-2" />
            Cancel and Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

