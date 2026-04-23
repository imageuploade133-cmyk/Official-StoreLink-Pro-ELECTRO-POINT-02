'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Globe, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function QuickLinksCard() {
  return (
    <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-card">
      <CardHeader className="border-b border-border/50 bg-muted/5">
        <CardTitle className="text-lg">Admin Access</CardTitle>
        <CardDescription>
          Quick access to system and website configuration.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
        <Button asChild variant="outline" className="h-auto py-4 justify-start flex-col items-start gap-1">
          <Link href="/dashboard/settings">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <span className="font-semibold">General Settings</span>
              <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
            </div>
            <span className="text-xs text-muted-foreground font-normal">Manage store preferences and business info</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 justify-start flex-col items-start gap-1">
          <Link href="/dashboard/public-web-settings">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span className="font-semibold">Web Settings</span>
              <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
            </div>
            <span className="text-xs text-muted-foreground font-normal">Customize your website's appearance and identity</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
