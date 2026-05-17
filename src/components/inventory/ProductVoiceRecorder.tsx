'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { 
  Mic, 
  Play, 
  Trash2, 
  Volume2, 
  Loader2, 
  StopCircle, 
  Info,
  X,
  Plus,
  GripVertical,
  Eye,
  EyeOff,
  Pause,
  Clock,
  Code,
  Link as LinkIcon,
  AudioWaveform,
  FastForward,
  AlertTriangle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { FormField, FormItem, FormControl, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MAX_RECORDING_SECONDS = 60; 
const MAX_BASE64_SIZE = 950000; 

export function ProductVoiceRecorder() {
  const { control, setValue, watch } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "voiceSignatures"
  });

  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);
  const [isPlayingId, setIsPlayingId] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<number, number>>({});
  const [isConverting, setIsConverting] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayersRef = useRef<Record<string, HTMLAudioElement>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingIndex(null);
    }
  }, []);

  useEffect(() => {
    if (isRecording && recordingIndex !== null) {
      const currentDuration = durations[recordingIndex] || 0;
      if (currentDuration >= MAX_RECORDING_SECONDS) {
        stopRecording();
      }
    }
  }, [durations, isRecording, recordingIndex, stopRecording]);

  const getSupportedMimeType = () => {
    // iOS Safari prefers isotype=webm
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('✅ Using MIME type:', type);
        return type;
      }
    }
    console.warn('No optimal MIME type found');
    return 'audio/webm';
  };

const startRecording = async (index: number) => {
    try {
      console.log('🎤 Starting voice recording on:', navigator.userAgent);
      
      // iOS Safari requires HTTPS + user gesture
      if (typeof window !== 'undefined') {
        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
        if (!isSecure) {
          throw new Error('Microphone requires HTTPS or localhost for iPhone/iOS.');
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 48000
      };
      
      const mimeType = getSupportedMimeType();
      if (mimeType) options.mimeType = mimeType;

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsConverting(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            const base64Audio = reader.result as string;
            
            if (base64Audio.length > MAX_BASE64_SIZE) {
                toast({ 
                    variant: "destructive", 
                    title: "Optimization Notice", 
                    description: "Recording too complex for direct code storage. Try a more concise pitch." 
                });
                setIsConverting(false);
                return;
            }
            
            setValue(`voiceSignatures.${index}.audioDataUri`, base64Audio, { shouldValidate: true });
            setIsConverting(false);
            toast({ title: "Track Ready", description: "Audio signature has been converted to code." });
        };

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingIndex(index);
      setDurations(prev => ({ ...prev, [index]: 0 }));
      
      timerRef.current = setInterval(() => {
        setDurations(prev => {
            const current = (prev[index] || 0) + 1;
            return { ...prev, [index]: current };
        });
      }, 1000);

    } catch (err: any) {
      console.error('🎤 Voice recorder error:', err.name, err.message);
      let errorMsg = 'Microphone access failed.';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Microphone permission denied. Please enable in browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No microphone found on this device.';
      } else if (err.message.includes('HTTPS')) {
        errorMsg = 'iPhone requires HTTPS connection. Use ngrok or deploy.';
      } else {
        errorMsg = err.message || errorMsg;
      }
      
      toast({ 
        variant: "destructive", 
        title: "Microphone Error", 
        description: errorMsg 
      });
    }
  };

  const togglePlayback = (id: string, dataUri: string) => {
    if (!dataUri) return;
    
    const existing = audioPlayersRef.current[id];
    
    if (isPlayingId === id && existing) {
        existing.pause();
        setIsPlayingId(null);
        return;
    }

    Object.values(audioPlayersRef.current).forEach(p => p.pause());

    if (!existing || existing.src !== dataUri) {
        const audio = new Audio(dataUri);
        audio.onplay = () => setIsPlayingId(id);
        audio.onpause = () => { if(isPlayingId === id) setIsPlayingId(null); };
        audio.onended = () => { if(isPlayingId === id) setIsPlayingId(null); };
        audioPlayersRef.current[id] = audio;
        audio.play();
    } else {
        existing.play();
    }
  };

  const handleAddTrack = () => {
      append({
          id: Math.random().toString(36).substring(7),
          audioDataUri: '',
          title: `Pitch Track ${fields.length + 1}`,
          isVisible: true,
          mode: 'mic'
      });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h3 className="text-xl font-black tracking-tighter uppercase text-primary flex items-center gap-3">
                <Volume2 className="h-6 w-6" /> Voice Signature Hub
            </h3>
            <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-widest">Premium Multimedia Identity Suite</p>
        </div>
        <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleAddTrack}
            className="rounded-full h-10 px-6 font-black uppercase text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary hover:text-white transition-all shadow-lg"
        >
            <Plus className="h-4 w-4 mr-2" /> Add Track
        </Button>
      </div>

      <div className="space-y-6">
        {fields.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-[3rem] bg-muted/10">
                <Mic className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-10" />
                <p className="text-lg font-black tracking-tight text-muted-foreground uppercase">No Audio Signatures</p>
                <p className="text-sm text-muted-foreground mt-2">Personalize your product with a professional audio pitch.</p>
                <Button variant="link" onClick={handleAddTrack} className="mt-4 font-bold text-primary">Start first recording</Button>
            </div>
        ) : (
            <div className="space-y-6">
                {fields.map((field, index) => {
                    const track = watch(`voiceSignatures.${index}`);
                    const hasAudio = !!track?.audioDataUri;
                    const isTrackRecording = isRecording && recordingIndex === index;
                    const currentMode = track?.mode || 'mic';
                    const currentDuration = durations[index] || 0;
                    const recordingPercentage = (currentDuration / MAX_RECORDING_SECONDS) * 100;
                    const isClosingIn = currentDuration > (MAX_RECORDING_SECONDS - 10);

                    return (
                        <div key={field.id} className={cn(
                            "p-8 border-2 rounded-[3rem] transition-all duration-700 relative group overflow-hidden",
                            isTrackRecording ? "bg-rose-50 border-rose-500 ring-8 ring-rose-500/5" : "bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-primary/30 shadow-xl"
                        )}>
                            {/* Real-time Progress Bar Overlay */}
                            {isTrackRecording && (
                                <div 
                                    className={cn(
                                        "absolute top-0 left-0 h-1.5 z-50 transition-all duration-1000 ease-linear",
                                        isClosingIn ? "bg-rose-600 animate-pulse" : "bg-primary"
                                    )} 
                                    style={{ width: `${recordingPercentage}%` }} 
                                />
                            )}

                            <div className="absolute top-6 right-8 flex items-center gap-4">
                                <FormField
                                    control={control}
                                    name={`voiceSignatures.${index}.isVisible`}
                                    render={({ field: subField }) => (
                                        <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-full border border-slate-200/50">
                                            {subField.value ? <Eye className="h-3.5 w-3.5 text-green-600" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground opacity-50" />}
                                            <Switch 
                                                checked={subField.value} 
                                                onCheckedChange={subField.onChange}
                                                className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
                                            />
                                        </div>
                                    )}
                                />
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-2xl transition-all"
                                    onClick={() => remove(index)}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                                <div className="md:col-span-1 hidden md:flex flex-col items-center gap-1 pt-2">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30"
                                        onClick={() => move(index, index - 1)}
                                        disabled={index === 0 || isRecording}
                                        title="Move Up"
                                    >
                                        <ChevronUp className="h-5 w-5" />
                                    </Button>
                                    
                                    <div className="flex flex-col items-center -my-1">
                                        <GripVertical className="h-5 w-5 text-muted-foreground/40" />
                                        <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest mt-0.5">0{index + 1}</span>
                                    </div>

                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30"
                                        onClick={() => move(index, index + 1)}
                                        disabled={index === fields.length - 1 || isRecording}
                                        title="Move Down"
                                    >
                                        <ChevronDown className="h-5 w-5" />
                                    </Button>
                                </div>

                                <div className="md:col-span-11 space-y-8">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <FormField
                                                control={control}
                                                name={`voiceSignatures.${index}.title`}
                                                render={({ field: titleField }) => (
                                                    <FormItem className="space-y-2">
                                                        <FormLabel className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Track Identity</FormLabel>
                                                        <FormControl>
                                                            <Input 
                                                                placeholder="e.g., Founder's Expert Pitch" 
                                                                {...titleField}
                                                                className="h-12 font-black text-lg bg-muted/20 border-none rounded-2xl focus-visible:ring-primary/30"
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Audio Input Protocol</Label>
                                                <FormField
                                                    control={control}
                                                    name={`voiceSignatures.${index}.mode`}
                                                    render={({ field: modeField }) => (
                                                        <Tabs value={modeField.value || 'mic'} onValueChange={modeField.onChange} className="w-full">
                                                            <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/30 rounded-2xl">
                                                                <TabsTrigger value="mic" className="text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl">
                                                                    <Mic className="h-3.5 w-3.5" /> Studio Mic
                                                                </TabsTrigger>
                                                                <TabsTrigger value="link" className="text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl">
                                                                    <LinkIcon className="h-3.5 w-3.5" /> Stream Link
                                                                </TabsTrigger>
                                                            </TabsList>
                                                        </Tabs>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col justify-end gap-4 min-w-[240px]">
                                            {currentMode === 'mic' ? (
                                                <div className="space-y-4">
                                                    {isTrackRecording ? (
                                                        <div className="space-y-4 animate-in zoom-in-95 duration-300">
                                                            <div className="bg-white p-6 rounded-[2rem] border-2 border-rose-200 shadow-lg space-y-4 text-center">
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <div className="h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
                                                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-rose-600">Mic Live</span>
                                                                </div>
                                                                <div className={cn(
                                                                    "text-4xl font-black font-mono tracking-tighter transition-colors",
                                                                    isClosingIn ? "text-rose-600" : "text-slate-900"
                                                                )}>
                                                                    {formatTime(currentDuration)}
                                                                </div>
                                                                <div className="text-[10px] font-bold text-muted-foreground uppercase">Will auto-save at 60s...</div>
                                                            </div>
                                                            <Button 
                                                                type="button" 
                                                                variant="destructive" 
                                                                onClick={stopRecording}
                                                                className="rounded-2xl w-full h-14 font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-200 transition-all active:scale-95"
                                                            >
                                                                <StopCircle className="h-5 w-5 mr-3" /> Finish Recording
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button 
                                                            type="button" 
                                                            variant={hasAudio ? "outline" : "default"}
                                                            onClick={() => startRecording(index)}
                                                            className="rounded-2xl w-full h-14 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-[0.98]"
                                                            disabled={isConverting}
                                                        >
                                                            {isConverting ? (
                                                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Converting to Code...</>
                                                            ) : (
                                                                <><Mic className="h-5 w-5 mr-3" /> {hasAudio ? 'Redo Pitch' : 'Start Session'}</>
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <FormField
                                                    control={control}
                                                    name={`voiceSignatures.${index}.audioDataUri`}
                                                    render={({ field: uriField }) => (
                                                        <FormItem className="space-y-2">
                                                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Audio Source Link</FormLabel>
                                                            <FormControl>
                                                                <Input 
                                                                    placeholder="https://cdn.example.com/pitch.mp3" 
                                                                    {...uriField}
                                                                    className="h-12 text-sm font-mono bg-muted/20 border-none rounded-2xl"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}

                                            {hasAudio && !isTrackRecording && (
                                                <Button 
                                                    type="button" 
                                                    variant="secondary"
                                                    onClick={() => togglePlayback(field.id, track.audioDataUri)}
                                                    className="rounded-2xl h-14 w-full flex items-center justify-center gap-3 font-black uppercase text-xs tracking-widest bg-slate-900 text-white hover:bg-slate-800 shadow-xl transition-all active:scale-95"
                                                >
                                                    {isPlayingId === field.id ? (
                                                        <><Pause className="h-5 w-5 fill-current" /> Stop Preview</>
                                                    ) : (
                                                        <><Play className="h-5 w-5 fill-current" /> Listen to Track</>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {hasAudio && currentMode === 'mic' && !isTrackRecording && (
                                        <div className="p-5 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/10 animate-in fade-in duration-700">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-primary mb-2 tracking-widest">
                                                <span className="flex items-center gap-2"><Code className="h-3 w-3" /> Binary Integrity Synced</span>
                                                <span className="opacity-50">Local Buffer Valid</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                                <div className={cn("h-full bg-primary transition-all duration-1000 ease-out", isPlayingId === field.id ? "w-full" : "w-0")} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
      
      <div className="p-6 bg-primary/5 rounded-[3rem] border-2 border-dashed border-primary/10 flex gap-6 items-start">
          <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-lg shrink-0">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
          <div className="text-xs space-y-2">
              <p className="font-black text-primary uppercase tracking-widest">Database Optimization Protocol</p>
              <p className="text-muted-foreground leading-relaxed font-medium">
                  Voice signatures are limited to **60 seconds** and optimized to ensure high-fidelity audio fits perfectly within the direct code storage limits. The system will **automatically finalize** your session once the limit is reached to guarantee a successful save.
              </p>
          </div>
      </div>
    </div>
  );
}
