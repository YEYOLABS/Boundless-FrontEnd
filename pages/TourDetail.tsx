
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Tour, Inspection, Issue, TourStatus, Float, Vehicle, Driver } from '../types';
import StatusBadge from '../components/StatusBadge';
import InspectionList from '../components/InspectionList';
import { ArrowLeft, Edit3, Clipboard, AlertCircle, Calendar, Truck, Info, Wallet, Plus, ShieldCheck, X, Car, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useNotification } from '../contexts/NotificationContext';

const TourDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { showNotification, showConfirm } = useNotification();

  const [tour, setTour] = useState<Tour | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [float, setFloat] = useState<Float | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'inspections' | 'issues' | 'financials'>('info');
  const [loading, setLoading] = useState(true);

  const [resolvedVehicleName, setResolvedVehicleName] = useState<string>('');
  const [resolvedDriverName, setResolvedDriverName] = useState<string>('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [assigning, setAssigning] = useState(false);

  const [isFloatModalOpen, setIsFloatModalOpen] = useState(false);
  const [newFloatAmount, setNewFloatAmount] = useState<number>(0);
  const [floatMessage, setFloatMessage] = useState<string>('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    pax: '',
    notes: ''
  });

  const canWrite = user?.role === 'owner' || user?.role === 'tour_manager';

  // Helper to add one day to a date string (YYYY-MM-DD format)
  const addOneDay = (dateStr: string): string => {
    if (!dateStr) return dateStr;
    const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
    date.setDate(date.getDate() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to format date for display (adds +1 day to match tour reference)
  const formatTourDate = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    const adjustedDate = addOneDay(dateStr);
    return new Date(adjustedDate + 'T00:00:00').toLocaleDateString();
  };

  // Helper to format tour names (replace codes with proper names)
  const formatTourName = (name: string) => {
    if (!name) return name;
    let displayName = name;

    // Map of tour codes to proper names
    const tourCodeMap: { [key: string]: string } = {
      'ZAPAN': 'Panorama',
      'ZAKRU': 'Panorama',
      'ZAAD': 'Addo North',
      'ZAADS': 'Addo South',
      'ZAOUT': 'Outeniqua',
      'ZARAI': 'Rainbow North',
      'ZARAIS': 'Rainbow South',
      'GOLF': 'Golf Tour',
      'GARDEN': 'Garden Route',
      'CAPE': 'Cape Town',
      'WINELANDS': 'Winelands'
    };

    // Replace any tour codes with proper names (case insensitive, at start of string or after space)
    Object.entries(tourCodeMap).forEach(([code, properName]) => {
      // Match code at start of string or after whitespace, followed by non-letter character or end
      const regex = new RegExp(`(^|\\s)(${code})(?=[^a-zA-Z]|$)`, 'gi');
      displayName = displayName.replace(regex, `$1${properName}`);
    });

    return displayName;
  };

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [tourData, inspectionData, issueData, floatsData, vehiclesData, driversData] = await Promise.all([
        api.getTour(id),
        api.getInspectionsByTour(id).catch(() => []),
        api.getIssues().catch(() => []),
        api.getFloats().catch(() => []),
        api.getVehicles().catch(() => []),
        api.getDrivers().catch(() => [])
      ]);

      setTour(tourData);
      setInspections(inspectionData);

      if (tourData) {
        setIssues(issueData.filter((i: Issue) => i.vehicleId === tourData.vehicleId));
        const tourFloat = (floatsData as Float[]).find(f => f.tourId === id);
        setFloat(tourFloat || null);

        const vehicle = (vehiclesData as Vehicle[]).find(v => v.id === tourData.vehicleId);
        const vName = tourData.vehicleName || vehicle?.licenceNumber || 'Unknown Asset';
        const dName = vehicle?.currentDriverName || tourData.driverName || (driversData as Driver[]).find(d => d.uid === tourData.driverId)?.name || 'Unassigned';
        setResolvedVehicleName(vName);
        setResolvedDriverName(dName);
      }

      // Sort vehicles by sortOrder
      const sortedVehicles = (vehiclesData as Vehicle[]).sort((a, b) => {
        const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
      setVehicles(sortedVehicles);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleIssueFloat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !tour) return;

    // Get the vehicle assigned to this tour
    const assignedVehicle = vehicles.find(v => v.id === tour.vehicleId);

    if (!assignedVehicle) {
      showNotification('Cannot issue float: No vehicle assigned to this tour', 'error');
      return;
    }

    // Get driver from the vehicle, not the tour
    const driverId = assignedVehicle.currentDriverId;

    if (!driverId) {
      showNotification('Cannot issue float: No driver assigned to the vehicle', 'error');
      return;
    }

    if (!newFloatAmount || newFloatAmount <= 0) {
      showNotification('Please enter a valid amount greater than 0', 'info');
      return;
    }

    const amountCents = Math.round(newFloatAmount * 100);

    console.log('Issuing float with:', {
      driverId,
      amountCents,
      tourId: tour.id,
      message: floatMessage || undefined,
      vehicleId: assignedVehicle.id,
      vehicleModel: assignedVehicle.model
    });

    try {
      await api.issueFloat({
        amountCents,
        driverId,
        tourId: tour.id,
        message: floatMessage || undefined
      });
      setIsFloatModalOpen(false);
      setNewFloatAmount(0);
      setFloatMessage('');
      fetchData();
    } catch (err) {
      console.error('Float issuance error:', err);
      showNotification('Failed to issue float: ' + err, 'error');
    }
  };

  const handleCloseFloat = async () => {
    if (!float || !canWrite) return;
    showConfirm('Close this float? This indicates all cash is accounted for.', async () => {
      try {
        await api.closeFloat(float.id);
        fetchData();
        showNotification('Float settled and closed successfully.', 'success');
      } catch (err) {
        showNotification('Failed to close float', 'error');
      }
    }, 'Settle Float');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tour || !canWrite) return;

    const updates: any = {};
    if (editForm.pax !== '') updates.pax = parseInt(editForm.pax);
    if (editForm.notes !== tour.notes) updates.notes = editForm.notes;

    if (Object.keys(updates).length === 0) {
      setIsEditModalOpen(false);
      return;
    }

    try {
      await api.updateTour(tour.id, updates);
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      showNotification('Failed to update tour: ' + err, 'error');
    }
  };

  const handleCancelTour = async () => {
    if (!tour || !canWrite) return;
    showConfirm('Cancel this tour? This action cannot be undone.', async () => {
      try {
        await api.updateTour(tour.id, { status: TourStatus.CANCELLED });
        fetchData();
        showNotification('Tour has been successfully cancelled.', 'success');
      } catch (err) {
        showNotification('Failed to cancel tour: ' + err, 'error');
      }
    }, 'Cancel Tour');
  };

  const handleDeleteTour = async () => {
    if (!tour || !canWrite) return;
    showConfirm('Delete this tour? This action cannot be undone and will permanently remove the tour.', async () => {
      try {
        await api.deleteTour(tour.id);
        navigate('/tours');
        showNotification('Tour deleted from registry.', 'success');
      } catch (err) {
        showNotification('Failed to delete tour: ' + err, 'error');
      }
    }, 'Delete Tour');
  };

  const handleVehicleChange = (vehicleId: string) => {
    if (!tour) return;
    // Update local tour state to reflect selection (optimistic)
    setTour({ ...tour, vehicleId });
    // Also update resolved vehicle name for immediate UI feedback
    const selectedVehicle = vehicles.find(v => v.id === vehicleId);
    if (selectedVehicle) {
      setResolvedVehicleName(`${selectedVehicle.model} (${selectedVehicle.licenceNumber})`);
    } else {
      setResolvedVehicleName('Unknown Asset');
    }
  };

  const handleAssignVehicle = async () => {
    if (!tour || !tour.vehicleId || assigning) return;
    showConfirm(`Assign vehicle to tour ${tour.tour_reference}? This will update tour and vehicle records.`, async () => {
      setAssigning(true);
      try {
        // Update tour with new vehicleId
        await api.updateTour(tour.id, { vehicleId: tour.vehicleId });
        // Optionally update vehicle with driver assignment
        const selectedVehicle = vehicles.find(v => v.id === tour.vehicleId);
        if (selectedVehicle && tour.driverId) {
          await api.updateVehicle(selectedVehicle.id, {
            currentDriverId: tour.driverId,
            currentDriverName: resolvedDriverName,
            assignedById: user?.uid,
            assignedByName: user?.username,
          });
        }
        // Refresh data and navigate back to tours page
        showNotification('Vehicle assigned successfully.', 'success');
        navigate('/tours');
      } catch (err) {
        showNotification('Failed to assign vehicle: ' + err, 'error');
        // Revert optimistic changes
        fetchData();
      } finally {
        setAssigning(false);
      }
    }, 'Confirm Assignment');
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-bold text-slate-400">Synchronizing Tour Intelligence...</p>
    </div>
  );

  if (!tour) return (
    <div className="p-20 text-center space-y-4">
      <AlertCircle size={48} className="mx-auto text-rose-500" />
      <h2 className="text-xl font-bold text-slate-800">Tour Data Unavailable</h2>
      <p className="text-slate-500">The requested tour sequence was not found on the server.</p>
      <button onClick={() => navigate('/tours')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Return to Registry</button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/tours')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium"
      >
        <ArrowLeft size={18} />
        Back to Tours
      </button>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Truck size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-800">{formatTourName(tour?.tour_reference)}</h2>
                {/**<StatusBadge status={tour.status} /> */}
              </div>
              {/**<p className="text-slate-500 text-sm mt-1 uppercase font-black tracking-widest">Tour Registry: {tour?.tour_reference}</p> */}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditForm({ pax: tour.pax?.toString() || '', notes: tour.notes || '' });
                setIsEditModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all"
            >
              <Edit3 size={18} />
              Edit
            </button>
            {tour.status === TourStatus.PLANNED && canWrite && (
              <>
                <button
                  onClick={handleCancelTour}
                  className="px-5 py-2.5 rounded-xl border border-rose-200 text-rose-600 font-semibold flex items-center gap-2 hover:bg-rose-50 transition-all"
                >
                  Cancel Tour
                </button>
                <button
                  onClick={() => {
                    showConfirm('Activate this tour?', async () => {
                      try {
                        await api.updateTour(tour.id, { status: TourStatus.ACTIVE });
                        fetchData();
                        showNotification('Tour activated successfully.', 'success');
                      } catch (err) {
                        showNotification('Failed to activate tour.', 'error');
                      }
                    }, 'Tour Activation');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                >
                  Confirm
                </button>
              </>
            )}
            {canWrite && (
              <button
                onClick={handleDeleteTour}
                className="px-5 py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold flex items-center gap-2 hover:bg-red-50 transition-all"
              >
                <Trash2 size={18} />
                Delete Tour
              </button>
            )}
          </div>
        </div>

        <div className="px-8 flex border-b border-slate-50 overflow-x-auto no-scrollbar">
          {[
            { id: 'info', name: 'Overview', icon: Info },
            { id: 'financials', name: 'Financials', icon: Wallet, badge: float ? 1 : 0 },
            { id: 'inspections', name: 'Inspections', icon: Clipboard, badge: inspections.length },
            { id: 'issues', name: 'Linked Issues', icon: AlertCircle, badge: issues.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                px-6 py-4 flex items-center gap-2 border-b-2 font-semibold text-sm transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'}
              `}
            >
              <tab.icon size={18} />
              {tab.name}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                <div>
                  {/**<h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Driver Information</h4> */}
                  <div className="bg-slate-50 p-2 rounded-2xl flex items-center gap-4 border border-slate-100">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center font-bold text-indigo-600 shadow-sm border border-slate-100 uppercase">
                      {resolvedDriverName.charAt(0) || 'D'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{resolvedDriverName}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tour Schedule</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Calendar size={18} className="text-slate-400" />
                      <span className="text-sm">Starts: <b className="text-slate-800">{formatTourDate(tour.startDate)}</b></span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Calendar size={18} className="text-slate-400" />
                      <span className="text-sm">Ends: <b className="text-slate-800">{formatTourDate(tour.endDate)}</b></span>
                    </div>
                  </div>
                </div>
                {canWrite && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Vehicle Assignment</h4>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <Car size={18} className="text-slate-400" />
                        <div className="flex-1">
                          <select
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={tour.vehicleId || ''}
                            onChange={(e) => handleVehicleChange(e.target.value)}
                          >
                            <option value="">Select a vehicle</option>
                            {vehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.licenceNumber}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={handleAssignVehicle}
                          disabled={!tour.vehicleId || assigning}
                          className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {assigning ? 'Assigning...' : 'Assign'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">Current: {resolvedVehicleName}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Managerial Notes</h4>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 min-h-[140px] text-slate-600 italic">
                  {tour.notes || "No additional notes provided for this tour."}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Float Allocation</h3>
                {!float && canWrite && (
                  <button
                    onClick={() => setIsFloatModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                  >
                    <Plus size={16} />
                    Issue Float
                  </button>
                )}
              </div>

              {float ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-indigo-600 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/30">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10 space-y-4">
                      <div className="flex justify-between items-center">
                        <Wallet size={24} className="opacity-80" />
                        <StatusBadge status={float.active ? 'open' : 'closed'} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Remaining Balance</p>
                        <p className="text-4xl font-black tracking-tight mt-1">R{(float.remainingAmount / 100).toLocaleString()}</p>
                      </div>
                      <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                        <div>
                          <p className="text-[8px] font-bold uppercase opacity-50">Issued To</p>
                          <p className="text-xs font-bold">{float.driverName || resolvedDriverName}</p>
                        </div>
                        <p className="text-[10px] font-bold opacity-60">{new Date(float.createdAt || tour.startDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Actions</h4>
                      <div className="space-y-3">
                        {float.active && canWrite ? (
                          <button
                            onClick={handleCloseFloat}
                            className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                          >
                            Settle & Close Float
                          </button>
                        ) : (
                          <div className="text-center py-4 italic text-slate-400 text-sm">
                            This float is closed and cannot be modified.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Wallet size={32} />
                  </div>
                  <h4 className="font-bold text-slate-700">No Float Assigned</h4>
                  <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">This tour currently has no cash float assigned. You can issue one to enable driver expenses.</p>
                  {canWrite && (
                    <button
                      onClick={() => setIsFloatModalOpen(true)}
                      className="mt-6 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                    >
                      Issue First Float
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'inspections' && (
            <InspectionList inspections={inspections} />
          )}

          {activeTab === 'issues' && (
            <div className="space-y-4">
              {issues.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic">This deployment is currently issue-free.</div>
              ) : (
                issues.map((issue) => (
                  <div key={issue.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6">
                    {issue.imageUrl && (
                      <img src={issue.imageUrl} className="w-32 h-32 rounded-xl object-cover border border-slate-200 shadow-sm" alt="Issue" />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-slate-800">#{issue.id.slice(0, 8)}</h4>
                            <StatusBadge status={issue.severity} />
                            <StatusBadge status={issue.status} />
                          </div>
                          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{issue.description}</p>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(issue.reportedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {isFloatModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-zoomIn border border-white/20">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="text-indigo-600" size={20} />
                Issue Float
              </h3>
              <button onClick={() => setIsFloatModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleIssueFloat} className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Amount Allocation</label>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black text-slate-300">R</span>
                  <input
                    required
                    autoFocus
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newFloatAmount || ''}
                    onChange={e => setNewFloatAmount(Number(e.target.value))}
                    className="w-full max-w-[150px] bg-transparent text-4xl font-black text-slate-800 outline-none border-b-2 border-slate-100 focus:border-indigo-600 transition-all text-center"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 font-bold uppercase shadow-sm">
                    {resolvedDriverName.charAt(0) || 'D'}
                  </div>
                  <p className="text-xs font-bold text-slate-700">{resolvedDriverName}</p>
                </div>
                <p className="text-[10px] text-slate-500 italic mt-2">Deployment Sequence {tour.id.slice(0, 8)}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                  <span>Message to Driver</span>
                  <span className="text-slate-300 font-normal normal-case tracking-normal">(Optional)</span>
                </label>
                <textarea
                  value={floatMessage}
                  onChange={e => setFloatMessage(e.target.value)}
                  placeholder="e.g., Use this for fuel and accommodation expenses..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[80px] resize-none transition-all"
                  maxLength={200}
                />
                <p className="text-[9px] text-slate-400 text-right">{floatMessage.length}/200 characters</p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsFloatModalOpen(false)}
                  className="flex-1 py-3.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 py-3.5 font-bold text-white rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 text-xs uppercase tracking-widest"
                >
                  Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-zoomIn border border-white/20">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit3 className="text-indigo-600" size={20} />
                Edit Tour
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Passenger Count (PAX)</label>
                <input
                  type="number"
                  value={editForm.pax}
                  onChange={e => setEditForm({ ...editForm, pax: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                  placeholder="e.g. 45"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Managerial Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[100px] resize-none transition-all"
                  placeholder="Additional notes..."
                  maxLength={500}
                />
                <p className="text-[9px] text-slate-400 text-right">{editForm.notes.length}/500 characters</p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 py-3.5 font-bold text-white rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 text-xs uppercase tracking-widest"
                >
                  Update Tour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourDetail;
