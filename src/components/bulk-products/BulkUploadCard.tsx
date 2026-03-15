'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, AlertTriangle } from 'lucide-react';

interface BulkUploadCardProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileName: string;
  isProcessing: boolean;
  validationError: string | null;
  requiredHeaders: string[];
  optionalHeaders: string[];
  isAllBranchesView: boolean;
}

export function BulkUploadCard({ 
  onFileUpload,
  fileName,
  isProcessing,
  validationError,
  requiredHeaders,
  optionalHeaders,
  isAllBranchesView,
}: BulkUploadCardProps) {
  
  const downloadTemplate = () => {
    const headers = [...requiredHeaders, ...optionalHeaders];
    let sampleData = "Sample Laptop,LP-001,1200.50,950,15,electronics,A sample laptop product,Tech Supplier,5,true,https://example.com/laptop.png";
    if (isAllBranchesView) {
      sampleData = `main_branch_id,${sampleData}`;
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + "\n"
      + sampleData;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "product_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Upload File</CardTitle>
        <CardDescription>
          Select a CSV file to begin the import process. If you don't have a file, download our template to get started.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg bg-muted/30 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-grow">
                <h4 className="font-semibold">Instructions & Template</h4>
                <p className="text-xs text-muted-foreground">
                    Ensure your CSV file has the required headers: <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{requiredHeaders.join(', ')}</code>. 
                    Optional headers: <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{optionalHeaders.join(', ')}</code>.
                </p>
            </div>
            <Button onClick={downloadTemplate} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4"/> Download Template
            </Button>
        </div>

        <div className="flex items-center gap-4">
          <Button asChild variant="outline" disabled={isProcessing}>
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4"/> {fileName ? 'Change File' : 'Upload CSV File'}
              <Input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={onFileUpload} disabled={isProcessing} />
            </label>
          </Button>
          {fileName && <p className="text-sm text-muted-foreground">Selected: {fileName}</p>}
        </div>

        {validationError && (
           <div className="flex items-center gap-2 p-3 text-sm text-destructive border border-destructive bg-destructive/10 rounded-md">
              <AlertTriangle className="h-5 w-5"/>
              <p>{validationError}</p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
