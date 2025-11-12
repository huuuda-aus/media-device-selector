import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type {
  Device,
  MediaDeviceKind,
  PermissionStatus,
  SelectedDevices,
  DeviceLists,
} from "../types";

interface UseMediaDevicesOptions {
  includeCamera?: boolean;
}

interface UseMediaDevicesReturn {
  devices: Device[];
  deviceLists: DeviceLists;
  selectedDevices: SelectedDevices;
  setSelectedDevices: React.Dispatch<React.SetStateAction<SelectedDevices>>;
  selectDevice: (kind: MediaDeviceKind, deviceId: string) => Promise<void>;
  activeStream: MediaStream | null;
  permissionStatus: PermissionStatus;
  isLoading: boolean;
  error: Error | null;
  isMediaDevicesSupported: boolean;
}

const useMediaDevices = (
  options: UseMediaDevicesOptions = {},
): UseMediaDevicesReturn => {
  const { includeCamera = true } = options;
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>("prompt");
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<SelectedDevices>({
    microphoneId: null,
    cameraId: null, // Always start with no camera selected
    speakerId: null,
  });

  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Refs for cleanup and tracking
  const streamRef = useRef<MediaStream | null>(null);
  const isMounted = useRef(true);

  // Check if MediaDevices API is supported
  const isMediaDevicesSupported =
    typeof navigator !== "undefined" && "mediaDevices" in navigator;

  // Cleanup function for media streams
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        streamRef.current?.removeTrack(track);
      });
      streamRef.current = null;
      setActiveStream(null);
    }
  }, []);

  // Update device selection
  const selectDevice = useCallback(
    async (kind: MediaDeviceKind, deviceId: string) => {
      if (!isMediaDevicesSupported) {
        const error = new Error(
          "MediaDevices API is not supported in this browser",
        );
        setError(error);
        return;
      }

      try {
        setError(null);

        // Update selected device in state
        setSelectedDevices((prev) => ({
          ...prev,
          ...(kind === "audioinput" && { microphoneId: deviceId }),
          ...(kind === "videoinput" && { cameraId: deviceId }),
          ...(kind === "audiooutput" && { speakerId: deviceId }),
        }));

        // Update selected devices state
        setSelectedDevices((prev) => {
          const update: Partial<SelectedDevices> = {};
          if (kind === "audioinput") update.microphoneId = deviceId;
          if (kind === "videoinput") update.cameraId = deviceId;
          if (kind === "audiooutput") update.speakerId = deviceId;
          return { ...prev, ...update };
        });

        // Only handle audio and video input devices (not outputs)
        if (kind === "audioinput" || kind === "videoinput") {
          const constraints: MediaStreamConstraints = {
            audio:
              kind === "audioinput" ? { deviceId: { exact: deviceId } } : false,
            video:
              kind === "videoinput"
                ? {
                    deviceId: { exact: deviceId },
                    // Request 4:3 aspect ratio
                    width: { ideal: 1280 }, // 4:3 aspect ratio
                    height: { ideal: 960 }, // 4:3 aspect ratio
                    aspectRatio: 4 / 3, // Enforce 4:3 aspect ratio
                  }
                : false,
          };

          // Stop any existing tracks
          cleanup();

          try {
            const stream =
              await navigator.mediaDevices.getUserMedia(constraints);

            if (!isMounted.current) {
              // Cleanup if component unmounted during async operation
              stream.getTracks().forEach((track) => track.stop());
              return;
            }

            streamRef.current = stream;
            setActiveStream(stream);
          } catch (err) {
            if (isMounted.current) {
              setError(
                err instanceof Error
                  ? err
                  : new Error(`Failed to access ${kind}`),
              );
            }
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to select device"),
        );
      }
    },
    [activeStream],
  );

  // Request permissions and enumerate devices
  const enumerateDevices = useCallback(async () => {
    if (!isMediaDevicesSupported) {
      setPermissionStatus("not-supported");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Only request camera permissions if includeCamera is true
      const constraints = {
        audio: true,
        video: includeCamera,
      };

      // Request permissions by getting a media stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Stop all tracks to release the camera/mic
      stream.getTracks().forEach((track) => track.stop());

      const mediaDevices = await navigator.mediaDevices.enumerateDevices();

      // Check mounted state after async operations
      if (!isMounted.current) {
        return;
      }

      const formattedDevices = mediaDevices
        .filter((device) => {
          if (!device.deviceId) {
            return false;
          }
          // Skip camera devices if includeCamera is false
          if (!includeCamera && device.kind.toLowerCase().includes("video")) {
            return false;
          }
          return true;
        })
        .map((device) => {
          const deviceKind = device.kind.toLowerCase();
          let kind: MediaDeviceKind;

          if (deviceKind.includes("video")) {
            kind = "videoinput";
          } else if (deviceKind.includes("audio")) {
            kind = deviceKind.includes("out") ? "audiooutput" : "audioinput";
          } else {
            kind = "audioinput";
          }

          return {
            deviceId: device.deviceId,
            kind,
            label:
              device.label ||
              `Unknown ${kind.replace("input", "").replace("output", "")}`,
            groupId: device.groupId,
            isSelected: false,
            toJSON() {
              return {
                deviceId: this.deviceId,
                kind: this.kind,
                label: this.label,
                groupId: this.groupId,
                isSelected: this.isSelected,
              };
            },
          };
        });

      if (!isMounted.current) {
        return;
      }

      setDevices(formattedDevices);

      // Update selected devices if not already set
      const audioInputs = formattedDevices.filter(
        (d) => d.kind === "audioinput",
      );
      const audioOutputs = formattedDevices.filter(
        (d) => d.kind === "audiooutput",
      );

      // Always keep cameraId as null by default, regardless of includeCamera
      setSelectedDevices((prev) => ({
        microphoneId: prev.microphoneId || audioInputs[0]?.deviceId || null,
        speakerId: prev.speakerId || audioOutputs[0]?.deviceId || null,
        cameraId: null, // Always default to no camera selected
      }));

      setPermissionStatus("granted");
    } catch (err) {
      if (isMounted.current) {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setPermissionStatus("denied");
        } else {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to access media devices"),
          );
        }
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [isMediaDevicesSupported, includeCamera]);

  // Use a ref to track the initialization state
  const initRef = useRef<boolean>(false);
  const deviceChangeHandler = useRef<(() => void) | null>(null);

  // Set initial camera selection based on includeCamera
  useEffect(() => {
    if (!includeCamera) {
      setSelectedDevices((prev) => ({
        ...prev,
        cameraId: null,
      }));
    }
  }, [includeCamera]);

  // Set up device change listener and initial enumeration
  useEffect(() => {
    // Skip if not supported
    if (!isMediaDevicesSupported) {
      setError(new Error("MediaDevices API is not supported in this browser"));
      setIsLoading(false);
      return;
    }

    // Prevent multiple initializations
    if (initRef.current) {
      return;
    }

    initRef.current = true;

    // Create a flag to track if we're currently enumerating
    let isEnumerating = false;

    // Create a queue for device changes that happen during enumeration
    let pendingDeviceChange = false;

    // Mark as mounted at the start of effect
    isMounted.current = true;

    // Wrapper function to handle device changes
    const handleDeviceChange = async () => {
      if (!isMounted.current) return;

      if (isEnumerating) {
        pendingDeviceChange = true;
        return;
      }

      try {
        isEnumerating = true;
        await enumerateDevices();
      } finally {
        isEnumerating = false;

        // If a device change happened while we were enumerating, run again
        if (pendingDeviceChange) {
          pendingDeviceChange = false;
          setTimeout(handleDeviceChange, 0);
        }
      }
    };

    // Store the handler in the ref
    deviceChangeHandler.current = handleDeviceChange;

    // Set up the event listener
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    // Initial device enumeration
    const initialize = async () => {
      try {
        setIsLoading(true);
        await handleDeviceChange();
      } catch (err) {
        if (isMounted.current) {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to enumerate devices"),
          );
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    // Start the initialization
    initialize();

    // Cleanup function
    return () => {
      if (deviceChangeHandler.current) {
        navigator.mediaDevices.removeEventListener(
          "devicechange",
          deviceChangeHandler.current,
        );
        deviceChangeHandler.current = null;
      }
      cleanup();
      // Don't set isMounted to false here as it can cause race conditions
      // with async operations that are still in progress
      initRef.current = false;
    };
  }, [isMediaDevicesSupported, includeCamera]); // Only depends on isMediaDevicesSupported

  // Organize devices by kind - only run after initial load
  const [hasInitialDevices, setHasInitialDevices] = useState(false);

  // Update hasInitialDevices when we first get devices
  useEffect(() => {
    if (devices.length > 0 && !hasInitialDevices) {
      setHasInitialDevices(true);
    }
  }, [devices.length, hasInitialDevices]);

  const deviceLists = useMemo<DeviceLists>(() => {
    // Don't process until we've completed initial device loading
    if (!hasInitialDevices || isLoading) {
      return { microphones: [], cameras: [], speakers: [] };
    }

    const microphones = devices.filter((d) => d.kind === "audioinput");
    const cameras = devices.filter((d) => d.kind === "videoinput");
    const speakers = devices.filter((d) => d.kind === "audiooutput");

    const result = {
      microphones: microphones.map((d) => ({
        ...d,
        isSelected: d.deviceId === selectedDevices.microphoneId,
      })),
      cameras: cameras.map((d) => ({
        ...d,
        isSelected: d.deviceId === selectedDevices.cameraId,
      })),
      speakers: speakers.map((d) => ({
        ...d,
        isSelected: d.deviceId === selectedDevices.speakerId,
      })),
    };

    return result;
  }, [devices, selectedDevices, isLoading, hasInitialDevices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("Component unmounting, cleaning up...");
      isMounted.current = false;
      cleanup();
      // Reset initRef when component fully unmounts
      initRef.current = false;
    };
  }, []);

  // Only expose deviceLists after initial load
  const exposedDeviceLists = hasInitialDevices
    ? deviceLists
    : { microphones: [], cameras: [], speakers: [] };

  return {
    devices,
    deviceLists: exposedDeviceLists,
    selectedDevices,
    setSelectedDevices,
    selectDevice,
    activeStream,
    permissionStatus,
    isLoading: !hasInitialDevices || isLoading,
    error,
    isMediaDevicesSupported,
  };
};

// Export as default for backward compatibility
export default useMediaDevices;

// Export the type for better TypeScript support
export type { UseMediaDevicesOptions, UseMediaDevicesReturn };
