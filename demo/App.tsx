import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DeviceSelectorModal } from "../src";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Media Device Selector Demo</h1>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          marginBottom: "20px",
          cursor: "pointer",
        }}
      >
        Open Device Selector
      </button>

      <DeviceSelectorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectionComplete={(devices) => {
          if (videoRef.current && devices.cameraId) {
            navigator.mediaDevices
              .getUserMedia({ video: { deviceId: devices.cameraId } })
              .then((stream) => {
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                }
              });
          }
          setIsOpen(false);
        }}
        targetMediaRef={videoRef}
        showCameraPreview={true}
        includeCamera={true}
      />

      <div style={{ marginTop: "20px" }}>
        <h2>Camera Preview:</h2>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            maxWidth: "100%",
            border: "1px solid #ccc",
            borderRadius: "4px",
            backgroundColor: "#f5f5f5",
            minHeight: "240px",
          }}
        />
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
