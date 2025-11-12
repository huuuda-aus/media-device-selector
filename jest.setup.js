import "@testing-library/jest-dom";

// Mock devices
const mockDevices = [
  {
    deviceId: "mic1",
    kind: "audioinput",
    label: "Microphone 1",
    groupId: "mic1-group",
  },
  {
    deviceId: "mic2",
    kind: "audioinput",
    label: "Microphone 2",
    groupId: "mic2-group",
  },
  {
    deviceId: "cam1",
    kind: "videoinput",
    label: "Camera 1",
    groupId: "cam1-group",
  },
  {
    deviceId: "speaker1",
    kind: "audiooutput",
    label: "Speaker 1",
    groupId: "speaker1-group",
  },
];

// Mock MediaStream
class MockMediaStream {
  tracks = [];

  constructor(tracks = []) {
    this.tracks = tracks;
  }

  getTracks() {
    return this.tracks;
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === "audio");
  }

  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === "video");
  }
}

// Create a mock event target for devicechange events
class MockEventTarget {
  listeners = new Map();

  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  dispatchEvent(event) {
    if (this.listeners.has(event.type)) {
      this.listeners.get(event.type).forEach((callback) => {
        if (typeof callback === "function") {
          callback(event);
        } else if (typeof callback.handleEvent === "function") {
          callback.handleEvent(event);
        }
      });
    }
    return true;
  }
}

// Mock the MediaDevices API
const mockMediaDevices = new MockEventTarget();
Object.assign(mockMediaDevices, {
  enumerateDevices: jest.fn().mockResolvedValue(mockDevices),
  getUserMedia: jest.fn().mockResolvedValue(new MockMediaStream()),
  ondevicechange: null,
});

// Mock the HTMLMediaElement setSinkId
Object.defineProperty(HTMLMediaElement.prototype, "setSinkId", {
  value: jest.fn().mockResolvedValue(undefined),
  writable: true,
});

// Set up the mock
Object.defineProperty(globalThis.navigator, "mediaDevices", {
  value: mockMediaDevices,
  writable: true,
  configurable: true,
});

// Add a helper to reset all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();

  // Reset the mock implementations
  mockMediaDevices.enumerateDevices.mockResolvedValue(mockDevices);
  mockMediaDevices.getUserMedia.mockResolvedValue(new MockMediaStream());

  // Reset the event listeners
  mockMediaDevices.listeners = new Map();
  mockMediaDevices.ondevicechange = null;
});
