import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { TranscriptEntry } from '../types';

// --- Audio Utility Functions ---
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


export const VoiceAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');
    
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const stopAudioProcessing = useCallback(() => {
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
    }, []);

    const closeSession = useCallback(async () => {
        setStatus('idle');
        if (sessionPromiseRef.current) {
            const session = await sessionPromiseRef.current;
            session.close();
            sessionPromiseRef.current = null;
        }
        stopAudioProcessing();
        for (const source of sourcesRef.current.values()) {
            source.stop();
        }
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    }, [stopAudioProcessing]);

    const startSession = useCallback(async () => {
        setIsOpen(true);
        if (sessionPromiseRef.current) return;

        setStatus('connecting');
        setTranscript([]);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
                    systemInstruction: 'You are Stickman, a friendly and energetic AI assistant for STICKMAN CODES - an interactive coding game platform! You help players learn programming concepts through fun games. Keep your answers concise, encouraging, and beginner-friendly. Use emojis occasionally and be enthusiastic about coding! 🚶‍♂️',
                },
                callbacks: {
                    onopen: () => {
                        setStatus('listening');
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
                            currentInputTranscription.current += message.serverContent.inputTranscription.text;
                            setTranscript(prev => {
                                const last = prev[prev.length - 1];
                                if (last?.speaker === 'user') {
                                    return [...prev.slice(0, -1), { speaker: 'user', text: currentInputTranscription.current }];
                                }
                                return [...prev, { speaker: 'user', text: currentInputTranscription.current }];
                            });
                        }
                        if (message.serverContent?.outputTranscription) {
                            setStatus('speaking');
                            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
                            setTranscript(prev => {
                                const last = prev[prev.length - 1];
                                if (last?.speaker === 'model') {
                                    return [...prev.slice(0, -1), { speaker: 'model', text: currentOutputTranscription.current }];
                                }
                                return [...prev, { speaker: 'model', text: currentOutputTranscription.current }];
                            });
                        }
                         if (message.serverContent?.turnComplete) {
                            currentInputTranscription.current = '';
                            currentOutputTranscription.current = '';
                            setStatus('listening');
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
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session Error:', e);
                        setStatus('idle');
                    },
                    onclose: () => {
                        setStatus('idle');
                    },
                },
            });
        } catch (error) {
            console.error('Failed to start session:', error);
            setStatus('idle');
        }
    }, []);

    const handleToggleAssistant = () => {
        if (isOpen) {
            closeSession();
            setIsOpen(false);
        } else {
            startSession();
        }
    };
    
    const MicButton = () => {
        let icon, color, text;
        switch(status){
            case 'connecting':
                icon = <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
                color = 'bg-gradient-to-br from-yellow-400 to-orange-400';
                text = 'Connecting...';
                break;
            case 'listening':
                icon = <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>;
                color = 'bg-gradient-to-br from-green-400 to-emerald-500';
                text = '🎤 Listening...';
                break;
            case 'speaking':
                 icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.828 2.828a1 1 0 011.414 0A5.98 5.98 0 0115 10a5.98 5.98 0 01-1.757 4.243 1 1 0 01-1.414-1.414A3.986 3.986 0 0013 10a3.986 3.986 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
                 color = 'bg-gradient-to-br from-blue-400 to-blue-600';
                 text = '🔊 Speaking...';
                 break;
            default: // idle
                 icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>;
                 color = 'bg-gradient-to-br from-purple-500 to-pink-500';
                 text = '🎙️ Start Chat';
        }

        return (
            <div className='flex items-center justify-center gap-3 bg-white rounded-xl p-3 shadow-lg border-2 border-purple-200'>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${color} shadow-lg`}>
                    {icon}
                </div>
                <span className="font-bold text-purple-700 text-sm">{text}</span>
            </div>
        )
    }

    return (
        <>
            {/* Floating Voice Assistant Button */}
            <button
                onClick={handleToggleAssistant}
                className="fixed bottom-6 right-6 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 text-white rounded-3xl shadow-2xl hover:shadow-purple-500/50 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-offset-2 z-50 flex flex-col items-center justify-center gap-2 p-4 transition-all transform hover:scale-105 hover:rotate-2 animate-pulse"
                style={{ width: isOpen ? '80px' : 'auto', height: isOpen ? '80px' : 'auto' }}
                aria-label={isOpen ? 'Close Voice Assistant' : 'Open Voice Assistant'}
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <>
                        {/* Stickman with Mic */}
                        <svg viewBox="0 0 100 120" width="80" height="96" className="mb-1">
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
                        <div className="font-extrabold text-sm tracking-tight whitespace-nowrap text-center leading-tight">
                            Talk to<br/>Stickman!!
                        </div>
                    </>
                )}
            </button>
            {isOpen && (
                 <div className="fixed inset-0 bg-black/30 z-40" onClick={handleToggleAssistant}></div>
            )}
            <div className={`fixed bottom-24 right-6 w-[350px] h-[500px] bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-2xl border-2 border-purple-300 z-50 flex flex-col transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                <header className="p-4 border-b-2 border-purple-200 bg-gradient-to-r from-purple-500 to-pink-500">
                    <h3 className="font-extrabold text-xl text-white text-center">🚶‍♂️ Talk to Stickman!!</h3>
                </header>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {transcript.map((entry, index) => (
                        <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <p className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-lg ${entry.speaker === 'user' ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-br-lg' : 'bg-white text-gray-800 rounded-bl-lg border-2 border-purple-200'}`}>
                                {entry.text}
                            </p>
                        </div>
                    ))}
                    <div ref={transcriptEndRef} />
                </div>
                <footer className="p-4 border-t-2 border-purple-200 bg-white">
                    <MicButton />
                </footer>
            </div>
        </>
    );
};