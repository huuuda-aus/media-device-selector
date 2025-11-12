import React from "react";
import { createRoot } from "react-dom/client";
import DeviceSelectorModal from "../src/components/DeviceSelectorModal";

// Control camera inclusion via state instead of a constant
const DemoIncludeCameraDefault = true;

function Demo() {
  const [isOpen, setIsOpen] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [includeCamera, setIncludeCamera] = React.useState(
    DemoIncludeCameraDefault,
  );

  const handleSelectionComplete = (devices: any) => {
    if (videoRef.current && devices.cameraId) {
      navigator.mediaDevices
        .getUserMedia({ video: { deviceId: devices.cameraId } })
        .then((stream) => {
          videoRef.current!.srcObject = stream;
        });
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Media Device Selector Demo</h1>

<p>
  <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <input
      type="checkbox"
      checked={includeCamera}
      onChange={(e) => setIncludeCamera(e.target.checked)}
      style={{ zoom: 1.6 }}
    />
    <span>Include Camera</span>
  </label>
</p>

      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
          marginBottom: "20px",
        }}
      >
        Select Devices
      </button>

      <DeviceSelectorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectionComplete={handleSelectionComplete}
        targetMediaRef={videoRef}
        showCameraPreview={includeCamera}
        includeCamera={includeCamera}
      />

      {includeCamera && (
        <div style={{ marginTop: "20px", maxWidth: "400px" }}>
          <h2>Camera Preview:</h2>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              maxWidth: "100%",
              border: "1px solid #ccc",
              borderRadius: "4px",
              background: "#000",
            }}
          />
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<Demo />);
