'use client';

import * as React from 'react';
import { useState } from 'react';
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
  X,
  Camera,
  Wand2,
  Sparkles
} from 'lucide-react';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { removeBackground } from '@/ai/flows/background-removal-flow';
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
  DialogDescription
} from "@/components/ui/dialog";
import { CameraCaptureModal } from '@/components/media/CameraCaptureModal';
import { ConfirmationModal } from '../dialogs/ConfirmationModal';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProductImageGalleryProps {
  primaryUrl: string;
  additionalUrls: string[];
  onPrimaryChange: (url: string) => void;
  onAdditionalChange: (urls: string[]) => void;
  disabled?: boolean;
  variantImages?: { url: string; name: string }[];
}

export function ProductImageGallery({ 
  primaryUrl, 
  additionalUrls, 
  onPrimaryChange, 
  onAdditionalChange, 
  disabled,
  variantImages = []
}: ProductImageGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPhotoCaptureOpen, setIsPhotoCaptureOpen] = useState(false);
  const [isVariantSelectionOpen, setIsVariantSelectionOpen] = useState(false);
  const [pendingImages, setPendingImages] = useState<{ id: string; url: string }[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });
  const { toast } = useToast();
  const { settings, store } = useSettings();

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
    
    // Create local previews for immediate feedback
    const newPending = Array.from(files).map((file: File, idx) => ({
      id: `pending-${Date.now()}-${idx}`,
      url: URL.createObjectURL(file),
      file
    }));
    
    setPendingImages(newPending.map(p => ({ id: p.id, url: p.url })));

    let currentPrimary = primaryUrl;
    let currentAdditional = [...additionalUrls];

    try {
      for (const pending of newPending) {
        try {
          const file = pending.file;
          
          if (file.size > maxSizeBytes) {
              toast({
                  variant: "destructive",
                  title: "File too large",
                  description: `"${file.name}" exceeds the ${maxFileSizeMb}MB limit.`,
              });
              setPendingImages(prev => prev.filter(p => p.id !== pending.id));
              URL.revokeObjectURL(pending.url);
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

          const result = await uploadImage({ imageDataUri, storeId: store?.id });
          
          if (!currentPrimary) {
            currentPrimary = result.display_url;
            onPrimaryChange(currentPrimary);
          } else {
            currentAdditional = [...currentAdditional, result.display_url];
            onAdditionalChange(currentAdditional);
          }
        } catch (singleError: any) {
          console.error("Individual upload failed:", singleError);
          toast({ 
            variant: "destructive", 
            title: "Upload Failed", 
            description: `Could not upload one of your images. ${singleError.message || ""}` 
          });
        } finally {
          // Always remove from pending and revoke URL
          setPendingImages(prev => prev.filter(p => p.id !== pending.id));
          URL.revokeObjectURL(pending.url);
        }
      }

      toast({ title: "Gallery Updated", description: "Media assets processed successfully." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload Process Error", description: error.message || "An error occurred during upload." });
    } finally {
      setIsUploading(false);
      // Clean up any remaining URLs
      newPending.forEach(p => {
        try { URL.revokeObjectURL(p.url); } catch (e) {}
      });
      setPendingImages([]);
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

  const handleRemoveBackground = async (imageUrl: string, index: number) => {
    setIsUploading(true);
    try {
      // Convert image URL to data URI
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const imageDataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Remove background
      const result = await removeBackground({ imageDataUri });

      // Upload the background-removed image
      const uploadResult = await uploadImage({ imageDataUri: result.display_url, storeId: store?.id });

      // Update the image in the correct position
      if (allImages[index].isPrimary) {
        onPrimaryChange(uploadResult.display_url);
      } else {
        const updatedUrls = [...additionalUrls];
        const urlIndex = updatedUrls.indexOf(imageUrl);
        if (urlIndex !== -1) {
          updatedUrls[urlIndex] = uploadResult.display_url;
          onAdditionalChange(updatedUrls);
        }
      }

      toast({ title: 'Background Removed!', description: 'Product mockup created successfully.' });
    } catch (error: any) {
      console.error('Background removal failed:', error);
      toast({ 
        variant: "destructive", 
        title: "Background Removal Failed", 
        description: error.message || "Could not remove background. API key may not be configured." 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <Label className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Visual Catalog Management <span className="text-destructive">*</span>
            </Label>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-tighter">
                First image is your Hero. Max size: {settings?.imageMaxFileSizeMb || 5}MB.
            </p>
        </div>
        <div className="flex gap-2">
          {variantImages.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full h-10 px-4 font-bold gap-2 border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => setIsVariantSelectionOpen(true)}
              disabled={disabled || isUploading}
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Use Variant Image</span>
            </Button>
          )}
          {allImages.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full h-10 px-4 font-bold gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setConfirmConfig({
                  isOpen: true,
                  title: 'Clear All Media?',
                  description: 'This will remove all images from this product. This action cannot be undone.',
                  onConfirm: () => {
                    onPrimaryChange('');
                    onAdditionalChange([]);
                    toast({ title: "Gallery Cleared", description: "All images have been removed." });
                  }
                });
              }}
              disabled={disabled || isUploading}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear All</span>
            </Button>
          )}
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

          {/* Camera Modal */}
          <CameraCaptureModal 
            isOpen={isPhotoCaptureOpen}
            onClose={() => setIsPhotoCaptureOpen(false)}
            onImageCaptured={async (imageUrl) => {
              try {
                setIsUploading(true);
                
                // The image is already uploaded and optimized by CameraCaptureModal
                // imageUrl is a string URL, not a Blob
                if (!primaryUrl) {
                  onPrimaryChange(imageUrl);
                } else {
                  onAdditionalChange([...additionalUrls, imageUrl]);
                }
                
                toast({ title: "Photo Captured!", description: "Added to gallery successfully." });
              } catch (error: any) {
                console.error('Camera capture failed:', error);
                toast({ 
                  variant: "destructive", 
                  title: "Capture Failed", 
                  description: error.message || "Could not process photo." 
                });
              } finally {
                setIsUploading(false);
              }
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {allImages.map((item, index) => (
          <div 
            key={item.url + index} 
            className={cn(
                "group relative aspect-square rounded-[2rem] overflow-hidden border-2 transition-all duration-500 shadow-xl",
                item.isPrimary ? "border-primary scale-105 z-10 ring-8 ring-primary/10" : "border-transparent bg-muted hover:border-primary/50"
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

                <div className="flex gap-1 transition-opacity">
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-sm border border-white/20"
                        onClick={() => handleRemoveBackground(item.url, index)}
                        disabled={disabled || isUploading}
                        title="Remove Background (Make Mockup)"
                    >
                        <Wand2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-white/90 text-black hover:bg-white shadow-sm border border-black/5"
                        onClick={() => setPreviewUrl(item.url)}
                        title="Preview"
                    >
                        <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 rounded-full shadow-lg border border-white/20"
                        onClick={() => {
                            setConfirmConfig({
                                isOpen: true,
                                title: 'Remove Image?',
                                description: 'Are you sure you want to remove this image from the gallery?',
                                onConfirm: () => removeImage(index)
                            });
                        }}
                        disabled={disabled || isUploading}
                        title="Remove"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity flex items-center justify-between gap-1">
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

        {pendingImages.map((item) => (
          <div 
            key={item.id} 
            className="group relative aspect-square rounded-[1.5rem] overflow-hidden border-2 border-dashed border-primary/30 bg-primary/5 animate-pulse"
          >
            <img 
              src={item.url} 
              alt="Uploading..." 
              className="w-full h-full object-cover opacity-40 grayscale" 
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span className="text-[8px] font-black uppercase text-primary tracking-tighter">Processing...</span>
            </div>
          </div>
        ))}

        {allImages.length === 0 && !isUploading && pendingImages.length === 0 && (
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

      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, isOpen: open }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
      />

      <Dialog open={isVariantSelectionOpen} onOpenChange={setIsVariantSelectionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select from Variant Images</DialogTitle>
            <DialogDescription>
              Pick one of your generated variant images to use as the primary product image.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-1">
              {variantImages.map((variant, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="group relative aspect-square rounded-xl overflow-hidden border-2 hover:border-primary transition-all bg-muted"
                  onClick={() => {
                    onPrimaryChange(variant.url);
                    setIsVariantSelectionOpen(false);
                    toast({ title: "Primary Image Updated", description: `Using image from variant: ${variant.name}` });
                  }}
                >
                  <Image 
                    src={variant.url} 
                    alt={variant.name} 
                    fill 
                    className="object-cover transition-transform group-hover:scale-110" 
                    unoptimized
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-black/60 text-white text-[10px] font-bold truncate">
                    {variant.name}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

