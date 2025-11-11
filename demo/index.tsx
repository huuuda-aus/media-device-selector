import React from 'react';
import { createRoot } from 'react-dom/client';
import DeviceSelectorModal from '../src/components/DeviceSelectorModal';

const INCLUDE_CAMERA = true;

function Demo() {
  const [isOpen, setIsOpen] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleSelectionComplete = (devices: any) => {
    console.log('Selected devices:', devices);
    if (videoRef.current && devices.cameraId) {
      navigator.mediaDevices
        .getUserMedia({ video: { deviceId: devices.cameraId } })
        .then(stream => {
          videoRef.current!.srcObject = stream;
        });
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Media Device Selector Demo</h1>
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        Select Audio Devices
      </button>

      <DeviceSelectorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectionComplete={handleSelectionComplete}
        targetMediaRef={videoRef}
        showCameraPreview={INCLUDE_CAMERA}
        includeCamera={INCLUDE_CAMERA}
      />

      {INCLUDE_CAMERA && (
        <div style={{ marginTop: '20px' }}>
          <h2>Camera Preview:</h2>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{
              maxWidth: '100%',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Demo />);
