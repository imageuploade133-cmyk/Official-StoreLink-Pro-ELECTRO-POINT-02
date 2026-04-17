"use client";
import React from "react";
import { OfflineDetector } from "@/components/OfflineDetector";

export default function RootStoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <OfflineDetector>
      {children}
    </OfflineDetector>
  );
}
