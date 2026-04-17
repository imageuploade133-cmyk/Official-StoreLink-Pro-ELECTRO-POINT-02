'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Star, Loader2, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useStoreUrl } from '@/hooks/use-store-url';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating.').max(5),
  comment: z.string().min(5, 'Review must be at least 5 characters.').max(500, 'Review too long.'),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ProductReviewFormProps {
  productId: string;
}

export function ProductReviewForm({ productId }: ProductReviewFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const { getStoreUrl } = useStoreUrl();

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 5,
      comment: '',
    },
  });

  const onSubmit = async (values: ReviewFormValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'products', productId, 'reviews'), {
        userId: user.uid,
        userName: user.displayName || 'Valued Customer',
        userPhotoURL: user.photoURL || null,
        rating: values.rating,
        comment: values.comment,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Review Submitted', description: 'Thank you for your feedback!' });
      form.reset();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to submit review.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="p-8 border-2 rounded-[2rem] bg-white dark:bg-slate-900/50 ">
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

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em]  shadow-primary/20"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit My Review
          </Button>
        </form>
      </Form>
    </div>
  );
}
