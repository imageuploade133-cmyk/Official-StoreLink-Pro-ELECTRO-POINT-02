
'use client';
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { updateProfile, type User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { Loader2, UploadCloud } from 'lucide-react';
import type { StaffMember } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';

interface ProfilePictureUploadProps {
  user: User;
  staffMember: StaffMember | null;
}

const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].replace(/[^a-zA/g, ' ').split(' ').filter(Boolean);
     if (parts.length > 1) {
        return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 1) {
      return parts[0].substring(0,2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
};

export function ProfilePictureUpload({ user, staffMember }: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { settings } = useSettings();
  const auth = useAuth();
  const firestore = useFirestore();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({ variant: 'destructive', title: 'No file selected', description: 'Please choose an image to upload.' });
      return;
    }
    
    const maxFileSizeMb = settings?.imageMaxFileSizeMb || 5;
    if (file.size > maxFileSizeMb * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File too large', description: `Avatar must be smaller than ${maxFileSizeMb}MB.` });
        return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const imageDataUri = reader.result as string;
          const result = await uploadImage({ imageDataUri });
          const newPhotoURL = result.display_url;

          await updateProfile(user, { photoURL: newPhotoURL });

          const userProfileRef = doc(firestore, 'users', user.uid);
          await updateDoc(userProfileRef, { photoURL: newPhotoURL });
          
          if (staffMember) {
            const staffRef = doc(firestore, 'staff', user.uid);
            await updateDoc(staffRef, { avatar: newPhotoURL });
          }
          
          toast({ title: 'Success', description: 'Profile picture updated.' });
          setPreview(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          // Force a reload to show the new avatar in the nav.
          window.location.reload(); 
        } catch (error: any) {
          toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload image." });
        } finally {
           setIsUploading(false);
        }
      };
      reader.onerror = () => {
        toast({ variant: "destructive", title: "File Error", description: "Could not read the selected file."});
        setIsUploading(false);
      };
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Error', description: error.message });
       setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Picture</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Avatar className="h-32 w-32 border-4 border-muted">
          <AvatarImage src={preview || user.photoURL || ''} alt={user.displayName || 'User'} />
          <AvatarFallback className="text-4xl">{getInitials(user?.email)}</AvatarFallback>
        </Avatar>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/gif"
          className="hidden"
          id="profile-picture-input"
        />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
           <UploadCloud className="mr-2 h-4 w-4" /> Choose Image
        </Button>
        {preview && (
          <Button onClick={handleUpload} disabled={isUploading}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save New Picture
          </Button>
        )}
        <p className="text text-muted-foreground uppercase font-black">Limit: {settings?.imageMaxFileSizeMb || 5}MB</p>
      </CardContent>
    </Card>
  );
}
