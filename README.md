# React Media Device Selector

[![npm version](https://badge.fury.io/js/react-media-device-selector.svg)](https://badge.fury.io/js/react-media-device-selector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Demo-Live%20Demo-blue)](https://huuuda-aus.github.io/media-device-selector/)

A lightweight, customizable React component for managing media devices (camera, microphone, and speakers) with a clean, accessible UI. Built with TypeScript and fully typed for a great developer experience.

## 🚀 Live Demo

Check out the [live demo](https://huuuda-aus.github.io/media-device-selector/) to see the component in action!

## 🌟 Client-Side Only

> **Important**: This is a client-side only component that requires browser APIs. It will throw an error if used in a server-side rendering (SSR) environment. See [Server-Side Rendering](#server-side-rendering) for usage in frameworks like Next.js.

## ✨ Features

- 🎥 List and select cameras, microphones, and speakers
- 🎨 Customizable modal interface
- 🎣 Standalone `useMediaDevices` hook for custom UIs
- 📱 Responsive design that works on all devices
- 🔍 Real-time device permission handling (camera permission excluded by default)
- 🔄 Automatic device refresh when hardware changes
- 🔊 Built-in speaker test with optional custom `testSound` (mp3/wav) and button auto-disable while playing
- 🎯 TypeScript support with full type definitions included in the package
- 🚫 Zero external UI dependencies
- 🛡️ Type-safe with comprehensive error handling
- 🌍 Environment detection and graceful degradation

## 📦 Installation

```bash
# Using npm
npm install react-media-device-selector

# Using yarn
yarn add react-media-device-selector

# Using pnpm
pnpm add react-media-device-selector
```

## 🚀 Basic Usage

```tsx
import { DeviceSelectorModal } from "react-media-device-selector";
import { useRef, useState } from "react";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleSelectionComplete = (selection: {
    cameraId: string | null;
    microphoneId: string | null;
    speakerId: string | null;
  }) => {
    if (videoRef.current && selection.cameraId) {
      navigator.mediaDevices
        .getUserMedia({ video: { deviceId: { exact: selection.cameraId } } })
        .then((stream) => {
          videoRef.current!.srcObject = stream;
        });
    }
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Select Devices</button>

      <DeviceSelectorModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectionComplete={handleSelectionComplete}
        targetMediaRef={videoRef}
        includeCamera={false}
        showCameraPreview={false}
      />

      <video ref={videoRef} autoPlay playsInline style={{ width: 400 }} />
    </div>
  );
}
```

## 🔧 API Reference

### DeviceSelectorModal props

- `isOpen: boolean` — controls visibility
- `onClose?: () => void` — called when modal requests close
- `onSelectionComplete: (selection: SelectedDevices) => void` — called on Confirm
- `targetMediaRef?: React.RefObject<HTMLMediaElement>` — used to route speaker output via `setSinkId`
- `showCameraPreview?: boolean` — default `true`
- `includeCamera?: boolean` — default `false` (mic-only permission prompt by default)
- `testSound?: string` — optional URL/module for custom speaker test audio
- `className?: string`
- `style?: React.CSSProperties`

### useMediaDevices hook

```ts
const {
  devices,                  // Flat list of devices
  deviceLists,              // { microphones, cameras, speakers }
  selectedDevices,          // { microphoneId, cameraId, speakerId }
  setSelectedDevices,       // React state setter
  selectDevice,             // (kind, deviceId) -> Promise<void>
  activeStream,             // MediaStream | null (for preview)
  permissionStatus,         // 'prompt' | 'granted' | 'denied' | 'not-supported'
  isLoading,                // boolean
  error,                    // Error | null
  isMediaDevicesSupported,  // boolean
} = useMediaDevices({ includeCamera?: boolean });
```

## 🔊 Speaker test sound

- Default behavior: built-in short tone sequence you can use to verify output.
- Custom sound: pass `testSound` (URL or imported asset) to play your own file.
  - With Vite or similar bundlers, you can import assets:
    ```tsx
    import testMp3 from "./assets/soundtest.mp3";

    <DeviceSelectorModal testSound={testMp3} />
    ```
  - Or place your file in the public folder and reference `/soundtest.mp3`.
- The Test button auto-disables while playing to prevent overlap.

## 🌟 Advanced Usage

### Custom Styling

You can style the modal by overriding the default CSS variables:

```css
:root {
  --rmds-background: #ffffff;
  --rmds-text: #333333;
  --rmds-primary: #4f46e5;
  --rmds-primary-hover: #4338ca;
  --rmds-border: #e5e7eb;
  --rmds-border-radius: 0.5rem;
  --rmds-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

### Using the Hook Without the Modal

```tsx
function CustomDeviceSelector() {
  const {
    devices: { videoInputs, audioInputs },
    selectedDevices,
    updateSelectedDevices,
    permissionStatus,
  } = useMediaDevices();

  if (permissionStatus === "denied") {
    return <div>Please enable camera and microphone permissions</div>;
  }

  return (
    <div>
      <h3>Select Camera</h3>
      <select
        value={selectedDevices.videoInput || ""}
        onChange={(e) => updateSelectedDevices({ videoInput: e.target.value })}
      >
        {videoInputs.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
          </option>
        ))}
      </select>

      {/* Add similar selects for audio devices */}
    </div>
  );
}
```

## 🖥️ Server-Side Rendering

This component is designed to work only in the browser. When using with server-side rendering frameworks like Next.js, you'll need to:

### Next.js App Router

```tsx
"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const DeviceSelectorModal = dynamic(
  () =>
    import("react-media-device-selector").then(
      (mod) => mod.DeviceSelectorModal,
    ),
  {
    ssr: false,
    loading: () => <div>Loading device selector...</div>,
  },
);

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DeviceSelectorModal
        isOpen={true}
        onClose={() => {}}
        onSelectionComplete={console.log}
      />
    </Suspense>
  );
}
```

### Next.js Pages Router

```tsx
import dynamic from "next/dynamic";

const DeviceSelectorModal = dynamic(
  () =>
    import("react-media-device-selector").then(
      (mod) => mod.DeviceSelectorModal,
    ),
  { ssr: false },
);

function HomePage() {
  return (
    <div>
      <h1>Device Selector Demo</h1>
      <DeviceSelectorModal
        isOpen={true}
        onClose={() => {}}
        onSelectionComplete={console.log}
      />
    </div>
  );
}

export default HomePage;
```

### Error Handling

For better error handling, you can use the `checkEnvironmentSupport` utility:

```tsx
import { checkEnvironmentSupport } from "react-media-device-selector";

function DeviceSelectorWrapper() {
  const env = checkEnvironmentSupport();

  if (!env.isBrowser) {
    return <div>This component only works in the browser</div>;
  }

  if (env.error) {
    return <div>Media devices not supported: {env.error.message}</div>;
  }

  return <DeviceSelectorModal /* props */ />;
}
```

## 🤝 Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) to get started.

## 📄 License

MIT © [Huuuda](https://github.com/huuuda-aus)

---

Built with ❤️ by [Huuuda](https://github.com/huuuda-aus)
