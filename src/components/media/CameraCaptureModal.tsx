'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 font-black">
            <Camera className="h-6 w-6" />
            Capture Product Photo
          </DialogTitle>
          <DialogDescription className="text-sm">
            Take a clear photo of your product. Rear camera auto-selected on mobile. Remove background to create professional mockups.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
              <Camera className="h-20 w-20 text-muted-foreground opacity-30" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-destructive">{error}</h3>
                <p className="text-sm text-muted-foreground mb-6">Camera permission needed for photo capture.</p>
              </div>
              <Button onClick={startCamera} className="gap-2">
                <Zap className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : capturedImage ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
              <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-primary/20">
                <img 
                  src={capturedImage} 
                  alt="Captured product" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-bold text-muted-foreground">Perfect capture!</p>
                <p className="text-xs text-muted-foreground">Choose how to process your product image.</p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <Button 
                  className="w-full gap-2 font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
                  onClick={removeBackgroundFromImage} 
                  disabled={isUploading}
                >
                  {isUploading ? <Circle className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Remove Background (Make Mockup)
                </Button>
                <div className="flex gap-3 w-full">
                  <Button variant="outline" onClick={retakePhoto} className="flex-1 gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Retake
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2 font-bold" 
                    onClick={uploadCapturedImage} 
                    disabled={isUploading}
                  >
                    {isUploading ? <Circle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Keep Background
                  </Button>
                </div>
              </div>
            </div>
          ) : isCapturing ? (
            <div className="relative h-[400px] md:h-[500px] rounded-xl overflow-hidden shadow-2xl border-4 border-primary/20">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover"
                playsInline 
                muted
              />
              <div className="absolute inset-0 flex items-end justify-center p-8 pointer-events-none">
                <div className="w-48 h-48 border-4 border-white/30 rounded-2xl bg-white/10 backdrop-blur-sm animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Circle 
                    className="h-24 w-24 text-white/80 animate-ping" 
                    strokeWidth={1}
                  />
                </div>
              </div>
              <Button
                onClick={capturePhoto}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 h-20 w-20 rounded-full bg-white/90 hover:bg-white shadow-2xl border-4 border-white/50 text-primary font-black text-xl shadow-lg active:scale-95 transition-all"
              >
                <Camera className="h-8 w-8" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-bold mb-2">Starting Camera...</p>
                <p className="text-sm">Initializing rear camera.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-0 border-t">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1"
            disabled={isUploading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

