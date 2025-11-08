'use client';

import { useEffect, useState, useRef } from 'react';
import { Room, RoomEvent, ConnectionState } from 'livekit-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function VoiceChat() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] =
    useState<string>('en-IN-NeerjaNeural');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isProcessingAudioRef = useRef(false);
  const selectedVoiceRef = useRef<string>('en-IN-NeerjaNeural');
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const shouldPauseRecordingRef = useRef(false);

  // Available Edge TTS voices - VERIFIED WORKING
  const voices = [
    {
      value: 'en-IN-NeerjaNeural',
      label: 'English (India) - Neerja 🇮🇳',
      lang: 'en',
    },
    {
      value: 'en-IN-PrabhatNeural',
      label: 'English (India) - Prabhat 🇮🇳',
      lang: 'en',
    },
    { value: 'hi-IN-SwaraNeural', label: 'Hindi - Swara 🇮🇳', lang: 'hi' },
    { value: 'hi-IN-MadhurNeural', label: 'Hindi - Madhur 🇮🇳', lang: 'hi' },
    { value: 'en-US-AriaNeural', label: 'English (US) - Aria 🇺🇸', lang: 'en' },
    { value: 'en-US-GuyNeural', label: 'English (US) - Guy 🇺🇸', lang: 'en' },
    {
      value: 'en-GB-SoniaNeural',
      label: 'English (UK) - Sonia 🇬🇧',
      lang: 'en',
    },
    { value: 'en-GB-RyanNeural', label: 'English (UK) - Ryan 🇬🇧', lang: 'en' },
    { value: 'es-ES-ElviraNeural', label: 'Spanish - Elvira 🇪🇸', lang: 'es' },
    { value: 'fr-FR-DeniseNeural', label: 'French - Denise 🇫🇷', lang: 'fr' },
    { value: 'de-DE-KatjaNeural', label: 'German - Katja 🇩🇪', lang: 'de' },
    { value: 'ja-JP-NanamiNeural', label: 'Japanese - Nanami 🇯🇵', lang: 'ja' },
    {
      value: 'zh-CN-XiaoxiaoNeural',
      label: 'Chinese - Xiaoxiao 🇨🇳',
      lang: 'zh',
    },
    { value: 'ar-SA-ZariyahNeural', label: 'Arabic - Zariyah 🇸🇦', lang: 'ar' },
  ];

  useEffect(() => {
    initializeRoom();
    initializeWebSocket();
    startContinuousListening();

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (roomRef.current) {
      roomRef.current.disconnect();
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  };

  const initializeWebSocket = () => {
    wsRef.current = new WebSocket('ws://localhost:3002');

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };

    wsRef.current.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'response') {
          setIsProcessing(false);
          addMessage(data.text, false);

          // Queue audio for playback
          if (data.audio) {
            audioQueueRef.current.push(data.audio);
            if (!isProcessingAudioRef.current) {
              processAudioQueue();
            }
          } else {
            // Request TTS audio
            requestTTS(data.text);
          }
        } else if (data.type === 'audio') {
          setIsProcessing(false);
          audioQueueRef.current.push(data.audio);
          if (!isProcessingAudioRef.current) {
            processAudioQueue();
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        setIsProcessing(false);
      }
    };

    wsRef.current.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const requestTTS = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const currentVoice = selectedVoiceRef.current;
      wsRef.current.send(
        JSON.stringify({
          type: 'tts',
          text: text,
          voice: currentVoice,
        })
      );
    }
  };

  const processAudioQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isProcessingAudioRef.current = false;
      setIsPlaying(false);
      shouldPauseRecordingRef.current = false;

      // Resume recording after playback
      if (
        !isMuted &&
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === 'inactive'
      ) {
        setTimeout(() => {
          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === 'inactive' &&
            !isMuted
          ) {
            audioChunksRef.current = [];
            mediaRecorderRef.current.start();
            monitorAudioLevel();
          }
        }, 100);
      }
      return;
    }

    isProcessingAudioRef.current = true;
    setIsPlaying(true);
    shouldPauseRecordingRef.current = true;

    // Stop recording while AI is speaking
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    }

    const audioData = audioQueueRef.current.shift()!;

    try {
      // Convert base64 to audio and play
      const audioBlob = base64ToBlob(audioData, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      currentAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        processAudioQueue();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        processAudioQueue();
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      currentAudioRef.current = null;
      processAudioQueue();
    }
  };

  const base64ToBlob = (base64: string, type: string): Blob => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  };

  const initializeRoom = async () => {
    try {
      const response = await fetch('/api/token');
      const { token } = await response.json();

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnectionState(state);
      });

      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);
      await room.localParticipant.setMicrophoneEnabled(!isMuted);
    } catch (error) {
      console.error('Failed to connect to room:', error);
    }
  };

  const startContinuousListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // Higher sample rate for better quality
          channelCount: 1, // Mono is better for speech recognition
        },
      });

      streamRef.current = stream;

      // Set up audio analysis for silence detection
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Set up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        // Don't send audio if we're pausing for AI playback
        if (shouldPauseRecordingRef.current) {
          audioChunksRef.current = [];
          return;
        }

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: 'audio/webm',
          });

          // Increased minimum size to 100KB to avoid sending noise/short sounds
          if (audioBlob.size > 100000) {
            const audioData = await blobToBase64(audioBlob);
            sendAudioToBackend(audioData);
          } else {
            console.log('Audio too short, skipping:', audioBlob.size, 'bytes');
          }

          audioChunksRef.current = [];
        }

        // Restart recording immediately for continuous listening
        // But only if not playing AI audio
        if (
          !isMuted &&
          !shouldPauseRecordingRef.current &&
          mediaRecorderRef.current
        ) {
          setTimeout(() => {
            if (
              mediaRecorderRef.current &&
              mediaRecorderRef.current.state !== 'recording' &&
              !isMuted &&
              !shouldPauseRecordingRef.current
            ) {
              mediaRecorderRef.current.start();
              monitorAudioLevel();
            }
          }, 100); // Small delay before restarting
        }
      };

      // Start recording
      mediaRecorderRef.current.start();
      setIsListening(true);
      monitorAudioLevel();
    } catch (error) {
      console.error('Error starting continuous listening:', error);
    }
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current || isMuted) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    let isSpeaking = false;
    let speakingStartTime = 0;
    const SPEECH_THRESHOLD = 50; // Increased from 30 to reduce false positives
    const MIN_SPEAKING_DURATION = 500; // Must speak for at least 500ms
    const SILENCE_DURATION = 3000; // Wait 3 seconds of silence before stopping

    const checkAudio = () => {
      if (!analyserRef.current || isMuted) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

      // If sound detected above threshold
      if (average > SPEECH_THRESHOLD) {
        if (!isSpeaking) {
          // Just started speaking
          speakingStartTime = Date.now();
        }
        isSpeaking = true;

        // Clear any existing silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }

        // Set new silence timeout
        silenceTimeoutRef.current = setTimeout(() => {
          const speakingDuration = Date.now() - speakingStartTime;

          // Only stop if we spoke for minimum duration
          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === 'recording' &&
            isSpeaking &&
            speakingDuration >= MIN_SPEAKING_DURATION
          ) {
            mediaRecorderRef.current.stop();
            isSpeaking = false;
            speakingStartTime = 0;
          } else if (speakingDuration < MIN_SPEAKING_DURATION) {
            // Too short, ignore this audio
            isSpeaking = false;
            speakingStartTime = 0;
          }
        }, SILENCE_DURATION);
      }

      // Continue monitoring
      if (!isMuted) {
        requestAnimationFrame(checkAudio);
      }
    };

    checkAudio();
  };

  const sendAudioToBackend = (audioData: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setIsProcessing(true);
      const currentVoice = selectedVoiceRef.current;
      console.log('Sending audio with voice:', currentVoice);
      wsRef.current.send(
        JSON.stringify({
          type: 'audio',
          audio: audioData,
          voice: currentVoice,
        })
      );
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const addMessage = (text: string, isUser: boolean) => {
    const message: Message = {
      id: Date.now().toString() + Math.random(),
      text,
      isUser,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const toggleMute = async () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (newMutedState) {
      // Stop listening
      setIsListening(false);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === 'recording'
      ) {
        mediaRecorderRef.current.stop();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    } else {
      // Resume listening
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'recording'
      ) {
        audioChunksRef.current = [];
        mediaRecorderRef.current.start();
        setIsListening(true);
        monitorAudioLevel();
      }
    }

    if (roomRef.current) {
      await roomRef.current.localParticipant.setMicrophoneEnabled(
        !newMutedState
      );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-zinc-950 border-zinc-800">
        {/* Header */}
        <div className="border-b border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div
                  className={`w-3 h-3 rounded-full ${
                    connectionState === ConnectionState.Connected
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                />
                {isListening && (
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping" />
                )}
              </div>
              <span className="text-sm text-zinc-400">
                {connectionState === ConnectionState.Connected
                  ? 'Connected'
                  : 'Disconnected'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {isProcessing && (
                <div className="flex items-center space-x-2 text-yellow-400 text-sm">
                  <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
              {isPlaying && (
                <div className="flex items-center space-x-2 text-blue-400 text-sm">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span>Speaking...</span>
                </div>
              )}
            </div>
          </div>

          {/* Voice Selection */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-zinc-400 ">Voice:</span>
            <Select
              value={selectedVoice}
              onValueChange={(newVoice) => {
                console.log(
                  'Voice changed from',
                  selectedVoice,
                  'to',
                  newVoice
                );
                setSelectedVoice(newVoice);
                selectedVoiceRef.current = newVoice; // Update ref immediately
                // Clear conversation when changing language
                setMessages([]);
                // Clear audio queue
                audioQueueRef.current = [];
                // Send reset signal to backend
                if (
                  wsRef.current &&
                  wsRef.current.readyState === WebSocket.OPEN
                ) {
                  wsRef.current.send(
                    JSON.stringify({
                      type: 'reset',
                    })
                  );
                }
              }}
            >
              <SelectTrigger className="w-[280px] bg-zinc-900 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                {voices.map((voice) => (
                  <SelectItem
                    key={voice.value}
                    value={voice.value}
                    className="text-white hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer"
                  >
                    {voice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Messages */}
        <div className="h-[500px] overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse" />
                  <div className="absolute inset-4 bg-blue-500/40 rounded-full animate-pulse delay-75" />
                  <div className="absolute inset-8 bg-blue-500/60 rounded-full animate-pulse delay-150" />
                </div>
                <p className="text-zinc-400">Start speaking...</p>
                <p className="text-xs text-zinc-600">
                  Your conversation will appear here
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-100'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Mic Control */}
        <div className="border-t border-zinc-800 p-6">
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={toggleMute}
              size="lg"
              className={`rounded-full w-16 h-16 ${
                isMuted
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-zinc-500">
              {isMuted
                ? 'Click to unmute and start talking'
                : 'Listening... Speak naturally'}
            </p>
          </div>

          {/* Audio Visualizer */}
          {isListening && !isMuted && (
            <div className="flex justify-center items-center space-x-1 mt-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-blue-500 rounded-full animate-pulse"
                  style={{
                    height: '8px',
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.8s',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
