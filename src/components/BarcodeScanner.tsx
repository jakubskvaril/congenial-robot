import { useEffect, useRef, useState } from 'react';

interface BarcodeScannerProps {
  onResult: (ean: string) => void;
}

export function BarcodeScanner({ onResult }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [detected, setDetected] = useState('');
  const readerRef = useRef<unknown>(null);

  async function startScanner() {
    setError('');
    setActive(true);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      await reader.decodeFromVideoDevice(null, videoRef.current!, (result) => {
        if (result) {
          const text = result.getText();
          setDetected(text);
          reader.reset();
          setActive(false);
          onResult(text);
        }
      });
    } catch (err) {
      setError('Kamera není dostupná nebo nebyl udělen přístup.');
      setActive(false);
    }
  }

  function stopScanner() {
    if (readerRef.current) {
      (readerRef.current as { reset: () => void }).reset();
    }
    setActive(false);
  }

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div>
      {!active && !detected && (
        <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={startScanner}>
          📷 Spustit skener
        </button>
      )}
      {active && (
        <div style={{ position: 'relative' }}>
          <video ref={videoRef} style={{ width: '100%', borderRadius: 8 }} muted autoPlay playsInline />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{ border: '2px solid var(--gold)', width: 200, height: 100, borderRadius: 4 }} />
          </div>
          <button type="button" className="btn btn-ghost btn-sm"
            style={{ marginTop: 8, width: '100%' }} onClick={stopScanner}>
            Zastavit skener
          </button>
        </div>
      )}
      {detected && (
        <div style={{ background: 'var(--bg)', padding: 10, borderRadius: 8 }}>
          <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓ EAN: {detected}</span>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
