import React, { useEffect, useRef } from 'react';
import useMediaDevices, { type UseMediaDevicesOptions } from '../hooks/useMediaDevices';
import type { MediaDeviceKind, SelectedDevices } from '../types';
import '../styles/index.css';

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
  
  const renderDeviceList = (devices: Array<{ deviceId: string; label: string; kind: MediaDeviceKind; isSelected?: boolean }>, kind: MediaDeviceKind) => {
    if (isLoading) return <div className="loading">Loading devices...</div>;
    if (error) return <div className="error">Error loading devices: {error.message}</div>;

    // For camera devices, add a "No camera" option
    const showNoCameraOption = kind === 'videoinput' && includeCamera;
    const noCameraOption = {
      deviceId: '',
      label: 'No camera',
      kind: 'videoinput' as MediaDeviceKind,
      isSelected: selectedDevices.cameraId === null
    };

    const deviceList = showNoCameraOption ? [noCameraOption, ...devices] : devices;

    if (deviceList.length === 0) return <div className="no-devices">No {kind} devices found</div>;

    return (
      <div className="device-list">
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
              className={`device-item ${isDeviceSelected ? 'selected' : ''}`}
              onClick={() => handleDeviceSelect(kind, isNoCamera ? null : device.deviceId)}
            >
              <div className="device-radio">
                <div className="radio-dot" />
              </div>
              <div className="device-label">
                {device.label || `Unknown ${kind.replace('input', '').replace('output', '')}`}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDeviceLists = () => {
    if (isLoading) return <div className="loading">Loading devices...</div>;
    if (error) return <div className="error">Error loading devices: {error.message}</div>;

    // Filter devices by kind
    const microphones = deviceLists.filter(device => device.kind === 'audioinput');
    const cameras = deviceLists.filter(device => device.kind === 'videoinput');
    const speakers = deviceLists.filter(device => device.kind === 'audiooutput');

    return (
      <div className="device-lists-container">
        <div className="device-list-container">
          <h3>Microphone</h3>
          {renderDeviceList(microphones, 'audioinput')}
        </div>
        {includeCamera && (
          <div className="device-list-container">
            <h3>Camera</h3>
            {renderDeviceList(cameras, 'videoinput')}
          </div>
        )}
        <div className="device-list-container">
          <h3>Speaker</h3>
          {renderDeviceList(speakers, 'audiooutput')}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!isMediaDevicesSupported) {
      return (
        <div className="unsupported">
          Your browser doesn't support the MediaDevices API. Please use a modern browser.
        </div>
      );
    }

    if (permissionStatus === 'denied') {
      return (
        <div className="permission-denied">
          <h3>Permission Required</h3>
          <p>
            Please allow access to your camera and microphone in your browser settings and refresh the page.
          </p>
        </div>
      );
    }

    return (
      <div className="content">
        <div className="device-lists-container">
          {renderDeviceLists()}
        </div>
        {includeCamera && showCameraPreview && (
          <div className="preview-section">
            <h3>Camera Preview</h3>
            <div className="video-container">
              {selectedDevices.cameraId ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="video-preview"
                />
              ) : (
                <div className="no-camera-selected">
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
        <div className={`modal-overlay ${theme === 'dark' ? 'dark-theme' : ''}`}>
          <div className={`modal ${className}`} style={style}>
            <div className="modal-header">
              <h2>Select Devices</h2>
            </div>
            
            {renderContent()}
            
            <div className="modal-footer">
              <button
                className={`cancel-button ${theme === 'dark' ? 'dark-theme' : ''}`}
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                className={`confirm-button ${theme === 'dark' ? 'dark-theme' : ''}`}
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
