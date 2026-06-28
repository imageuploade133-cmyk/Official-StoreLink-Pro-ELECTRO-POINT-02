'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  Search,
  Mail,
  Calendar,
  User as UserIcon,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  MoreVertical,
  Ticket
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { format } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';
import AccessDenied from '@/components/staff-management/AccessDenied';

interface Invitation {
  id: string;
  codeHash: string;
  createdAt: string;
  createdBy: string;
  expiresAt: string | null;
  status: 'unused' | 'used' | 'revoked' | 'expired';
  usedBy?: string;
  usedAt?: string;
  maxUses: number;
  usedCount: number;
}

export default function InvitationManagerPage() {
  const auth = useFirebaseAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewCodeModalOpen, setIsViewCodeModalOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const isSuperAdmin = user?.email === 'abdulkadir123shaba@gmail.com';

  const fetchInvitations = async () => {
    setIsLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/invitations', {
        headers: {
            'Authorization': `Bearer ${idToken}`
        }
      });
      if (response.ok) {
        const data = await response.ok ? await response.json() : [];
        setInvitations(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchInvitations();
    }
  }, [isSuperAdmin]);

  if (isAuthLoading) {
    return <div className="p-8 flex justify-center"><Spinner /></div>;
  }

  if (!isSuperAdmin) {
    return <AccessDenied />;
  }

  const handleGenerate = async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          createdBy: user?.displayName || user?.email || 'Admin',
          maxUses,
          expiresAt: expiryDate || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedCode(data.code);
        setIsCreateModalOpen(false);
        setIsViewCodeModalOpen(true);
        fetchInvitations();
        toast({ title: "Invitation Generated", description: "The code is ready to use." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to generate invitation." });
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/invitations', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ id, status: 'revoked' })
      });

      if (response.ok) {
        toast({ title: "Invitation Revoked", description: "The code is no longer valid." });
        fetchInvitations();
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to revoke invitation." });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Invitation code copied to clipboard." });
  };

  const getStatusBadge = (status: string, expiresAt: string | null, usedCount: number, maxUses: number) => {
    if (status === 'revoked') return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" /> Revoked</Badge>;
    if (expiresAt && new Date(expiresAt) < new Date()) return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Expired</Badge>;
    if (usedCount >= maxUses) return <Badge className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle className="w-3 h-3 mr-1" /> Used</Badge>;
    return <Badge className="bg-blue-500 hover:bg-blue-600"><Ticket className="w-3 h-3 mr-1" /> Unused</Badge>;
  };

  const filteredInvitations = invitations.filter(inv =>
    inv.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Ticket}
        title="Invitation Manager"
        description="Generate and manage secure invitation codes for new merchant registration."
      >
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Generate Invitation
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by creator..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={fetchInvitations}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created At</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Spinner size="sm" />
                  </TableCell>
                </TableRow>
              ) : filteredInvitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No invitations found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {format(new Date(inv.createdAt), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3 h-3 text-muted-foreground" />
                        {inv.createdBy}
                      </div>
                    </TableCell>
                    <TableCell>
                        <span className="text-xs font-semibold">{inv.usedCount} / {inv.maxUses}</span>
                    </TableCell>
                    <TableCell>
                      {inv.expiresAt ? (
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(inv.expiresAt), 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        <span className="text-zinc-400">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(inv.status, inv.expiresAt, inv.usedCount, inv.maxUses)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRevoke(inv.id)} className="text-rose-500">
                            <Ban className="w-4 h-4 mr-2" /> Revoke
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New Invitation</DialogTitle>
            <DialogDescription>
              Create a secure, random invitation code for merchant signup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Uses</label>
              <Input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expiration Date (Optional)</label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate}>Generate Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Code Modal (Show Only Once) */}
      <Dialog open={isViewCodeModalOpen} onOpenChange={setIsViewCodeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitation Generated</DialogTitle>
            <DialogDescription className="text-rose-500 font-bold">
              IMPORTANT: This code will only be displayed once. Copy it now.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl">
            <code className="flex-1 text-lg font-mono break-all">{generatedCode}</code>
            <Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedCode)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setIsViewCodeModalOpen(false)}>I have copied the code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
