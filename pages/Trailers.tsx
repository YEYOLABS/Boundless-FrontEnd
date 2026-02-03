import React, { useEffect, useState } from 'react';
import { Trailer, VehicleStatus } from '../types.ts';
import { useFetch } from '../hooks/useFetch.ts';
import StatusBadge from '../components/StatusBadge.tsx';
import { Plus, Search, Truck, X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store.ts';
import { api } from '../api.ts';

const Trailers: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { data: trailers, loading, request } = useFetch<Trailer[]>();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newTrailer, setNewTrailer] = useState({
    model: '',
    licenceNumber: '',
    modelYear: '',
  });

  const canWrite = user?.role === 'owner' || user?.role === 'ops';

  const loadTrailers = () => request('/get-trailers');

  useEffect(() => {
    loadTrailers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setSubmitting(true);
    try {
      await api.addTrailer(newTrailer);
      setIsModalOpen(false);
      setNewTrailer({ model: '', licenceNumber: '', modelYear: '' });
      loadTrailers();
    } catch (err) {
      alert('Failed to add trailer: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Trailer Management</h2>
          <p className="text-slate-500 mt-1">Register new trailers and monitor status.</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus size={20} />
            Register Trailer
          </button>
        )}
      </header>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Filter by licence number or model..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           Array.from({length: 3}).map((_, i) => <div key={i} className="h-72 bg-white rounded-3xl animate-pulse border border-slate-100"></div>)
        ) : (
          trailers?.map((t) => (
            <div
              key={t.id}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group cursor-pointer relative flex flex-col justify-between overflow-hidden border-b-4 border-b-transparent hover:border-b-indigo-500"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Truck size={24} />
                  </div>
                </div>

                <div className="space-y-1 mb-6">
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">{t.model}</h3>
                  <p className="text-xs font-black text-indigo-600 tracking-[0.2em] uppercase">{t.licenceNumber}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 px-4 py-2 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                  <StatusBadge status={t.status || 'READY'} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Register Trailer Modal */}
      {isModalOpen && canWrite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-zoomIn border border-white/20">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Add Trailer</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Register new trailer.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Model Specification</label>
                  <input
                    required
                    value={newTrailer.model}
                    onChange={e => setNewTrailer({...newTrailer, model: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                    placeholder="e.g. TRAILER MODEL X"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registry Plate</label>
                  <input
                    required
                    value={newTrailer.licenceNumber}
                    onChange={e => setNewTrailer({...newTrailer, licenceNumber: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                    placeholder="e.g. TRL 123 CT"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Model Year</label>
                  <input
                    required
                    type="number"
                    value={newTrailer.modelYear}
                    onChange={e => setNewTrailer({...newTrailer, modelYear: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                    placeholder="e.g. 2020"
                  />
                </div>
                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all text-xs uppercase">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 py-3.5 font-bold text-white rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Registering...
                      </div>
                    ) : (
                      'Register'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trailers;