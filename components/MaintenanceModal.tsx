import React from 'react';
import { X } from 'lucide-react';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehiclePlate: string;
  maintenanceType: 'tyres' | 'wheels' | 'service' | 'brakes';
  data: {
    lastServiceKm: number;
    nextServiceKm: number;
    kilometersLeft: number;
    status: 'green' | 'amber' | 'red';
    cumulativeKm: number;
  };
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  vehiclePlate,
  maintenanceType,
  data
}) => {
  if (!isOpen) return null;

  const getStatusText = (status: string) => {
    switch (status) {
      case 'green': return 'Good';
      case 'amber': return 'Warning';
      case 'red': return 'Critical';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'text-emerald-600';
      case 'amber': return 'text-amber-600';
      case 'red': return 'text-rose-600';
      default: return 'text-slate-600';
    }
  };

  const getMaintenanceTitle = (type: string) => {
    switch (type) {
      case 'tyres': return 'TYRES';
      case 'wheels': return 'WHEELS (ALIGNMENT/BALANCING)';
      case 'service': return 'SERVICE';
      case 'brakes': return 'BRAKES';
      default: return type.toUpperCase();
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-zoomIn">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">
              {vehiclePlate} - {getMaintenanceTitle(maintenanceType)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-sm text-slate-500 font-medium">Last Service (KM)</span>
              <span className="text-lg font-black text-slate-800">
                {data.lastServiceKm.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-sm text-slate-500 font-medium">Next Service (KM)</span>
              <span className="text-lg font-black text-slate-800">
                {data.nextServiceKm.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-slate-100">
              <span className="text-sm text-slate-500 font-medium">Kilometers Left</span>
              <span className="text-lg font-black text-slate-800">
                {data.kilometersLeft.toLocaleString()} km
              </span>
            </div>

            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-slate-500 font-medium">Status</span>
              <span className={`text-lg font-black ${getStatusColor(data.status)}`}>
                {getStatusText(data.status)}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-colors"
          >
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceModal;
