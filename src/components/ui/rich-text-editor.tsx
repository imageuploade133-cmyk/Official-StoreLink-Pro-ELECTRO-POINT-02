'use client';

import * as React from 'react';
import { 
  Bold, 
  Link as LinkIcon, 
  Palette, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Pencil,
  List,
  ListOrdered,
  Undo,
  Redo,
  Code,
  ImagePlus,
  Video,
  Loader2,
  X,
  Trash2,
  Table as TableIcon,
  Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Black', value: '#000000' },
  { name: 'Gray', value: '#64748b' },
];

const FONT_SIZES = [
  { label: 'Extra Small', value: '1', size: '10px' },
  { label: 'Small', value: '2', size: '13px' },
  { label: 'Normal', value: '3', size: '16px' },
  { label: 'Medium', value: '4', size: '18px' },
  { label: 'Large', value: '5', size: '24px' },
  { label: 'Extra Large', value: '6', size: '32px' },
  { label: 'Huge', value: '7', size: '48px' },
];

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = React.useState<'visual' | 'code'>('visual');
  const [isUploading, setIsUploading] = React.useState(false);
  const [selectedMedia, setSelectedMedia] = React.useState<HTMLElement | null>(null);
  const [resizeState, setResizeState] = React.useState<{ active: boolean; startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const lastValueRef = React.useRef(value);
  const { toast } = useToast();

  // Robust synchronization logic
  React.useEffect(() => {
    if (editorRef.current && !isFocused && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
      lastValueRef.current = value;
    }
  }, [value, isFocused]);

  const handleInput = () => {
    if (editorRef.current) {
      const newValue = editorRef.current.innerHTML;
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue;
        onChange(newValue);
      }
    }
  };

  const syncValue = () => handleInput();

  const ensureFocus = () => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.focus();
    }
  };

  const executeCommand = (e: React.MouseEvent, command: string, cmdValue: string | undefined = undefined) => {
    e.preventDefault();
    e.stopPropagation();
    ensureFocus();
    document.execCommand(command, false, cmdValue);
    handleInput();
  };

  const handleInsertTable = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rowsStr = window.prompt('Enter number of rows:', '3');
    const colsStr = window.prompt('Enter number of columns:', '3');
    
    if (!rowsStr || !colsStr) return;
    
    const rows = parseInt(rowsStr);
    const cols = parseInt(colsStr);
    
    if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Dimensions', description: 'Rows and columns must be positive numbers.' });
        return;
    }

    // Explicitly focus and restore selection range if possible
    ensureFocus();

    let tableHtml = '<table border="1" class="rich-editor-table" style="width: 100%; border-collapse: collapse; margin: 16px 0;">';
    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
        tableHtml += '<td style="border: 1px solid #cbd5e1; padding: 12px; min-width: 80px; height: 40px; vertical-align: top;">&nbsp;</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</table><p><br></p>';

    document.execCommand('insertHTML', false, tableHtml);
    handleInput();
  };

  const applyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    ensureFocus();
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    
    const url = window.prompt('Enter the URL (e.g., https://example.com):', 'https://');
    if (!url || url === 'https://') return;

    const openInNewTab = window.confirm('Should this link open in a new tab?');
    
    let linkText = selectedText;
    if (!linkText) {
      linkText = window.prompt('Enter the text to display for this link:', url) || url;
    }

    const targetAttr = openInNewTab ? 'target="_blank" rel="noopener noreferrer"' : '';
    const linkHtml = `<a href="${url}" ${targetAttr} class="text-primary hover:underline font-bold">${linkText}</a>`;

    ensureFocus();
    document.execCommand('insertHTML', false, linkHtml);
    handleInput();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        const imgHtml = `<img src="${result.display_url}" class="rich-editor-media" style="max-width: 100%; height: auto; border-radius: 12px; margin: 12px auto; display: block;" />`;
        
        ensureFocus();
        document.execCommand('insertHTML', false, imgHtml);
        handleInput();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not upload image.' });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
  };

  const handleVideoEmbed = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = window.prompt('Enter Video URL (YouTube, Vimeo, or Direct MP4):', 'https://');
    if (!url || url === 'https://') return;

    let videoHtml = '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const vid = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
      videoHtml = `<iframe src="https://www.youtube.com/embed/${vid}" class="rich-editor-media" style="width: 100%; aspect-ratio: 16/9; border-radius: 12px; border: none; margin: 12px auto; display: block;" allowfullscreen></iframe>`;
    } else if (url.includes('vimeo.com')) {
      const vid = url.split('/').pop();
      videoHtml = `<iframe src="https://player.vimeo.com/video/${vid}" class="rich-editor-media" style="width: 100%; aspect-ratio: 16/9; border-radius: 12px; border: none; margin: 12px auto; display: block;" allowfullscreen></iframe>`;
    } else {
      videoHtml = `<video src="${url}" controls class="rich-editor-media" style="max-width: 100%; height: auto; border-radius: 12px; margin: 12px auto; display: block;"></video>`;
    }

    ensureFocus();
    document.execCommand('insertHTML', false, videoHtml);
    handleInput();
  };

  React.useEffect(() => {
    const handleEditorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (['IMG', 'VIDEO', 'IFRAME'].includes(target.tagName)) {
        setSelectedMedia(target);
      } else {
        setSelectedMedia(null);
      }
    };

    const container = editorRef.current;
    if (container) {
      container.addEventListener('click', handleEditorClick);
    }
    return () => {
      if (container) container.removeEventListener('click', handleEditorClick);
    };
  }, []);

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!selectedMedia) return;
    e.preventDefault();
    e.stopPropagation();

    setResizeState({
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: selectedMedia.clientWidth,
      startHeight: selectedMedia.clientHeight,
    });
  };

  React.useEffect(() => {
    if (!resizeState || !selectedMedia) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeState.startX;
      const newWidth = Math.max(100, resizeState.startWidth + deltaX);
      const ratio = resizeState.startWidth / resizeState.startHeight;
      const newHeight = newWidth / ratio;

      selectedMedia.style.width = `${newWidth}px`;
      if (selectedMedia.tagName !== 'IFRAME') {
          selectedMedia.style.height = 'auto';
      } else {
          selectedMedia.style.height = `${newHeight}px`;
      }
    };

    const handleMouseUp = () => {
      setResizeState(null);
      handleInput();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeState, selectedMedia]);

  const overlayStyle = React.useMemo(() => {
    if (!selectedMedia || !editorRef.current) return null;
    const rect = selectedMedia.getBoundingClientRect();
    const parentRect = editorRef.current.getBoundingClientRect();
    return {
      top: rect.top - parentRect.top + editorRef.current.scrollTop,
      left: rect.left - parentRect.left + editorRef.current.scrollLeft,
      width: rect.width,
      height: rect.height,
    };
  }, [selectedMedia, resizeState]);

  const handleDeleteMedia = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedMedia) {
      selectedMedia.remove();
      setSelectedMedia(null);
      handleInput();
    }
  };

  return (
    <div className={cn("border rounded-2xl overflow-hidden bg-background  flex flex-col relative", className)}>
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex flex-wrap items-center gap-1.5">
          {activeTab === 'visual' ? (
            <>
              <div className="flex items-center gap-1 mr-1">
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onMouseDown={(e) => executeCommand(e, 'undo')} title="Undo"><Undo className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onMouseDown={(e) => executeCommand(e, 'redo')} title="Redo"><Redo className="h-4 w-4" /></Button>
              </div>
              <Separator orientation="vertical" className="h-5 mx-1" />
              
              {/* Font Size Selector */}
              <Popover>
                <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" title="Font Size"><Type className="h-4 w-4" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2 rounded-xl " align="start">
                  <div className="flex flex-col gap-1">
                    {FONT_SIZES.map((size) => (
                      <Button
                        key={size.value}
                        type="button"
                        variant="ghost"
                        className="justify-start font-bold h-9 px-3"
                        onMouseDown={(e) => executeCommand(e, 'fontSize', size.value)}
                      >
                        <span style={{ fontSize: size.size }}>{size.label}</span>
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 font-black" onMouseDown={(e) => executeCommand(e, 'bold')} title="Bold"><Bold className="h-4 w-4" /></Button>
              <Popover>
                <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" title="Text Color"><Palette className="h-4 w-4" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-3 rounded-xl " align="start">
                  <div className="grid grid-cols-4 gap-2">
                    {COLORS.map((c) => (
                      <button 
                        key={c.value} 
                        type="button" 
                        className="h-7 w-7 rounded-full border-2 border-background  hover:scale-125 transition-transform" 
                        style={{ backgroundColor: c.value }} 
                        onMouseDown={(e) => executeCommand(e, 'foreColor', c.value)} 
                        title={c.name} 
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onMouseDown={(e) => executeCommand(e, 'justifyLeft')} title="Align Left"><AlignLeft className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onMouseDown={(e) => executeCommand(e, 'justifyCenter')} title="Align Center"><AlignCenter className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onMouseDown={(e) => executeCommand(e, 'justifyRight')} title="Align Right"><AlignRight className="h-4 w-4" /></Button>
              </div>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-primary font-bold" onMouseDown={applyLink} title="Insert Link (New Tab option)"><LinkIcon className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onMouseDown={(e) => executeCommand(e, 'insertUnorderedList')} title="Bullet List"><List className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onMouseDown={(e) => executeCommand(e, 'insertOrderedList')} title="Numbered List"><ListOrdered className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-indigo-600" onMouseDown={handleInsertTable} title="Insert Table"><TableIcon className="h-4 w-4" /></Button>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-primary hover:bg-primary/10" 
                onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }} 
                disabled={isUploading}
                title="Insert Image"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-blue-600 hover:bg-blue-50" 
                onMouseDown={handleVideoEmbed}
                title="Embed Video"
              >
                <Video className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex items-center h-9 px-3 text font-black uppercase text-muted-foreground tracking-widest bg-muted/50 rounded-lg">
              <Code className="mr-2 h-3.5 w-3.5" /> HTML Source Mode
            </div>
          )}
        </div>

        <div className="inline-flex items-center justify-center rounded-xl text-muted-foreground h-10 bg-muted/50 p-1 border  ml-2">
          <button
            type="button"
            onClick={() => { syncValue(); setActiveTab('visual'); }}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-black ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 gap-2 uppercase tracking-wider",
              activeTab === 'visual' ? "bg-background text-primary " : "hover:bg-background/50"
            )}
          >
            <Pencil className="h-3 w-3" /> Designer
          </button>
          <button
            type="button"
            onClick={() => { syncValue(); setActiveTab('code'); }}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-black ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 gap-2 uppercase tracking-wider",
              activeTab === 'code' ? "bg-background text-primary " : "hover:bg-background/50"
            )}
          >
            <Code className="h-3 w-3" /> Source
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="relative flex-1 min-h overflow-hidden">
        {/* Visual Mode */}
        <div 
          className={cn("h-full", activeTab !== 'visual' && "hidden")}
          style={{ display: activeTab === 'visual' ? 'block' : 'none' }}
        >
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
                setIsFocused(false);
                handleInput();
            }}
            className="prose dark:prose-invert prose-sm max-w-none w-full h-full min-h p-6 outline-none focus:ring-0 overflow-y-auto bg-background selection:bg-primary/20 rich-editor-content"
            style={{ minHeight: '400px' }}
          />
          {!value && !isFocused && (
            <div className="absolute top-6 left-6 text-muted-foreground pointer-events-none text-sm font-medium italic opacity-50">
              {placeholder || "Start designing your premium product description..."}
            </div>
          )}

          {/* Media Control & Resize Overlays */}
          {selectedMedia && overlayStyle && (
            <div 
              className="absolute border-2 border-primary pointer-events-none z-30 transition-all duration-75"
              style={{
                top: overlayStyle.top,
                left: overlayStyle.left,
                width: overlayStyle.width,
                height: overlayStyle.height,
              }}
            >
              {/* Delete Button */}
              <div className="absolute -top-10 right-0 pointer-events-auto">
                <Button 
                    variant="destructive" 
                    size="sm" 
                    className="h-8 px-3 rounded-full font-black text uppercase "
                    onMouseDown={handleDeleteMedia}
                >
                    <Trash2 className="h-3 w-3 mr-1.5" /> Remove
                </Button>
              </div>

              {/* Resize Handle */}
              <div 
                className="absolute -bottom-2 -right-2 w-5 h-5 bg-primary border-4 border-background rounded-full cursor-nwse-resize pointer-events-auto  hover:scale-125 transition-transform"
                onMouseDown={handleResizeStart}
              />
            </div>
          )}
        </div>

        {/* Code Mode */}
        <div 
          className={cn("h-full", activeTab !== 'code' && "hidden")}
          style={{ display: activeTab === 'code' ? 'block' : 'none' }}
        >
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Raw HTML source code..."
            className="w-full h-full min-h p-6 font-mono text-xs leading-relaxed bg-slate-950 text-emerald-400 outline-none resize-none border-none selection:bg-emerald-500/20"
            style={{ minHeight: '400px' }}
          />
        </div>
      </div>
      
      <div className="px-4 py-2.5 bg-muted/20 border-t flex justify-between items-center text font-black text-muted-foreground uppercase tracking">
        <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {activeTab === 'visual' ? 'Designer Ready' : 'Source Active'}
            </span>
            <span>{value?.length || 0} Characters</span>
        </div>
        <div className="flex items-center gap-2">
            StoreLink-Pro Editor v2.9
        </div>
      </div>
    </div>
  );
}
