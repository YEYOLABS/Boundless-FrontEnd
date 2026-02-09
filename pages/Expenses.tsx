
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Expense, ExpenseStatus, UserRole, Tour } from '../types';
import StatusBadge from '../components/StatusBadge';
import { Search, Trash2, CheckCircle, XCircle, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

interface Props {
  role: UserRole;
}

const Expenses: React.FC<Props> = ({ role }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTours, setExpandedTours] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification, showConfirm } = useNotification();
  const isOwner = role === 'owner';

  const loadExpenses = async () => {
    try {
      const [expenseData, tourData] = await Promise.all([
        api.getExpenses(),
        api.getTours()
      ]);
      setExpenses(expenseData);
      setTours(tourData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadExpenses(); }, []);

  const toggleTour = (tourId: string) => {
    const newExpanded = new Set(expandedTours);
    if (newExpanded.has(tourId)) {
      newExpanded.delete(tourId);
    } else {
      newExpanded.add(tourId);
    }
    setExpandedTours(newExpanded);
  };

  const handleStatusChange = async (id: string, action: 'approve' | 'reject') => {
    showConfirm(`Mark expense as ${action}d?`, async () => {
      try {
        await api.updateExpenseStatus(id, action);
        loadExpenses();
        showNotification(`Expense ${action}d.`, 'success');
      } catch (err) {
        showNotification('Failed to update status', 'error');
      }
    }, 'Expense Status Update');
  };

  const handleDelete = async (id: string) => {
    showConfirm('PERMANENT ACTION: Delete this expense record?', async () => {
      try {
        await api.deleteExpense(id);
        loadExpenses();
        showNotification('Expense record removed.', 'success');
      } catch (err) {
        showNotification('Failed to delete expense', 'error');
      }
    }, 'Delete Expense');
  };

  // Group expenses by tour
  const groupedExpenses = expenses.reduce((acc, expense) => {
    const tourId = expense.tourId || 'unassigned';
    if (!acc[tourId]) {
      acc[tourId] = [];
    }
    acc[tourId].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  // Filter expenses based on search term
  const filteredGroupedExpenses = Object.entries(groupedExpenses).reduce((acc, [tourId, expenseList]) => {
    const tour = tours.find(t => t.id === tourId);
    const tourMatches = tour?.tour_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        tour?.tour_name.toLowerCase().includes(searchTerm.toLowerCase());
    const expenseMatches = (expenseList as Expense[]).some(exp => 
      exp.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (searchTerm === '' || tourMatches || expenseMatches) {
      acc[tourId] = expenseList as Expense[];
    }
    return acc;
  }, {} as Record<string, Expense[]>);

  const getTourInfo = (tourId: string) => {
    if (tourId === 'unassigned') return null;
    return tours.find(t => t.id === tourId);
  };

  const calculateTourTotal = (expenseList: Expense[]) => {
    return expenseList.reduce((sum, exp) => sum + ((exp.amountCents || exp.amount) / 100), 0);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Expense Tracking</h2>
          <p className="text-slate-500 mt-1">Review and approve driver expenditure and float settlements.</p>
        </div>
      </header>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by tour or expense..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" 
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-20 text-center animate-pulse">Loading expenses...</div>
      ) : Object.keys(filteredGroupedExpenses).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-20 text-center text-slate-400">No expenses recorded.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(filteredGroupedExpenses).map(([tourId, expenseList]) => {
            const tour = getTourInfo(tourId);
            const isExpanded = expandedTours.has(tourId);
            const totalAmount = calculateTourTotal(expenseList);

            return (
              <div key={tourId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Tour Header */}
                <div 
                  onClick={() => toggleTour(tourId)}
                  className="p-6 bg-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {isExpanded ? <ChevronDown size={20} className="text-slate-600" /> : <ChevronRight size={20} className="text-slate-600" />}
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">
                        {tour ? tour.tour_reference : 'Unassigned Expenses'}
                      </h3>
                      {tour && (
                        <p className="text-sm text-slate-500 mt-1">{tour.tour_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Expenses</p>
                      <p className="text-xl font-bold text-slate-900">R{totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-bold">
                      {expenseList.length} {expenseList.length === 1 ? 'Expense' : 'Expenses'}
                    </div>
                  </div>
                </div>

                {/* Expenses Table */}
                {isExpanded && (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                      <tr>
                        <th className="px-6 py-4">Expense Details</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Vehicle</th>
                        <th className="px-6 py-4">Trailer</th>
                        <th className="px-6 py-4">Driver</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Float Link</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {expenseList.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-4">
                              {exp.receiptUrl ? (
                                <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0 hover:bg-indigo-100 transition-colors">
                                  <FileText size={20} />
                                </a>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                                  <FileText size={20} />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-800">{exp.category}</p>
                                <p className="text-xs text-slate-500 line-clamp-1">{exp.description}</p>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{new Date(exp.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">R{((exp.amountCents || exp.amount) / 100).toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{exp.vehicleLicence || '—'}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{exp.trailerLicence || '—'}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{exp.driverName || '—'}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={exp.status} />
                          </td>
                          <td className="px-6 py-4">
                            {exp.floatId ? (
                              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-1 rounded">#{exp.floatId.slice(0, 6)}</span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {exp.status === ExpenseStatus.PENDING && (
                                <>
                                  <button onClick={() => handleStatusChange(exp.id, 'approve')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                                    <CheckCircle size={20} />
                                  </button>
                                  <button onClick={() => handleStatusChange(exp.id, 'reject')} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Reject">
                                    <XCircle size={20} />
                                  </button>
                                </>
                              )}
                              {isOwner && (
                                <button onClick={() => handleDelete(exp.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                                  <Trash2 size={20} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Expenses;
