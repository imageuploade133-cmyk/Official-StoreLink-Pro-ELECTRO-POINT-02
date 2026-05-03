
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Globe, CheckCircle2, AlertCircle, Clock, Trash2, ExternalLink, Copy, RefreshCw, Info } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  addDomainToVercel, 
  removeDomainFromVercel, 
  verifyDomain, 
  updateStoreDomain,
  checkDomainStatus,
  isSubdomainAvailable,
  updateStorePrimaryDomain,
  toggleDomainRedirect
} from '@/app/actions/domains';
import { getMainDomain } from '@/lib/domain';
import { cn } from '@/lib/utils';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export default function DomainSettingsPage() {
  const { store, permissions, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [domainInput, setDomainInput] = useState('');
  const [subdomainInput, setSubdomainInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubdomainSubmitting, setIsSubdomainSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (store?.customDomain) {
      setDomainInput(store.customDomain);
    }
    if (store?.subdomain) {
      setSubdomainInput(store.subdomain);
    } else if (store?.id) {
        setSubdomainInput(store.id);
    }
  }, [store]);

  const mainDomain = useMemo(() => getMainDomain(), []);
  
  const freeUrl = `${mainDomain}/${store?.id || 'your-store'}`;
  const proUrl = store?.subdomain ? `${store.subdomain}.${mainDomain}` : `${store?.id}.${mainDomain}`;
  const customDomain = store?.customDomain;

  const domainStatus = useMemo(() => {
    if (!customDomain) return 'none';
    return store?.domainStatus || (store?.domainVerified ? 'active' : 'pending');
  }, [customDomain, store?.domainStatus, store?.domainVerified]);

  const handleConnect = async () => {
    if (!domainInput) {
      toast({
        title: "Error",
        description: "Please enter a domain name",
        variant: "destructive"
      });
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i;
    if (!domainRegex.test(domainInput)) {
        toast({
            title: "Invalid Domain",
            description: "Please enter a valid domain name (e.g., example.com)",
            variant: "destructive"
        });
        return;
    }

    setIsSubmitting(true);
    try {
      // 1. Add to Vercel
      const vercelRes = await addDomainToVercel(domainInput);
      if (!vercelRes.success && vercelRes.error?.code !== 'domain_already_exists') {
        throw new Error(vercelRes.error?.message || 'Failed to add domain to Vercel');
      }

      // 2. Update Firestore
      await updateStoreDomain(store!.id, domainInput, store?.subdomain || subdomainInput || null);

      toast({
        title: "Domain Connected",
        description: "Your domain has been connected. Please configure your DNS settings.",
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubdomain = async () => {
    if (!store || !subdomainInput) return;
    
    setIsSubdomainSubmitting(true);
    try {
      const available = await isSubdomainAvailable(subdomainInput, store.id);
      if (!available) {
        toast({ 
          variant: 'destructive', 
          title: 'Subdomain unavailable', 
          description: 'This subdomain is already taken or reserved. Please choose another one.' 
        });
        return;
      }

      await updateStoreDomain(store.id, store.customDomain || null, subdomainInput);
      toast({ 
        title: 'Subdomain Updated', 
        description: `Your store subdomain has been updated to ${subdomainInput}.${mainDomain}` 
      });
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Update Failed', 
        description: error.message || 'Failed to update subdomain.' 
      });
    } finally {
      setIsSubdomainSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!customDomain) return;
    
    setIsVerifying(true);
    try {
      const res = await verifyDomain(store!.id, customDomain);
      if (res.success) {
        toast({
          title: "Domain Verified",
          description: "Your domain is now active and ready to use!",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: res.error || "DNS records not yet propagated or incorrect.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemove = async () => {
    if (!customDomain) return;
    
    if (!confirm(`Are you sure you want to remove ${customDomain}?`)) return;

    setIsRemoving(true);
    try {
      // 1. Remove from Vercel
      await removeDomainFromVercel(customDomain);
      
      // 2. Update Firestore
      await updateStoreDomain(store!.id, null, store?.subdomain || null);
      
      // If primary domain was custom, reset it to free
      if (store?.primaryDomainType === 'custom') {
        await updateStorePrimaryDomain(store!.id, 'free');
      }

      setDomainInput('');

      toast({
        title: "Domain Removed",
        description: "The custom domain has been removed from your store.",
      });
    } catch (error: any) {
      toast({
        title: "Removal Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handlePrimaryDomainChange = async (value: 'free' | 'subdomain' | 'custom') => {
    if (!store) return;
    try {
        await updateStorePrimaryDomain(store.id, value);
        toast({
            title: "Primary Domain Updated",
            description: `Your primary domain is now set to ${value === 'free' ? 'Free URL' : value === 'subdomain' ? 'Pro URL' : 'Custom Domain'}.`,
        });
    } catch (error: any) {
        toast({
            title: "Update Failed",
            description: error.message || "Failed to update primary domain.",
            variant: "destructive"
        });
    }
  };

  const handleToggleRedirect = async (enabled: boolean) => {
    if (!store) return;
    try {
        await toggleDomainRedirect(store.id, enabled);
        toast({
            title: enabled ? "Redirects Enabled" : "Redirects Disabled",
            description: enabled 
                ? "Secondary domains will now redirect to your primary domain."
                : "All active domains will work independently.",
        });
    } catch (error: any) {
        toast({
            title: "Update Failed",
            description: error.message || "Failed to update redirect settings.",
            variant: "destructive"
        });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  if (isAuthLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        icon={Globe}
        title="Domain Settings"
        description="Connect and manage your store's custom domain and URLs."
      />

      {/* Connection Guide */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300 text-lg">
            <Info className="h-5 w-5" />
            Getting Started with Custom Domains
          </CardTitle>
          <CardDescription className="text-blue-700/80 dark:text-blue-400/80">
            Follow these steps to connect your own domain name (like www.yourbrand.com) to your store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[12px] text-white">1</span>
                Add Your Domain
              </div>
              <p className="text-sm text-blue-800/70 dark:text-blue-300/70 leading-relaxed">
                Enter your domain name in the <strong>Add Custom Domain</strong> form below. We support both root domains and subdomains.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[12px] text-white">2</span>
                Update DNS Records
              </div>
              <p className="text-sm text-blue-800/70 dark:text-blue-300/70 leading-relaxed">
                Log in to your domain provider (GoDaddy, Namecheap, etc.) and add the <strong>A</strong> and <strong>CNAME</strong> records provided in the instructions.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[12px] text-white">3</span>
                Verify & Launch
              </div>
              <p className="text-sm text-blue-800/70 dark:text-blue-300/70 leading-relaxed">
                Wait for DNS propagation, then click <strong>Verify</strong>. Once active, set it as your <strong>Primary Domain</strong> to start loading your store.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-blue-50/50 dark:bg-blue-900/10 py-3">
          <p className="text-xs text-blue-700/80 dark:text-blue-400/80">
            <strong>Note:</strong> A custom domain makes your store look more professional and helps customers remember your website easily.
          </p>
        </CardFooter>
      </Card>

      {/* Primary Domain Configuration */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Primary Domain Configuration
          </CardTitle>
          <CardDescription>
            Choose your primary domain for generated links and SEO.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primary-domain">Primary Domain</Label>
              <Select 
                value={store?.primaryDomainType || 'free'} 
                onValueChange={(value) => handlePrimaryDomainChange(value as any)}
              >
                <SelectTrigger id="primary-domain">
                  <SelectValue placeholder="Select primary domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free URL ({freeUrl})</SelectItem>
                  <SelectItem value="subdomain">Pro URL ({proUrl})</SelectItem>
                  {domainStatus === 'active' && (
                    <SelectItem value="custom">Custom Domain ({customDomain})</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This domain will be used for all shared links and search engine optimization.
              </p>
            </div>

            <div className="flex flex-col justify-end space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                <div className="space-y-0.5">
                  <Label className="text-base">Automatic Redirects</Label>
                  <p className="text-sm text-muted-foreground">
                    Redirect all secondary domains to your primary domain.
                  </p>
                </div>
                <Switch 
                  checked={!!store?.redirectEnabled} 
                  onCheckedChange={handleToggleRedirect}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current URLs */}
      <Card>
        <CardHeader>
          <CardTitle>Store URLs</CardTitle>
          <CardDescription>
            Different ways customers can access your store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground mb-1">Free URL</p>
              <div className="flex items-center justify-between">
                <code className="text-sm font-semibold">{freeUrl}</code>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(freeUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground mb-1">Pro URL</p>
              <div className="flex items-center justify-between">
                <code className="text-sm font-semibold">{proUrl}</code>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(proUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {customDomain && (
            <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
               <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-primary">Custom Domain</p>
                    <Badge variant={domainStatus === 'active' ? 'default' : 'secondary'} className={cn(
                        domainStatus === 'active' && "bg-green-500 hover:bg-green-600",
                        domainStatus === 'pending' && "bg-yellow-500 hover:bg-yellow-600",
                        domainStatus === 'failed' && "bg-red-500 hover:bg-red-600"
                    )}>
                        {domainStatus.charAt(0).toUpperCase() + domainStatus.slice(1)}
                    </Badge>
               </div>
              <div className="flex items-center justify-between">
                <code className="text-lg font-bold">{customDomain}</code>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`https://${customDomain}`)}>
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                        <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subdomain Management */}
      <Card>
        <CardHeader>
          <CardTitle>Pro URL Settings</CardTitle>
          <CardDescription>
            Customize your professional subdomain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Input
                placeholder="your-store"
                value={subdomainInput}
                onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                disabled={isSubdomainSubmitting}
                className="pr-32"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">
                .{mainDomain}
              </div>
            </div>
            <Button 
                onClick={handleUpdateSubdomain} 
                disabled={isSubdomainSubmitting || !subdomainInput || subdomainInput === store?.subdomain}
            >
              {isSubdomainSubmitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update Subdomain
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connect Domain Form */}
      <Card>
        <CardHeader>
          <CardTitle>{customDomain ? 'Update Custom Domain' : 'Add Custom Domain'}</CardTitle>
          <CardDescription>
            Enter your domain name to connect it to your store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="example.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value.toLowerCase())}
              disabled={isSubmitting || isVerifying || isRemoving}
            />
            <Button 
                onClick={handleConnect} 
                disabled={isSubmitting || !domainInput || domainInput === customDomain}
            >
              {isSubmitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Connect Domain
            </Button>
          </div>
          {customDomain && (
             <div className="flex gap-2">
                <Button 
                    variant="outline" 
                    onClick={handleVerify} 
                    disabled={isVerifying || domainStatus === 'active'}
                    className="flex-1"
                >
                    {isVerifying ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />}
                    Verify DNS Configuration
                </Button>
                <Button 
                    variant="destructive" 
                    onClick={handleRemove} 
                    disabled={isRemoving}
                >
                    {isRemoving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
             </div>
          )}
        </CardContent>
      </Card>

      {/* DNS Instructions */}
      {customDomain && domainStatus !== 'active' && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              DNS Configuration Required
            </CardTitle>
            <CardDescription>
              Please add the following records to your DNS provider (e.g., GoDaddy, Namecheap) to point your domain to StoreLink Pro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold">A Record</p>
                <div className="grid grid-cols-3 gap-4 p-3 border rounded bg-background">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Type</p>
                    <p className="font-mono text-sm">A</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Name</p>
                    <p className="font-mono text-sm">@</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Value</p>
                      <p className="font-mono text-sm">76.76.21.21</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard('76.76.21.21')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">CNAME Record</p>
                <div className="grid grid-cols-3 gap-4 p-3 border rounded bg-background">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Type</p>
                    <p className="font-mono text-sm">CNAME</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Name</p>
                    <p className="font-mono text-sm">www</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Value</p>
                      <p className="font-mono text-sm">cname.vercel-dns.com</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard('cname.vercel-dns.com')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-background border rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />
              <p className="text-sm text-muted-foreground">
                DNS changes can take up to 24-48 hours to propagate, although it usually happens much faster. After updating your DNS, click the "Verify" button above.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {domainStatus === 'active' && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Domain Fully Active
            </CardTitle>
            <CardDescription className="text-green-600/80 dark:text-green-400/80">
              Your custom domain is correctly configured and pointing to your store.
              {store?.domainActivatedAt && (
                <span className="block mt-1 text-xs">
                  Activated on: {store.domainActivatedAt.toDate().toLocaleDateString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
              <div className="flex items-center gap-2 text-sm">
                  <p>Your store is now accessible at:</p>
                  <a 
                    href={`https://${customDomain}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-bold underline flex items-center gap-1"
                  >
                      https://{customDomain}
                      <ExternalLink className="h-3 w-3" />
                  </a>
              </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
