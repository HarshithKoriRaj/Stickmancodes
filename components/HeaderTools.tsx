import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Blob } from '@google/genai';

// Audio utility functions
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface HeaderToolsProps {
  onOpenWhiteboard?: () => void;
}

export const HeaderTools: React.FC<HeaderToolsProps> = ({ onOpenWhiteboard }) => {
  // Voice Assistant State
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState<Array<{ speaker: 'user' | 'ai'; text: string }>>([]);
  const [countdown, setCountdown] = useState<number>(5);

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const nextStartTimeRef = useRef<number>(0);
  const currentInputTranscriptionRef = useRef<string>('');
  const currentOutputTranscriptionRef = useRef<string>('');
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Whiteboard State
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    // Clear auto-stop timer
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }

    // Clear countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Stop all audio sources
    sourcesRef.current.forEach((source) => source.stop());
    sourcesRef.current.clear();

    // Close session
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then((session: any) => {
        if (session && typeof session.close === 'function') {
          session.close();
        }
      });
      sessionPromiseRef.current = null;
    }

    // Disconnect audio nodes
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    // Close audio contexts
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Reset transcription refs
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    nextStartTimeRef.current = 0;

    // Reset countdown
    setCountdown(5);
  };

  const toggleVoiceAssistant = async () => {
    if (status === 'idle') {
      setStatus('connecting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        startSession(stream);
      } catch (error) {
        console.error('Microphone access denied:', error);
        setStatus('idle');
      }
    } else {
      cleanup();
      setStatus('idle');
    }
  };

  const startSession = async (stream: MediaStream) => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCe2jIJqoeAHvqpT4i8ydmepfs_0GQ76OA';
      const ai = new GoogleGenAI({ apiKey });
      mediaStreamRef.current = stream;

      inputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 24000 });
      const outputNode = outputAudioContextRef.current.createGain();
      outputNode.connect(outputAudioContextRef.current.destination);

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are Stickman, a friendly and energetic AI assistant for STICKMAN CODES - an interactive coding game platform! You help players learn programming concepts through fun games. Keep your answers concise, encouraging, and beginner-friendly. Use emojis occasionally and be enthusiastic about coding!',
        },
        callbacks: {
          onopen: () => {
            setStatus('listening');
            setCountdown(5);

            // Start countdown interval (update every second)
            let timeLeft = 5;
            countdownIntervalRef.current = setInterval(() => {
              timeLeft -= 1;
              setCountdown(timeLeft);
              if (timeLeft <= 0) {
                if (countdownIntervalRef.current) {
                  clearInterval(countdownIntervalRef.current);
                  countdownIntervalRef.current = null;
                }
              }
            }, 1000);

            // Start 5-second auto-stop timer
            autoStopTimerRef.current = setTimeout(() => {
              cleanup();
              setStatus('idle');
            }, 5000);

            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(v => v * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
              setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last?.speaker === 'user') {
                  return [...prev.slice(0, -1), { speaker: 'user', text: currentInputTranscriptionRef.current }];
                }
                return [...prev, { speaker: 'user', text: currentInputTranscriptionRef.current }];
              });
            }
            if (message.serverContent?.outputTranscription) {
              // Clear the auto-stop timer when AI starts speaking
              if (autoStopTimerRef.current) {
                clearTimeout(autoStopTimerRef.current);
                autoStopTimerRef.current = null;
              }
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }

              setStatus('speaking');
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
              setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last?.speaker === 'ai') {
                  return [...prev.slice(0, -1), { speaker: 'ai', text: currentOutputTranscriptionRef.current }];
                }
                return [...prev, { speaker: 'ai', text: currentOutputTranscriptionRef.current }];
              });
            }
            if (message.serverContent?.turnComplete) {
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
              setStatus('listening');

              // Auto-stop after AI finishes speaking
              setTimeout(() => {
                cleanup();
                setStatus('idle');
              }, 1000);
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const outCtx = outputAudioContextRef.current;
              if(!outCtx) return;

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              source.addEventListener('ended', () => { sourcesRef.current.delete(source); });
              sourcesRef.current.add(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }
          },
          onclose: () => {
            stream.getTracks().forEach((track) => track.stop());
            setStatus('idle');
          },
          onerror: (error: Error) => {
            console.error('Session error:', error);
            stream.getTracks().forEach((track) => track.stop());
            setStatus('idle');
          },
        },
      });
    } catch (error) {
      console.error('Failed to start session:', error);
      setStatus('idle');
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connecting': return 'bg-yellow-500';
      case 'listening': return 'bg-green-500 animate-pulse';
      case 'speaking': return 'bg-blue-500 animate-pulse';
      default: return 'bg-purple-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connecting': return 'Connecting...';
      case 'listening': return `Listening... (${countdown}s)`;
      case 'speaking': return 'Speaking...';
      default: return 'Start Chat';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-3">
      {/* Voice Assistant Widget */}
      <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-xl shadow-2xl border-2 border-purple-300">
        <div className="flex items-center gap-3 p-4">
          {/* Stickman with Mic Icon */}
          <div className="flex-shrink-0">
            <svg viewBox="0 0 100 120" width="60" height="72">
              {/* Stickman */}
              <circle cx="50" cy="20" r="10" fill="white" stroke="white" strokeWidth="2"/>
              <line x1="50" y1="30" x2="50" y2="60" stroke="white" strokeWidth="4"/>
              <line x1="50" y1="40" x2="35" y2="50" stroke="white" strokeWidth="4"/>
              <line x1="50" y1="40" x2="65" y2="50" stroke="white" strokeWidth="4"/>
              <line x1="50" y1="60" x2="35" y2="85" stroke="white" strokeWidth="4"/>
              <line x1="50" y1="60" x2="65" y2="85" stroke="white" strokeWidth="4"/>
              {/* Microphone in hand */}
              <rect x="62" y="45" width="8" height="14" rx="4" fill="#FFD700" stroke="#FFA500" strokeWidth="1.5"/>
              <line x1="66" y1="59" x2="66" y2="64" stroke="#FFA500" strokeWidth="2"/>
              <line x1="63" y1="64" x2="69" y2="64" stroke="#FFA500" strokeWidth="2"/>
              {/* Sound waves */}
              <path d="M 75 50 Q 78 52 75 54" stroke="#FFD700" strokeWidth="2" fill="none" opacity="0.8"/>
              <path d="M 80 48 Q 84 52 80 56" stroke="#FFD700" strokeWidth="2" fill="none" opacity="0.6"/>
            </svg>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-2">
            <div className="text-white font-extrabold text-sm">
              Talk to Stickman!!
            </div>
            <button
              onClick={toggleVoiceAssistant}
              className={`px-4 py-2 rounded-lg font-bold text-white transition-all transform hover:scale-105 ${getStatusColor()}`}
            >
              {status === 'idle' ? '🎙️ Start' : '⏸️ Stop'}
            </button>
            {status !== 'idle' && (
              <div className="text-xs text-white/90 font-semibold">
                {getStatusText()}
              </div>
            )}
          </div>

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsVoiceOpen(!isVoiceOpen)}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
          >
            {isVoiceOpen ? '▼' : '▲'}
          </button>
        </div>

        {/* Transcript Panel */}
        {isVoiceOpen && (
          <div className="bg-white/95 rounded-b-xl p-4 max-h-[400px] overflow-y-auto border-t-2 border-purple-300">
            <h4 className="font-bold text-purple-900 mb-2">Conversation</h4>
            <div className="space-y-2">
              {transcript.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No conversation yet...</p>
              ) : (
                transcript.map((entry, index) => (
                  <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <p className={`max-w-[80%] p-2 rounded-lg text-sm ${
                      entry.speaker === 'user'
                        ? 'bg-purple-100 text-purple-900'
                        : 'bg-blue-100 text-blue-900'
                    }`}>
                      {entry.text}
                    </p>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Interactive Whiteboard Widget */}
      <div className="bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-xl shadow-2xl border-2 border-blue-300">
        <div className="flex items-center gap-3 p-4">
          {/* Whiteboard Icon */}
          <div className="flex-shrink-0">
            <svg viewBox="0 0 100 100" width="60" height="60">
              {/* Whiteboard */}
              <rect x="10" y="20" width="80" height="60" rx="4" fill="white" stroke="#333" strokeWidth="3"/>
              {/* Drawing on board */}
              <path d="M 20 35 Q 30 30 40 35 T 60 35" stroke="#FF6B6B" strokeWidth="2.5" fill="none"/>
              <circle cx="70" cy="45" r="8" stroke="#4ECDC4" strokeWidth="2.5" fill="none"/>
              <path d="M 25 55 L 45 55 L 35 70 Z" stroke="#45B7D1" strokeWidth="2.5" fill="none"/>
              {/* Markers */}
              <rect x="78" y="25" width="4" height="15" rx="2" fill="#FF6B6B"/>
              <rect x="78" y="43" width="4" height="15" rx="2" fill="#4ECDC4"/>
              <rect x="78" y="61" width="4" height="15" rx="2" fill="#45B7D1"/>
            </svg>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-2">
            <div className="text-white font-extrabold text-sm">
              Interactive Board
            </div>
            <button
              onClick={() => onOpenWhiteboard && onOpenWhiteboard()}
              className="px-4 py-2 rounded-lg font-bold bg-white text-blue-600 hover:bg-blue-50 transition-all transform hover:scale-105"
            >
              🎨 Open
            </button>
          </div>

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
          >
            {isWhiteboardOpen ? '▼' : '▲'}
          </button>
        </div>

        {/* Info Panel */}
        {isWhiteboardOpen && (
          <div className="bg-white/95 rounded-b-xl p-4 border-t-2 border-blue-300">
            <h4 className="font-bold text-blue-900 mb-2">Collaboration Features</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✅ Real-time video chat</li>
              <li>✅ Canvas annotations</li>
              <li>✅ Voice communication</li>
              <li>✅ Room-based joining</li>
            </ul>
            <p className="text-xs text-gray-600 mt-2 italic">
              Connect with friends and draw together while coding!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
