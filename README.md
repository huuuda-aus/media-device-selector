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
- 🔍 Real-time device permission handling
- 🔄 Automatic device refresh when hardware changes
- 🎯 TypeScript support with full type definitions
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
import {
  DeviceSelectorModal,
  useMediaDevices,
} from "react-media-device-selector";
import { useState, useRef } from "react";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { devices, selectedDevices, updateSelectedDevices } = useMediaDevices();

  const handleDeviceSelection = (selected: {
    videoInput?: string | null;
    audioInput?: string | null;
    audioOutput?: string | null;
  }) => {
    // Example: Start video stream with selected camera
    if (videoRef.current && selected.videoInput) {
      navigator.mediaDevices
        .getUserMedia({
          video: { deviceId: selected.videoInput },
        })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
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
        showCameraPreview={true}
      />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "100%", maxWidth: "640px" }}
      />
    </div>
  );
}
```

## 🔧 API Reference

### `DeviceSelectorModal` Props

| Prop                  | Type                                 | Required | Default          | Description                                   |
| --------------------- | ------------------------------------ | -------- | ---------------- | --------------------------------------------- |
| `isOpen`              | `boolean`                            | ✅       | -                | Controls the visibility of the modal          |
| `onClose`             | `() => void`                         | ✅       | -                | Callback when the modal is closed             |
| `onSelectionComplete` | `(devices: SelectedDevices) => void` | ✅       | -                | Callback when device selection is confirmed   |
| `targetMediaRef`      | `React.RefObject<HTMLVideoElement>`  | ❌       | -                | Reference to video element for camera preview |
| `showCameraPreview`   | `boolean`                            | ❌       | `true`           | Show/hide camera preview section              |
| `includeCamera`       | `boolean`                            | ❌       | `true`           | Include camera selection                      |
| `includeMicrophone`   | `boolean`                            | ❌       | `true`           | Include microphone selection                  |
| `includeSpeaker`      | `boolean`                            | ❌       | `true`           | Include speaker selection                     |
| `title`               | `string`                             | ❌       | "Select Devices" | Modal title                                   |
| `className`           | `string`                             | ❌       | -                | Additional CSS class for the modal            |

### `useMediaDevices` Hook

```typescript
const {
  // Device lists
  devices: {
    videoInputs: Device[],    // Available cameras
    audioInputs: Device[],    // Available microphones
    audioOutputs: Device[]    // Available speakers
  },

  // Currently selected devices
  selectedDevices: {
    videoInput?: string | null;  // Selected camera ID
    audioInput?: string | null;  // Selected microphone ID
    audioOutput?: string | null; // Selected speaker ID
  },

  // Methods
  updateSelectedDevices: (devices: Partial<SelectedDevices>) => void;
  requestPermission: () => Promise<PermissionStatus>;
  refreshDevices: () => Promise<void>;

  // Status
  permissionStatus: 'granted' | 'denied' | 'prompt';
  isLoading: boolean;
  error: Error | null;

} = useMediaDevices();
```

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
