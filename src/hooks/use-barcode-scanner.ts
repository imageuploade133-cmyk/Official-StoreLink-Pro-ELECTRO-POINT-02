import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
}

export function useBarcodeScanner({ onScan, enabled = true }: UseBarcodeScannerOptions) {
  const barcodeBuffer = useRef('');
  const lastKeystrokeTimeRef = useRef<number>(0);
  const SCAN_TIMEOUT_MS = 50; // Typical barcode scanner speed

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

    // Ignore if user is typing in an input field (unless it's our designated barcode input)
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      (activeElement as HTMLElement).isContentEditable
    );
    
    // We only want to catch global barcode scans if not typing, 
    // OR if the active element has a specific data attribute
    if (isTyping && !(activeElement as HTMLElement).hasAttribute('data-barcode-input')) {
        return;
    }

    if (event.key === 'Enter') {
      if (barcodeBuffer.current.length > 2) {
        onScan(barcodeBuffer.current);
        playSuccessSound();
        vibrate();
        barcodeBuffer.current = '';
      }
    } else if (event.key.length === 1) {
      const currentTime = Date.now();
      if (currentTime - lastKeystrokeTimeRef.current > SCAN_TIMEOUT_MS) {
        barcodeBuffer.current = event.key;
      } else {
        barcodeBuffer.current += event.key;
      }
      lastKeystrokeTimeRef.current = currentTime;
    }
  }, [enabled, onScan, playSuccessSound, vibrate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { playSuccessSound, vibrate };
}
