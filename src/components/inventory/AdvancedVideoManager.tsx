'use client';

import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Video, 
  Youtube, 
  Facebook, 
  Smartphone,
  Globe,
  Info,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const platformIcons = {
  direct: Video,
  youtube: Youtube,
  facebook: Facebook,
  tiktok: Smartphone,
};

export function AdvancedVideoManager() {
  const { control } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "videos"
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Video className="h-4 w-4" /> Multimedia Gallery
            </h4>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Social Media & Direct Video Links</p>
        </div>
        <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => append({ type: 'direct', url: '', title: '' })}
            className="rounded-full h-9 px-4 font-bold border-primary/30 text-primary hover:bg-primary/5"
        >
            <Plus className="h-4 w-4 mr-2" /> Add Video
        </Button>
      </div>

      <div className="space-y-4">
        {fields.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/10">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">No additional videos</p>
                <p className="text-[10px] text-muted-foreground mt-1">Add YouTube, TikTok or Social links to your gallery.</p>
            </div>
        ) : (
            <div className="space-y-3">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-6 border rounded-[2rem] bg-muted/5 space-y-4 relative group transition-all hover:border-primary/20">
                        <div className="absolute top-4 right-4 flex gap-2">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-1 flex flex-col items-center gap-1 justify-center">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30"
                                    onClick={() => move(index, index - 1)}
                                    disabled={index === 0}
                                    title="Move Up"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </Button>
                                <GripVertical className="h-5 w-5 text-muted-foreground/30" />
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30"
                                    onClick={() => move(index, index + 1)}
                                    disabled={index === fields.length - 1}
                                    title="Move Down"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            <div className="md:col-span-3 space-y-2">
                                <FormField
                                    control={control}
                                    name={`videos.${index}.type`}
                                    render={({ field: typeField }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Platform</FormLabel>
                                            <Select onValueChange={typeField.onChange} value={typeField.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-11 bg-background rounded-xl">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="direct">Direct Link (MP4)</SelectItem>
                                                    <SelectItem value="youtube">YouTube</SelectItem>
                                                    <SelectItem value="facebook">Facebook</SelectItem>
                                                    <SelectItem value="tiktok">TikTok</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="md:col-span-8 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={control}
                                        name={`videos.${index}.title`}
                                        render={({ field: titleField }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Video Title</FormLabel>
                                                <FormControl><Input placeholder="e.g., Unboxing Experience" {...titleField} className="h-11 bg-background rounded-xl" /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name={`videos.${index}.url`}
                                        render={({ field: urlField }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Media Reference</FormLabel>
                                                <FormControl><Input placeholder="Paste URL or <iframe> code" {...urlField} className="h-11 bg-background rounded-xl" /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
      
      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-4 items-start">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-[10px] space-y-1">
              <p className="font-bold text-primary uppercase">Elite Embedding Engine</p>
              <p className="text-muted-foreground leading-relaxed font-medium">
                  Supports pasting full YouTube/Facebook/TikTok embed codes or direct URLs. Vertical videos will automatically use portrait mode.
              </p>
          </div>
      </div>
    </div>
  );
}
