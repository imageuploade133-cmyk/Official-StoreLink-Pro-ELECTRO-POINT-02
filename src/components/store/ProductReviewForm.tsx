'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, setDoc, doc } from 'firebase/firestore';
import { Star, Loader2, Send, MessageCircle, Ban, Mic, StopCircle, Trash2, Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useStoreUrl } from '@/hooks/use-store-url';
import { useRef, useCallback } from 'react';

const MAX_RECORDING_SECONDS = 60;
const MAX_BASE64_SIZE = 850000;

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating.').max(5),
  comment: z.string().min(5, 'Review must be at least 5 characters.').max(500, 'Review too long.'),
  audioDataUri: z.string().optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ProductReviewFormProps {
  productId: string;
  storeId?: string;
}

export function ProductReviewForm({ productId, storeId }: ProductReviewFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const { getStoreUrl } = useStoreUrl();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
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
            toast({ variant: "destructive", title: "Recording too long", description: "Please keep your voice comment under 60 seconds." });
          } else {
            form.setValue('audioDataUri', base64Audio);
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
      toast({ variant: "destructive", title: "Microphone Error", description: err.message || "Could not access microphone." });
    }
  };

  const togglePlayback = () => {
    const audioDataUri = form.getValues('audioDataUri');
    if (!audioDataUri) return;

    if (isPlaying && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!audioPlayerRef.current || audioPlayerRef.current.src !== audioDataUri) {
      const audio = new Audio(audioDataUri);
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => setIsPlaying(false);
      audioPlayerRef.current = audio;
    }
    audioPlayerRef.current.play();
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
    if (user && firestore && storeId) {
        const checkBanned = async () => {
            const customersRef = collection(firestore, 'customers');
            const q = query(customersRef, where('store_id', '==', storeId), where('uid', '==', user.uid), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty && snap.docs[0].data().status === 'banned') {
                setIsBanned(true);
            }
        };
        checkBanned();
    }
  }, [user, firestore, storeId]);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 5,
      comment: '',
      audioDataUri: '',
    },
  });

  const onSubmit = async (values: ReviewFormValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    try {
      // Check if user is banned
      const customersRef = collection(firestore, 'customers');
      const q = query(customersRef, where('store_id', '==', storeId || ''), where('uid', '==', user.uid), limit(1));
      const customerSnap = await getDocs(q);
      
      if (!customerSnap.empty && customerSnap.docs[0].data().status === 'banned') {
          toast({ 
            variant: 'destructive', 
            title: 'Account Restricted', 
            description: 'Your account has been suspended from posting reviews in this store.' 
          });
          setIsSubmitting(false);
          return;
      }

      const reviewData = {
        userId: user.uid,
        userName: user.displayName || 'Valued Customer',
        userPhotoURL: user.photoURL || null,
        rating: values.rating,
        comment: values.comment,
        audioDataUri: values.audioDataUri || null,
        productId,
        store_id: storeId || '',
        isApproved: true,
        isHidden: false,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(firestore, 'products', productId, 'reviews'), reviewData);
      
      // Also save to a top-level collection for easier querying in dashboard without collectionGroup indexes
      try {
        await setDoc(doc(firestore, 'store_reviews', docRef.id), {
          ...reviewData,
          id: docRef.id,
        });
      } catch (e) {
        console.error('Error duplicating review to top-level collection:', e);
      }

      toast({ title: 'Review Submitted', description: 'Thank you for your feedback!' });
      form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to submit review.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBanned) {
    return (
      <div className="p-8 border-2 border-destructive border-dashed rounded-[2rem] text-center bg-destructive/5">
        <Ban className="h-10 w-10 text-destructive mx-auto mb-4" />
        <h4 className="text-xl font-black tracking-tight mb-2 text-destructive">Account Restricted</h4>
        <p className="text-sm text-muted-foreground mb-2">You have been suspended from participating in this store&apos;s community.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 border-2 border-dashed rounded-[2rem] text-center bg-muted/30">
        <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <h4 className="text-xl font-black tracking-tight mb-2">Share Your Thoughts</h4>
        <p className="text-sm text-muted-foreground mb-6">You must be logged in to write a review for this product.</p>
        <Button asChild variant="outline" className="rounded-xl font-black uppercase text-[10px] tracking-widest px-8">
          <Link href={getStoreUrl('/store/login')}>Login to Review</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 border-2 rounded-[2rem] bg-white dark:bg-slate-900/50 shadow-sm">
      <h4 className="text-xl font-black tracking-tight mb-6 flex items-center gap-3">
        <Star className="h-6 w-6 text-primary fill-current" /> Write a Review
      </h4>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Overall Rating</FormLabel>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="p-1 transition-transform active:scale-90"
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => field.onChange(star)}
                    >
                      <Star
                        className={cn(
                          "h-8 w-8 transition-colors",
                          (hoveredRating || field.value) >= star
                            ? "text-amber-400 fill-current"
                            : "text-slate-200 dark:text-slate-700"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Your Experience</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What did you like or dislike? How was the quality?"
                    className="min-h-[120px] rounded-2xl bg-slate-50 dark:bg-slate-800 border-none resize-none focus-visible:ring-primary"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="audioDataUri"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                   Voice Comment <span className="lowercase font-medium opacity-60">(Optional)</span>
                </FormLabel>
                <div className="space-y-4">
                  {field.value ? (
                    <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/20 animate-in zoom-in-95 duration-300">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-primary text-white hover:bg-primary/90"
                        onClick={togglePlayback}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <div className="flex-1">
                        <div className="text-[10px] font-black uppercase text-primary tracking-widest">Audio Comment Ready</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">Binary Stream Encoded</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-destructive transition-colors"
                        onClick={() => field.onChange(null)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : isRecording ? (
                    <div className="flex items-center gap-4 p-4 bg-rose-50 rounded-2xl border-2 border-rose-200 animate-pulse">
                      <div className="h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
                      <div className="flex-1">
                        <div className="text-xl font-mono font-black text-rose-600">{formatTime(recordingDuration)}</div>
                        <div className="text-[8px] font-black uppercase text-rose-400 tracking-widest">Recording in progress...</div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10"
                        onClick={stopRecording}
                      >
                        <StopCircle className="h-3 w-3 mr-2" /> Stop
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-14 rounded-2xl border-2 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all gap-3"
                      onClick={startRecording}
                      disabled={isConverting}
                    >
                      {isConverting ? (
                         <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Mic className="h-4 w-4 text-primary" />
                          <span className="font-black uppercase text-[10px] tracking-widest">Add Voice Comment</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isSubmitting || isRecording || isConverting}
            className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit My Review
          </Button>
        </form>
      </Form>
    </div>
  );
}
