import React, { useEffect, useRef } from 'react';
import useMediaDevices, { type UseMediaDevicesOptions } from '../hooks/useMediaDevices';
import type { MediaDeviceKind, SelectedDevices } from '../types';
import styles from './styles.module.css';

interface DeviceSelectorModalProps {
  theme?: 'light' | 'dark';
  onSelectionComplete: (selection: SelectedDevices) => void;
  renderButton?: React.ReactNode;
  targetMediaRef?: React.RefObject<HTMLMediaElement>;
  showCameraPreview?: boolean;
  includeCamera: boolean;
  className?: string;
  style?: React.CSSProperties;
  isOpen?: boolean;
  onClose?: () => void;
}

const DeviceSelectorModal: React.FC<DeviceSelectorModalProps> = ({
  theme = 'light',
  onSelectionComplete,
  renderButton,
  targetMediaRef,
  showCameraPreview = true,
  includeCamera,
  className = '',
  style = {},
  isOpen: isOpenProp,
  onClose
}) => {
  const [isOpenState, setIsOpenState] = React.useState(false);
  const isOpen = isOpenProp ?? isOpenState;
  const videoRef = useRef<HTMLVideoElement>(null);


  const handleOpen = () => {
    if (onClose) {
      onClose();
    } else {
      setIsOpenState(true);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setIsOpenState(false);
    }
  };

  const options: UseMediaDevicesOptions = {
    includeCamera,
  };

  const { 
    devices: deviceLists, 
    selectDevice, 
    selectedDevices, 
    setSelectedDevices,
    activeStream, 
    permissionStatus, 
    isLoading, 
    error, 
    isMediaDevicesSupported 
  } = useMediaDevices(options);

  // Handle camera preview
  useEffect(() => {
    if (videoRef.current && activeStream) {
      videoRef.current.srcObject = activeStream;
    }
    
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [activeStream]);

  // Handle speaker selection
  useEffect(() => {
    if (selectedDevices.speakerId && targetMediaRef?.current && 'setSinkId' in targetMediaRef.current) {
      try {
        // Type assertion needed because setSinkId is not in the standard HTMLMediaElement type
        (targetMediaRef.current as any).setSinkId(selectedDevices.speakerId);
      } catch (err) {
        // Error setting audio output device
      }
    }
  }, [selectedDevices.speakerId, targetMediaRef]);

  const handleDeviceSelect = (kind: MediaDeviceKind, deviceId: string | null) => {
    if (kind === 'videoinput' && deviceId === null) {
      // Handle 'No camera' selection
      setSelectedDevices(prev => ({
        ...prev,
        cameraId: null
      }));
    } else if (deviceId) {
      selectDevice(kind, deviceId);
    }
  };

  const handleConfirm = () => {
    onSelectionComplete(selectedDevices);
    handleClose();
  };
  
  const handleModalClose = () => {
    handleClose();
  };

  const renderDeviceList = (devices: Array<{ deviceId: string; label: string; kind: MediaDeviceKind; isSelected?: boolean }>, kind: MediaDeviceKind) => {
    if (isLoading) return <div className={styles.loading}>Loading devices...</div>;
    if (error) return <div className={styles.error}>Error loading devices: {error.message}</div>;

    // For camera devices, add a "No camera" option
    const showNoCameraOption = kind === 'videoinput' && includeCamera;
    const noCameraOption = {
      deviceId: '',
      label: 'No camera',
      kind: 'videoinput' as MediaDeviceKind,
      isSelected: selectedDevices.cameraId === null
    };

    const deviceList = showNoCameraOption ? [noCameraOption, ...devices] : devices;

    if (deviceList.length === 0) return <div className={styles.noDevices}>No {kind} devices found</div>;

    return (
      <div className={styles.deviceList}>
        {deviceList.map((device) => {
          const isNoCamera = kind === 'videoinput' && device.deviceId === '';
          const isDeviceSelected = isNoCamera
            ? selectedDevices.cameraId === null
            : (kind === 'audioinput' && selectedDevices.microphoneId === device.deviceId) ||
              (kind === 'videoinput' && selectedDevices.cameraId === device.deviceId) ||
              (kind === 'audiooutput' && selectedDevices.speakerId === device.deviceId);

          return (
            <div
              key={device.deviceId || 'no-camera'}
              className={`${styles.deviceItem} ${isDeviceSelected ? styles.selected : ''}`}
              onClick={() => handleDeviceSelect(kind, isNoCamera ? null : device.deviceId)}
            >
              <div className={styles.deviceRadio}>
                <div className={styles.radioDot} />
              </div>
              <div className={styles.deviceLabel}>
                {device.label || `Unknown ${kind.replace('input', '').replace('output', '')}`}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDeviceLists = () => {
    if (isLoading) return <div className={styles.loading}>Loading devices...</div>;
    if (error) return <div className={styles.error}>Error loading devices: {error.message}</div>;

    // Filter devices by kind
    const microphones = deviceLists.filter(device => device.kind === 'audioinput');
    const cameras = deviceLists.filter(device => device.kind === 'videoinput');
    const speakers = deviceLists.filter(device => device.kind === 'audiooutput');

    return (
      <div className={styles.deviceListsContainer}>
        <div className={styles.deviceListContainer}>
          <h3>Microphone</h3>
          {renderDeviceList(microphones, 'audioinput')}
        </div>
        {includeCamera && (
          <div className={styles.deviceListContainer}>
            <h3>Camera</h3>
            {renderDeviceList(cameras, 'videoinput')}
          </div>
        )}
        <div className={styles.deviceListContainer}>
          <h3>Speaker</h3>
          {renderDeviceList(speakers, 'audiooutput')}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!isMediaDevicesSupported) {
      return (
        <div className={styles.unsupported}>
          Your browser doesn't support the MediaDevices API. Please use a modern browser.
        </div>
      );
    }

    if (permissionStatus === 'denied') {
      return (
        <div className={styles.permissionDenied}>
          <h3>Permission Required</h3>
          <p>
            Please allow access to your camera and microphone in your browser settings and refresh the page.
          </p>
        </div>
      );
    }

    return (
      <div className={styles.content}>
        <div className={styles.deviceListsContainer}>
          {renderDeviceLists()}
        </div>
        {includeCamera && showCameraPreview && (
          <div className={styles.previewSection}>
            <h3>Camera Preview</h3>
            <div className={styles.videoContainer}>
              {selectedDevices.cameraId ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={styles.videoPreview}
                />
              ) : (
                <div className={styles.noCameraSelected}>
                  No camera selected
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {!isOpen && (renderButton && (
        <div onClick={handleOpen}>{renderButton}</div>
      ))}

      {isOpen && (
        <div className={`${styles.modalOverlay} ${theme === 'dark' ? styles.dark : ''}`}>
          <div className={`${styles.modal} ${className}`} style={style}>
            <div className={styles.modalHeader}>
              <h2>Select Devices</h2>
            </div>
            
            {renderContent()}
            
            <div className={styles.modalFooter}>
              <button
                className={`${styles.cancelButton} ${theme === 'dark' ? styles.dark : ''}`}
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                className={`${styles.confirmButton} ${theme === 'dark' ? styles.dark : ''}`}
                onClick={handleConfirm}
                disabled={isLoading}
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeviceSelectorModal;
