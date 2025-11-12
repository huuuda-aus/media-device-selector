import { EnvironmentSupport, MediaDeviceError } from "../types";

/**
 * Checks if the current environment supports the required media device APIs
 */
export function checkEnvironmentSupport(): EnvironmentSupport {
  const isBrowser =
    typeof window !== "undefined" && typeof window.navigator !== "undefined";

  if (!isBrowser) {
    const error: MediaDeviceError = {
      name: "NotSupportedError",
      message: "This component only works in browser environments",
    };
    return {
      isBrowser: false,
      isMediaDevicesSupported: false,
      isGetUserMediaSupported: false,
      isEnumerateDevicesSupported: false,
      error,
    };
  }

  const isMediaDevicesSupported = "mediaDevices" in navigator;
  const isGetUserMediaSupported =
    isMediaDevicesSupported && "getUserMedia" in navigator.mediaDevices;
  const isEnumerateDevicesSupported =
    isMediaDevicesSupported && "enumerateDevices" in navigator.mediaDevices;

  let error: MediaDeviceError | undefined;

  if (!isMediaDevicesSupported) {
    error = {
      name: "NotSupportedError",
      message: "MediaDevices API is not supported in this browser",
    };
  } else if (!isGetUserMediaSupported) {
    error = {
      name: "NotSupportedError",
      message: "getUserMedia is not supported in this browser",
    };
  } else if (!isEnumerateDevicesSupported) {
    error = {
      name: "NotSupportedError",
      message: "enumerateDevices is not supported in this browser",
    };
  }

  return {
    isBrowser,
    isMediaDevicesSupported,
    isGetUserMediaSupported,
    isEnumerateDevicesSupported,
    error,
  };
}

/**
 * Creates a standardized error object from various error types
 */
export function createMediaDeviceError(error: unknown): MediaDeviceError {
  if (error && typeof error === "object") {
    const err = error as Error & { constraint?: string };
    return {
      name: (err.name as any) || "UnknownError",
      message: err.message || "An unknown error occurred",
      constraint: err.constraint,
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : "An unknown error occurred",
  };
}

/**
 * Validates the current environment and throws if not supported
 * @throws {MediaDeviceError} If the environment is not supported
 */
export function validateEnvironment(): void {
  const env = checkEnvironmentSupport();
  if (env.error) {
    throw env.error;
  }
}

/**
 * Safe wrapper for browser-specific code
 */
export function safeBrowserCall<T>(callback: () => T, fallback: T): T {
  try {
    validateEnvironment();
    return callback();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Browser API not available:", error);
    }
    return fallback;
  }
}
