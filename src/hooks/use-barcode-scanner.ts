import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  scanTimeout?: number;
}

export function useBarcodeScanner({ 
  onScan, 
  enabled = true,
  scanTimeout = 100 
}: UseBarcodeScannerOptions) {
  const barcodeBuffer = useRef('');
  const lastKeystrokeTimeRef = useRef<number>(0);

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

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const activeElement = document.activeElement;
    const isTyping = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      (activeElement as HTMLElement).isContentEditable
    );
    
    const currentTime = Date.now();
    const timeSinceLastKey = currentTime - lastKeystrokeTimeRef.current;
    const isFast = timeSinceLastKey <= scanTimeout;

    if (event.key === 'Enter') {
      if (barcodeBuffer.current.length > 2) {
        const scannedBarcode = barcodeBuffer.current;
        barcodeBuffer.current = '';
        
        onScan(scannedBarcode);
        playSuccessSound();
        vibrate();
        
        // Always prevent default if we handled it as a barcode scan
        event.preventDefault();
        event.stopPropagation();
      } else {
        barcodeBuffer.current = '';
      }
      return;
    }

    if (event.key.length === 1) {
      // Logic for accumulating characters
      if (isTyping && !(activeElement as HTMLElement).hasAttribute('data-barcode-input')) {
        // In a regular input, only accumulate if it's fast
        if (isFast) {
          barcodeBuffer.current += event.key;
        } else {
          // Slow key in a regular input starts a new buffer, but it's likely just typing
          barcodeBuffer.current = event.key;
        }
      } else {
        // Not in an input or in a barcode-enabled input
        if (isFast || barcodeBuffer.current.length === 0) {
          barcodeBuffer.current += event.key;
        } else {
          barcodeBuffer.current = event.key;
        }
      }
      lastKeystrokeTimeRef.current = currentTime;
    }
  }, [enabled, onScan, playSuccessSound, vibrate, scanTimeout]);

  useEffect(() => {
    // Using capture phase to handle it before other listeners
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);

  return { playSuccessSound, vibrate };
}
