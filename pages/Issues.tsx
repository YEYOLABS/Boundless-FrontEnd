
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Issue, IssueStatus, IssueSeverity, Vehicle } from '../types';
import StatusBadge from '../components/StatusBadge';
import { Plus, Search, Filter, Wrench, X, Truck } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useNotification } from '../contexts/NotificationContext';

const Issues: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showNotification } = useNotification();
  const { data: vehicles, request: fetchVehicles } = useFetch<Vehicle[]>();
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');

  const [newIssue, setNewIssue] = useState({
    vehicleId: '',
    description: '',
    severity: IssueSeverity.MEDIUM
  });

  const [statusUpdates, setStatusUpdates] = useState<Record<string, { status: IssueStatus; notes: string }>>({});

  const loadIssues = async () => {
    try {
      const data = await api.getIssues();
      setIssues(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      fetchVehicles('/get-vehicles');
    }
  }, [isModalOpen]);

  const handleUpdateStatus = async (id: string) => {
    const update = statusUpdates[id];
    if (!update) return;

    try {
      await api.updateIssueStatus(id, update.status, update.notes || undefined);
      setStatusUpdates(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      loadIssues();
    } catch (err) {
      showNotification('Failed to update status', 'error');
    }
  };

  const handleStatusChange = (id: string, status: IssueStatus) => {
    setStatusUpdates(prev => ({
      ...prev,
      [id]: { status, notes: prev[id]?.notes || '' }
    }));
  };

  const handleNotesChange = (id: string, notes: string) => {
    setStatusUpdates(prev => ({
      ...prev,
      [id]: { status: prev[id]?.status || IssueStatus.REPORTED, notes }
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssue.vehicleId) {
      showNotification("Please select a vehicle.", 'info');
      return;
    }
    try {
      await api.createIssue({ ...newIssue, status: IssueStatus.REPORTED });
      setIsModalOpen(false);
      setNewIssue({ vehicleId: '', description: '', severity: IssueSeverity.MEDIUM });
      loadIssues();
    } catch (err) {
      showNotification('Failed to create issue', 'error');
    }
  };

  const getStatusProgress = (status: IssueStatus) => {
    switch (status) {
      case IssueStatus.REPORTED: return 25;
      case IssueStatus.SCHEDULED: return 50;
      case IssueStatus.IN_PROGRESS: return 75;
      case IssueStatus.DONE: return 100;
      default: return 0;
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Issues Workspace</h2>
          <p className="text-slate-500 mt-1">Track and manage vehicle maintenance and repairs.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus size={20} />
          Report Issue
        </button>
      </header>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Filter by vehicle, description..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
      </div>

      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm inline-flex gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`relative px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${activeTab === 'active'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
            : 'text-slate-600 hover:bg-slate-50'
            }`}
        >
          Active Issues
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'active'
            ? 'bg-white/20 text-white'
            : 'bg-slate-100 text-slate-600'
            }`}>
            {issues.filter(issue => issue.status !== IssueStatus.DONE).length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={`relative px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${activeTab === 'closed'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
            : 'text-slate-600 hover:bg-slate-50'
            }`}
        >
          Closed Issues
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'closed'
            ? 'bg-white/20 text-white'
            : 'bg-slate-100 text-slate-600'
            }`}>
            {issues.filter(issue => issue.status === IssueStatus.DONE).length}
          </span>
        </button>
      </div>


      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-20 animate-pulse font-bold text-slate-400">Loading issues registry...</div>
        ) : issues.filter(issue => activeTab === 'active' ? issue.status !== IssueStatus.DONE : issue.status === IssueStatus.DONE).length === 0 ? (
          <div className="text-center py-20 text-slate-400 italic bg-white rounded-3xl border border-dashed border-slate-200">
            {activeTab === 'active' ? 'No active issues reported.' : 'No closed issues.'}
          </div>
        ) : (
          issues.filter(issue => activeTab === 'active' ? issue.status !== IssueStatus.DONE : issue.status === IssueStatus.DONE).map((issue) => (
            <div key={issue.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-48 h-32 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                  {issue.imageUrl ? (
                    <img src={issue.imageUrl} className="w-full h-full object-cover" alt="Issue" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Wrench size={32} />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-800">{issue.vehicleName}</h3>
                        <StatusBadge status={issue.severity} />
                        <StatusBadge status={issue.status} />
                      </div>
                      <p className="text-slate-500 text-xs mt-1">Reported on {new Date(issue.reportedAt).toLocaleDateString()} • ID: {issue.id.slice(0, 8)}</p>
                    </div>
                  </div>

                  <p className="text-slate-600 text-sm leading-relaxed">{issue.description}</p>

                  {issue.status !== IssueStatus.DONE && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex gap-3 items-center">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Update Status:</label>
                        <select
                          value={statusUpdates[issue.id]?.status || issue.status}
                          onChange={(e) => handleStatusChange(issue.id, e.target.value as IssueStatus)}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {Object.values(IssueStatus).map(s => (
                            <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={statusUpdates[issue.id]?.notes || ''}
                        onChange={(e) => handleNotesChange(issue.id, e.target.value)}
                        placeholder="Add notes (optional)..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[60px]"
                      />
                      <button
                        onClick={() => handleUpdateStatus(issue.id)}
                        disabled={!statusUpdates[issue.id]}
                        className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Update Issue
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-1000"
                    style={{ width: `${getStatusProgress(issue.status)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Reported</span>
                  <span>Scheduled</span>
                  <span>In Progress</span>
                  <span>Fixed</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div >

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-zoomIn border border-white/20">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Report Maintenance</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Fleet Service Request</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-8">
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Truck size={12} className="text-indigo-600" />
                    Asset Identity
                  </label>
                  <select
                    required
                    value={newIssue.vehicleId}
                    onChange={e => setNewIssue({ ...newIssue, vehicleId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  >
                    <option value="">Choose vehicle...</option>
                    {vehicles?.map(v => (
                      <option key={v.id} value={v.id}>{v.model} ({v.licenceNumber})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Urgency</label>
                  <select
                    value={newIssue.severity}
                    onChange={e => setNewIssue({ ...newIssue, severity: e.target.value as IssueSeverity })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 text-sm"
                  >
                    {Object.values(IssueSeverity).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Technical Detail</label>
                  <textarea
                    required
                    value={newIssue.description}
                    onChange={e => setNewIssue({ ...newIssue, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[100px] text-sm text-slate-600 italic focus:ring-4 focus:ring-indigo-500/10 outline-none"
                    placeholder="Briefly describe the mechanical fault..."
                  />
                </div>
                <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all text-xs uppercase">Cancel</button>
                  <button type="submit" className="flex-1 bg-rose-600 py-3.5 font-bold text-white rounded-xl shadow-lg shadow-rose-600/30 hover:bg-rose-700 transition-all active:scale-95 text-xs uppercase">File Report</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default Issues;
