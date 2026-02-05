import React from 'react';
import { X, Zap, AlertCircle, Sparkles, Info, HelpCircle } from 'lucide-react';

interface NotificationModalProps {
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
    onConfirm?: () => void;
    showConfirmButtons?: boolean;
    title?: string;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
    isOpen,
    message,
    type,
    onClose,
    onConfirm,
    showConfirmButtons = false,
    title = 'System Message'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-zoomIn border border-slate-100">
                <div className="p-8 text-center space-y-6">
                    <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-lg ${showConfirmButtons ? 'bg-indigo-50 text-indigo-500 shadow-indigo-500/20' :
                            type === 'success' ? 'bg-emerald-50 text-emerald-500 shadow-emerald-500/20' :
                                type === 'error' ? 'bg-rose-50 text-rose-500 shadow-rose-500/20' :
                                    'bg-indigo-50 text-indigo-500 shadow-indigo-500/20'
                        }`}>
                        {showConfirmButtons ? <HelpCircle size={36} /> :
                            type === 'success' ? <Zap size={36} /> :
                                type === 'error' ? <AlertCircle size={36} /> :
                                    <Info size={36} />}
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-slate-800 tracking-tight">{title}</h4>
                        <p className="text-sm font-bold text-slate-500 mt-2 leading-relaxed shrink-0">{message}</p>
                    </div>

                    <div className={`flex ${showConfirmButtons ? 'flex-row gap-3' : 'flex-col'}`}>
                        {showConfirmButtons && (
                            <button
                                onClick={onClose}
                                className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={showConfirmButtons ? onConfirm : onClose}
                            className={`flex-[2] bg-slate-900 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20 ${!showConfirmButtons ? 'w-full' : ''}`}
                        >
                            {showConfirmButtons ? 'Confirm' : 'Confirm & Dismiss'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationModal;
