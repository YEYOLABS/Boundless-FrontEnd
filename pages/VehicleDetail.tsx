
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Vehicle, Tour, Inspection, Issue, VehicleStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import InspectionList from '../components/InspectionList';
import { ArrowLeft, Truck, Calendar, Map, AlertCircle, Clipboard, Info, User, ShieldCheck, Wrench, ChevronRight, Trash2, Clock, StickyNote } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useNotification } from '../contexts/NotificationContext';

const VehicleDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { showNotification, showConfirm } = useNotification();
  const [activeTab, setActiveTab] = useState<'info' | 'tours' | 'issues' | 'maintenance' | 'inspections'>('info');

  const vehicleFetch = useFetch<Vehicle>();
  const toursFetch = useFetch<Tour[]>();
  const issuesFetch = useFetch<Issue[]>();
  const inspectionsFetch = useFetch<Inspection[]>();

  const defaultIntervals = {
    service: 15000,
    handbrakeShoes: 150000,
    alignmentBalancing: 8000,
    tyres: 70000,
    turboExchange: 150000,
    clutchReplacement: 100000,
  };

  const [maintenanceIntervals, setMaintenanceIntervals] = useState(defaultIntervals);

  const canWrite = user?.role === 'owner' || user?.role === 'ops';

  const loadAllData = async () => {
    if (!id) return;
    try {
      await Promise.all([
        vehicleFetch.request(`/vehicles/${id}`),
        toursFetch.request(`/vehicles/${id}/tours`),
        issuesFetch.request(`/vehicles/${id}/issues`),
        inspectionsFetch.request(`/vehicles/${id}/inspections`)
      ]);
    } catch (err) {
      console.error("Failed to load vehicle details", err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [id]);

  useEffect(() => {
    if (vehicleFetch.data) {
      setMaintenanceIntervals(vehicleFetch.data.vehicleMaintenanceIntervalsKm || defaultIntervals);
    }
  }, [vehicleFetch.data]);

  const handleDelete = async () => {
    if (!id || !canWrite) return;
    showConfirm('CRITICAL ACTION: Are you sure you want to decommission and remove this vehicle from the fleet? This action is permanent.', async () => {
      try {
        await api.deleteVehicle(id);
        navigate('/vehicles');
        showNotification('Asset successfully decommissioned.', 'success');
      } catch (err) {
        showNotification('Failed to delete asset: ' + err, 'error');
      }
    }, 'Decommission Asset');
  };

  const handleUpdateMaintenance = async () => {
    if (!id || !canWrite) return;
    try {
      await api.updateVehicle(id, { vehicleMaintenanceIntervalsKm: maintenanceIntervals });
      showNotification('Maintenance intervals updated successfully', 'success');
      loadAllData(); // Reload to get updated data
    } catch (err) {
      showNotification('Failed to update maintenance intervals: ' + err, 'error');
    }
  };

  const vehicle = vehicleFetch.data;
  const loading = vehicleFetch.loading;

  if (loading) return <div className="p-20 text-center animate-pulse font-bold text-slate-400">Synchronizing Asset Data...</div>;
  if (!vehicle) return (
    <div className="p-20 text-center flex flex-col items-center">
      <AlertCircle size={48} className="text-rose-500 mb-4" />
      <h3 className="text-xl font-bold">Vehicle Not Found</h3>
      <button onClick={() => navigate('/vehicles')} className="mt-4 text-indigo-600 font-bold hover:underline">Return to Fleet</button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate('/vehicles')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm uppercase tracking-widest"
        >
          <ArrowLeft size={16} />
          Back to Fleet
        </button>
        {canWrite && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
          >
            <Trash2 size={16} />
            Decommission Asset
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/30">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-600/20">
              <Truck size={40} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">{vehicle.licenceNumber}</h2>
                {/* <StatusBadge status={vehicle.status || 'READY'} /> */}
              </div>
              {/* <p className="text-indigo-600 font-black text-xs mt-2 uppercase tracking-[0.3em]">{vehicle.model}</p> */}
            </div>
          </div>
          {/* <div className="flex gap-3">
            <button className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white hover:shadow-sm transition-all flex items-center gap-2">
              <Wrench size={18} />
              Schedule Maintenance
            </button>
          </div> */}
        </div>

        <div className="px-8 flex border-b border-slate-50 overflow-x-auto no-scrollbar bg-white sticky top-0 z-10">
          {[
            { id: 'info', name: 'Overview', icon: Info },
            { id: 'tours', name: 'Tour History', icon: Map, badge: toursFetch.data?.length },
            { id: 'issues', name: 'Issue Log', icon: AlertCircle, badge: issuesFetch.data?.length },
            { id: 'maintenance', name: 'Master Data', icon: Wrench },
            { id: 'inspections', name: 'Inspections', icon: Clipboard, badge: inspectionsFetch.data?.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                px-8 py-5 flex items-center gap-2 border-b-4 font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'}
              `}
            >
              <tab.icon size={16} />
              {tab.name}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-lg text-[10px] ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'info' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-8">
                  <div>
                    {/* <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Deployment Status</h4> */}
                    {vehicle.currentDriverName ? (
                      <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-[1rem] space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-white text-emerald-600 flex items-center justify-center font-black text-xl shadow-sm border border-emerald-100">
                            {vehicle.currentDriverName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Active Driver</p>
                            <p className="text-lg font-black text-slate-800">{vehicle.currentDriverName}</p>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-emerald-100">
                          <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest mb-1 opacity-60">Dispatcher</p>
                          <div className="flex items-center gap-2">
                            <User size={12} className="text-emerald-600" />
                            <p className="text-sm font-bold text-slate-700">{vehicle.assignedByName || 'System Automated'}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] text-center space-y-4">
                        <ShieldCheck size={32} className="text-slate-300 mx-auto" />
                        <p className="text-sm font-bold text-slate-500">Asset is currently in the depot and ready for deployment.</p>
                        <button
                          onClick={() => navigate('/vehicles')}
                          className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline"
                        >
                          Start Assignment Process
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-8">
                  <div>
                    {/* <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Technical Specification</h4> */}
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Licence Plate', val: vehicle.licenceNumber },
                        //  { label: 'Asset ID', val: vehicle.id.slice(0, 12) },
                        { label: 'Trailer', val: vehicle.trailerLicence || 'N/A' },
                        //  { label: 'Created At', val: new Date(vehicle.createdAt || '').toLocaleDateString() },
                      ].map((spec, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{spec.label}</p>
                          <p className="text-sm font-black text-slate-800 tracking-tight">{spec.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inspection Stats vs Master Data */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Inspection Stats vs Master Data</h4>
                <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Maintenance Interval</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Done</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Current</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance (km left)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(maintenanceIntervals).map(([key, interval]) => {
                          const itemName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                          const initialOdometer = vehicle.odometer || 0;
                          const latestOdometer = vehicle.latest_odometer || initialOdometer;
                          const kmSinceLast = latestOdometer - initialOdometer;
                          const kmLeft = (interval as number) - kmSinceLast;
                          const balance = Math.max(0, kmLeft);

                          return (
                            <tr key={key} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-sm font-black text-slate-800 tracking-tight">{itemName}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-slate-600">{interval} km</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-slate-600">{initialOdometer} km</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-bold text-slate-600">{latestOdometer} km</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`text-sm font-black ${balance < 1000 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  <p>{balance} km</p>
                                  {balance < 1000 && (
                                    <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">Due Soon</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tours' && (
            <div className="space-y-6">
              {toursFetch.data?.length === 0 ? (
                <div className="text-center py-20 text-slate-400 italic">No tour history available for this asset.</div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {toursFetch.data?.map((tour) => (
                    <div
                      key={tour.id}
                      onClick={() => navigate(`/tours/${tour.id}`)}
                      className="bg-slate-50 p-2 rounded-[1rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shadow-sm border border-slate-100">
                          <Clock size={24} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            {/* <StatusBadge status={tour.status} /> */}
                            {tour?.tour_reference}
                          </div>
                          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(tour.startDate).toLocaleDateString()}</span>
                            <span>—</span>
                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(tour.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 max-w-md hidden lg:block">
                        {tour.notes && (
                          <div className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-slate-100 italic text-xs text-slate-500 line-clamp-2">
                            <StickyNote size={12} className="shrink-0 mt-0.5" />
                            {tour.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 justify-between md:justify-end">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tour Reference</p>
                          <p className="text-xs font-black text-slate-400 italic">#{tour?.tour_reference}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="space-y-4">
              {issuesFetch.data?.length === 0 ? (
                <div className="text-center py-20 text-slate-400 italic">This asset has a clean safety record. No issues reported.</div>
              ) : (
                issuesFetch.data?.map((issue) => (
                  <div key={issue.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${issue.severity === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                      <AlertCircle size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-black text-slate-800 tracking-tight">#{issue.id.slice(0, 8)}</h4>
                          <StatusBadge status={issue.severity} />
                          <StatusBadge status={issue.status} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(issue.reportedAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">{issue.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h4 className="text-lg font-black text-slate-800 tracking-tight">Master Data</h4>
                  {canWrite && (
                    <button
                      onClick={handleUpdateMaintenance}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all"
                    >
                      Update
                    </button>
                  )}
                </div>

                {/* Tyres Section */}
                <div className="mb-8 border-b border-slate-100 pb-8">
                  <h5 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">Tyres</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Left Front', key: 'tyres_left_front' },
                      { label: 'Right Front', key: 'tyres_right_front' },
                      { label: 'Left Rear Inner', key: 'tyres_left_rear_inner' },
                      { label: 'Left Rear Outer', key: 'tyres_left_rear_outer' },
                      { label: 'Right Rear Inner', key: 'tyres_right_rear_inner' },
                      { label: 'Right Rear Outer', key: 'tyres_right_rear_outer' },
                    ].map((item) => (
                      <div key={item.key} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="mm"
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm font-bold"
                            disabled={!canWrite}
                          />
                          <span className="text-xs text-slate-400 font-bold">mm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Last Log</p>
                    <p className="text-sm font-bold text-slate-800">30,911 km</p>
                  </div>
                </div>

                {/* Wheels Section */}
                <div className="mb-8 border-b border-slate-100 pb-8">
                  <h5 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">Wheels</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Alignment', key: 'wheels_alignment' },
                      { label: 'Balancing', key: 'wheels_balancing' },
                    ].map((item) => (
                      <div key={item.key} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
                        <input
                          type="number"
                          placeholder="km"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm font-bold"
                          disabled={!canWrite}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Services Section */}
                <div>
                  <h5 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">Services</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Service', key: 'service' },
                      { label: 'Turbo Exchange', key: 'turboExchange' },
                      { label: 'Handbrake Shoes', key: 'handbrakeShoes' },
                      { label: 'Clutch Replacement', key: 'clutchReplacement' },
                    ].map((item) => (
                      <div key={item.key} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
                        <input
                          type="number"
                          value={maintenanceIntervals[item.key as keyof typeof maintenanceIntervals] || ''}
                          onChange={e => setMaintenanceIntervals({ ...maintenanceIntervals, [item.key]: parseInt(e.target.value) || 0 })}
                          placeholder="km"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm font-bold"
                          disabled={!canWrite}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inspections' && (
            <InspectionList inspections={inspectionsFetch.data || []} />
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleDetail;
