import React, { useEffect, useRef } from 'react';
import useMediaDevices from '../hooks/useMediaDevices';
import type { MediaDeviceKind, SelectedDevices } from '../types';
import styles from './styles.module.css';

interface DeviceSelectorModalProps {
  theme?: 'light' | 'dark';
  onSelectionComplete: (selection: SelectedDevices) => void;
  renderButton?: React.ReactNode;
  targetMediaRef?: React.RefObject<HTMLMediaElement>;
  showCameraPreview?: boolean;
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

  const {
    selectedDevices,
    selectDevice,
    activeStream,
    permissionStatus,
    isLoading,
    error,
    isMediaDevicesSupported,
    deviceLists,
  } = useMediaDevices();

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
        console.error('Error setting audio output device:', err);
      }
    }
  }, [selectedDevices.speakerId, targetMediaRef]);

  const handleDeviceSelect = (kind: MediaDeviceKind, deviceId: string) => {
    selectDevice(kind, deviceId);
  };

  const handleConfirm = () => {
    onSelectionComplete(selectedDevices);
    handleClose();
  };
  
  const handleModalClose = () => {
    handleClose();
  };

  const renderDeviceList = (devices: Array<{ deviceId: string; label: string; kind: MediaDeviceKind; isSelected?: boolean }>, kind: MediaDeviceKind) => {
    console.log(`Rendering ${kind} devices:`, devices);
    
    if (isLoading) return <div className={styles.loading}>Loading devices...</div>;
    if (error) return <div className={styles.error}>Error loading devices: {error.message}</div>;
    if (!devices || devices.length === 0) return <div className={styles.noDevices}>No {kind} devices found</div>;

    return (
      <div className={styles.deviceList}>
        {devices.map((device) => {
          const isDeviceSelected = 
            (kind === 'audioinput' && selectedDevices.microphoneId === device.deviceId) ||
            (kind === 'videoinput' && selectedDevices.cameraId === device.deviceId) ||
            (kind === 'audiooutput' && selectedDevices.speakerId === device.deviceId);

          console.log(`Device ${device.deviceId} (${kind}) is ${isDeviceSelected ? 'selected' : 'not selected'}`);

          return (
            <div
              key={device.deviceId}
              className={`${styles.deviceItem} ${isDeviceSelected ? styles.selected : ''}`}
              onClick={() => handleDeviceSelect(kind, device.deviceId)}
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

  const renderContent = () => {
    console.log('Rendering content with deviceLists:', deviceLists);
    
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
        <div className={styles.deviceSection}>
          <h3>Microphone</h3>
          {renderDeviceList(deviceLists.microphones, 'audioinput')}
        </div>

        <div className={styles.deviceSection}>
          <h3>Camera</h3>
          {renderDeviceList(deviceLists.cameras, 'videoinput')}
        </div>

        <div className={styles.deviceSection}>
          <h3>Speaker</h3>
          {renderDeviceList(deviceLists.speakers, 'audiooutput')}
        </div>

        {showCameraPreview && selectedDevices.cameraId && (
          <div className={styles.previewSection}>
            <h3>Camera Preview</h3>
            <div className={styles.videoContainer}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={styles.videoPreview}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {!isOpen && (renderButton ? (
        <div onClick={handleOpen}>{renderButton}</div>
      ) : (
        <button 
          onClick={handleOpen}
          className={`${styles.button} ${theme === 'dark' ? styles.dark : ''} ${className}`}
          style={style}
        >
          Select Devices
        </button>
      ))}

      {isOpen && (
        <div className={`${styles.modalOverlay} ${theme === 'dark' ? styles.dark : ''}`}>
          <div className={`${styles.modal} ${className}`} style={style}>
            <div className={styles.modalHeader}>
              <h2>Select Devices</h2>
              <button 
                className={styles.closeButton}
                onClick={handleModalClose}
                aria-label="Close"
              >
                &times;
              </button>
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
