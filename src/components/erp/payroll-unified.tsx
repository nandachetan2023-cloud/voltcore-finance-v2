'use client';

import { useState } from 'react';
import { FileSpreadsheet, Download, TrendingUp } from 'lucide-react';
import PayrollNonCompliance from './payroll-non-compliance';
import PayrollCompliance from './payroll-compliance';
import PayrollGenerateModule from './payroll-generate';

type ViewMode = 'non-compliance' | 'compliance' | 'generator';

export default function PayrollUnified() {
  const [activeView, setActiveView] = useState<ViewMode>('non-compliance');

  return (
    <div className="space-y-4 p-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 bg-[#161c24] border border-[#252e3a] rounded-lg p-1">
        <button
          onClick={() => setActiveView('non-compliance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-[12px] font-semibold transition-all duration-150 ${
            activeView === 'non-compliance'
              ? 'bg-[#f5a623] text-black shadow-sm'
              : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920]'
          }`}
        >
          <TrendingUp size={14} />
          Non-Compliance Payroll
        </button>
        
        <button
          onClick={() => setActiveView('compliance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-[12px] font-semibold transition-all duration-150 ${
            activeView === 'compliance'
              ? 'bg-[#00e676] text-black shadow-sm'
              : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920]'
          }`}
        >
          <FileSpreadsheet size={14} />
          Compliance Payroll
        </button>
        
        <button
          onClick={() => setActiveView('generator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-[12px] font-semibold transition-all duration-150 ${
            activeView === 'generator'
              ? 'bg-[#00d4ff] text-black shadow-sm'
              : 'text-[#8899aa] hover:text-[#e2e8f0] hover:bg-[#141920]'
          }`}
        >
          <Download size={14} />
          Generate Excel
        </button>
      </div>

      {/* View Content */}
      <div className="animate-fadeIn">
        {activeView === 'non-compliance' && <PayrollNonCompliance />}
        {activeView === 'compliance' && <PayrollCompliance />}
        {activeView === 'generator' && <PayrollGenerateModule />}
      </div>
    </div>
  );
}
