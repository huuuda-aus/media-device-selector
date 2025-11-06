import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Device, MediaDeviceKind, PermissionStatus, SelectedDevices, DeviceLists } from '../types';

interface UseMediaDevicesReturn {
  devices: Device[];
  deviceLists: DeviceLists;
  selectedDevices: SelectedDevices;
  selectDevice: (kind: MediaDeviceKind, deviceId: string) => Promise<void>;
  activeStream: MediaStream | null;
  permissionStatus: PermissionStatus;
  isLoading: boolean;
  error: Error | null;
  isMediaDevicesSupported: boolean;
}

const useMediaDevices = (): UseMediaDevicesReturn => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('prompt');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<SelectedDevices>({
    microphoneId: null,
    cameraId: null,
    speakerId: null,
  });
  
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Refs for cleanup and tracking
  const streamRef = useRef<MediaStream | null>(null);
  const isMounted = useRef(true);

  // Check if MediaDevices API is supported
  const isMediaDevicesSupported = typeof navigator !== 'undefined' && 'mediaDevices' in navigator;

  // Cleanup function for media streams
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
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
      console.log(`Selecting ${kind} device:`, deviceId);
      
      if (!isMediaDevicesSupported) {
        const error = new Error('MediaDevices API is not supported in this browser');
        console.error(error);
        setError(error);
        return;
      }

      try {
        setError(null);
        
        // Update selected device in state
        setSelectedDevices(prev => ({
          ...prev,
          ...(kind === 'audioinput' && { microphoneId: deviceId }),
          ...(kind === 'videoinput' && { cameraId: deviceId }),
          ...(kind === 'audiooutput' && { speakerId: deviceId }),
        }));
        
        // Update selected devices state
        setSelectedDevices(prev => {
          const update: Partial<SelectedDevices> = {};
          if (kind === 'audioinput') update.microphoneId = deviceId;
          if (kind === 'videoinput') update.cameraId = deviceId;
          if (kind === 'audiooutput') update.speakerId = deviceId;
          return { ...prev, ...update };
        });

        // Only handle audio and video input devices (not outputs)
        if (kind === 'audioinput' || kind === 'videoinput') {
          const constraints: MediaStreamConstraints = {
            audio: kind === 'audioinput' ? { deviceId: { exact: deviceId } } : false,
            video: kind === 'videoinput' ? { deviceId: { exact: deviceId } } : false,
          };

          // Stop any existing tracks
          cleanup();

          try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (!isMounted.current) {
              // Cleanup if component unmounted during async operation
              stream.getTracks().forEach(track => track.stop());
              return;
            }
            
            streamRef.current = stream;
            setActiveStream(stream);
          } catch (err) {
            if (isMounted.current) {
              console.error(`Error accessing ${kind}:`, err);
              setError(err instanceof Error ? err : new Error(`Failed to access ${kind}`));
            }
          }
        }
      } catch (err) {
        console.error(`Error selecting ${kind}:`, err);
        setError(err instanceof Error ? err : new Error('Failed to select device'));
      }
    },
    [activeStream]
  );

  // Request permissions and enumerate devices
  const enumerateDevices = useCallback(async () => {
    console.log('Starting device enumeration...');
    
    if (!isMediaDevicesSupported) {
      console.log('MediaDevices API is not supported');
      setPermissionStatus('not-supported');
      setIsLoading(false);
      return;
    }

    console.log('Starting device enumeration...');
    setIsLoading(true);
    setError(null);

    try {
      console.log('Requesting media permissions...');
      // First, request permissions by getting a media stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      
      // Stop all tracks to release the camera/mic
      stream.getTracks().forEach(track => track.stop());
      
      console.log('Enumerating devices...');
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      
      // Check mounted state after async operations
      if (!isMounted.current) {
        console.log('Component unmounted before device processing');
        return;
      }

      // Debug: Log the raw device data in detail
      console.group('Raw Device Data from enumerateDevices()');
      console.log('Total devices found:', mediaDevices.length);
      mediaDevices.forEach((device, index) => {
        console.group(`Device ${index + 1}:`);
        console.log('Kind:', device.kind);
        console.log('Device ID:', device.deviceId);
        console.log('Label:', device.label);
        console.log('Group ID:', device.groupId);
        console.groupEnd();
      });
      console.groupEnd();
      
      console.log('Device kinds found:', [...new Set(mediaDevices.map(d => d.kind))]);
      
      const formattedDevices = mediaDevices
        .filter(device => {
          if (!device.deviceId) {
            console.log('Skipping device with no ID:', device);
            return false;
          }
          return true;
        })
        .map(device => {
          const deviceKind = device.kind.toLowerCase();
          let kind: MediaDeviceKind;
          
          if (deviceKind.includes('video')) {
            kind = 'videoinput';
          } else if (deviceKind.includes('audio')) {
            kind = deviceKind.includes('out') ? 'audiooutput' : 'audioinput';
          } else {
            console.warn(`Unknown device kind: ${device.kind}, defaulting to audioinput`);
            kind = 'audioinput';
          }
          
          return {
            deviceId: device.deviceId,
            kind,
            label: device.label || `Unknown ${kind.replace('input', '').replace('output', '')}`,
            groupId: device.groupId,
            isSelected: false,
            toJSON() {
              return {
                deviceId: this.deviceId,
                kind: this.kind,
                label: this.label,
                groupId: this.groupId,
                isSelected: this.isSelected
              };
            }
          };
        });

      // Debug: Log the formatted devices in detail
      console.group('Formatted Devices');
      console.log('Total formatted devices:', formattedDevices.length);
      formattedDevices.forEach((device, index) => {
        console.group(`Device ${index + 1} (${device.kind}):`);
        console.log('Device ID:', device.deviceId);
        console.log('Label:', device.label);
        console.log('Group ID:', device.groupId);
        console.log('Is Selected:', device.isSelected);
        console.groupEnd();
      });
      console.groupEnd();
      
      // Final mounted check before state updates
      if (!isMounted.current) {
        console.log('Component unmounted before updating state');
        return;
      }
      
      // Update devices state
      console.log('Updating devices state with', formattedDevices.length, 'devices');
      setDevices(formattedDevices);
      
      // Update selected devices if not already set
      const audioInputs = formattedDevices.filter(d => d.kind === 'audioinput');
      const videoInputs = formattedDevices.filter(d => d.kind === 'videoinput');
      const audioOutputs = formattedDevices.filter(d => d.kind === 'audiooutput');
      
      console.log('Updating selected devices:', {
        audioInputs: audioInputs.length,
        videoInputs: videoInputs.length,
        audioOutputs: audioOutputs.length
      });
      
      setSelectedDevices(prev => {
        const update = {
          microphoneId: prev.microphoneId || (audioInputs[0]?.deviceId || null),
          cameraId: prev.cameraId || (videoInputs[0]?.deviceId || null),
          speakerId: prev.speakerId || (audioOutputs[0]?.deviceId || null),
        };
        console.log('Selected devices update:', update);
        return update;
      });
      
      setPermissionStatus('granted');
      console.log('Device enumeration completed successfully');
      console.log('5b. Finished processing devices, loading complete');
    } catch (err) {
      if (isMounted.current) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setPermissionStatus('denied');
        } else {
          console.error('Error accessing media devices:', err);
          setError(err instanceof Error ? err : new Error('Failed to access media devices'));
        }
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [isMediaDevicesSupported]);

  // Use a ref to track the initialization state
  const initRef = useRef<boolean>(false);
  const deviceChangeHandler = useRef<(() => void) | null>(null);

  // Set up device change listener and initial enumeration
  useEffect(() => {
    // Skip if not supported
    if (!isMediaDevicesSupported) {
      console.log('MediaDevices API not supported');
      setError(new Error('MediaDevices API is not supported in this browser'));
      setIsLoading(false);
      return;
    }
    
    // Prevent multiple initializations
    if (initRef.current) {
      console.log('Already initialized, skipping...');
      return;
    }

    console.log('Setting up device change listener and performing initial enumeration...');
    initRef.current = true;
    
    // Create a flag to track if we're currently enumerating
    let isEnumerating = false;
    
    // Create a queue for device changes that happen during enumeration
    let pendingDeviceChange = false;
    
    // Mark as mounted at the start of effect
    isMounted.current = true;

    // Wrapper function to handle device changes
    const handleDeviceChange = async () => {
      console.log('Device change handler called, isMounted:', isMounted.current);
      if (!isMounted.current) return;
      
      if (isEnumerating) {
        console.log('Already enumerating, queuing next enumeration...');
        pendingDeviceChange = true;
        return;
      }
      
      try {
        isEnumerating = true;
        console.log('Starting device enumeration...');
        await enumerateDevices();
        console.log('Device enumeration completed');
      } catch (err) {
        console.error('Error in device enumeration:', err);
      } finally {
        isEnumerating = false;
        
        // If a device change happened while we were enumerating, run again
        if (pendingDeviceChange) {
          console.log('Processing queued device change...');
          pendingDeviceChange = false;
          setTimeout(handleDeviceChange, 0);
        }
      }
    };

    // Store the handler in the ref
    deviceChangeHandler.current = handleDeviceChange;

    // Set up the event listener
    console.log('Adding devicechange event listener');
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    // Initial device enumeration
    const initialize = async () => {
      try {
        console.log('Starting initial device enumeration...');
        setIsLoading(true);
        await handleDeviceChange();
      } catch (err) {
        console.error('Error during initial device enumeration:', err);
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error('Failed to enumerate devices'));
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };
    
    // Start the initialization
    console.log('Starting initialization...');
    initialize();

    // Cleanup function
    return () => {
      console.log('Running cleanup...');
      if (deviceChangeHandler.current) {
        console.log('Removing devicechange event listener');
        navigator.mediaDevices.removeEventListener('devicechange', deviceChangeHandler.current);
        deviceChangeHandler.current = null;
      }
      cleanup();
      // Don't set isMounted to false here as it can cause race conditions
      // with async operations that are still in progress
      initRef.current = false;
    };
  }, [isMediaDevicesSupported]);  // Only depends on isMediaDevicesSupported

  // Organize devices by kind - only run after initial load
  const [hasInitialDevices, setHasInitialDevices] = useState(false);
  
  // Log when devices state changes
  useEffect(() => {
    console.group('Devices State Update');
    console.log('Devices array length:', devices.length);
    console.log('Current devices:', devices);
    console.groupEnd();
  }, [devices]);
  
  // Update hasInitialDevices when we first get devices
  useEffect(() => {
    if (devices.length > 0) {
      console.group('Initial Devices Loaded');
      console.log('Number of devices:', devices.length);
      console.log('Current hasInitialDevices:', hasInitialDevices);
      
      if (!hasInitialDevices) {
        console.log('Setting hasInitialDevices to true');
        setHasInitialDevices(true);
      }
      
      console.groupEnd();
    }
  }, [devices.length, hasInitialDevices]);

  const deviceLists = useMemo<DeviceLists>(() => {
    console.group('deviceLists useMemo');
    console.log('hasInitialDevices:', hasInitialDevices);
    console.log('isLoading:', isLoading);
    console.log('devices count:', devices.length);
    
    // Don't process until we've completed initial device loading
    if (!hasInitialDevices || isLoading) {
      console.log('Devices not ready yet, returning empty lists');
      console.groupEnd();
      return { microphones: [], cameras: [], speakers: [] };
    }
    
    console.log('Organizing devices. Device count:', devices.length);
    
    const microphones = devices.filter(d => d.kind === 'audioinput');
    const cameras = devices.filter(d => d.kind === 'videoinput');
    const speakers = devices.filter(d => d.kind === 'audiooutput');
    
    console.group('Devices by type');
    console.log('Microphones:', microphones.length);
    console.log('Cameras:', cameras.length);
    console.log('Speakers:', speakers.length);
    console.log('Other:', devices.length - (microphones.length + cameras.length + speakers.length));
    
    console.group('Device Details');
    console.group('Microphones:');
    microphones.forEach((m, i) => console.log(`${i + 1}. ${m.label || 'Unnamed'} (${m.deviceId})`));
    console.groupEnd();
    
    console.group('Cameras:');
    cameras.forEach((c, i) => console.log(`${i + 1}. ${c.label || 'Unnamed'} (${c.deviceId})`));
    console.groupEnd();
    
    console.group('Speakers:');
    speakers.forEach((s, i) => console.log(`${i + 1}. ${s.label || 'Unnamed'} (${s.deviceId})`));
    console.groupEnd();
    
    console.groupEnd(); // End Device Details
    console.groupEnd(); // End Devices by type
    
    const result = {
      microphones: microphones.map(d => ({
        ...d,
        isSelected: d.deviceId === selectedDevices.microphoneId
      })),
      cameras: cameras.map(d => ({
        ...d,
        isSelected: d.deviceId === selectedDevices.cameraId
      })),
      speakers: speakers.map(d => ({
        ...d,
        isSelected: d.deviceId === selectedDevices.speakerId
      }))
    };
    
    console.log('Organized device lists:', {
      microphones: result.microphones.map(d => `${d.label || 'Unlabeled'} (${d.deviceId})`),
      cameras: result.cameras.map(d => `${d.label || 'Unlabeled'} (${d.deviceId})`),
      speakers: result.speakers.map(d => `${d.label || 'Unlabeled'} (${d.deviceId})`)
    });
    
    console.log('Organized devices:', {
      microphones: result.microphones.map(d => d.label || d.deviceId),
      cameras: result.cameras.map(d => d.label || d.deviceId),
      speakers: result.speakers.map(d => d.label || d.deviceId)
    });
    
    return result;
  }, [devices, selectedDevices, isLoading, hasInitialDevices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up...');
      isMounted.current = false;
      cleanup();
      // Reset initRef when component fully unmounts
      initRef.current = false;
    };
  }, []);

  // Only expose deviceLists after initial load
  const exposedDeviceLists = hasInitialDevices ? deviceLists : { microphones: [], cameras: [], speakers: [] };
  
  return {
    devices,
    deviceLists: exposedDeviceLists,
    selectedDevices,
    selectDevice,
    activeStream,
    permissionStatus,
    isLoading: !hasInitialDevices || isLoading,
    error,
    isMediaDevicesSupported,
  };
};

export default useMediaDevices;
