
import React, { useEffect, useState } from 'react';
import { Vehicle, VehicleStatus, Driver, TourStatus, Tour, Inspection, Issue, IssueSeverity } from '../types.ts';
import { useFetch } from '../hooks/useFetch.ts';
import StatusBadge from '../components/StatusBadge.tsx';
import { Plus, Search, Truck, User, X, Calendar, ShieldCheck, UserCheck, Box, AlertCircle, AlertTriangle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store.ts';
import { api } from '../api.ts';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

const Vehicles: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { showNotification } = useNotification();
  const { data: vehicles, loading, request } = useFetch<Vehicle[]>();
  const { data: drivers, request: fetchDrivers } = useFetch<Driver[]>();
  const { data: tours, request: fetchTours } = useFetch<Tour[]>();
  const { data: issues, request: fetchIssues } = useFetch<Issue[]>();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inspectionModal, setInspectionModal] = useState<{ open: boolean, vehicle: Vehicle | null, type: string }>({ open: false, vehicle: null, type: '' });
  const [inspections, setInspections] = useState<Inspection[]>([]);

  const [newIssue, setNewIssue] = useState({
    description: '',
    severity: IssueSeverity.LOW,
    imageUrl: ''
  });

  useEffect(() => {
    if (inspectionModal.open && inspectionModal.vehicle) {
      setInspections([]); // Clear previous
      api.getVehicleInspections(inspectionModal.vehicle.id)
        .then(data => setInspections(data))
        .catch(err => console.error("Failed to fetch inspections", err));
    }
  }, [inspectionModal.open, inspectionModal.vehicle]);

  const [newVehicle, setNewVehicle] = useState({
    model: '',
    licenceNumber: '',
    modelYear: '',
    trailerModel: '',
    trailerLicence: '',
    odometer: '',
    lastServiced: '',
    nextService: '',
  });

  const [assignment, setAssignment] = useState({
    driverId: ''
  });

  const [searchQuery, setSearchQuery] = useState('');

  const canWrite = user?.role === 'owner' || user?.role === 'ops';
  const isOps = user?.role === 'ops';

  const loadVehicles = () => request('/get-vehicles');

  useEffect(() => {
    loadVehicles();
    fetchTours('/tours');
    fetchIssues('/issues');
  }, []);

  const handleOpenAssign = (e: React.MouseEvent, vehicle: Vehicle) => {
    e.stopPropagation();
    setSelectedVehicle(vehicle);
    setIsAssignModalOpen(true);
    fetchDrivers('/get-drivers');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setSubmitting(true);
    try {
      await api.addVehicle({ ...newVehicle, status: VehicleStatus.READY });
      setIsModalOpen(false);
      setNewVehicle({ model: '', licenceNumber: '', modelYear: '', trailerModel: '', trailerLicence: '', odometer: '', lastServiced: '', nextService: '' });
      loadVehicles();
    } catch (err) {
      showNotification('Failed to add vehicle: ' + err, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !assignment.driverId) return;

    try {
      const driver = drivers?.find(d => d.uid === assignment.driverId);
      await api.updateVehicle(selectedVehicle.id, {
        currentDriverId: assignment.driverId,
        currentDriverName: driver?.name || '',
        assignedById: user?.uid,
        assignedByName: user?.name || user?.username || '',
        status: VehicleStatus.READY
      });
      setIsAssignModalOpen(false);
      setAssignment({ driverId: '' });
      loadVehicles();
    } catch (err: any) {
      console.error('Assignment error:', err);
      const message = err?.response?.data?.message || err?.message || err;
      showNotification(`Failed to assign driver: ${message}`, 'error');
    }
  };

  const openInspection = (vehicle: Vehicle, type: string) => {
    setInspectionModal({ open: true, vehicle, type });
  };

  const getInspectionColor = (vehicle: Vehicle, type: string): 'green' | 'amber' | 'red' => {
    const intervals = vehicle.vehicleMaintenanceIntervalsKm;
    if (!intervals) return 'green';

    // Helper to compute color based on interval, last replacement odometer, and current odometer
    const computeColor = (interval: number, lastReplacementOdo: number): 'green' | 'amber' | 'red' => {
      const currentOdo = vehicle.latest_odometer || vehicle.odometer;
      const kmSinceLast = Math.max(0, currentOdo - lastReplacementOdo);
      const kmLeft = Math.max(0, interval - kmSinceLast);
      const percentageLeft = (kmLeft / interval) * 100;

      if (percentageLeft <= 5) return 'red';
      if (percentageLeft <= 20) return 'amber';
      return 'green';
    };

    // All maintenance items use the vehicle's reference odometer as the last service point
    const lastServiceOdo = vehicle.odometer;
    switch (type) {
      case 'tyres':
        return computeColor(intervals.tyres, lastServiceOdo);
      case 'wheels':
        return computeColor(intervals.alignmentBalancing, lastServiceOdo);
      case 'service':
        return computeColor(intervals.service, lastServiceOdo);
      case 'trailer':
        // trailer doesn't have interval, check if trailerModel or trailerLicence exists
        return vehicle.trailerModel || vehicle.trailerLicence ? 'green' : 'amber';
      default:
        return 'green';
    }
  };

  const formatTourName = (name: string) => {
    // Check for various dash types: hyphen, en-dash, em-dash
    const separatorRegex = / [-–—] /;
    const match = name.match(separatorRegex);

    if (!match) return name;

    // Split by the found separator
    const parts = name.split(match[0]).map(part => part.trim());

    if (parts.length >= 2) {
      const [first, second, ...rest] = parts;
      // Reconstruct using standard hyphen for consistency
      return `${second} - ${first} ${rest.length > 0 ? '- ' + rest.join(' - ') : ''}`;
    }
    return name;
  };

  // Helper to format date in South African format (DD/MM/YYYY)
  const formatDateSA = (dateStr: string) => {
    // Parse the date string directly without timezone conversion
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  // Helper to get vehicle issues
  const getVehicleIssues = (vehicleId: string) => {
    return issues?.filter(issue => issue.vehicleId === vehicleId && issue.status !== 'done') || [];
  };

  // Helper to get most severe issue for a vehicle
  const getMostSevereIssue = (vehicleId: string): Issue | null => {
    const vehicleIssues = getVehicleIssues(vehicleId);
    if (vehicleIssues.length === 0) return null;

    // Sort by severity: critical > high > medium > low
    const severityOrder = [IssueSeverity.CRITICAL, IssueSeverity.HIGH, IssueSeverity.MEDIUM, IssueSeverity.LOW];
    return vehicleIssues.sort((a, b) =>
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
    )[0];
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    setSubmitting(true);
    try {
      await api.createIssue({
        ...newIssue,
        vehicleId: selectedVehicle.id,
        vehicleName: selectedVehicle.model
      });
      setIsIssueModalOpen(false);
      setNewIssue({
        description: '',
        severity: IssueSeverity.LOW,
        imageUrl: ''
      });
      fetchIssues('/issues');
      loadVehicles();
    } catch (err) {
      showNotification('Failed to report issue: ' + err, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">WHITEBOARD</h2>
        </div>
        {canWrite && (
          <div className="flex gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Plus size={20} />
              Register Vehicle
            </button>
          </div>
        )}
      </header>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by licence number or model..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-slate-100"></div>
          ))
        ) : (
          vehicles?.sort((a, b) => {
            const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
            return orderA - orderB;
          }).filter(v =>
            (v.licenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.model || '').toLowerCase().includes(searchQuery.toLowerCase())
          ).map((v) => {
            const vehicleTours = tours
              ?.filter(t => t.vehicleId === v.id)
              .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()) // Most recent first
              .slice(0, 5) || []; // Show up to 5 tours
            return (
              <div
                key={v.id}
                className="bg-slate-50 p-6 rounded-3xl border border-indigo-200 shadow-sm hover:shadow-xl transition-all group relative flex flex-col md:flex-row justify-between overflow-hidden border-b-4 border-b-indigo-300"
              >
                {/* Vehicle details left side */}
                <div
                  className="flex-1 cursor-pointer bg-slate-50 rounded-2xl p-6 hover:bg-slate-100 transition-colors border border-indigo-100 relative max-w-2xl"
                  onClick={() => navigate(`/vehicles/${v.id}`)}

                >


                  <div className="space-y-2 mb-4">
                    {/* Vehicle licence plate with truck icon */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                        <Truck size={12} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">{v.licenceNumber}</h3>
                        {(v.trailerLicence || v.trailerModel) && (
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Trailer: {v.trailerLicence || v.trailerModel}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Issue button based on severity */}
                    {(() => {
                      const mostSevereIssue = getMostSevereIssue(v.id);
                      if (!mostSevereIssue) return null;

                      const severityColors = {
                        [IssueSeverity.LOW]: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
                        [IssueSeverity.MEDIUM]: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
                        [IssueSeverity.HIGH]: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
                        [IssueSeverity.CRITICAL]: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
                      };

                      const colors = severityColors[mostSevereIssue.severity];
                      const Icon = mostSevereIssue.severity === IssueSeverity.CRITICAL || mostSevereIssue.severity === IssueSeverity.HIGH
                        ? AlertTriangle
                        : AlertCircle;

                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/vehicles/${v.id}`);
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors.bg} ${colors.text} ${colors.border} font-bold text-xs uppercase tracking-wider hover:opacity-80 transition-opacity`}
                        >
                          <Icon size={14} />
                          {mostSevereIssue.severity} Issue
                        </button>
                      );
                    })()}
                  </div>


                  {/* Tour or assignment */}
                  <div className="pt-4">
                    {v.currentDriverId ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                            <User size={12} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Driver</p>
                            <p className="text-sm font-bold text-slate-800">{v.currentDriverName || 'Unknown'}</p>
                          </div>
                        </div>

                      </div>
                    ) : v.status === 'ready' || v.status === VehicleStatus.READY ? (
                      canWrite && (
                        <button
                          onClick={(e) => handleOpenAssign(e, v)}
                          className="py-2 px-4 text-xs font-bold text-indigo-600 bg-indigo-50/50 border border-indigo-100 rounded-xl hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest"
                        >
                          Assign Driver
                        </button>
                      )
                    ) : (
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-2">
                        Unavailable for Assignment
                      </p>
                    )}
                  </div>
                </div>

                {/* Tours right side */}
                <div className="mt-6 md:mt-0 md:ml-8 flex flex-col justify-center">
                  <div className="flex flex-col md:flex-row gap-4">
                    {vehicleTours.length > 0 ? (
                      vehicleTours.map((tour) => (
                        <div
                          key={tour.id}
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-w-[200px] hover:bg-slate-100 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tours/${tour.id}`);
                          }}
                        >

                          <h4 className="text-sm font-bold text-slate-800 mb-1">{formatTourName(tour?.tour_reference)}</h4>

                          <div className="flex justify-between text-xs text-slate-500">
                            <span>{formatDateSA(tour.startDate)}</span>
                            <span>→</span>
                            <span>{formatDateSA(tour.endDate)}</span>
                          </div>
                          <div className="flex gap-1 max-w-md mt-3">
                            {(['tyres', 'wheels', 'service', 'trailer'] as const).map((type) => {
                              // Use tour's maintenanceIndicators if available, otherwise fall back to vehicle calculation
                              let color: 'green' | 'amber' | 'red' = 'green';
                              
                              if (tour.maintenanceIndicators) {
                                if (type === 'tyres') color = tour.maintenanceIndicators.tyres.color;
                                else if (type === 'wheels') color = tour.maintenanceIndicators.wheels.color;
                                else if (type === 'service') color = tour.maintenanceIndicators.service.color;
                                else if (type === 'trailer') color = tour.maintenanceIndicators.brakes.color;
                              } else {
                                color = getInspectionColor(v, type);
                              }
                              
                              const label = type === 'tyres' ? 'T' : type === 'wheels' ? 'W' : type === 'service' ? 'S' : 'TR';
                              const colorClasses = {
                                green: 'bg-green-100 text-green-800 hover:bg-green-200',
                                amber: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
                                red: 'bg-red-100 text-red-800 hover:bg-red-200',
                              }[color];
                              return (
                                <button
                                  key={type}
                                  onClick={(e) => { e.stopPropagation(); openInspection(v, type); }}
                                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors uppercase ${colorClasses}`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>

                          {/* TWSTR Status Text */}
                          <div className="mt-2 space-y-1">
                            {(['tyres', 'wheels', 'service', 'trailer'] as const).map((type) => {
                              const color = getInspectionColor(v, type);
                              const label = type.charAt(0).toUpperCase() + type.slice(1);
                              const statusText = color === 'green' ? 'Good' : color === 'amber' ? 'Check' : 'Critical';
                              if (color === 'green') return null; // Only show non-good? or all? "Tyres :: CURRENT"
                              return (
                                <div key={type} className="flex justify-between text-[9px] uppercase font-bold text-slate-500">
                                  <span>{label}</span>
                                  <span className={color === 'red' ? 'text-red-500' : color === 'amber' ? 'text-amber-500' : 'text-green-500'}>
                                    :: {statusText}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center min-w-[200px]">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Tours</p>
                        <p className="text-xs text-slate-500 mt-1">No tours attached to this vehicle</p>
                      </div>
                    )}
                  </div>
                  {vehicleTours.length > 2 && (
                    <p className="text-[10px] text-slate-400 text-center mt-2">
                      +{vehicleTours.length - 2} more tours
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Register Vehicle Modal */}
      {isModalOpen && canWrite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-zoomIn border border-white/20">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Add Fleet Asset</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Register new vehicle.</p>
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
                    value={newVehicle.model}
                    onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                    placeholder="e.g. HONDA FIT 3"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registry Plate</label>
                  <input
                    required
                    value={newVehicle.licenceNumber}
                    onChange={e => setNewVehicle({ ...newVehicle, licenceNumber: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                    placeholder="e.g. GM 45 TY CT"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Model Year</label>
                  <input
                    required
                    type="number"
                    value={newVehicle.modelYear}
                    onChange={e => setNewVehicle({ ...newVehicle, modelYear: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                    placeholder="e.g. 2020"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trailer Model (Optional)</label>
                  <input
                    value={newVehicle.trailerModel}
                    onChange={e => setNewVehicle({ ...newVehicle, trailerModel: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                    placeholder="e.g. TRAILER MODEL X"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trailer Licence (Optional)</label>
                  <input
                    value={newVehicle.trailerLicence}
                    onChange={e => setNewVehicle({ ...newVehicle, trailerLicence: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                    placeholder="e.g. TRL 123 CT"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Odometer</label>
                  <input
                    required
                    type="number"
                    value={newVehicle.odometer}
                    onChange={e => setNewVehicle({ ...newVehicle, odometer: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Service (KM)</label>
                  <input
                    required
                    type="number"
                    value={newVehicle.lastServiced}
                    onChange={e => setNewVehicle({ ...newVehicle, lastServiced: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                    placeholder="e.g. 150000"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Next Service (KM)</label>
                  <input
                    required
                    type="number"
                    value={newVehicle.nextService}
                    onChange={e => setNewVehicle({ ...newVehicle, nextService: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                    placeholder="e.g. 165000"
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

      {/* Assign Driver Modal */}
      {isAssignModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-zoomIn border border-white/20">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Assign Driver</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Deploying {selectedVehicle.model}</p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-8">
              <form onSubmit={handleAssignSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <User size={12} className="text-indigo-600" />
                      Assign Operator
                    </label>
                    <select
                      required
                      value={assignment.driverId}
                      onChange={e => setAssignment({ ...assignment, driverId: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-sm"
                    >
                      <option value="">Choose operator...</option>
                      {drivers?.map(d => (
                        <option key={d.uid} value={d.uid}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                </div>

                <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 flex items-start gap-3">
                  <ShieldCheck size={16} className="shrink-0 mt-0.5 text-slate-500" />
                  <p className="text-[10px] font-bold leading-relaxed uppercase text-slate-600">
                    Assigns driver to vehicle. Vehicle remains ready.
                  </p>
                </div>

                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
                  <button type="button" onClick={() => setIsAssignModalOpen(false)} className="flex-1 py-3.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all text-xs uppercase">Cancel</button>
                  <button type="submit" className="flex-1 bg-indigo-600 py-3.5 font-bold text-white rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all text-xs uppercase">Authorize</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Inspection Status Modal */}
      {inspectionModal.open && inspectionModal.vehicle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-zoomIn border border-white/20">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {inspectionModal.vehicle.licenceNumber} • {inspectionModal.type.toUpperCase()}
                </p>
              </div>
              <button onClick={() => setInspectionModal({ open: false, vehicle: null, type: '' })} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-8">
              <div className="space-y-6">
                {(() => {
                  const intervals = inspectionModal.vehicle.vehicleMaintenanceIntervalsKm;
                  if (!intervals) return null;

                  const currentOdo = inspectionModal.vehicle.latest_odometer || inspectionModal.vehicle.odometer;
                  let lastServiceOdo: number;
                  let nextServiceOdo: number;
                  let interval: number;
                  let kmLeft: number;
                  let color: 'green' | 'amber' | 'red';
                  let statusText: string;

                  switch (inspectionModal.type) {
                    case 'tyres':
                      interval = intervals.tyres;
                      lastServiceOdo = inspectionModal.vehicle.odometer;
                      nextServiceOdo = inspectionModal.vehicle.odometer + interval;
                      break;
                    case 'wheels':
                      interval = intervals.alignmentBalancing;
                      lastServiceOdo = inspectionModal.vehicle.odometer;
                      nextServiceOdo = inspectionModal.vehicle.odometer + interval;
                      break;
                    case 'service':
                      interval = intervals.service;
                      lastServiceOdo = inspectionModal.vehicle.lastServiced || inspectionModal.vehicle.odometer;
                      nextServiceOdo = inspectionModal.vehicle.nextService || inspectionModal.vehicle.odometer;
                      break;
                    case 'trailer':
                      interval = 0;
                      lastServiceOdo = inspectionModal.vehicle.odometer;
                      nextServiceOdo = inspectionModal.vehicle.odometer;
                      color = inspectionModal.vehicle.trailerModel || inspectionModal.vehicle.trailerLicence ? 'green' : 'amber';
                      statusText = color === 'green' ? 'Good' : 'Check';
                      kmLeft = 0;
                      break;
                    default:
                      interval = 0;
                      lastServiceOdo = inspectionModal.vehicle.odometer;
                      nextServiceOdo = inspectionModal.vehicle.odometer;
                      color = 'green';
                      statusText = 'Good';
                      kmLeft = 0;
                  }

                  if (inspectionModal.type !== 'trailer') {
                    const kmSinceLast = Math.max(0, currentOdo - lastServiceOdo);
                    kmLeft = Math.max(0, interval - kmSinceLast);
                    const percentageLeft = interval > 0 ? (kmLeft / interval) * 100 : 100;
                    if (percentageLeft <= 5) color = 'red';
                    else if (percentageLeft <= 20) color = 'amber';
                    else color = 'green';
                    statusText = color === 'green' ? 'Good' : color === 'amber' ? 'Check' : 'Critical';
                  }

                  return (
                    <>
                      <div className="space-y-1.5">
                        <div className="space-y-2">

                          <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-xs text-slate-500">Last Service (KM)</span>
                            <span className="text-sm font-bold text-slate-800">{lastServiceOdo}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-xs text-slate-500">Next Service (KM)</span>
                            <span className="text-sm font-bold text-slate-800">{nextServiceOdo}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-xs text-slate-500">Kilometers Left</span>
                            <span className="text-sm font-bold text-slate-800">{inspectionModal.type === 'trailer' ? 'N/A' : (kmLeft || '0') + ' km'}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-xs text-slate-500">Status</span>
                            <span className={`text-sm font-bold ${color === 'red' ? 'text-red-500' : color === 'amber' ? 'text-amber-500' : 'text-green-500'}`}>
                              {statusText}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Measurements Section */}
                {(inspectionModal.type === 'tyres' || inspectionModal.type === 'trailer') && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Latest Measurements (mm)
                    </label>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      {(() => {
                        const relevantKey = inspectionModal.type === 'tyres' ? 'tyre_tread_depth' :
                            'trailer_tread_depth';

                        const latestInspection = inspections
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .find(i => i.results && i.results[relevantKey]);

                        const measurements = latestInspection?.results[relevantKey] || {};

                        // Define expected fields for display to ensure they are visible even empty
                        const fieldConfig: Record<string, { key: string, label: string }[]> = {
                          'tyres': [
                            { key: 'left_front', label: 'Left Front' },
                            { key: 'right_front', label: 'Right Front' },
                            { key: 'left_rear_inner', label: 'Left Rear Inner' },
                            { key: 'left_rear_outer', label: 'Left Rear Outer' },
                            { key: 'right_rear_inner', label: 'Right Rear Inner' },
                            { key: 'right_rear_outer', label: 'Right Rear Outer' },
                          ],
                          'trailer': [
                            { key: 'left', label: 'Left' },
                            { key: 'right', label: 'Right' },
                          ]
                        };

                        const fields = fieldConfig[inspectionModal.type] || [];

                        if (fields.length === 0) return <p className="text-xs text-slate-500 italic">Configuration missing.</p>;

                        return (
                          <div className="grid grid-cols-2 gap-3">
                            {fields.map(({ key, label }) => {
                              const value = measurements[key];
                              const isRear = key.toLowerCase().includes('rear') || (inspectionModal.type === 'trailer'); // Trailer is all rear usually
                              const hasValue = value !== undefined && value !== null && value !== '';

                              return (
                                <div key={key} className={`flex justify-between items-center p-2 rounded-lg ${isRear ? 'bg-indigo-50/50 border border-indigo-100' : 'bg-white border border-slate-100'}`}>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isRear ? 'text-indigo-700' : 'text-slate-500'}`}>
                                    {label}
                                  </span>
                                  <span className={`text-sm font-bold ${hasValue ? 'text-slate-800' : 'text-slate-300'}`}>
                                    {hasValue ? value : '--'} <span className="text-[10px] text-slate-400 font-normal">mm</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={() => setInspectionModal({ open: false, vehicle: null, type: '' })}
                    className="w-full py-3.5 font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all text-xs uppercase"
                  >
                    Close Inspection
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {isIssueModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-zoomIn border border-white/20">
            <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Report Issue</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {selectedVehicle.licenceNumber}
                </p>
              </div>
              <button onClick={() => setIsIssueModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-8">
              <form onSubmit={handleIssueSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Issue Description</label>
                  <textarea
                    required
                    value={newIssue.description}
                    onChange={e => setNewIssue({ ...newIssue, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-medium resize-none"
                    placeholder="Describe the issue..."
                    rows={4}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Severity</label>
                  <select
                    required
                    value={newIssue.severity}
                    onChange={e => setNewIssue({ ...newIssue, severity: e.target.value as IssueSeverity })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-bold"
                  >
                    <option value={IssueSeverity.LOW}>Low</option>
                    <option value={IssueSeverity.MEDIUM}>Medium</option>
                    <option value={IssueSeverity.HIGH}>High</option>
                    <option value={IssueSeverity.CRITICAL}>Critical</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsIssueModalOpen(false)} className="flex-1 py-3.5 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all text-xs uppercase">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 py-3.5 font-bold text-white rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Reporting...
                      </div>
                    ) : (
                      'Report Issue'
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

export default Vehicles;