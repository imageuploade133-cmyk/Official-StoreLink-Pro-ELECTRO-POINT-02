'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Camera, Zap, X, Check } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import Html5QrcodeScanner, { Html5QrcodeSupportedFormats, Html5Qrcode } from 'html5-qrcode';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string) => void;
}

export function CameraScannerModal({ isOpen, onClose, onBarcodeScanned }: CameraScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      initScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [isOpen]);

  const initScanner = async () => {
    try {
      setIsScanning(true);
      setError(null);

      const scanner = new Html5QrcodeScanner(
        'scanner-container',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.QR_CODE]
        },
        false
      );

      scannerRef.current = scanner;

      scanner.render(
        undefined,
        (decodedText) => {
          setScannedCode(decodedText);
          toast({
            title: 'Barcode Scanned!',
            description: `Code: ${decodedText}`,
            action: (
              <ToastAction altText="Confirm" onClick={() => {
                onBarcodeScanned(decodedText);
                onClose();
              }}>Use Code</ToastAction>
            ),
          });
          stopScanner();
        },
        (err) => {
          if (err?.includes('Permission denied')) {
            setHasPermission(false);
            setError('Camera access denied. Please enable camera permissions.');
          }
        }
      );

      // Check camera availability
      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length === 0) {
        setError('No cameras found. Please check device connection.');
      } else {
        setHasPermission(true);
      }
    } catch (e: any) {
      setError(e?.message || 'Scanner initialization failed');
      toast({ variant: 'destructive', title: 'Scanner Error', description: e?.message });
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleRetry = () => {
    setError(null);
    initScanner();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 font-black">
            <Camera className="h-6 w-6" />
            Live Barcode Scanner
          </DialogTitle>
          <DialogDescription className="text-sm">
            Point camera at barcode. Supports EAN-13, Code128, QR. Works on mobile too.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 p-6 overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
              <Camera className="h-20 w-20 text-muted-foreground opacity-30" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-destructive">{error}</h3>
                <p className="text-sm text-muted-foreground mb-6">Camera access required for scanning.</p>
              </div>
              <Button onClick={handleRetry} className="gap-2">
                <Zap className="h-4 w-4" />
                Retry Scanner
              </Button>
              <div className="text-xs text-muted-foreground">
                <p>• Enable camera in browser settings</p>
                <p>• HTTPS required on desktop</p>
                <p>• Works on mobile Safari/Chrome</p>
              </div>
            </div>
          ) : isScanning ? (
            <div id="scanner-container" className="w-full h-[400px] md:h-[500px] rounded-xl overflow-hidden shadow-2xl border-4 border-primary/20" />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-bold mb-2">Initializing Scanner...</p>
                <p className="text-sm">Please wait while we access your camera.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-0 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          {scannedCode && (
            <Button 
              className="flex-1 gap-2 font-bold" 
              onClick={() => {
                onBarcodeScanned(scannedCode);
                onClose();
              }}
            >
              <Check className="h-4 w-4" />
              Use {scannedCode.substring(0, 12)}...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

