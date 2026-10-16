'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import {
  FileCode,
  Mail,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Code,
  Eye,
  Check,
  Sparkles,
  Layout,
  Save,
  Search,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { EmptyTableState } from '@/components/ui/empty-table-state';

interface SavedTemplate {
  id: string;
  storeId: string;
  channel: 'email' | 'whatsapp';
  name: string;
  subject?: string;
  content: string;
  createdAt: any;
}

export default function MessageTemplatesPage() {
  const { user, permissions, store, staffMember } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id || 'global', [staffMember, store]);

  const templatesQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return currentStoreId === 'global'
      ? query(collection(firestore, 'messageTemplates'))
      : query(collection(firestore, 'messageTemplates'), where('storeId', '==', currentStoreId));
  }, [firestore, currentStoreId]);

  const { data: templates, isLoading } = useCollection<SavedTemplate>(templatesQuery);

  const [activeChannel, setActiveChannel] = useState<'email' | 'whatsapp'>('email');
  const [editingTemplate, setEditingTemplate] = useState<SavedTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter(t =>
      t.channel === activeChannel &&
      (t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
       t.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [templates, activeChannel, searchQuery]);

  const handleOpenNewDialog = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateSubject('');
    setTemplateContent('');
    setIsDialogOpen(true);
  };

  const handleEditTemplate = (tmpl: SavedTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateName(tmpl.name);
    setTemplateSubject(tmpl.subject || '');
    setTemplateContent(tmpl.content);
    setIsDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !templateContent.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Template name and content are required.' });
      return;
    }

    if (!firestore) return;

    try {
      if (editingTemplate) {
        await updateDoc(doc(firestore, 'messageTemplates', editingTemplate.id), {
          name: templateName.trim(),
          subject: activeChannel === 'email' ? templateSubject.trim() : '',
          content: templateContent.trim(),
          updatedAt: serverTimestamp()
        });
        toast({ title: 'Template Updated', description: `Successfully updated "${templateName}".` });
      } else {
        await addDoc(collection(firestore, 'messageTemplates'), {
          storeId: currentStoreId,
          channel: activeChannel,
          name: templateName.trim(),
          subject: activeChannel === 'email' ? templateSubject.trim() : '',
          content: templateContent.trim(),
          createdAt: serverTimestamp()
        });
        toast({ title: 'Template Saved', description: `Successfully saved "${templateName}".` });
      }

      setIsDialogOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error Saving Template', description: e.message });
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'messageTemplates', id));
      toast({ title: 'Template Deleted', description: `Removed "${name}".` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error Deleting Template', description: e.message });
    }
  };

  const handleInsertVariable = (variable: string) => {
    setTemplateContent(prev => prev + ' ' + variable);
  };

  if (!permissions.canSendMarketingWhatsapp && !permissions.manage_settings) {
    return <AccessDenied />;
  }

  const previewSubject = templateSubject
    .replace(/\{name\}/gi, 'Jane Doe')
    .replace(/\{email\}/gi, 'jane@example.com')
    .replace(/\{storeName\}/gi, store?.name || 'Our Store');

  const previewContent = templateContent
    .replace(/\{name\}/gi, 'Jane Doe')
    .replace(/\{email\}/gi, 'jane@example.com')
    .replace(/\{storeName\}/gi, store?.name || 'Our Store');

  return (
    <div className="space-y-8">
      <PageHeader
        icon={FileCode}
        title="Custom Templates Manager"
        description="Design, save, and manage custom HTML/Text email templates and WhatsApp message templates."
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs value={activeChannel} onValueChange={(val: any) => setActiveChannel(val)} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-2 rounded-2xl h-12 bg-gray-100 dark:bg-muted p-1 w-full md:w-80">
            <TabsTrigger value="email" className="rounded-xl font-bold flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" /> Email Templates
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="rounded-xl font-bold flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" /> WhatsApp Templates
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeChannel} templates...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-12 rounded-2xl bg-gray-50 dark:bg-muted/50 border-gray-100 dark:border-border/50"
            />
          </div>

          <Button
            onClick={handleOpenNewDialog}
            className="rounded-2xl h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 dark:shadow-none"
          >
            <Plus className="h-4 w-4 mr-2" /> Create Template
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="rounded-3xl border-none shadow-lg">
          <CardContent className="p-8">
            <EmptyTableState
              icon={FileCode}
              title={`No ${activeChannel === 'email' ? 'Email' : 'WhatsApp'} Templates Found`}
              description={`Create your first custom ${activeChannel} template with HTML or visual text formatting.`}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(tmpl => (
            <Card key={tmpl.id} className="rounded-3xl border-none shadow-lg overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all">
              <CardHeader className="pb-3 border-b border-gray-100 dark:border-border/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold truncate">{tmpl.name}</CardTitle>
                    <Badge variant="outline" className="capitalize text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                      {tmpl.channel}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 space-y-2">
                {tmpl.subject && (
                  <p className="text-xs font-bold text-muted-foreground truncate">
                    Subject: <span className="text-foreground">{tmpl.subject}</span>
                  </p>
                )}
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-muted/40 text-xs font-mono line-clamp-4 text-muted-foreground">
                  {tmpl.content}
                </div>
              </CardContent>
              <CardFooter className="pt-3 pb-4 px-6 border-t border-gray-100 dark:border-border/40 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTemplate(tmpl)}
                  className="rounded-xl h-9 px-4 text-xs font-bold"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                  className="rounded-xl h-9 px-3 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Custom Template'}</DialogTitle>
            <DialogDescription>
              {activeChannel === 'email' ? 'Design email templates using HTML or plain text.' : 'Format custom WhatsApp templates with placeholders.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold">Template Name</label>
              <Input
                placeholder="e.g. VIP Welcome Promotion"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>

            {activeChannel === 'email' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Email Subject Line</label>
                <Input
                  placeholder="e.g. Special offer inside for {name}!"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  className="h-11 rounded-2xl"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold">
                  {activeChannel === 'email' ? 'Email Body (HTML / Plain Text)' : 'WhatsApp Message Content'}
                </label>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleInsertVariable('{name}')} className="h-6 text-[10px] rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30">
                    + Name
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleInsertVariable('{email}')} className="h-6 text-[10px] rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/30">
                    + Email
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleInsertVariable('{storeName}')} className="h-6 text-[10px] rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30">
                    + Store
                  </Button>
                </div>
              </div>
              <Textarea
                rows={9}
                placeholder={activeChannel === 'email' ? '<h2>Hello {name}</h2><p>Your message...</p>' : '*Hello {name}*,\n\nYour WhatsApp message...'}
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                className="rounded-2xl font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="rounded-2xl h-11 px-5">
                    <Eye className="h-4 w-4 mr-2" /> Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Template Live Preview</DialogTitle>
                    <DialogDescription>Sample substitution preview for Jane Doe.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4 border-t">
                    {activeChannel === 'email' && (
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold">Subject</p>
                        <p className="font-bold text-base">{previewSubject || 'No Subject'}</p>
                      </div>
                    )}
                    <div className="p-5 rounded-2xl border bg-white dark:bg-black overflow-auto max-h-80">
                      {activeChannel === 'email' ? (
                        <div dangerouslySetInnerHTML={{ __html: previewContent || '<p>No Content</p>' }} />
                      ) : (
                        <p className="whitespace-pre-line text-sm">{previewContent || 'No Content'}</p>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                type="button"
                onClick={handleSaveTemplate}
                className="rounded-2xl h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                <Save className="h-4 w-4 mr-2" /> Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
