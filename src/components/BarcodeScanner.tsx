import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import type { AIFoodResult } from '../lib/types';
import { lookupBarcode } from '../lib/barcode';

interface Props {
  onResult: (result: AIFoodResult, barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [status, setStatus] = useState<'scanning' | 'found' | 'not_found' | 'error'>('scanning');
  const [foundCode, setFoundCode] = useState('');

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();

    reader.decodeFromVideoDevice(undefined, videoRef.current!, async (result, _err, controls) => {
      controlsRef.current = controls;
      if (!result) return;
      const code = result.getText();
      if (code === foundCode) return;

      setFoundCode(code);
      setStatus('found');
      controls.stop();

      const product = await lookupBarcode(code);
      if (product) {
        onResult(product, code);
      } else {
        setStatus('not_found');
      }
    });

    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  const handleRetry = () => {
    setStatus('scanning');
    setFoundCode('');
    controlsRef.current = null;
    const reader = new BrowserMultiFormatReader();
    reader.decodeFromVideoDevice(undefined, videoRef.current!, async (result, _err, controls) => {
      controlsRef.current = controls;
      if (!result) return;
      const code = result.getText();
      setFoundCode(code);
      setStatus('found');
      controls.stop();
      const product = await lookupBarcode(code);
      if (product) {
        onResult(product, code);
      } else {
        setStatus('not_found');
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-10 pb-4 bg-black/60 absolute top-0 left-0 right-0 z-10">
        <h2 className="text-white font-bold text-lg">Scan Barcode</h2>
        <button onClick={onClose} className="text-white text-2xl w-10 h-10 flex items-center justify-center">✕</button>
      </div>

      {/* Video */}
      <video ref={videoRef} className="w-full h-full object-cover" />

      {/* Overlay frame */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-72 h-40 relative">
          <div className="absolute inset-0 border-2 border-white/30 rounded-xl" />
          {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-6 h-6`}>
              <div className={`absolute bg-emerald-400 ${i < 2 ? 'top-0' : 'bottom-0'} left-0 right-0 h-0.5`} />
              <div className={`absolute bg-emerald-400 ${i % 2 === 0 ? 'left-0' : 'right-0'} top-0 bottom-0 w-0.5`} />
            </div>
          ))}
          {status === 'scanning' && (
            <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 opacity-80 animate-bounce top-1/2" />
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        {status === 'scanning' && (
          <p className="text-white text-center text-sm">Point camera at a barcode</p>
        )}
        {status === 'found' && (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-sm">Looking up product...</p>
          </div>
        )}
        {status === 'not_found' && (
          <div className="text-center">
            <p className="text-red-300 text-sm mb-3">Product not found in database</p>
            <button
              onClick={handleRetry}
              className="bg-white text-gray-800 px-6 py-2 rounded-xl text-sm font-semibold"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
