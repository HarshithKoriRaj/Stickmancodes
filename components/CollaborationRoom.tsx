import React, { useState, useRef, useEffect } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';

// Declare MediaPipe types from CDN
declare const Hands: any;
declare const HAND_CONNECTIONS: any;

type DrawAction = {
  type: 'draw' | 'clear';
  x?: number;
  y?: number;
  prevX?: number;
  prevY?: number;
  color?: string;
  lineWidth?: number;
};

export const CollaborationRoom: React.FC = () => {
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('Create or join a room to start');
  const [drawColor, setDrawColor] = useState<string>('#FF0000');
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [handTrackingEnabled, setHandTrackingEnabled] = useState(true);
  const [isPinching, setIsPinching] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const handsRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // ---------- PeerJS initialisation ----------
  useEffect(() => {
    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
      },
      debug: 2,
    });

    peer.on('open', (id) => {
      console.log('[PeerJS] Open with ID:', id);
      setPeerId(id);
      setMessage(`Your Room Code: ${id}`);
      setError('');
    });

    peer.on('error', (err) => {
      console.error('[PeerJS Error]', err);
      setError(`Peer error: ${err.type} - ${err.message || 'Unknown error'}`);
    });

    // Incoming call (remote peer calls you)
    peer.on('call', (call) => {
      console.log('[PeerJS] Incoming call from', call.peer);
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current
              .play()
              .catch((err) => console.warn('Local video play() failed:', err));
          }

          call.answer(stream);
          callRef.current = call;

          call.on('stream', (remoteStream) => {
            console.log('[Call] Received remote stream');
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current
                .play()
                .catch((err) => console.warn('Remote video play() failed:', err));
            }
          });

          call.on('close', () => {
            console.log('[Call Closed]');
            setMessage('Call ended');
          });

          call.on('error', (err) => {
            console.error('[Call Error]', err);
            setError(`Call error: ${err.message}`);
          });
        })
        .catch((err) => {
          console.error('[getUserMedia Error]', err);
          setError(`Camera error: ${err.message}`);
        });
    });

    // Incoming data connection (remote peer connects for drawing)
    peer.on('connection', (conn) => {
      console.log('[PeerJS] Incoming data connection from', conn.peer);
      connectionRef.current = conn;
      setIsConnected(true);
      setMessage('✅ Connected! Use your hands to draw!');
      setError('');

      conn.on('data', (data) => {
        const action = data as DrawAction;
        if (
          action.type === 'draw' &&
          action.x !== undefined &&
          action.y !== undefined &&
          action.prevX !== undefined &&
          action.prevY !== undefined
        ) {
          drawLine(
            action.prevX,
            action.prevY,
            action.x,
            action.y,
            action.color || '#FF0000',
            action.lineWidth || 3,
          );
        } else if (action.type === 'clear') {
          clearCanvas();
        }
      });

      conn.on('close', () => {
        console.log('[Data Connection Closed]');
        setIsConnected(false);
        setMessage('Connection closed');
      });

      conn.on('error', (err) => {
        console.error('[Data Connection Error]', err);
        setError(`Connection error: ${err.message}`);
      });
    });

    peerRef.current = peer;

    return () => {
      console.log('[Cleanup] Destroying peer and streams');
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      if (localVideoRef.current) {
        try {
          localVideoRef.current.pause();
        } catch {}
        // @ts-ignore
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        try {
          remoteVideoRef.current.pause();
        } catch {}
        // @ts-ignore
        remoteVideoRef.current.srcObject = null;
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Canvas init ----------
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctxRef.current = ctx;
      }
    }
  }, []);

  // ---------- Hand tracking init ----------
  useEffect(() => {
    if (!localStream || !handTrackingEnabled || typeof Hands === 'undefined') {
      return;
    }

    const hands = new Hands({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results: any) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        processHandGesture(landmarks);
      } else {
        setIsPinching(false);
        lastPosRef.current = null;
      }
    });

    handsRef.current = hands;

    const detectHands = async () => {
      if (
        localVideoRef.current &&
        localVideoRef.current.readyState === 4 // HAVE_ENOUGH_DATA
      ) {
        await hands.send({ image: localVideoRef.current });
      }
      animationFrameRef.current = requestAnimationFrame(detectHands);
    };

    detectHands();

    return () => {
      if (handsRef.current) {
        handsRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [localStream, handTrackingEnabled]);

  // ---------- Gesture processing ----------
  const processHandGesture = (landmarks: any[]) => {
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];

    const distance = Math.sqrt(
      Math.pow(indexTip.x - thumbTip.x, 2) +
      Math.pow(indexTip.y - thumbTip.y, 2),
    );
    const pinched = distance < 0.05;
    setIsPinching(pinched);

    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // mirror X to match mirrored webcam
    const x = (1 - indexTip.x) * canvas.width;
    const y = indexTip.y * canvas.height;

    if (pinched) {
      if (lastPosRef.current) {
        drawLine(
          lastPosRef.current.x,
          lastPosRef.current.y,
          x,
          y,
          drawColor,
          lineWidth,
        );

        if (connectionRef.current && isConnected) {
          connectionRef.current.send({
            type: 'draw',
            prevX: lastPosRef.current.x,
            prevY: lastPosRef.current.y,
            x,
            y,
            color: drawColor,
            lineWidth,
          } as DrawAction);
        }
      }
      lastPosRef.current = { x, y };
    } else {
      lastPosRef.current = null;
    }
  };

  // ---------- Room actions ----------
  const createRoom = async () => {
    try {
      if (!peerId) {
        setError('Room code not ready yet. Wait a moment and try again.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current
          .play()
          .catch((err) =>
            console.warn('createRoom: local video play() failed:', err),
          );
      }
      setMessage(`Room created! Share this code: ${peerId}`);
      setError('');
    } catch (err: any) {
      console.error('[createRoom Error]', err);
      setError(`Failed to access camera: ${err.message}`);
    }
  };

  const joinRoom = async () => {
    const roomCode = remotePeerId.trim();
    if (!roomCode) {
      setError('Please enter a room code');
      return;
    }

    // NOTE: PeerJS IDs can be more than just strict A-Z0-9 if custom; keep simple but not too strict:
    if (!/^[a-zA-Z0-9\-]+$/.test(roomCode)) {
      setError('Invalid room code format.');
      return;
    }

    if (!peerRef.current) {
      setError('Peer not initialized. Refresh the page.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current
          .play()
          .catch((err) =>
            console.warn('joinRoom: local video play() failed:', err),
          );
      }

      setMessage('Connecting to room...');
      setError('');

      // 1) Start media call
      const call = peerRef.current.call(roomCode, stream);
      callRef.current = call;

      call.on('stream', (remoteStream) => {
        console.log('[Call] Remote stream received');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current
            .play()
            .catch((err) =>
              console.warn('joinRoom: remote video play() failed:', err),
            );
        }
        setMessage('Video connected! Establishing drawing channel...');
      });

      call.on('close', () => {
        console.log('[Call Closed]');
        setIsConnected(false);
        setMessage('Call ended');
      });

      call.on('error', (err) => {
        console.error('[Call Error]', err);
        setError(`Call error: ${err.message}`);
      });

      // 2) Start data connection
      const conn = peerRef.current.connect(roomCode);
      connectionRef.current = conn;

      conn.on('open', () => {
        console.log('[Data Connection] Open');
        setIsConnected(true);
        setMessage('✅ Connected! Use your hands to draw!');
      });

      conn.on('data', (data) => {
        const action = data as DrawAction;
        if (
          action.type === 'draw' &&
          action.x !== undefined &&
          action.y !== undefined &&
          action.prevX !== undefined &&
          action.prevY !== undefined
        ) {
          drawLine(
            action.prevX,
            action.prevY,
            action.x,
            action.y,
            action.color || '#FF0000',
            action.lineWidth || 3,
          );
        } else if (action.type === 'clear') {
          clearCanvas();
        }
      });

      conn.on('close', () => {
        console.log('[Data Connection Closed]');
        setIsConnected(false);
        setMessage('Connection closed');
      });

      conn.on('error', (err) => {
        console.error('[Data Connection Error]', err);
        setError(`Connection error: ${err.message}`);
      });
    } catch (err: any) {
      console.error('[joinRoom Error]', err);
      setError(`Failed to join: ${err.message}`);
      setMessage('Failed to access camera');
    }
  };

  // ---------- Drawing helpers ----------
  const drawLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width: number,
  ) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Mouse drawing (fallback mode)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (handTrackingEnabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    lastPosRef.current = { x, y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (handTrackingEnabled) return;
    if (!isDrawing || !lastPosRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    drawLine(lastPosRef.current.x, lastPosRef.current.y, x, y, drawColor, lineWidth);

    if (connectionRef.current && isConnected) {
      connectionRef.current.send({
        type: 'draw',
        prevX: lastPosRef.current.x,
        prevY: lastPosRef.current.y,
        x,
        y,
        color: drawColor,
        lineWidth,
      } as DrawAction);
    }

    lastPosRef.current = { x, y };
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const handleClearCanvas = () => {
    clearCanvas();
    if (connectionRef.current && isConnected) {
      connectionRef.current.send({ type: 'clear' } as DrawAction);
    }
  };

  // ---------- JSX ----------
  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-2xl p-6">
        <h2 className="text-3xl font-bold text-purple-900 mb-2">
          👥 Collaboration Room - Draw with Your Hands! 👆
        </h2>
        <p className="text-gray-700 mb-4">
          Connect with a friend and use hand gestures to draw annotations together in real-time!
        </p>

        {/* Hand Tracking Toggle */}
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-4 mb-4 border-2 border-yellow-400">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-orange-900 flex items-center gap-2">
                ✋ Hand Tracking Mode
                {isPinching && (
                  <span className="text-green-600 animate-pulse">
                    (Pinching - Drawing!)
                  </span>
                )}
              </h3>
              <p className="text-sm text-orange-800">
                {handTrackingEnabled
                  ? '👆 Point with index finger. Pinch thumb + index to draw!'
                  : '🖱️ Use mouse to draw'}
              </p>
            </div>
            <button
              onClick={() => setHandTrackingEnabled((prev) => !prev)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                handTrackingEnabled
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {handTrackingEnabled ? '✋ Hand Mode ON' : '🖱️ Mouse Mode'}
            </button>
          </div>
        </div>

        {/* Instructions Toggle */}
        <button
          onClick={() => setShowInstructions((prev) => !prev)}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          {showInstructions ? 'Hide Instructions' : 'How to Use Hand Tracking'}
        </button>

        {showInstructions && (
          <div className="bg-white rounded-lg p-4 mb-4 border-2 border-blue-300">
            <h3 className="font-bold text-lg text-blue-900 mb-2">
              Hand Tracking Instructions:
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>
                <strong>Show Your Hand:</strong> Hold your hand in front of the webcam with palm facing
                camera
              </li>
              <li>
                <strong>Point:</strong> Extend your index finger
              </li>
              <li>
                <strong>Draw:</strong> Pinch your thumb and index finger together
              </li>
              <li>
                <strong>Move:</strong> While pinching, move your hand to draw on the canvas
              </li>
              <li>
                <strong>Stop Drawing:</strong> Release the pinch
              </li>
              <li>
                <strong>Change Colors:</strong> Use the color buttons below
              </li>
              <li>
                <strong>Fallback:</strong> If hand tracking doesn’t work, toggle to Mouse Mode
              </li>
            </ol>
          </div>
        )}

        {/* Status & Controls */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <div className="flex flex-wrap gap-3 items-center mb-3">
            <div className="flex-1 min-w-[200px]">
              <div className="text-xs text-gray-600 mb-1">Your Room Code (share this!)</div>
              <div className="text-sm font-mono font-bold text-purple-900 bg-purple-100 rounded-lg p-2 border border-purple-300 select-all break-all">
                {peerId || 'Loading...'}
              </div>
            </div>

            <button
              onClick={createRoom}
              disabled={!!localStream}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                localStream
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              Create Room
            </button>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-600 mb-1">
                Enter Room Code to Join:
              </label>
              <input
                type="text"
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
                placeholder="Paste full room code here"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <button
              onClick={joinRoom}
              disabled={!remotePeerId.trim() || isConnected}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                !remotePeerId.trim() || isConnected
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Join Room
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
              }`}
            />
            <span className="text-sm font-semibold text-gray-700">
              {message}
            </span>
          </div>

          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg p-2 border border-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Drawing Tools */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-3">Drawing Tools</h3>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2">
              <span className="text-sm font-semibold">Color:</span>
              <input
                type="color"
                value={drawColor}
                onChange={(e) => setDrawColor(e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center gap-2">
              <span className="text-sm font-semibold">Line Width:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                className="w-32"
              />
            </label>

            <button
              onClick={handleClearCanvas}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Clear Canvas
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Local video + canvas */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-2">
              Your Video + Annotations
              {handTrackingEnabled && (
                <span className="ml-2 text-xs text-green-600">
                  (✋ Hand Tracking Active)
                </span>
              )}
            </h3>
            <div
              className="relative bg-gray-900 rounded-lg overflow-hidden"
              style={{ aspectRatio: '4 / 3' }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`absolute top-0 left-0 w-full h-full ${
                  handTrackingEnabled ? 'cursor-default' : 'cursor-crosshair'
                }`}
              />
            </div>
          </div>

          {/* Remote video */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-2">Partner&apos;s Video</h3>
            <div
              className="relative bg-gray-900 rounded-lg overflow-hidden"
              style={{ aspectRatio: '4 / 3' }}
            >
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {!isConnected && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                  Waiting for connection...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          {handTrackingEnabled ? (
            <>
              👆 <strong>Point with your index finger and pinch to draw!</strong> Both users
              see annotations in real time. Voice chat is automatically enabled.
            </>
          ) : (
            <>
              🖱️ <strong>Click and drag to draw with mouse.</strong> Both users see
              annotations in real time. Voice chat is automatically enabled.
            </>
          )}
        </div>
      </div>
    </div>
  );
};
