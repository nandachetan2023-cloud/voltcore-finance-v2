'use client';

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: boolean;
  batchId?: string;
  summary?: {
    createdInvoices?: number;
    updatedInvoices?: number;
    createdPayments?: number;
    createdDeductions?: number;
    createdCreditNotes?: number;
    createdWorkOrders?: number;
    updatedWorkOrders?: number;
    createdAdvices?: number;
    createdLines?: number;
    rowErrors?: number;
  };
  error?: string;
}

interface PreviewData {
  success: boolean;
  sheetName: string;
  header: string[];
  rowCount: number;
  sample: Record<string, any>[];
}

export default function Finance() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('os-details');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [availableSheets, setAvailableSheets] = useState<Array<{name: string; rowCount: number}>>([]);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setResult(null);
    setPreviewData(null);
    setShowSheetSelector(false);
    setSelectedSheet(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      const sheets = workbook.SheetNames.map(name => {
        const worksheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        return { name, rowCount: data.length };
      });

      setAvailableSheets(sheets);

      if (sheets.length === 1) {
        setSelectedSheet(sheets[0].name);
      } else {
        setShowSheetSelector(true);
      }
    } catch (error) {
      toast.error('Failed to read Excel file');
      console.error(error);
    }
  };

  const handleSheetSelect = (sheetName: string) => {
    setSelectedSheet(sheetName);
    setShowSheetSelector(false);
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedSheet) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('importedBy', 'Finance Import Center');

      let importEndpoint = '/api/fin/invoices/import';
      if (activeTab === 'work-order') importEndpoint = '/api/fin/purchase-orders/import';
      if (activeTab === 'payment-advice') importEndpoint = '/api/fin/payment-advices/import';

      const res = await fetch(importEndpoint, { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) {
        setResult(json);
        toast.success('Import successful');
        setTimeout(() => {
          setOpen(false);
          setPreviewData(null);
          setSelectedFile(null);
          setResult(null);
        }, 2000);
      } else {
        setResult(json);
        toast.error(json.error || 'Import failed');
      }
    } catch (error) {
      setResult({ success: false, error: 'Network error' });
      toast.error('Failed to import data');
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setOpen(false);
    setSelectedFile(null);
    setSelectedSheet(null);
    setPreviewData(null);
    setResult(null);
    setAvailableSheets([]);
    setShowSheetSelector(false);
  };

  return (
    <div className="p-4">
      <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-6">
        <h2 className="text-[18px] font-bold text-[#e2e8f0]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Finance Import Center
        </h2>
        <p className="mt-2 text-[12px] text-[#8899aa]">
          Import finance data from Excel files with automatic data normalization.
        </p>

        <div className="mt-4">
          <button className="vc-btn-primary flex items-center gap-2" onClick={() => setOpen(true)}>
            <Upload size={14} />
            Open Import Center
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0] text-base">Finance Import Center</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#141920] border border-[#2e3a48]">
              <TabsTrigger value="os-details" className="data-[state=active]:bg-[#f5a623] data-[state=active]:text-black">
                OS Details (Invoices)
              </TabsTrigger>
              <TabsTrigger value="work-order" className="data-[state=active]:bg-[#f5a623] data-[state=active]:text-black">
                Work Orders
              </TabsTrigger>
              <TabsTrigger value="payment-advice" className="data-[state=active]:bg-[#f5a623] data-[state=active]:text-black">
                Payment Advice
              </TabsTrigger>
            </TabsList>

            <TabsContent value="os-details" className="mt-4">
              <div className="text-[11px] text-[#8899aa] mb-4">
                Import invoice/outstanding data. Deductions normalized into separate records.
              </div>
            </TabsContent>
            <TabsContent value="work-order" className="mt-4">
              <div className="text-[11px] text-[#8899aa] mb-4">
                Import work order master data. Links to party and site masters.
              </div>
            </TabsContent>
            <TabsContent value="payment-advice" className="mt-4">
              <div className="text-[11px] text-[#8899aa] mb-4">
                Import payment advice for vendor payments.
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-4 space-y-4">
            <div className="border-2 border-dashed border-[#2e3a48] rounded-lg p-8 text-center">
              <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" id="finance-file-upload" />
              <label htmlFor="finance-file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-[#f5a623]/10 flex items-center justify-center">
                  <FileSpreadsheet size={32} className="text-[#f5a623]" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#e2e8f0] mb-1">
                    {selectedFile ? selectedFile.name : 'Click to upload Excel file'}
                  </div>
                  <div className="text-[10px] text-[#5a6878]">Supports .xlsx and .xls files</div>
                  {selectedSheet && <div className="text-[10px] text-[#00d4ff] mt-1">Selected Sheet: {selectedSheet}</div>}
                </div>
              </label>
            </div>

            {showSheetSelector && availableSheets.length > 0 && (
              <div className="border border-[#2e3a48] rounded-lg p-4 bg-[#141920]">
                <div className="flex items-center gap-2 mb-3">
                  <FileSpreadsheet size={16} className="text-[#00d4ff]" />
                  <div className="text-[12px] font-semibold text-[#e2e8f0]">Select Sheet to Import</div>
                </div>
                <div className="space-y-2">
                  {availableSheets.map((sheet, idx) => (
                    <button key={idx} onClick={() => handleSheetSelect(sheet.name)}
                      className="w-full text-left px-3 py-2 bg-[#0d1117] border border-[#2e3a48] rounded hover:border-[#00d4ff] transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold text-[#e2e8f0]">{sheet.name}</div>
                        <div className="text-[10px] text-[#5a6878]">{sheet.rowCount} rows</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div className="bg-[#141920] border border-[#2e3a48] rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#f5a623] border-t-transparent" />
                  <span className="text-[12px] text-[#e2e8f0]">Importing finance data...</span>
                </div>
              </div>
            )}

            {result && (
              <div className={`border rounded-lg p-4 ${result.success ? 'bg-[#00e676]/10 border-[#00e676]/30' : 'bg-[#ff3d3d]/10 border-[#ff3d3d]/30'}`}>
                <div className="flex items-start gap-3">
                  {result.success ? <CheckCircle2 size={20} className="text-[#00e676] shrink-0" /> : <AlertCircle size={20} className="text-[#ff3d3d] shrink-0" />}
                  <div className="text-[12px] font-semibold text-[#e2e8f0]">
                    {result.success ? 'Import Successful' : result.error || 'Import Failed'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48]" onClick={resetState}>
              Close
            </Button>
            {selectedFile && selectedSheet && !result && (
              <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" onClick={handleImport} disabled={uploading}>
                {uploading ? 'Importing...' : 'Import Data'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
