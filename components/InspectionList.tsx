import React, { useState } from 'react';
import { Inspection } from '../types';
import StatusBadge from './StatusBadge';
import { Clipboard, ChevronDown, ChevronUp } from 'lucide-react';

interface InspectionListProps {
  inspections: Inspection[];
}

const InspectionList: React.FC<InspectionListProps> = ({ inspections }) => {
  const [expandedInspections, setExpandedInspections] = useState<Set<string>>(new Set());

  const toggleInspectionExpansion = (inspectionId: string) => {
    setExpandedInspections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(inspectionId)) {
        newSet.delete(inspectionId);
      } else {
        newSet.add(inspectionId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      {inspections.length === 0 ? (
        <div className="text-center py-20 text-slate-400 italic">No inspection logs detected.</div>
      ) : (
        inspections.map((ins) => {
          const isExpanded = expandedInspections.has(ins.id);
          return (
            <div key={ins.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div
                className="p-2 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleInspectionExpansion(ins.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <Clipboard size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{ins.type} Inspection</h4>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{new Date(ins.createdAt || ins.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-3">
                    <StatusBadge status="COMPLETED" />
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(Array.isArray(ins.results) ? ins.results : Object.entries(ins.results)).map((item, index) => {
                      const key = Array.isArray(ins.results) ? item.key : item[0];
                      const val = Array.isArray(ins.results) ? item.value : item[1];
                      const actualValue = typeof val === 'object' && val !== null && 'value' in val ? val.value : val;
                      const displayKey = typeof val === 'object' && val !== null && 'key' in val ? val.key : key;
                      return (
                        <div key={displayKey || index} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">{displayKey.replace(/([A-Z])/g, ' $1')}</p>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${typeof actualValue === 'boolean' && actualValue ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                            <p className={`text-xs font-black ${typeof actualValue === 'boolean' ? (actualValue ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-800'}`}>
                              {typeof actualValue === 'boolean' ? (actualValue ? 'PASSED' : 'FAILED') : typeof actualValue === 'object' ? 'COMPLETED' : actualValue}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default InspectionList;