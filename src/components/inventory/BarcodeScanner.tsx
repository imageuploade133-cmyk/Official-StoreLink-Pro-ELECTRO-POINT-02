'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Camera, 
  Zap, 
  ZapOff, 
  X, 
  Loader2, 
  RefreshCw 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [cameras, setCameras] = useState<{id: string, label: string}[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isRepeatMode, setIsRepeatMode] = useState(false);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  const playSuccessSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn('Failed to play success sound:', e);
    }
  }, []);

  const vibrate = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    setIsInitializing(true);
    setError(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);
      
      if (devices && devices.length > 0) {
        // Prefer back camera
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
        const cameraId = backCamera ? backCamera.id : devices[0].id;
        setSelectedCameraId(cameraId);
        
        const html5QrCode = new Html5Qrcode("scanner-viewport");
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          cameraId,
          {
            fps: 20,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE,
            ]
          },
          (decodedText) => {
            playSuccessSound();
            vibrate();
            onScan(decodedText);
            if (!isRepeatMode) {
              onClose();
            } else {
              toast({
                title: "Scanned",
                description: `Code: ${decodedText}`,
                duration: 1000,
              });
            }
          },
          () => {
            // Error callback - ignore to avoid spamming
          }
        );

        setIsInitializing(false);

        // Check for flashlight support
        try {
            const track = html5QrCode.getRunningTrack();
            const capabilities = track.getCapabilities() as any;
            if (capabilities.torch) {
              setHasFlash(true);
            }
        } catch (e) {
            console.log("Flashlight not supported", e);
        }
      } else {
        setError("No cameras found.");
        setIsInitializing(false);
      }
    } catch (err: any) {
      console.error("Failed to start scanner:", err);
      setError(err.message || "Could not access camera.");
      setIsInitializing(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
    }
    setIsFlashOn(false);
    setHasFlash(false);
  };

  const toggleFlash = async () => {
    if (html5QrCodeRef.current && hasFlash) {
      const newFlashState = !isFlashOn;
      try {
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: newFlashState }] as any
        });
        setIsFlashOn(newFlashState);
      } catch (err) {
        console.error("Failed to toggle flash:", err);
        toast({
          variant: "destructive",
          title: "Flash Error",
          description: "Could not toggle flashlight."
        });
      }
    }
  };

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCameraId = cameras[nextIndex].id;
    
    await stopScanner();
    setSelectedCameraId(nextCameraId);
    
    // Start again with new camera
    setIsInitializing(true);
    try {
        const html5QrCode = new Html5Qrcode("scanner-viewport");
        html5QrCodeRef.current = html5QrCode;
        await html5QrCode.start(
          nextCameraId,
          {
            fps: 20,
            qrbox: { width: 250, height: 150 },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.QR_CODE,
              ]
          },
          (decodedText) => {
            playSuccessSound();
            vibrate();
            onScan(decodedText);
            if (!isRepeatMode) {
              onClose();
            } else {
              toast({
                title: "Scanned",
                description: `Code: ${decodedText}`,
                duration: 1000,
              });
            }
          },
          () => {}
        );
        setIsInitializing(false);
        try {
            const track = html5QrCode.getRunningTrack();
            const capabilities = track.getCapabilities() as any;
            setHasFlash(!!capabilities.torch);
        } catch (e) {
            setHasFlash(false);
        }
    } catch (err: any) {
        setError(err.message || "Failed to switch camera.");
        setIsInitializing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none bg-black rounded-3xl">
        <DialogHeader className="p-6 pb-2 absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent text-white">
          <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
            <Camera className="h-6 w-6 text-primary" />
            Barcode Scanner
          </DialogTitle>
          <DialogDescription className="text-gray-300 font-medium">
            Scan any product barcode or QR code.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full aspect-[4/5] bg-black flex items-center justify-center">
          {isInitializing && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-white font-bold animate-pulse">Initializing Camera...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black p-8 text-center gap-6">
              <div className="p-4 bg-destructive/10 rounded-full">
                <X className="h-12 w-12 text-destructive" />
              </div>
              <div>
                <h3 className="text-white font-black text-xl mb-2">Access Denied</h3>
                <p className="text-gray-400 text-sm">{error}</p>
              </div>
              <Button onClick={startScanner} className="rounded-full px-8 py-6 font-bold text-lg">
                <RefreshCw className="h-5 w-5 mr-2" />
                Retry Access
              </Button>
            </div>
          )}

          <div id="scanner-viewport" className="w-full h-full object-cover" />

          {/* Scanner UI Overlay */}
          {!error && !isInitializing && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Scanning Frame */}
                <div className="relative w-64 h-40 border-2 border-white/20 rounded-2xl">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl" />
                    
                    {/* Scanning Line Animation */}
                    <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-primary shadow-[0_0_15px_hsl(var(--primary))] animate-scan-move" />
                </div>
                <p className="mt-8 text-white/70 font-bold uppercase tracking-widest text-[10px] bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
                    Position barcode within frame
                </p>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6 z-50">
            {hasFlash && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleFlash}
                className={cn(
                  "h-14 w-14 rounded-full border-2 transition-all duration-300",
                  isFlashOn ? "bg-primary border-primary text-white shadow-lg shadow-primary/40" : "bg-black/40 border-white/20 text-white hover:bg-black/60"
                )}
              >
                {isFlashOn ? <Zap className="h-6 w-6" /> : <ZapOff className="h-6 w-6" />}
              </Button>
            )}

            {cameras.length > 1 && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={switchCamera}
                className="h-14 w-14 rounded-full border-2 bg-black/40 border-white/20 text-white hover:bg-black/60"
              >
                <RefreshCw className="h-6 w-6" />
              </Button>
            )}

            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsRepeatMode(!isRepeatMode)}
              className={cn(
                "h-14 w-14 rounded-full border-2 transition-all duration-300",
                isRepeatMode ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/40" : "bg-black/40 border-white/20 text-white hover:bg-black/60"
              )}
              title="Fast Repeated Scanning"
            >
              <RefreshCw className={cn("h-6 w-6", isRepeatMode && "animate-spin-slow")} />
            </Button>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={onClose}
              className="h-14 w-14 rounded-full border-2 bg-black/40 border-white/20 text-white hover:bg-destructive hover:border-destructive transition-colors"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
