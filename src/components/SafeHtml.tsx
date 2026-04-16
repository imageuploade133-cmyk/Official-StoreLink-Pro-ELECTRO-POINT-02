
'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SafeHtmlProps {
  html: string;
  className?: string;
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && containerRef.current) {
      let root = containerRef.current.shadowRoot;
      if (!root) {
        root = containerRef.current.attachShadow({ mode: 'open' });
      }
      root.innerHTML = html;
    }
  }, [html, isMounted]);

  if (!isMounted) {
    return <div className={className} />;
  }

  return <div ref={containerRef} className={className} />;
}
