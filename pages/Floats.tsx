
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Float } from '../types';
import StatusBadge from '../components/StatusBadge';
import { Plus, Wallet, ShieldCheck, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useFetch } from '../hooks/useFetch';
import { useNotification } from '../contexts/NotificationContext';

const Floats: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { showNotification, showConfirm } = useNotification();
  const { data: floats, loading, request } = useFetch<Float[]>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFloat, setNewFloat] = useState({
    amount: 0,
    driverId: '',
    tourId: '',
    message: ''
  });

  const canWrite = user?.role === 'owner' || user?.role === 'tour_manager';

  const loadFloats = async () => {
    try {
      await request('/floats');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadFloats(); }, []);

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    showConfirm(`Are you absolutely sure you want to issue a float of R${newFloat.amount}?`, async () => {
      try {
        await request('/floats', { method: 'POST', data: newFloat });
        setIsModalOpen(false);
        loadFloats();
        showNotification('Float issued successfully.', 'success');
      } catch (err) {
        showNotification('Failed to issue float', 'error');
      }
    }, 'Issue Float');
  };

  const handleClose = async (id: string) => {
    if (!canWrite) return;
    showConfirm('Close this float? All linked expenses should be submitted.', async () => {
      try {
        await api.closeFloat(id);
        loadFloats();
        showNotification('Float closed and accounted for.', 'success');
      } catch (err) {
        showNotification('Failed to close float', 'error');
      }
    }, 'Settle Float');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Float Management</h2>
          <p className="text-slate-500 mt-1">Issue and track cash floats for drivers.</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Plus size={20} />
            Issue New Float
          </button>
        )}
      </header>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Driver</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Issued At</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={5} className="p-20 text-center animate-pulse font-bold text-slate-400">Loading floats...</td></tr>
            ) : !floats || floats.length === 0 ? (
              <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold">No floats recorded.</td></tr>
            ) : (
              floats.map((float) => (
                <tr key={float.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                        {float.driverName.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-700">{float.driverName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">R{float.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={float.status || 'open'} />
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs font-bold">{new Date(float.issuedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    {float.status === 'open' && canWrite && (
                      <button
                        onClick={() => handleClose(float.id)}
                        className="text-indigo-600 text-xs font-bold hover:underline uppercase tracking-tighter"
                      >
                        Close Float
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && canWrite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-zoomIn border border-white/20">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="text-indigo-600" size={20} />
                Issue Cash Float
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-8">
              <form onSubmit={handleIssue} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Allocation Amount (R)</label>
                  <input required type="number" value={newFloat.amount} onChange={e => setNewFloat({ ...newFloat, amount: Number(e.target.value) })} className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 text-2xl font-black text-slate-800 focus:border-indigo-600 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recipient Driver ID</label>
                  <input required value={newFloat.driverId} onChange={e => setNewFloat({ ...newFloat, driverId: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deployment Reference (Optional)</label>
                  <input value={newFloat.tourId} onChange={e => setNewFloat({ ...newFloat, tourId: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message to App (Optional)</label>
                  <input value={newFloat.message} onChange={e => setNewFloat({ ...newFloat, message: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="Send a note to driver..." />
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-[10px] text-amber-700 italic font-bold">
                  NOTICE: Funds are immediate liabilities. Ensure driver has confirmed physical receipt.
                </div>

                <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-6 rounded-xl font-bold text-slate-500 text-xs uppercase">Cancel</button>
                  <button type="submit" className="flex-1 py-3 px-6 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 text-xs uppercase">Authorize</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Floats;
