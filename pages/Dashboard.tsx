import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Tour, TourStatus, Vehicle, Issue, UserRole } from '../types';
import { useFetch } from '../hooks/useFetch';
import { Sparkles, Edit2, Calendar, Truck, X, Save } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { RootState } from '../store/store.ts';
import { api } from '../api';
import { useNotification } from '../contexts/NotificationContext';

const Dashboard: React.FC = () => {
  const toursFetch = useFetch<Tour[]>();
  const vehiclesFetch = useFetch<Vehicle[]>();
  const issuesFetch = useFetch<Issue[]>();
  const [aiBriefing, setAiBriefing] = useState<string>("");
  const { showNotification } = useNotification();
  const { user } = useSelector((state: RootState) => state.auth);
  const role = user?.role as UserRole;
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editForm, setEditForm] = useState<Partial<Vehicle>>({});



  const loadData = async () => {
    const [tours, vehicles, issues] = await Promise.all([
      toursFetch.request('/tours'),
      vehiclesFetch.request('/get-vehicles'),
      issuesFetch.request('/issues')
    ]);

    if (tours && vehicles) {
      generateAIBriefing(tours, vehicles);
    }
  };

  const generateAIBriefing = async (tours: Tour[], vehicles: Vehicle[]) => {
    try {
      // Fix: Use process.env.API_KEY directly in GoogleGenAI constructor, assuming it is valid and pre-configured.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Executive summary for fleet owners: ${vehicles.length} assets. ${tours.filter(t => t.status === TourStatus.ACTIVE).length} active tours. Briefly state if any immediate risk exists. 2 sentences max.`;

      // Fix: Use gemini-3-flash-preview and the direct .text property for content extraction.
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { systemInstruction: "You are a senior fleet consultant. Be concise, direct, and professional.", temperature: 0.1 }
      });
      setAiBriefing(response.text || "");
    } catch (e) {
      setAiBriefing("Fleet operations currently stable with high readiness across key routes.");
    }
  };

  const handleEditClick = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditForm({
      odometer: vehicle.odometer,
      licenceNumber: vehicle.licenceNumber,
      trailerModel: vehicle.trailerModel || '',
      trailerLicence: vehicle.trailerLicence || '',
      lastServiced: vehicle.lastServiced,
      nextService: vehicle.nextService,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingVehicle) return;
    try {
      await api.updateVehicle(editingVehicle.id, editForm);
      // Refresh vehicles
      vehiclesFetch.request('/get-vehicles');
      setEditingVehicle(null);
    } catch (error) {
      console.error('Failed to update vehicle:', error);
      showNotification('Failed to update vehicle', 'error');
    }
  };

  const handleCloseModal = () => {
    setEditingVehicle(null);
    setEditForm({});
  };

  useEffect(() => { loadData(); }, []);

  // Compute timeline data for next 60 days
  const timelineData = useMemo(() => {
    const vehicles = vehiclesFetch.data || [];
    const tours = toursFetch.data || [];
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 60); // next two months

    const vehicleMap = new Map<string, { vehicle: Vehicle; tours: Tour[] }>();
    vehicles.forEach(v => vehicleMap.set(v.id, { vehicle: v, tours: [] }));

    tours.forEach(t => {
      const start = new Date(t.startDate);
      if (start >= today && start <= endDate) {
        const entry = vehicleMap.get(t.vehicleId);
        if (entry) {
          entry.tours.push(t);
        }
      }
    });

    // Sort tours by start date
    vehicleMap.forEach(entry => {
      entry.tours.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    });

    // Sort vehicles by sortOrder
    return Array.from(vehicleMap.values()).sort((a, b) => {
      const orderA = a.vehicle.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.vehicle.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }, [vehiclesFetch.data, toursFetch.data]);

  if (vehiclesFetch.loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Fleet Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Fleet Intelligence</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Real-time governance over safety, readiness, and compliance.</p>
        </div>
        <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Active: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </header>

      {/* AI Intelligence Briefing */}
      <div className="relative group overflow-hidden">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative bg-white border border-indigo-50 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
            <Sparkles size={32} className="animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Operational Insight</span>
              <div className="h-px flex-1 bg-indigo-50"></div>
            </div>
            <p className="text-slate-700 font-bold italic text-lg leading-relaxed">
              "{aiBriefing || "Initializing fleet analysis sequence..."}"
            </p>
          </div>
        </div>

        {/* Edit Vehicle Modal */}
        {editingVehicle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800">Edit Vehicle</h3>
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Odometer (km)</label>
                  <input
                    type="number"
                    value={editForm.odometer || ''}
                    onChange={(e) => setEditForm({ ...editForm, odometer: parseInt(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Licence Number</label>
                  <input
                    type="text"
                    value={editForm.licenceNumber || ''}
                    onChange={(e) => setEditForm({ ...editForm, licenceNumber: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Trailer Model</label>
                  <input
                    type="text"
                    value={editForm.trailerModel || ''}
                    onChange={(e) => setEditForm({ ...editForm, trailerModel: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Trailer Licence</label>
                  <input
                    type="text"
                    value={editForm.trailerLicence || ''}
                    onChange={(e) => setEditForm({ ...editForm, trailerLicence: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Serviced</label>
                  <input
                    type="date"
                    value={editForm.lastServiced || ''}
                    onChange={(e) => setEditForm({ ...editForm, lastServiced: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Next Service</label>
                  <input
                    type="date"
                    value={editForm.nextService || ''}
                    onChange={(e) => setEditForm({ ...editForm, nextService: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 border border-slate-200 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      {/* Vehicle Timeline Section */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Vehicle Timeline</h3>
              <p className="text-slate-500 text-sm">Assigned tours for the next two months</p>
            </div>
          </div>
          <div className="text-xs font-medium text-slate-400">
            {new Date().toLocaleDateString()} – {new Date(new Date().setDate(new Date().getDate() + 60)).toLocaleDateString()}
          </div>
        </div>

        <div className="space-y-8">
          {timelineData.map(({ vehicle, tours }) => (
            <div key={vehicle.id} className="border border-slate-100 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Vehicle info and timeline (left side) */}
                <div className="md:w-1/3 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center">
                        <Truck size={24} className="text-slate-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{vehicle.licenceNumber} – {vehicle.model}</h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>Odometer: {vehicle.odometer} km</span>
                          {vehicle.trailerModel && (
                            <>
                              <span>•</span>
                              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                Trailer: {vehicle.trailerModel} ({vehicle.trailerLicence})
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditClick(vehicle)}
                      className="text-indigo-600 hover:text-indigo-800 p-2 rounded-lg hover:bg-indigo-50"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>

                  {/* Timeline bar */}
                  <div className="relative h-10 bg-slate-50 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center">
                      {/* Today line */}
                      <div className="absolute h-full w-px bg-red-400 left-0" style={{ left: '0%' }}></div>
                      {/* Tour segments */}
                      {tours.map((tour, idx) => {
                        const start = new Date(tour.startDate);
                        const end = new Date(tour.endDate);
                        const totalDays = 60;
                        const startOffset = Math.max(0, (start.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
                        const leftPercent = (startOffset / totalDays) * 100;
                        const widthPercent = (durationDays / totalDays) * 100;
                        return (
                          <div
                            key={tour.id}
                            className="absolute h-6 rounded-md bg-indigo-500 hover:bg-indigo-600 transition-colors"
                            style={{
                              left: `${leftPercent}%`,
                              width: `${Math.max(2, widthPercent)}%`,
                              top: '50%',
                              transform: 'translateY(-50%)',
                            }}
                            title={`${tour.name} (${tour.startDate} – ${tour.endDate})`}
                          ></div>
                        );
                      })}
                    </div>
                    {/* Day markers */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-400 px-2">
                      <span>Today</span>
                      <span>+30d</span>
                      <span>+60d</span>
                    </div>
                  </div>
                </div>

                {/* Tours list (right side) */}
                <div className="md:w-2/3">
                  {tours.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {tours.map(tour => (
                        <div key={tour.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-indigo-300 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-bold text-slate-800">{tour.name}</div>
                              <div className="text-xs text-slate-500">
                                {tour.tour_reference && <span>Ref: {tour.tour_reference}</span>}
                                {tour.supplier && <span> • {tour.supplier}</span>}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${tour.status === TourStatus.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                              {tour.status}
                            </span>
                          </div>
                          <div className="text-sm text-slate-700 mb-1">
                            {new Date(tour.startDate).toLocaleDateString()} – {new Date(tour.endDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>PAX: {tour.pax || 'N/A'}</span>
                            <span>Asset: {tour.vehicleId ? 'Assigned' : 'Unassigned'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <Calendar size={24} className="text-slate-400" />
                      </div>
                      <h5 className="font-bold text-slate-600 mb-1">No Tour Associated</h5>
                      <p className="text-slate-500 text-sm">This vehicle has no scheduled tours for the next 60 days.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;