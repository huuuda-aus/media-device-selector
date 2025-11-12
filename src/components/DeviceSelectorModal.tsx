import React, { useCallback, useEffect, useRef, useState } from "react";
import useMediaDevices, {
  type UseMediaDevicesOptions,
} from "../hooks/useMediaDevices";
import type { MediaDeviceKind, SelectedDevices } from "../types";
import "../styles/index.css";

interface DeviceSelectorModalProps {
  theme?: "light" | "dark";
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
  theme = "light",
  onSelectionComplete,
  renderButton,
  targetMediaRef,
  showCameraPreview = true,
  includeCamera,
  className = "",
  style = {},
  isOpen: isOpenProp,
  onClose,
}) => {
  const [isOpenState, setIsOpenState] = useState(false);
  const [, setAnalyser] = useState<AnalyserNode | null>(null);
  const [, setAudioContext] = useState<AudioContext | null>(null);
  const [, setDataArray] = useState<Uint8Array | null>(null);
  const [volume, setVolume] = useState(0);
  const [systemVolume, setSystemVolume] = useState(1);
  const animationFrameId = useRef<number>();
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
    isMediaDevicesSupported,
  } = useMediaDevices(options);

  // Get system microphone volume when the component mounts or when the selected device changes
  useEffect(() => {
    const getSystemVolume = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedDevices.microphoneId
              ? { exact: selectedDevices.microphoneId }
              : undefined,
          },
        });

        // Create a temporary audio context to check volume
        const AudioContext =
          window.AudioContext || (window as any).webkitAudioContext;
        const tempCtx = new AudioContext();
        const source = tempCtx.createMediaStreamSource(stream);
        const gainNode = tempCtx.createGain();

        source.connect(gainNode);

        // Get the current gain value (system volume)
        const currentGain = gainNode.gain.value;
        setSystemVolume(currentGain);

        // Clean up
        source.disconnect();
        gainNode.disconnect();
        await tempCtx.close();

        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        console.error("Error getting system volume:", error);
        // Fallback to 100% if we can't get the system volume
        setSystemVolume(1.0);
      }
    };

    if (isOpen && selectedDevices.microphoneId) {
      getSystemVolume();
    }
  }, [isOpen, selectedDevices.microphoneId]);

  // Get a fresh stream for the selected microphone
  const getFreshStream = useCallback(async (deviceId: string) => {
    if (!deviceId) return null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          // These constraints help with getting consistent audio levels
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });

      if (stream.getAudioTracks().length === 0) {
        console.warn("No audio tracks in stream");
        stream.getTracks().forEach((track) => track.stop());
        return null;
      }

      // Create a dummy audio element to keep the stream active
      const audio = new Audio();
      audio.srcObject = stream;
      audio.muted = true;

      // Store the audio element for cleanup
      const audioElementRef = { current: audio };
      audio.play().catch((e) => {
        console.error("Error playing audio:", e);
        // Clean up if playback fails
        audioElementRef.current.srcObject = null;
        stream.getTracks().forEach((track) => track.stop());
        return null;
      });

      // Return cleanup function along with the stream
      return {
        stream,
        cleanup: async () => {
          try {
            audioElementRef.current.pause();
            audioElementRef.current.srcObject = null;
            stream.getTracks().forEach((track) => track.stop());
          } catch (e) {
            console.error("Error cleaning up audio:", e);
          }
        },
      };
    } catch (error) {
      console.error("Error getting fresh stream:", error);
      return null;
    }
  }, []);

  // Removed cameraStreamRef; we rely on activeStream from the hook for preview

  // Track audio stream separately from the camera stream
  const audioStreamRef = useRef<{
    stream: MediaStream;
    cleanup: () => void;
  } | null>(null);

  // Handle microphone stream initialization and cleanup
  useEffect(() => {
    if (!isOpen || !selectedDevices.microphoneId) {
      // Clean up any existing audio stream
      if (audioStreamRef.current) {
        audioStreamRef.current.cleanup();
        audioStreamRef.current = null;
      }
      setVolume(0);
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;
    let animationFrameId: number | null = null;
    let audioSource: MediaStreamAudioSourceNode | null = null;
    let isMounted = true;

    const analyzeAudio = () => {
      if (!isMounted || !analyser || !dataArray) return;

      try {
        analyser.getByteFrequencyData(
          dataArray as unknown as Uint8Array<ArrayBuffer>,
        );

        // Calculate average volume
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;

        // Normalize to 0-1 range and update state
        setVolume(avg / 255);

        animationFrameId = requestAnimationFrame(analyzeAudio);
      } catch (error) {
        console.error("Error in audio analysis:", error);
      }
    };

    const setupAudioAnalysis = async (stream: MediaStream) => {
      if (stream.getAudioTracks().length === 0) {
        console.warn("No audio tracks available for analysis");
        return;
      }

      try {
        // Create audio context and nodes
        audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        // Connect the audio source to the analyser
        audioSource = audioContext.createMediaStreamSource(stream);
        audioSource.connect(analyser);

        // Create data array for frequency data
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        // Start the analysis loop
        animationFrameId = requestAnimationFrame(analyzeAudio);
      } catch (error) {
        console.error("Error setting up audio analysis:", error);
      }
    };

    const initializeMicrophone = async () => {
      if (!isMounted) return;

      try {
        // Only reinitialize if microphone device changed
        const currentDeviceId = audioStreamRef.current?.stream
          .getAudioTracks()[0]
          ?.getSettings().deviceId;
        if (
          audioStreamRef.current &&
          currentDeviceId === selectedDevices.microphoneId
        ) {
          return; // Already using the correct device
        }

        // Clean up existing stream if any
        if (audioStreamRef.current) {
          audioStreamRef.current.cleanup();
          audioStreamRef.current = null;
        }

        // Get new microphone stream
        const result = await getFreshStream(selectedDevices.microphoneId!);

        if (!result || !isMounted) {
          if (result) result.cleanup();
          return;
        }

        audioStreamRef.current = result;

        // Set up audio analysis if we have audio tracks
        if (result.stream.getAudioTracks().length > 0) {
          await setupAudioAnalysis(result.stream);
        }
      } catch (error) {
        console.error("Error initializing microphone:", error);
      }
    };

    // Initialize microphone with a small delay to prevent UI jank
    const initTimer = setTimeout(() => {
      if (isMounted) {
        initializeMicrophone().catch(console.error);
      }
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);

      // Clean up audio analysis
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Disconnect audio nodes
      if (audioSource && analyser) {
        audioSource.disconnect(analyser);
      }

      // Close audio context
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(console.error);
      }

      // Clean up audio stream (the cleanup function will handle stopping tracks)
      if (audioStreamRef.current) {
        audioStreamRef.current.cleanup();
        audioStreamRef.current = null;
      }

      // Reset volume when cleaning up
      setVolume(0);
    };
  }, [isOpen, selectedDevices.microphoneId, getFreshStream]);

  // Removed standalone camera initialization effect to avoid conflicts with activeStream and prevent flicker

  // Removed redundant microphone reinitialization effect that caused stream churn when selecting camera

  // Handle microphone volume analysis - only when modal is open
  useEffect(() => {
    if (!isOpen || !selectedDevices.microphoneId || !activeStream) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = undefined;
      }
      return;
    }

    // Validate stream before using
    const isValidStream =
      activeStream instanceof MediaStream &&
      typeof (activeStream as any).getAudioTracks === "function" &&
      typeof (activeStream as any).getTracks === "function";

    if (!isValidStream) {
      return;
    }

    // Make sure we have audio tracks
    const audioTracks = activeStream.getAudioTracks();
    if (audioTracks.length === 0) {
      return;
    }

    const audioTrack = audioTracks[0];
    if (audioTrack.readyState !== "live") {
      return;
    }

    if (!audioTrack.enabled) {
      audioTrack.enabled = true;
    }

    // Create audio context and analyser
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 64; // Higher fftSize for better frequency resolution
    analyserNode.smoothingTimeConstant = 0.3; // Smoother transitions

    // Make sure we have an active audio track
    const tracks = activeStream.getAudioTracks();
    if (tracks.length === 0) {
      console.log("No audio tracks available for analysis");
      return;
    }

    // Create a new stream with just the audio track to avoid interference
    const audioStream = new MediaStream([activeStream.getAudioTracks()[0]]);
    const source = ctx.createMediaStreamSource(audioStream);
    source.connect(analyserNode);

    // Create a silent destination to prevent audio feedback
    const destination = ctx.createMediaStreamDestination();
    analyserNode.connect(destination);

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    setAudioContext(ctx);
    setAnalyser(analyserNode);
    setDataArray(dataArray);

    // Start the animation loop
    let animationRunning = true;
    let lastLogTime = 0;

    const updateVolume = () => {
      if (!animationRunning) return;

      analyserNode.getByteFrequencyData(
        dataArray as unknown as Uint8Array<ArrayBuffer>,
      );

      // Debug log the first few values of the data array (once per second)
      const now = Date.now();
      if (now - lastLogTime > 1000) {
        lastLogTime = now;
      }

      // Calculate average volume from the frequency data
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }

      const average = sum / bufferLength;

      // Calculate raw volume (0-1)
      const threshold = 50; // Minimum value to consider as sound
      const normalizedVolume =
        average < threshold ? 0 : Math.min(average / 255, 1);

      // Scale the volume by the system volume setting
      const systemScaledVolume = normalizedVolume * systemVolume;

      setVolume((prevVolume) => {
        // Fast response to sound, slow decay
        const newVolume =
          systemScaledVolume > prevVolume
            ? systemScaledVolume // Immediate response to sound
            : Math.max(prevVolume - 0.02, 0); // Slow decay
        return newVolume;
      });

      animationFrameId.current = requestAnimationFrame(updateVolume);
    };

    // Start the volume monitoring
    updateVolume();

    return () => {
      animationRunning = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }

      // Clean up audio nodes
      try {
        source.disconnect();
        analyserNode.disconnect();
        destination.disconnect();

        if (ctx.state !== "closed") {
          ctx.close().catch(console.error);
        }
      } catch (e) {
        console.error("Error cleaning up audio:", e);
      }
    };
  }, [
    activeStream,
    selectedDevices.microphoneId,
    isOpen,
    isMediaDevicesSupported,
    permissionStatus,
  ]);

  // Handle camera preview
  useEffect(() => {
    if (!isOpen) return;

    if (videoRef.current) {
      if (activeStream) {
        videoRef.current.srcObject = activeStream;
      } else if (selectedDevices.cameraId) {
        // Reinitialize the camera if we have a selected camera but no active stream
        selectDevice("videoinput", selectedDevices.cameraId).catch(
          console.error,
        );
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
    if (
      selectedDevices.speakerId &&
      targetMediaRef?.current &&
      "setSinkId" in targetMediaRef.current
    ) {
      try {
        // Type assertion needed because setSinkId is not in the standard HTMLMediaElement type
        (targetMediaRef.current as any).setSinkId(selectedDevices.speakerId);
      } catch (err) {
        // Error setting audio output device
      }
    }
  }, [selectedDevices.speakerId, targetMediaRef]);

  const handleDeviceSelect = async (
    kind: MediaDeviceKind,
    deviceId: string | null,
  ) => {
    if (kind === "videoinput" && deviceId === null) {
      // Handle 'No camera' selection
      if (videoRef.current) {
        // Stop all video tracks
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          videoRef.current.srcObject = null;
        }
      }

      // Update the state to reflect no camera is selected
      setSelectedDevices((prev) => ({
        ...prev,
        cameraId: null,
      }));

      // Also clear any active stream in the parent component
      if (targetMediaRef?.current) {
        if (targetMediaRef.current.srcObject) {
          const stream = targetMediaRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
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

  const renderDeviceList = (
    devices: Array<{
      deviceId: string;
      label: string;
      kind: MediaDeviceKind;
      isSelected?: boolean;
    }>,
    kind: MediaDeviceKind,
  ) => {
    if (isLoading) return <div className="loading">Loading devices...</div>;
    if (error)
      return (
        <div className="error">Error loading devices: {error.message}</div>
      );

    // Volume indicator with system volume as maximum width
    const VolumeIndicator = () => {
      // Scale the volume by the system volume setting
      const scaledVolume = Math.min(volume, systemVolume);
      // Calculate the width as a percentage of the system volume
      const indicatorWidth = (scaledVolume / systemVolume) * 100;

      return (
        <div
          style={{
            width: "100%",
            height: "6px",
            backgroundColor:
              theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
            borderRadius: "3px",
            marginTop: "8px",
            overflow: "hidden",
            position: "relative",
            border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          }}
        >
          {/* System volume limit indicator (shows the maximum possible width) */}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: `${100 - systemVolume * 100}%`,
              backgroundColor:
                theme === "dark" ? "rgba(255,0,0,0.15)" : "rgba(255,0,0,0.05)",
              pointerEvents: "none",
              borderLeft: `1px dashed ${theme === "dark" ? "rgba(255,0,0,0.5)" : "rgba(255,0,0,0.3)"}`,
            }}
          />

          {/* Current volume indicator */}
          <div
            style={{
              width: `${indicatorWidth}%`,
              height: "100%",
              backgroundColor: theme === "dark" ? "#4CAF50" : "#2196F3",
              borderRadius: "2px",
              transition: "width 30ms ease-out",
              boxShadow: "0 0 4px rgba(0,0,0,0.1)",
              minWidth: volume > 0 ? "4px" : "0",
              opacity: volume > 0 ? 1 : 0,
              transitionProperty: "width, opacity",
              transitionDuration: "30ms, 300ms",
              transitionTimingFunction: "ease-out",
              position: "relative",
              zIndex: 1,
            }}
          />
        </div>
      );
    };

    // For camera devices, add a "No camera" option
    const showNoCameraOption = kind === "videoinput" && includeCamera;
    const noCameraOption = {
      deviceId: "",
      label: "No camera",
      kind: "videoinput" as MediaDeviceKind,
      isSelected: selectedDevices.cameraId === null,
    };

    const deviceList = showNoCameraOption
      ? [noCameraOption, ...devices]
      : devices;

    if (deviceList.length === 0)
      return <div className="no-devices">No {kind} devices found</div>;

    return (
      <div className="deviceList">
        {deviceList.map((device) => {
          const isNoCamera = kind === "videoinput" && device.deviceId === "";
          const isDeviceSelected = isNoCamera
            ? selectedDevices.cameraId === null
            : (kind === "audioinput" &&
                selectedDevices.microphoneId === device.deviceId) ||
              (kind === "videoinput" &&
                selectedDevices.cameraId === device.deviceId) ||
              (kind === "audiooutput" &&
                selectedDevices.speakerId === device.deviceId);

          return (
            <div
              key={device.deviceId || "no-camera"}
              className={`deviceItem ${isDeviceSelected ? "selected" : ""}`}
              onClick={() =>
                handleDeviceSelect(kind, isNoCamera ? null : device.deviceId)
              }
            >
              <div className="deviceRadio">
                <div className="radioDot" />
              </div>
              <div className="deviceLabel">
                <div>
                  {device.label ||
                    `Unknown ${kind.replace("input", "").replace("output", "")}`}
                </div>
                {kind === "audioinput" && isDeviceSelected && (
                  <VolumeIndicator />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDeviceLists = () => {
    if (isLoading) return <div className="loading">Loading devices...</div>;
    if (error)
      return (
        <div className="error">Error loading devices: {error.message}</div>
      );

    // Filter devices by kind
    const microphones = deviceLists.filter(
      (device) => device.kind === "audioinput",
    );
    const cameras = deviceLists.filter(
      (device) => device.kind === "videoinput",
    );
    const speakers = deviceLists.filter(
      (device) => device.kind === "audiooutput",
    );

    return (
      <div className="deviceListsContainer">
        {includeCamera && (
          <div className="deviceSection">
            <h3>Camera</h3>
            {renderDeviceList(cameras, "videoinput")}
          </div>
        )}
        <div className="deviceSection">
          <h3>Microphone</h3>
          {renderDeviceList(microphones, "audioinput")}
        </div>
        {speakers.length > 0 && (
          <div className="deviceSection">
            <h3>Speaker</h3>
            {renderDeviceList(speakers, "audiooutput")}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (!isMediaDevicesSupported) {
      return (
        <div className="unsupported">
          Your browser doesn't support the MediaDevices API. Please use a modern
          browser.
        </div>
      );
    }

    if (permissionStatus === "denied") {
      return (
        <div className="permission-denied">
          <h3>Permission Required</h3>
          <p>
            Please allow access to your camera and microphone in your browser
            settings and refresh the page.
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
                    width: "100%",
                    backgroundColor: "#000",
                    borderRadius: "4px",
                    display: selectedDevices.cameraId ? "block" : "none",
                  }}
                />
              ) : (
                <div className="noCameraSelected">No camera selected</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const modalClasses = ["modal", `theme-${theme}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {renderButton && (
        <button onClick={handleOpen} className="open-button" style={style}>
          {renderButton}
        </button>
      )}
      {isOpen && (
        <div className="modal-overlay" onClick={handleClose}>
          <div
            className={modalClasses}
            style={style}
            onClick={(e) => e.stopPropagation()}
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
              <button onClick={handleClose} className="button button-secondary">
                Cancel
              </button>
              <button onClick={handleConfirm} className="button button-primary">
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
