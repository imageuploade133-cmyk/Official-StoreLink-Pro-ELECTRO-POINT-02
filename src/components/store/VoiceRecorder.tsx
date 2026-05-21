'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, StopCircle, Play, Pause, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_RECORDING_SECONDS = 60;
const MAX_BASE64_SIZE = 950000;

interface VoiceRecorderProps {
  onRecordingComplete: (audioDataUri: string | null) => void;
  existingAudio?: string | null;
  disabled?: boolean;
  accentColor?: string;
  compact?: boolean;
}

export function VoiceRecorder({
  onRecordingComplete,
  existingAudio = null,
  disabled = false,
  accentColor = '#3b82f6',
  compact = false
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(existingAudio);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSupportedMimeType = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus'];
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'audio/webm';
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const startRecording = async () => {
    try {
      setPermissionDenied(false);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 48000
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsConverting(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          if (base64Audio.length > MAX_BASE64_SIZE) {
            setRecordedAudio(null);
            onRecordingComplete(null);
          } else {
            setRecordedAudio(base64Audio);
            onRecordingComplete(base64Audio);
          }
          setIsConverting(false);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setPermissionDenied(true);
      console.error('Microphone access error:', err);
    }
  };

  const togglePlayback = () => {
    const audioToPlay = recordedAudio || existingAudio;
    if (!audioToPlay) return;

    if (isPlaying && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!audioPlayerRef.current || audioPlayerRef.current.src !== audioToPlay) {
      const audio = new Audio(audioToPlay);
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => setIsPlaying(false);
      audioPlayerRef.current = audio;
    }
    audioPlayerRef.current.play();
  };

  const clearRecording = () => {
    if (isRecording) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlaying(false);
    setRecordedAudio(null);
    setRecordingDuration(0);
    onRecordingComplete(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    setRecordedAudio(existingAudio);
  }, [existingAudio]);

  const hasExistingOrRecorded = recordedAudio || existingAudio;

  if (permissionDenied) {
    return (
      <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 text-center">
        <p className="text-sm text-destructive font-medium">Microphone access denied</p>
        <p className="text-xs text-muted-foreground mt-1">Please allow microphone access to record voice replies</p>
      </div>
    );
  }

  if (hasExistingOrRecorded) {
    return (
      <div 
        className={cn(
          "rounded-2xl border-2 flex items-center gap-3 animate-in zoom-in-95 duration-300",
          compact ? "p-2 gap-2" : "p-3"
        )}
        style={{ 
          backgroundColor: `${accentColor}0D`,
          borderColor: `${accentColor}33`
        }}
      >
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className={cn("rounded-full text-white hover:opacity-90 shadow-md shrink-0", compact ? "h-8 w-8" : "h-10 w-10")}
          style={{ backgroundColor: accentColor }}
          onClick={togglePlayback}
          disabled={disabled}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex-1 min-w-0">
          <div 
            className={cn("font-black uppercase tracking-widest", compact ? "text-[9px]" : "text-[10px]")}
            style={{ color: accentColor }}
          >
            Voice Reply Recorded
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {compact ? null : (
              <div 
                className="h-0.5 flex-1 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800"
                style={{ maxWidth: "100px" }}
              >
                <div 
                  className={cn("h-full transition-all duration-200", isPlaying && "animate-pulse")}
                  style={{ 
                    backgroundColor: accentColor,
                    width: isPlaying ? "60%" : "0%"
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("text-slate-400 hover:text-destructive transition-colors shrink-0", compact ? "h-7 w-7" : "h-8 w-8")}
          onClick={clearRecording}
          disabled={disabled}
        >
          <Trash2 className={cn("h-3.5 w-3.5")} />
        </Button>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div 
        className={cn(
          "flex flex-col gap-3 p-4 rounded-2xl border-2 relative overflow-hidden",
          compact ? "p-3 gap-2" : "p-4"
        )}
        style={{ 
          backgroundColor: '#fef2f2',
          borderColor: '#fecaca'
        }}
      >
        <div 
          className={cn(
            "absolute top-0 left-0 h-1 transition-all duration-1000 ease-linear",
            recordingDuration > MAX_RECORDING_SECONDS - 10 ? "bg-red-500 animate-pulse" : "bg-primary"
          )} 
          style={{ width: `${(recordingDuration / MAX_RECORDING_SECONDS) * 100}%` }} 
        />
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse shrink-0" />
          <div className="flex-1">
            <div className={cn("font-mono font-black text-red-600", compact ? "text-base" : "text-xl")}>
              {formatTime(recordingDuration)}
            </div>
            {!compact && (
              <div className="text-[8px] font-black uppercase text-red-400 tracking-widest">
                {recordingDuration > MAX_RECORDING_SECONDS - 10 
                  ? 'Auto-stopping soon...' 
                  : 'Recording in progress...'}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className={cn("rounded-xl font-black uppercase text-[10px] tracking-widest", compact ? "h-8 px-2" : "h-10")}
            onClick={stopRecording}
          >
            <StopCircle className="h-3 w-3 mr-1" /> Stop
          </Button>
        </div>
      </div>
    );
  }

  if (isConverting) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed",
          compact ? "p-3" : "p-4"
        )}
        style={{ 
          backgroundColor: `${accentColor}0D`,
          borderColor: `${accentColor}33`
        }}
      >
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: accentColor }} />
        <span className="text-sm font-medium text-muted-foreground">Processing audio...</span>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "w-full rounded-2xl border-2 border-dashed transition-all gap-2 group",
        compact ? "h-10 text-xs" : "h-12 text-[10px]"
      )}
      style={{ 
        borderColor: `${accentColor}33`,
        backgroundColor: `${accentColor}0D`
      }}
      onClick={startRecording}
      disabled={disabled || isConverting}
    >
      <Mic 
        className={cn("shrink-0 group-hover:scale-110 transition-transform", compact ? "h-4 w-4" : "h-5 w-5")} 
        style={{ color: accentColor }}
      />
      <span className="font-black uppercase tracking-widest" style={{ color: accentColor }}>
        Record Voice Reply
      </span>
    </Button>
  );
}