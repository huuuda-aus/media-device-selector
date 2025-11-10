/**
 * Type representing the kind of media device
 */
export type MediaDeviceKind = 'audioinput' | 'audiooutput' | 'videoinput';

/**
 * Represents a media device (camera, microphone, or speaker)
 */
export interface Device extends MediaDeviceInfo {
  isSelected: boolean;
}

/**
 * Collection of available media devices by type
 */
export interface DeviceLists {
  microphones: Device[];
  cameras: Device[];
  speakers: Device[];
}

/**
 * Currently selected devices by type
 */
export interface SelectedDevices {
  microphoneId: string | null;
  cameraId: string | null;
  speakerId: string | null;
}

/**
 * Permission status for media device access
 */
export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'not-supported';

/**
 * Error type for media device errors
 */
export interface MediaDeviceError extends Error {
  name: 'NotSupportedError' | 'NotAllowedError' | 'NotFoundError' | 'NotReadableError' | 'OverconstrainedError' | 'SecurityError' | 'TypeError' | 'UnknownError';
  message: string;
  constraint?: string;
}

/**
 * Environment support check results
 */
export interface EnvironmentSupport {
  /** True if running in a browser environment */
  isBrowser: boolean;
  /** True if media devices API is supported */
  isMediaDevicesSupported: boolean;
  /** True if getUserMedia is supported */
  isGetUserMediaSupported: boolean;
  /** True if enumerateDevices is supported */
  isEnumerateDevicesSupported: boolean;
  /** Detailed error if any check fails */
  error?: MediaDeviceError;
}

/**
 * Props for the DeviceSelectorModal component
 */
export interface DeviceSelectorModalProps {
  /**
   * The color theme of the modal
   * @default 'light'
   */
  theme?: 'light' | 'dark';
  
  /**
   * Callback function that is called when the user confirms their device selection
   * @param selection - Object containing the selected device IDs
   */
  onSelectionComplete: (selection: SelectedDevices) => void;
  
  /**
   * Custom React node to use as the trigger button for the modal
   * If not provided, a default button will be rendered
   */
  renderButton?: React.ReactNode;
  
  /**
   * Reference to the target media element for speaker output
   * Required for speaker device selection to work
   */
  targetMediaRef?: React.RefObject<HTMLMediaElement>;
  
  /**
   * Whether to show a preview of the selected camera
   * @default true
   */
  showCameraPreview?: boolean;
  
  /**
   * Custom class name for the modal container
   */
  className?: string;
  
  /**
   * Custom styles for the modal container
   */
  style?: React.CSSProperties;
}
