'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Camera, Zap, X, Check } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5Qrcode } from 'html5-qrcode';

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
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h flex flex-col rounded-none border-none mt-0">
        <DrawerHeader className="p-6 pb-4 border-b shrink-0">
          <DrawerTitle className="flex items-center gap-3 font-black text-2xl">
            <Camera className="h-8 w-8 text-primary" />
            Live Barcode Scanner
          </DrawerTitle>
          <DrawerDescription className="text-sm">
            Point camera at barcode. Supports EAN-13, Code128, QR.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 p-4 overflow-hidden bg-black/5 flex flex-col justify-center">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8 bg-background rounded-3xl ">
              <Camera className="h-20 w-20 text-muted-foreground opacity-30" />
              <div>
                <h3 className="font-bold text-lg mb-2 text-destructive">{error}</h3>
                <p className="text-sm text-muted-foreground mb-6">Camera access required for scanning.</p>
              </div>
              <Button onClick={handleRetry} className="gap-2 px-8 py-6 rounded-full text-lg font-bold">
                <Zap className="h-5 w-5" />
                Retry Scanner
              </Button>
            </div>
          ) : isScanning ? (
            <div className="relative w-full aspect max-h md:max-h-none md:flex-1 rounded-3xl overflow-hidden  border-4 border-primary/20">
              <div id="scanner-container" className="w-full h-full" />
              <div className="absolute inset-0 border-2 border-primary/30 pointer-events-none rounded-3xl">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-primary animate-pulse rounded-lg" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground bg-background rounded-3xl">
              <div className="text-center">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-30 animate-bounce" />
                <p className="text-lg font-bold mb-2">Initializing Scanner...</p>
                <p className="text-sm">Please wait while we access your camera.</p>
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="p-6 pt-4 border-t flex flex-row gap-3 bg-background shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 h-14 rounded-2xl font-bold text-lg">
            <X className="h-5 w-5 mr-2" />
            Close
          </Button>
          {scannedCode && (
            <Button 
              className="flex-1 h-14 rounded-2xl gap-2 font-black text-lg  " 
              onClick={() => {
                onBarcodeScanned(scannedCode);
                onClose();
              }}
            >
              <Check className="h-5 w-5" />
              Use Code
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

