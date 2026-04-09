'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  Trash2, 
  Loader2, 
  Plus, 
  Image as ImageIcon,
  Crown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Maximize2,
  X
} from 'lucide-react';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { compressAndResizeImage } from '@/lib/image-utils';
import { useSettings } from '@/contexts/settings-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { CameraCaptureModal } from '@/components/media/CameraCaptureModal';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

interface ProductImageGalleryProps {
  primaryUrl: string;
  additionalUrls: string[];
  onPrimaryChange: (url: string) => void;
  onAdditionalChange: (urls: string[]) => void;
  disabled?: boolean;
}

export function ProductImageGallery({ 
  primaryUrl, 
  additionalUrls, 
  onPrimaryChange, 
  onAdditionalChange, 
  disabled 
}: ProductImageGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { settings } = useSettings();

  const allImages = React.useMemo(() => {
    const list = [];
    if (primaryUrl) list.push({ url: primaryUrl, isPrimary: true });
    additionalUrls.forEach(url => list.push({ url, isPrimary: false }));
    return list;
  }, [primaryUrl, additionalUrls]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const maxFileSizeMb = settings?.imageMaxFileSizeMb || 5;
    const maxSizeBytes = maxFileSizeMb * 1024 * 1024;

    setIsUploading(true);
    let newPrimary = primaryUrl;
    const newAdditional = [...additionalUrls];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.size > maxSizeBytes) {
            toast({
                variant: "destructive",
                title: "File too large",
                description: `"${file.name}" exceeds the ${maxFileSizeMb}MB limit.`,
            });
            continue;
        }

        const reader = new FileReader();
        const promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        let imageDataUri = await promise;

        // Perform Client-Side Optimization
        try {
            imageDataUri = await compressAndResizeImage(
                imageDataUri, 
                settings?.imageUploadQuality || 80, 
                settings?.imageMaxWidth || 1920
            );
        } catch (optError) {
            console.error("Optimization failed:", optError);
        }

        const result = await uploadImage({ imageDataUri });
        
        if (!newPrimary) {
          newPrimary = result.display_url;
        } else {
          newAdditional.push(result.display_url);
        }
      }

      onPrimaryChange(newPrimary);
      onAdditionalChange(newAdditional);
      toast({ title: "Gallery Updated", description: "Images optimized and added successfully." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message || "An error occurred during upload." });
    } finally {
      setIsUploading(false);
      event.target.value = ''; // Reset input
    }
  };

  const removeImage = (index: number) => {
    if (allImages[index].isPrimary) {
      if (additionalUrls.length > 0) {
        onPrimaryChange(additionalUrls[0]);
        onAdditionalChange(additionalUrls.slice(1));
      } else {
        onPrimaryChange('');
      }
    } else {
      const urlToRemove = allImages[index].url;
      onAdditionalChange(additionalUrls.filter(u => u !== urlToRemove));
    }
  };

  const makePrimary = (index: number) => {
    const selectedUrl = allImages[index].url;
    const currentPrimary = primaryUrl;
    
    onPrimaryChange(selectedUrl);
    const updatedAdditional = additionalUrls.filter(u => u !== selectedUrl);
    if (currentPrimary) updatedAdditional.push(currentPrimary);
    onAdditionalChange(updatedAdditional);
    
    toast({ title: "Primary Image Updated", description: "This image is now the hero for your product." });
  };

  const movePosition = (index: number, direction: 'left' | 'right') => {
    const newItems = [...allImages];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    onPrimaryChange(newItems[0].url);
    onAdditionalChange(newItems.slice(1).map(item => item.url));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <Label className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Visual Catalog Management
            </Label>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-tighter">
                First image is your Hero. Max size: {settings?.imageMaxFileSizeMb || 5}MB.
            </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full h-10 px-6 font-bold gap-2 flex-1" disabled={disabled || isUploading}>
            <label className="cursor-pointer w-full">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Import Media
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload} 
                disabled={disabled || isUploading}
              />
            </label>
          </Button>
          <CameraCaptureModal
            isOpen={isPhotoCaptureOpen}
            onClose={() => setIsPhotoCaptureOpen(false)}
            onImageCaptured={(url) => {
              // Add as primary if none, else additional
              if (!primaryUrl) {
                onPrimaryChange(url);
              } else {
                onAdditionalChange([...additionalUrls, url]);
              }
              toast({ title: 'Photo Added', description: 'Captured image uploaded successfully.' });
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 w-10 rounded-full p-0"
            onClick={() => setIsPhotoCaptureOpen(true)}
            disabled={disabled}
            title="Take photo with camera"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {allImages.map((item, index) => (
          <div 
            key={item.url + index} 
            className={cn(
                "group relative aspect-square rounded-[1.5rem] overflow-hidden border-2 transition-all duration-300 shadow-lg",
                item.isPrimary ? "border-primary scale-105 z-10 ring-4 ring-primary/10" : "border-muted bg-muted grayscale-[0.2] hover:grayscale-0"
            )}
          >
            <Image 
              src={item.url} 
              alt={item.isPrimary ? "Primary image" : `Gallery image ${index}`} 
              fill 
              className="object-cover transition-transform duration-500 group-hover:scale-110" 
              unoptimized
            />
            
            <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                <Badge className={cn(
                    "text-[8px] font-black uppercase tracking-widest py-0.5",
                    item.isPrimary ? "bg-primary text-white" : "bg-black/50 text-white backdrop-blur-sm"
                )}>
                    {item.isPrimary ? <CheckCircle2 className="h-2 w-2 mr-1" /> : null}
                    {item.isPrimary ? 'Primary' : 'Gallery'}
                </Badge>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="icon" 
                        className="h-6 w-6 rounded-full bg-white/90 text-black hover:bg-white"
                        onClick={() => setPreviewUrl(item.url)}
                    >
                        <Maximize2 className="h-3 w-3" />
                    </Button>
                    <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="h-6 w-6 rounded-full"
                        onClick={() => removeImage(index)}
                        disabled={disabled || isUploading}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between gap-1">
                <div className="flex gap-1">
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="icon" 
                        className="h-7 w-7 rounded-lg bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md"
                        onClick={() => movePosition(index, 'left')}
                        disabled={index === 0 || disabled || isUploading}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="icon" 
                        className="h-7 w-7 rounded-lg bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md"
                        onClick={() => movePosition(index, 'right')}
                        disabled={index === allImages.length - 1 || disabled || isUploading}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {!item.isPrimary && (
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        className="h-7 px-2 rounded-lg bg-primary text-white font-black text-[8px] uppercase tracking-widest hover:bg-white hover:text-primary transition-colors"
                        onClick={() => makePrimary(index)}
                        disabled={disabled || isUploading}
                    >
                        <Crown className="h-3 w-3 mr-1" /> Promote
                    </Button>
                )}
            </div>
          </div>
        ))}

        {isUploading && (
          <div className="aspect-square rounded-[1.5rem] border-2 border-dashed border-primary/30 flex flex-col items-center justify-center bg-primary/5 animate-pulse gap-2">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span className="text-[10px] font-black uppercase text-primary">Optimizing...</span>
          </div>
        )}

        {allImages.length === 0 && !isUploading && (
          <div className="col-span-full py-16 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 opacity-20" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest">Visuals empty</p>
            <p className="text-xs mt-1">Upload high-res images to build your catalog.</p>
          </div>
        )}
      </div>

      {/* Full Screen Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden bg-black/90 border-none shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
            <DialogDescription>Full screen view of the selected image.</DialogDescription>
          </DialogHeader>
          <div className="relative aspect-square md:aspect-video w-full flex items-center justify-center">
            {previewUrl && (
              <Image 
                src={previewUrl} 
                alt="Large preview" 
                fill 
                className="object-contain" 
                unoptimized
              />
            )}
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setPreviewUrl(null)}
                className="absolute top-4 right-4 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all z-50"
            >
                <X className="h-6 w-6" strokeWidth={3} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
