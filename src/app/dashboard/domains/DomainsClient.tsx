
'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Shield, CheckCircle, XCircle, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { addDomainToVercel, checkDomainStatus, updateStoreDomain, updateStorePlan, verifyDomain, isSubdomainAvailable } from '@/app/actions/domains';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { getMainDomain, getProtocol, getStoreUrl } from '@/lib/domain';

interface DomainsClientProps {
  initialMainDomain: string;
  initialProtocol: string;
}

export default function DomainsClient({ initialMainDomain, initialProtocol }: DomainsClientProps) {
  const { store, isAdmin, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [subdomainInput, setSubdomainInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [domainStatus, setDomainStatus] = useState<any>(null);

  const mainDomain = initialMainDomain;
  const protocol = initialProtocol;
  
  useEffect(() => {
    if (store?.customDomain) {
      setCustomDomain(store.customDomain);
      checkStatus(store.customDomain);
    }
    if (store?.subdomain) {
      setSubdomainInput(store.subdomain);
    } else if (store?.id) {
      setSubdomainInput(store.id);
    }
  }, [store]);

  const checkStatus = async (domain: string) => {
    const res = await checkDomainStatus(domain);
    if (res.success) {
      setDomainStatus(res.data);
    }
  };

  const handleUpdatePlan = async (plan: 'free' | 'pro' | 'premium') => {
    if (!store) return;
    setIsUpdating(true);
    try {
      await updateStorePlan(store.id, plan);
      toast({ title: 'Plan Updated', description: `Your plan has been updated to ${plan.toUpperCase()}.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Failed to update plan.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateSubdomain = async () => {
    if (!store || !subdomainInput) return;
    
    setIsUpdating(true);
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
      toast({ title: 'Subdomain Updated', description: `Your store subdomain has been updated to ${subdomainInput}.${mainDomain}` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Failed to update subdomain.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConnectDomain = async () => {
    if (!store || !customDomain) return;
    if (store.plan !== 'premium') {
      toast({ variant: 'destructive', title: 'Upgrade Required', description: 'Custom domains are only available on the Premium plan.' });
      return;
    }

    setIsUpdating(true);
    try {
      const res = await addDomainToVercel(customDomain);
      if (res.success) {
        await updateStoreDomain(store.id, customDomain, null);
        toast({ title: 'Domain Added', description: 'Domain successfully added. Please update your DNS records.' });
        checkStatus(customDomain);
      } else {
        toast({ variant: 'destructive', title: 'Failed to Add Domain', description: res.error?.message || 'Unknown error' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to connect domain.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerify = async () => {
    if (!store || !store.customDomain) return;
    setVerifying(true);
    try {
      const res = await verifyDomain(store.id, store.customDomain);
      if (res.success) {
        toast({ title: 'Domain Verified', description: 'Your domain has been successfully verified!' });
        checkStatus(store.customDomain);
      } else {
        toast({ variant: 'destructive', title: 'Verification Failed', description: res.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to verify domain.' });
    } finally {
      setVerifying(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>Only store owners can manage domain settings.</AlertDescription>
      </Alert>
    );
  }

  const currentPlan = store?.plan || 'free';
  const storeSlug = store?.id;
  const activeSubdomain = store?.subdomain || storeSlug;

  return (
    <div className="space-y-8 max-w-5xl">
      <PageHeader
        icon={Globe}
        title="Domain Settings"
        description="Manage how customers access your store online."
      />

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Current Primary URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <code className="text-lg font-bold text-primary break-all">
              {store?.customDomain && store.domainVerified 
                ? `${protocol}//${store.customDomain}` 
                : (currentPlan !== 'free' 
                   ? `${protocol}//${activeSubdomain}.${mainDomain}` 
                   : `${protocol}//${mainDomain}/${storeSlug}`)}
            </code>
            <Button variant="outline" size="sm" asChild className="shrink-0">
                <a 
                  href={store ? getStoreUrl(store.id, currentPlan, store.customDomain, store.subdomain) : '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                    Visit Store <ExternalLink className="h-4 w-4" />
                </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className={currentPlan === 'free' ? 'border-primary shadow-md' : ''}>
          <CardHeader>
            <CardTitle>Free Plan</CardTitle>
            <CardDescription>Default store URL</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Your store is accessible at:</p>
            <code className="bg-muted p-2 rounded block text-xs break-all">
              {mainDomain}/{storeSlug}
            </code>
          </CardContent>
          <CardFooter>
            <Button 
              variant={currentPlan === 'free' ? 'outline' : 'default'} 
              disabled={currentPlan === 'free' || isUpdating}
              onClick={() => handleUpdatePlan('free')}
              className="w-full"
            >
              {currentPlan === 'free' ? 'Current Plan' : 'Switch to Free'}
            </Button>
          </CardFooter>
        </Card>

        <Card className={currentPlan === 'pro' ? 'border-primary shadow-md' : ''}>
          <CardHeader>
            <CardTitle>Pro Plan</CardTitle>
            <CardDescription>Wildcard subdomain</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Professional subdomain for your store:</p>
            <code className="bg-muted p-2 rounded block text-xs break-all">
              {activeSubdomain}.{mainDomain}
            </code>
          </CardContent>
          <CardFooter>
            <Button 
              variant={currentPlan === 'pro' ? 'outline' : 'default'} 
              disabled={currentPlan === 'pro' || isUpdating}
              onClick={() => handleUpdatePlan('pro')}
              className="w-full"
            >
              {currentPlan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
            </Button>
          </CardFooter>
        </Card>

        <Card className={currentPlan === 'premium' ? 'border-primary shadow-md' : ''}>
          <CardHeader>
            <CardTitle>Premium Plan</CardTitle>
            <CardDescription>Custom user domain</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Connect your own brand domain:</p>
            <code className="bg-muted p-2 rounded block text-xs">
              yourbrand.com
            </code>
          </CardContent>
          <CardFooter>
            <Button 
              variant={currentPlan === 'premium' ? 'outline' : 'default'} 
              disabled={currentPlan === 'premium' || isUpdating}
              onClick={() => handleUpdatePlan('premium')}
              className="w-full"
            >
              {currentPlan === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {(currentPlan === 'pro' || currentPlan === 'premium') && (
        <Card>
          <CardHeader>
            <CardTitle>Subdomain Settings</CardTitle>
            <CardDescription>Activate and customize your store's subdomain.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex items-center border rounded-md px-3 bg-muted/50 h-10">
                <Input
                  className="border-0 bg-transparent p-0 focus-visible:ring-0"
                  placeholder="your-store-name"
                  value={subdomainInput}
                  onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  disabled={isUpdating}
                />
                <span className="text-muted-foreground ml-2">.{mainDomain}</span>
              </div>
              <Button 
                onClick={handleUpdateSubdomain} 
                disabled={isUpdating || !subdomainInput || subdomainInput === store?.subdomain}
              >
                {isUpdating ? <Spinner size="sm" className="mr-2" /> : null}
                {store?.subdomain ? 'Update Subdomain' : 'Activate Subdomain'}
              </Button>
            </div>
            {!store?.subdomain ? (
                <p className="text-xs text-muted-foreground">
                    Activate your professional subdomain to use <strong>{subdomainInput || '...'}.{mainDomain}</strong> instead of {mainDomain}/{store?.id}
                </p>
            ) : (
                <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                    <CheckCircle className="h-3 w-3" />
                    Subdomain is active: {store.subdomain}.{mainDomain}
                </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentPlan === 'premium' && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Custom Domain</CardTitle>
            <CardDescription>Enter your domain name to connect it to your store.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="example.com"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                disabled={isUpdating}
              />
              <Button onClick={handleConnectDomain} disabled={isUpdating || !customDomain}>
                {isUpdating ? <Spinner size="sm" className="mr-2" /> : null}
                Connect
              </Button>
            </div>

            {store?.customDomain && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{store.customDomain}</p>
                      <p className="text-xs text-muted-foreground">
                        Status: {store.domainVerified ? (
                          <span className="text-green-500 flex items-center gap-1 inline-flex">
                            <CheckCircle className="h-3 w-3" /> Verified
                          </span>
                        ) : (
                          <span className="text-amber-500 flex items-center gap-1 inline-flex">
                            <AlertTriangle className="h-3 w-3" /> Pending DNS
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleVerify} disabled={verifying}>
                    {verifying ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Refresh Status
                  </Button>
                </div>

                {!store.domainVerified && (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>DNS Setup Required</AlertTitle>
                    <AlertDescription className="mt-2 space-y-4">
                      <p>To finish connecting your domain, please add the following DNS records to your domain provider (e.g., Namecheap, GoDaddy):</p>
                      
                      <div className="space-y-3 mt-4">
                        <div className="bg-muted p-3 rounded-md overflow-x-auto">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">A Record</p>
                          <div className="grid grid-cols-3 gap-2 text-sm font-mono">
                            <span>Type: A</span>
                            <span>Name: @</span>
                            <span>Value: 76.76.21.21</span>
                          </div>
                        </div>
                        <p className="text-xs text-center font-medium">OR</p>
                        <div className="bg-muted p-3 rounded-md overflow-x-auto">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">CNAME Record</p>
                          <div className="grid grid-cols-3 gap-2 text-sm font-mono">
                            <span>Type: CNAME</span>
                            <span>Name: www</span>
                            <span>Value: cname.vercel-dns.com</span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-xs mt-4">
                        Note: DNS changes can take up to 48 hours to propagate, but usually happen within minutes.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentPlan !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle>Direct Store Access</CardTitle>
            <CardDescription>How to access your store with the current plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm font-medium">Pro Subdomain</span>
              <div className="flex items-center gap-2">
                <code className="text-xs">{activeSubdomain}.{mainDomain}</code>
                <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                  <a href={`${protocol}//${activeSubdomain}.${mainDomain}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            {store?.customDomain && store.domainVerified && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">Custom Domain</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs">{store.customDomain}</code>
                  <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                    <a href={`${protocol}//${store.customDomain}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
