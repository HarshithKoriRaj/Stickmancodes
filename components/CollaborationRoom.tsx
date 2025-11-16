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

  // Initialize PeerJS
  useEffect(() => {
    const peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('open', (id) => {
      setPeerId(id);
      setMessage(`Your Room Code: ${id}`);
    });

    peer.on('error', (err) => {
      setError(`Peer error: ${err.message}`);
    });

    peer.on('call', (call) => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            // Try to play the local video (autoplay policies may require a user gesture)
            localVideoRef.current.play()?.catch((err) => {
              console.warn('Local video play() failed (autoplay?):', err);
            });
          }
          call.answer(stream);
          callRef.current = call;

          call.on('stream', (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              // Try to play the remote video; catching errors if autoplay is blocked
              remoteVideoRef.current.play()?.catch((err) => {
                console.warn('Remote video play() failed (autoplay?):', err);
              });
            }
          });
        })
        .catch((err) => {
          setError(`Camera error: ${err.message}`);
        });
    });

    peer.on('connection', (conn) => {
      connectionRef.current = conn;
      setIsConnected(true);
      setMessage('Connected! Use your hands to draw!');

      conn.on('data', (data) => {
        const action = data as DrawAction;
        if (action.type === 'draw' && action.x !== undefined && action.y !== undefined && action.prevX !== undefined && action.prevY !== undefined) {
          drawLine(action.prevX, action.prevY, action.x, action.y, action.color || '#FF0000', action.lineWidth || 3);
        } else if (action.type === 'clear') {
          clearCanvas();
        }
      });

      conn.on('close', () => {
        setIsConnected(false);
        setMessage('Connection closed');
      });
    });

    peerRef.current = peer;

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      // Clear video srcObjects to release resources
      if (localVideoRef.current) {
        try { localVideoRef.current.pause(); } catch (e) {}
        // @ts-ignore
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        try { remoteVideoRef.current.pause(); } catch (e) {}
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
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctxRef.current = ctx;
      }
    }
  }, []);

  // Initialize Hand Tracking
  useEffect(() => {
    if (!localStream || !handTrackingEnabled || typeof Hands === 'undefined') return;

    const hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results: any) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        processHandGesture(landmarks);
      }
    });

    handsRef.current = hands;

    // Start hand detection loop
    const detectHands = async () => {
      if (localVideoRef.current && localVideoRef.current.readyState === 4) {
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

  const processHandGesture = (landmarks: any[]) => {
    // Index finger tip (landmark 8) and thumb tip (landmark 4)
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];

    // Calculate distance between index and thumb (pinch detection)
    const distance = Math.sqrt(
      Math.pow(indexTip.x - thumbTip.x, 2) +
      Math.pow(indexTip.y - thumbTip.y, 2)
    );

    const isPinched = distance < 0.05; // Pinch threshold
    setIsPinching(isPinched);

    if (!canvasRef.current) return;

    // Map video coordinates to canvas coordinates
    const canvas = canvasRef.current;
    const x = indexTip.x * canvas.width;
    const y = indexTip.y * canvas.height;

    if (isPinched) {
      if (lastPosRef.current) {
        // Draw line from last position to current
        drawLine(lastPosRef.current.x, lastPosRef.current.y, x, y, drawColor, lineWidth);

        // Send to remote peer
        if (connectionRef.current && isConnected) {
          connectionRef.current.send({
            type: 'draw',
            prevX: lastPosRef.current.x,
            prevY: lastPosRef.current.y,
            x,
            y,
            color: drawColor,
            lineWidth,
          });
        }
      }
      lastPosRef.current = { x, y };
    } else {
      lastPosRef.current = null;
    }

    // Draw finger indicator
    const ctx = ctxRef.current;
    if (ctx) {
      // Draw a circle at finger position
      ctx.save();
      ctx.strokeStyle = isPinched ? '#00FF00' : '#FFFF00';
      ctx.fillStyle = isPinched ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 255, 0, 0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, isPinched ? 12 : 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  };

  const createRoom = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Attempt to play the video after setting the srcObject
        localVideoRef.current.play()?.catch((err) => {
          console.warn('createRoom: local video play() failed (autoplay?):', err);
        });
      }
      setMessage(`Room created! Share this code: ${peerId.substring(0, 8)}`);
    } catch (err: any) {
      setError(`Failed to access camera: ${err.message}`);
    }
  };

  const joinRoom = async () => {
    if (!remotePeerId.trim()) {
      setError('Please enter a room code');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play()?.catch((err) => {
          console.warn('joinRoom: local video play() failed (autoplay?):', err);
        });
      }

      if (!peerRef.current) {
        setError('Peer not initialized');
        return;
      }

      const call = peerRef.current.call(remotePeerId, stream);
      callRef.current = call;

      call.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          // Try to play the remote audio/video (autoplay may require gesture or user interaction)
          remoteVideoRef.current.play()?.catch((err) => {
            console.warn('joinRoom: remote video play() failed (autoplay?):', err);
          });
        }
      });

      const conn = peerRef.current.connect(remotePeerId);
      connectionRef.current = conn;

      conn.on('open', () => {
        setIsConnected(true);
        setMessage('Connected! Use your hands to draw!');
      });

      conn.on('data', (data) => {
        const action = data as DrawAction;
        if (action.type === 'draw' && action.x !== undefined && action.y !== undefined && action.prevX !== undefined && action.prevY !== undefined) {
          drawLine(action.prevX, action.prevY, action.x, action.y, action.color || '#FF0000', action.lineWidth || 3);
        } else if (action.type === 'clear') {
          clearCanvas();
        }
      });

      conn.on('close', () => {
        setIsConnected(false);
        setMessage('Connection closed');
      });
    } catch (err: any) {
      setError(`Failed to join: ${err.message}`);
    }
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, width: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (handTrackingEnabled) return; // Ignore mouse when hand tracking is on
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    lastPosRef.current = { x, y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (handTrackingEnabled) return; // Ignore mouse when hand tracking is on
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
      });
    }

    lastPosRef.current = { x, y };
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearCanvas = () => {
    clearCanvas();
    if (connectionRef.current && isConnected) {
      connectionRef.current.send({ type: 'clear' });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-2xl p-6">
        <h2 className="text-3xl font-bold text-purple-900 mb-2">👥 Collaboration Room - Draw with Your Hands! 👆</h2>
        <p className="text-gray-700 mb-4">Connect with a friend and use hand gestures to draw annotations together in real-time!</p>

        {/* Hand Tracking Toggle */}
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-4 mb-4 border-2 border-yellow-400">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-orange-900 flex items-center gap-2">
                ✋ Hand Tracking Mode
                {isPinching && <span className="text-green-600 animate-pulse">(Pinching - Drawing!)</span>}
              </h3>
              <p className="text-sm text-orange-800">
                {handTrackingEnabled ? '👆 Point with index finger. Pinch thumb + index to draw!' : '🖱️ Use mouse to draw'}
              </p>
            </div>
            <button
              onClick={() => setHandTrackingEnabled(!handTrackingEnabled)}
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
          onClick={() => setShowInstructions(!showInstructions)}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          {showInstructions ? 'Hide Instructions' : 'How to Use Hand Tracking'}
        </button>

        {showInstructions && (
          <div className="bg-white rounded-lg p-4 mb-4 border-2 border-blue-300">
            <h3 className="font-bold text-lg text-blue-900 mb-2">Hand Tracking Instructions:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li><strong>Show Your Hand:</strong> Hold your hand in front of the webcam with palm facing camera</li>
              <li><strong>Point:</strong> Extend your index finger (the finger indicator will appear)</li>
              <li><strong>Draw:</strong> Pinch your thumb and index finger together - you'll see a green circle when pinching!</li>
              <li><strong>Move:</strong> While pinching, move your hand to draw on the canvas</li>
              <li><strong>Stop Drawing:</strong> Release the pinch (open thumb and index finger)</li>
              <li><strong>Change Colors:</strong> Use the color buttons below while not pinching</li>
              <li><strong>Fallback:</strong> If hand tracking doesn't work, toggle to Mouse Mode</li>
            </ol>
            <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-500">
              <p className="text-sm text-yellow-800"><strong>Tips:</strong> Keep your hand steady, ensure good lighting, and keep your hand within the camera frame!</p>
            </div>
          </div>
        )}

        {/* Status & Controls */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <div className="flex flex-wrap gap-3 items-center mb-3">
            <div className="flex-1 min-w-[200px]">
              <div className="text-xs text-gray-600 mb-1">Your Room Code (Share this!)</div>
              <div className="text-lg font-bold text-purple-900 bg-purple-100 rounded-lg p-2 border border-purple-300 select-all">
                {peerId ? peerId.substring(0, 8) : 'Loading...'}
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
              <label className="block text-xs text-gray-600 mb-1">Enter Room Code to Join:</label>
              <input
                type="text"
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
                placeholder="Paste room code here"
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
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-sm font-semibold text-gray-700">{message}</span>
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
              <span className="text-sm text-gray-600">{lineWidth}px</span>
            </label>

            <button
              onClick={handleClearCanvas}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Clear Canvas
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setDrawColor('#FF0000')}
                className="w-8 h-8 bg-red-500 rounded-full border-2 border-gray-300 hover:border-gray-600"
                title="Red"
              />
              <button
                onClick={() => setDrawColor('#00FF00')}
                className="w-8 h-8 bg-green-500 rounded-full border-2 border-gray-300 hover:border-gray-600"
                title="Green"
              />
              <button
                onClick={() => setDrawColor('#0000FF')}
                className="w-8 h-8 bg-blue-500 rounded-full border-2 border-gray-300 hover:border-gray-600"
                title="Blue"
              />
              <button
                onClick={() => setDrawColor('#FFFF00')}
                className="w-8 h-8 bg-yellow-400 rounded-full border-2 border-gray-300 hover:border-gray-600"
                title="Yellow"
              />
              <button
                onClick={() => setDrawColor('#000000')}
                className="w-8 h-8 bg-black rounded-full border-2 border-gray-300 hover:border-gray-600"
                title="Black"
              />
              <button
                onClick={() => setDrawColor('#FFFFFF')}
                className="w-8 h-8 bg-white rounded-full border-2 border-gray-600 hover:border-gray-800"
                title="White"
              />
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Local Video with Canvas Overlay */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-2">
              Your Video + Annotations
              {handTrackingEnabled && <span className="ml-2 text-xs text-green-600">(✋ Hand Tracking Active)</span>}
            </h3>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`absolute top-0 left-0 w-full h-full ${handTrackingEnabled ? 'cursor-default' : 'cursor-crosshair'}`}
              />
            </div>
          </div>

          {/* Remote Video */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-2">Partner's Video</h3>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
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
            <>👆 <strong>Point with your index finger and pinch to draw!</strong> Both users will see annotations in real-time. Voice chat is automatically enabled.</>
          ) : (
            <>🖱️ <strong>Click and drag to draw with mouse.</strong> Both users will see annotations in real-time. Voice chat is automatically enabled.</>
          )}
        </div>
      </div>
    </div>
  );
};
