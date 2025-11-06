export type MediaDeviceKind = 'audioinput' | 'videoinput' | 'audiooutput';

export interface Device extends MediaDeviceInfo {
  isSelected: boolean;
}

export interface DeviceLists {
  microphones: Device[];
  cameras: Device[];
  speakers: Device[];
}

export interface SelectedDevices {
  microphoneId: string | null;
  cameraId: string | null;
  speakerId: string | null;
}

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'not-supported';

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
