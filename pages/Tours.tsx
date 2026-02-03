import React, { useEffect, useState, useRef } from 'react';
import { Tour, TourStatus, Vehicle, Driver, Float } from '../types';
import StatusBadge from '../components/StatusBadge';
import {
  Plus, X, Upload, Check, FileText, Calendar,
  MapPin, Truck, User, Globe, Hash, Info, Briefcase, Search, Filter, Wallet, CheckCircle
} from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import * as XLSX from 'xlsx';

const Tours: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  // Data Fetches
  const toursFetch = useFetch<Tour[]>();
  const vehiclesFetch = useFetch<Vehicle[]>();
  const driversFetch = useFetch<Driver[]>();
  const floatsFetch = useFetch<Float[]>();

  // Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfirmedToursModalOpen, setIsConfirmedToursModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<{ valid: number, total: number, data: any[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAllTours, setShowAllTours] = useState(false);
  const [reportSearchTerm, setReportSearchTerm] = useState('');

  // Search States
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [newTour, setNewTour] = useState<Partial<Tour>>({
    tour_reference: '',
    tour_name: '',
    supplier: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: TourStatus.CONFIRMED,
    estimated_km: 0,
    pax: 0,
    vehicleId: '',
    driverId: '',
    notes: ''
  });

  const canWrite = user?.role === 'owner' || user?.role === 'tour_manager';

  const loadData = async () => {
    await Promise.all([
      toursFetch.request('/tours'),
      vehiclesFetch.request('/get-vehicles'),
      driversFetch.request('/get-drivers'),
      floatsFetch.request('/floats')
    ]);
  };

  useEffect(() => { loadData(); }, []);

  // Helper to get Vehicle Plate dynamically
  const getVehiclePlate = (vehicleId: string) => {
    const v = vehiclesFetch.data?.find(v => v.id === vehicleId);
    return v?.licenceNumber || 'UNASSIGNED';
  };

  // Helper to get Driver Name dynamically
  const getDriverName = (driverId: string) => {
    const d = driversFetch.data?.find(d => d.uid === driverId);
    return d?.name || 'Unassigned Operator';
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length !== 3) return '';
    const day = parts[0];
    const monthStr = parts[1];
    const year = parts[2];
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    const month = monthMap[monthStr];
    if (!month) return '';
    return `${year}-${month}-${day.padStart(2, '0')}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Assume first row is header
      const headers = jsonData[0]?.map((h: string) => h?.trim()) || [];
      const rows = jsonData.slice(1);

      // Map column indices based on header names
      const supplierIdx = headers.findIndex(h => h.toLowerCase().includes('supplier') || h.toLowerCase().includes('client'));
      const tourNameIdx = headers.findIndex(h => h.toLowerCase().includes('tour name'));
      const tourRefIdx = headers.findIndex(h => h.toLowerCase().includes('tour reference'));
      const arrivalIdx = headers.findIndex(h => h.toLowerCase().includes('arrival'));
      const departureIdx = headers.findIndex(h => h.toLowerCase().includes('departure'));
      const paxIdx = headers.findIndex(h => h.toLowerCase().includes('pax'));
      const statusIdx = headers.findIndex(h => h.toLowerCase().includes('status'));

      const mapped = rows.map(row => {
        const supplier = supplierIdx >= 0 ? row[supplierIdx] : '';
        const tourName = tourNameIdx >= 0 ? row[tourNameIdx] : '';
        const tourRef = tourRefIdx >= 0 ? row[tourRefIdx] : '';
        const arrival = arrivalIdx >= 0 ? row[arrivalIdx] : '';
        const departure = departureIdx >= 0 ? row[departureIdx] : '';
        const pax = paxIdx >= 0 ? row[paxIdx] : '';
        const statusRaw = statusIdx >= 0 ? row[statusIdx] : '';

        // Map status
        let status = TourStatus.PLANNED;
        if (typeof statusRaw === 'string') {
          if (statusRaw.toLowerCase().includes('cancelled')) {
            status = TourStatus.CANCELLED;
          } else if (statusRaw.toLowerCase().includes('approved')) {
            status = TourStatus.PLANNED;
          } else if (statusRaw.toLowerCase().includes('active')) {
            status = TourStatus.ACTIVE;
          } else if (statusRaw.toLowerCase().includes('completed')) {
            status = TourStatus.COMPLETED;
          }
        }

        // Convert dates to ISO string (YYYY-MM-DD)
        const startDate = parseDate(arrival);
        const endDate = parseDate(departure);

        return {
          tour_reference: tourRef,
          tour_name: tourName,
          supplier: supplier,
          start_date: startDate,
          end_date: endDate,
          status: status,
          pax: pax,
          notes: pax ? `PAX: ${pax}` : ''
        };
      }).filter(r => r.tour_reference && r.tour_reference !== '');

      setImportStatus({ total: mapped.length, valid: mapped.length, data: mapped });
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleAddTourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Find driver/vehicle names to send to API
      const selectedDriver = driversFetch.data?.find(d => d.uid === newTour.driverId);
      const selectedVehicle = vehiclesFetch.data?.find(v => v.id === newTour.vehicleId);

      await api.createTour({
        ...newTour,
        driverName: selectedDriver?.name,
        vehicleName: selectedVehicle?.model
      });

      setIsAddModalOpen(false);
      setNewTour({
        tour_reference: '',
        tour_name: '',
        supplier: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: TourStatus.CONFIRMED,
        estimated_km: 0,
        pax: 0,
        vehicleId: '',
        driverId: ''
      });
      toursFetch.request('/tours');
    } catch (err) {
      alert("Failed to create tour: " + err);
    } finally {
      setSubmitting(false);
    }
  };

  const processImport = async () => {
    if (!importStatus || importing) return;
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const item of importStatus.data) {
      try {
        // Map imported fields to tour object
        const tourData: Partial<Tour> = {
          tour_reference: item.tour_reference,
          tour_name: item.tour_name,
          supplier: item.supplier,
          startDate: item.start_date,
          endDate: item.end_date,
          status: item.status,
          notes: item.notes || '',
          pax: item.pax ? Number(item.pax) : 0,
          vehicleId: '',
          driverId: '',
          estimated_km: 0,
        };
        await api.createTour(tourData);
        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push(`Failed to import ${item.tour_reference}: ${err.message}`);
      }
    }

    setImporting(false);
    if (errorCount === 0) {
      alert(`Successfully imported ${successCount} tours.`);
      setIsImportModalOpen(false);
      setImportStatus(null);
      toursFetch.request('/tours');
    } else {
      alert(`Imported ${successCount} tours, ${errorCount} failed.\n${errors.slice(0, 3).join('\n')}`);
      // Keep modal open to allow retry?
    }
  };

  const statusGroups = [
    {
      id: 'Confirmed',
      label: 'Confirmed Tours',
      color: 'bg-emerald-500',
      filter: (t: Tour) => (t.status === TourStatus.CONFIRMED || t.status === TourStatus.ACTIVE),
      hasAssignment: (t: Tour) => t.vehicleId && t.driverId
    },
    {
      id: 'Pending',
      label: 'Pending Tours',
      color: 'bg-amber-500',
      filter: (t: Tour) => (t.status === TourStatus.PLANNED)
    }
  ];

  if (toursFetch.loading && !toursFetch.data) {
    return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Synchronizing Registry...</div>;
  }

  // Next 2 months logic (roughly 60 days)
  const isWithinNext2Months = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 60);
    // Ignore time
    d.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    future.setHours(0, 0, 0, 0);
    return d >= today && d <= future;
  };

  // Search date range filter
  const isWithinSearchRange = (dateStr: string) => {
    if (!searchStartDate && !searchEndDate) return true;
    const d = new Date(dateStr);
    const start = searchStartDate ? new Date(searchStartDate) : null;
    const end = searchEndDate ? new Date(searchEndDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    d.setHours(0, 0, 0, 0);
    const afterStart = !start || d >= start;
    const beforeEnd = !end || d <= end;
    return afterStart && beforeEnd;
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

  const calculateTourDates = (tour: Tour) => {
    let startDate = tour.startDate;
    let endDate = tour.endDate;
    let tourName = tour.tour_name;

    // ZAPAN logic: Fairfields, Panorama, start +1 day after 2026.10.14
    if (tourName.toUpperCase().includes('ZAPAN') || tourName.includes('Fairfields') || tourName.includes('Panorama')) {
      const baseDate = new Date('2026-10-14');
      baseDate.setDate(baseDate.getDate() + 1);
      startDate = baseDate.toISOString().split('T')[0];
    }

    // Rainbow logic: ZAAD start +1, end +8, becomes Rainbow North if end not provided
    if (tourName.toUpperCase().includes('RAINBOW')) {
      // Assume ZAAD is previous tour, but since static, perhaps check if startDate is after some date
      // For simplicity, if endDate not set, add 8 days and append North
      if (!endDate) {
        const start = new Date(startDate);
        start.setDate(start.getDate() + 8);
        endDate = start.toISOString().split('T')[0];
        tourName += ' North';
      }
    }

    // Addo logic: start +1, end +6, becomes Addo North if end not provided
    if (tourName.toUpperCase().includes('ADDO')) {
      if (!endDate) {
        const start = new Date(startDate);
        start.setDate(start.getDate() + 6);
        endDate = start.toISOString().split('T')[0];
        tourName += ' North';
      }
    }

    return { ...tour, startDate, endDate, tour_name: tourName };
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">ASSIGN</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Control center for planning, bulk deployment, and tracking.</p>
        </div>
        <div className="flex gap-4">
          {canWrite && (
            <div className="flex gap-4">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
              >
                <Upload size={18} />
                Bulk Import
              </button>
              <button
                onClick={() => setIsConfirmedToursModalOpen(true)}
                className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
              >
                <FileText size={18} />
                Report
              </button>
            </div>
          )}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30"
          >
            <Plus size={20} />
            Add Tour
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <Search size={20} className="text-slate-400" />
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Date Range Filter</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
            <input
              type="date"
              value={searchStartDate}
              onChange={e => setSearchStartDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</label>
            <input
              type="date"
              value={searchEndDate}
              onChange={e => setSearchEndDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tour Name</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
              placeholder="Search by tour name..."
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm inline-flex gap-2">
        <button
          onClick={() => setShowAllTours(false)}
          className={`relative px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${!showAllTours
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
            : 'text-slate-600 hover:bg-slate-50'
            }`}
        >
          Next 2 Months
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${!showAllTours
            ? 'bg-white/20 text-white'
            : 'bg-slate-100 text-slate-600'
            }`}>
            {toursFetch.data?.filter(t => isWithinNext2Months(t.startDate)).length || 0}
          </span>
        </button>
        <button
          onClick={() => setShowAllTours(true)}
          className={`relative px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${showAllTours
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
            : 'text-slate-600 hover:bg-slate-50'
            }`}
        >
          All Tours
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${showAllTours
            ? 'bg-white/20 text-white'
            : 'bg-slate-100 text-slate-600'
            }`}>
            {toursFetch.data?.length || 0}
          </span>
        </button>
      </div>


      {/* Kanban Grid */}
      <div className="space-y-12">
        {statusGroups.map((group) => {
          // Filter tours based on group logic AND optionally the next 2 months filter AND search range, excluding cancelled tours
          let groupTours = toursFetch.data?.filter(t => {
            const matchesGroup = group.filter(t);
            const matchesDateRange = showAllTours || isWithinNext2Months(t.startDate);
            const matchesSearch = isWithinSearchRange(t.startDate);
            const matchesTourName = searchTerm === '' || t.tour_name.toLowerCase().includes(searchTerm.toLowerCase());
            const notCancelled = t.status !== TourStatus.CANCELLED;
            
            // For confirmed tours, only show if assigned (has both vehicle and driver)
            if (group.id === 'Confirmed' && 'hasAssignment' in group) {
              return matchesGroup && matchesDateRange && matchesSearch && matchesTourName && notCancelled && group.hasAssignment(t);
            }
            
            return matchesGroup && matchesDateRange && matchesSearch && matchesTourName && notCancelled;
          }) || [];

          // Sort tours by start date (next available tour first)
          groupTours = groupTours.sort((a, b) => {
            const dateA = new Date(a.startDate).getTime();
            const dateB = new Date(b.startDate).getTime();
            return dateA - dateB;
          });

          return (
            <div key={group.id} className="space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className={`w-3 h-3 rounded-full ${group.color}`}></div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{group.label}</h3>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full ml-auto">
                  {groupTours.length} Records
                </span>
              </div>

              <div className="flex flex-wrap gap-6">
                {groupTours.map(tour => {
                  const adjustedTour = calculateTourDates(tour);
                  return (
                  <div
                    key={tour.id}
                    onClick={() => navigate(`/tours/${tour.id}`)}
                    className="w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-16px)] bg-white p-5 rounded-2xl border border-blue-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                          <Hash size={12} />
                          {formatTourName(adjustedTour.tour_name)}
                        </div>
                        <StatusBadge status={tour?.status} />
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-black text-lg text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{tour.tour_reference}</h3>
                      </div>

                      <div className="grid grid-cols-1 gap-3 py-4 border-y border-slate-50">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registration No</p>
                          <div className="flex items-center gap-2">
                            <Truck size={12} className="text-indigo-600" />
                            <span className="text-xs font-black text-slate-700 truncate">{getVehiclePlate(tour.vehicleId)}</span>
                          </div>
                        </div>
                        {/* <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Destination</p>
                          <div className="flex items-center gap-2">
                            <Globe size={12} className="text-sky-500" />
                            <span className="text-xs font-black text-slate-700 truncate">{tour.itinerary || 'Kruger Region'}</span>
                          </div>
                        </div> */}
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PAX</p>
                          <div className="flex items-center gap-2">
                            <User size={12} className="text-emerald-600" />
                            <span className="text-xs font-black text-slate-700 truncate">{tour.pax || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl group-hover:bg-indigo-50/50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100 uppercase">
                          {getDriverName(tour.driverId).charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned Operator</p>
                          <p className="text-xs font-black text-slate-800 truncate">{getDriverName(tour.driverId)}</p>
                        </div>
                      </div> */}

                      <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl group-hover:bg-indigo-50/50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-emerald-600 shadow-sm border border-slate-100 uppercase">
                          <Wallet size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance Available</p>
                          <p className="text-xs font-black text-slate-800 truncate">
                            R{(floatsFetch.data?.find(f => f.tourId === tour.id)?.remainingAmount / 100 || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
                })}
                {groupTours.length === 0 && (
                  <div className="w-full border-2 border-dashed border-slate-100 rounded-[3rem] py-20 text-center">
                    <Info className="mx-auto text-slate-200 mb-4" size={32} />
                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest italic">No Operational History</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Tour Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-zoomIn">
            <div className="p-10 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">CREATE A TOUR</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manual Registry Entry</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-12 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <form onSubmit={handleAddTourSubmit} className="space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tour Reference</label>
                    <input
                      required
                      value={newTour.tour_reference}
                      onChange={e => setNewTour({ ...newTour, tour_reference: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-slate-800"
                      placeholder="e.g. TR-2025-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier / Client</label>
                    <input
                      required
                      value={newTour.supplier}
                      onChange={e => setNewTour({ ...newTour, supplier: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-slate-800"
                      placeholder="e.g. Luxury Travels"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PAX</label>
                    <input
                      type="number"
                      min="0"
                      value={newTour.pax || ''}
                      onChange={e => setNewTour({ ...newTour, pax: e.target.value ? parseInt(e.target.value) : 0 })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-slate-800"
                      placeholder="Number of passengers"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tour Name</label>
                  <input
                    required
                    value={newTour.tour_name}
                    onChange={e => setNewTour({ ...newTour, tour_name: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-slate-800"
                    placeholder="e.g. Cape Town Wine Explorer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Assignment</label>
                    <select
                      required
                      value={newTour.vehicleId}
                      onChange={e => setNewTour({ ...newTour, vehicleId: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800"
                    >
                      <option value="">Choose Vehicle...</option>
                      {vehiclesFetch.data?.map(v => <option key={v.id} value={v.id}>{v.model} ({v.licenceNumber})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator Assignment</label>
                    <select
                      required
                      value={newTour.driverId}
                      onChange={e => setNewTour({ ...newTour, driverId: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800"
                    >
                      <option value="">Choose Driver...</option>
                      {driversFetch.data?.map(d => <option key={d.uid} value={d.uid}>{d.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                    <input type="date" required value={newTour.startDate} onChange={e => setNewTour({ ...newTour, startDate: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</label>
                    <input type="date" required value={newTour.endDate} onChange={e => setNewTour({ ...newTour, endDate: e.target.value })} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" />
                  </div>
                </div>

                <div className="flex gap-6 pt-8">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-5 font-black text-slate-400 text-xs uppercase tracking-widest">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-[2] bg-indigo-600 py-5 rounded-2xl font-black text-white text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Authorizing...
                      </div>
                    ) : (
                      'Authorize Deployment'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-zoomIn">
            <div className="p-10 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Registry Sync</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Bulk Normalization Engine</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-12">
              {!importStatus ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-4 border-dashed border-slate-100 rounded-[3rem] p-16 text-center hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                  <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform shadow-sm">
                    <FileText size={48} />
                  </div>
                  <h4 className="text-xl font-black text-slate-700">Drop Registry File</h4>
                  <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto font-medium text-center">Upload your supplier CSV/Excel file to populate the tour board.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2rem] flex items-center gap-8">
                    <div className="w-20 h-20 bg-white text-emerald-600 rounded-[1.5rem] flex items-center justify-center shadow-sm">
                      <Check size={40} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-emerald-900">Valid Schema Detected</p>
                      <p className="text-sm text-emerald-600 font-bold uppercase tracking-widest mt-1">Ready to sync {importStatus.valid} records.</p>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <button onClick={() => setImportStatus(null)} className="flex-1 py-5 font-black text-slate-400 text-xs uppercase tracking-widest">Reset File</button>
                    <button onClick={processImport} disabled={importing} className="flex-[2] bg-indigo-600 py-5 rounded-2xl font-black text-white text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {importing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Importing...
                        </>
                      ) : 'Execute Sync'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Tours Modal */}
      {isConfirmedToursModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl">
          <div className="bg-white rounded-[5px] shadow-2xl w-full max-w-4xl overflow-hidden animate-zoomIn">
            <div className="p-10 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Tour Report</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Historical Confirmed Deployments</p>
              </div>
              <button onClick={() => setIsConfirmedToursModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-12">
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <Search size={20} className="text-slate-400" />
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Search Tours</h3>
                </div>
                <input
                  type="text"
                  value={reportSearchTerm}
                  onChange={e => setReportSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                  placeholder="Search by tour reference..."
                />
              </div>
              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                {(() => {
                  const now = new Date();
                  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                  const confirmedTours = toursFetch.data?.filter(t => t.tour_reference.toLowerCase().includes(reportSearchTerm.toLowerCase())) || [];
                  return confirmedTours?.length > 0 ? (
                    <div className="space-y-6">
                      {confirmedTours.map(tour => {
                        const vehicle = vehiclesFetch.data?.find(v => v.id === tour.vehicleId);
                        const driverName = vehicle?.currentDriverName || 'Unassigned';
                        return (
                          <div key={tour.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tour Reference</p>
                                <p className="text-sm font-black text-slate-800">{tour.tour_reference}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Driver Name</p>
                                <p className="text-sm font-black text-slate-800">{driverName}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vehicle Registration</p>
                                <p className="text-sm font-black text-slate-800">{getVehiclePlate(tour.vehicleId)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Period</p>
                                <p className="text-sm font-black text-slate-800">
                                  Starts: {new Date(tour.startDate).toLocaleDateString('en-US')}<br />
                                  Ends: {new Date(tour.endDate).toLocaleDateString('en-US')}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <Info className="mx-auto text-slate-200 mb-4" size={32} />
                      <p className="text-xs font-black text-slate-300 uppercase tracking-widest italic">No Matching Tours</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tours;
