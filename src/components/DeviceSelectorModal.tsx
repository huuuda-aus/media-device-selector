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
    if (!isOpen) return;
    
    if (videoRef.current) {
      if (activeStream) {
        videoRef.current.srcObject = activeStream;
      } else if (selectedDevices.cameraId) {
        // Reinitialize the camera if we have a selected camera but no active stream
        selectDevice('videoinput', selectedDevices.cameraId).catch(console.error);
      }
    }
    
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [activeStream, isOpen, selectedDevices.cameraId, selectDevice]);

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

  const handleDeviceSelect = async (kind: MediaDeviceKind, deviceId: string | null) => {
    if (kind === 'videoinput' && deviceId === null) {
      // Handle 'No camera' selection
      if (videoRef.current) {
        // Stop all video tracks
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      }
      
      // Update the state to reflect no camera is selected
      setSelectedDevices(prev => ({
        ...prev,
        cameraId: null
      }));
      
      // Also clear any active stream in the parent component
      if (targetMediaRef?.current) {
        if (targetMediaRef.current.srcObject) {
          const stream = targetMediaRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          targetMediaRef.current.srcObject = null;
        }
      }
    } else if (deviceId) {
      // For other device selections, use the normal flow
      await selectDevice(kind, deviceId);
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
      <div className="deviceList">
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
              className={`deviceItem ${isDeviceSelected ? 'selected' : ''}`}
              onClick={() => handleDeviceSelect(kind, isNoCamera ? null : device.deviceId)}
            >
              <div className="deviceRadio">
                <div className="radioDot" />
              </div>
              <div className="deviceLabel">
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
      <div className="deviceListsContainer">
        {includeCamera && (
          <div className="deviceSection">
            <h3>Camera</h3>
            {renderDeviceList(cameras, 'videoinput')}
          </div>
        )}
        <div className="deviceSection">
          <h3>Microphone</h3>
          {renderDeviceList(microphones, 'audioinput')}
        </div>
        {speakers.length > 0 && (
          <div className="deviceSection">
            <h3>Speaker</h3>
            {renderDeviceList(speakers, 'audiooutput')}
          </div>
        )}
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
          <button onClick={() => window.location.reload()} className="primary">
            Refresh Page
          </button>
        </div>
      );
    }

    return (
      <div className="content">
        {renderDeviceLists()}
        {includeCamera && showCameraPreview && (
          <div className="previewSection">
            <div className="videoContainer">
              {selectedDevices.cameraId ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    backgroundColor: '#000',
                    borderRadius: '4px',
                    display: selectedDevices.cameraId ? 'block' : 'none'
                  }}
                />
              ) : (
                <div className="noCameraSelected">
                  No camera selected
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const modalClasses = [
    'modal',
    `theme-${theme}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <>
      {renderButton && (
        <button 
          onClick={handleOpen} 
          className="open-button"
          style={style}
        >
          {renderButton}
        </button>
      )}
      {isOpen && (
        <div className="modal-overlay" onClick={handleClose}>
          <div 
            className={modalClasses}
            style={style}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Select Devices</h2>
              <button 
                className="close-button" 
                onClick={handleClose}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>
            {renderContent()}
            <div className="modal-actions">
              <button 
                onClick={handleClose} 
                className="button button-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm} 
                className="button button-primary"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeviceSelectorModal;
