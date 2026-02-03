
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Expense, ExpenseStatus, UserRole } from '../types';
import StatusBadge from '../components/StatusBadge';
import { Search, Trash2, CheckCircle, XCircle, FileText } from 'lucide-react';

interface Props {
  role: UserRole;
}

const Expenses: React.FC<Props> = ({ role }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const isOwner = role === 'owner';

  const loadExpenses = async () => {
    try {
      const data = await api.getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadExpenses(); }, []);

  const handleStatusChange = async (id: string, action: 'approve' | 'reject') => {
    if (!confirm(`Mark expense as ${action}d?`)) return;
    try {
      await api.updateExpenseStatus(id, action);
      loadExpenses();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('PERMANENT ACTION: Delete this expense record?')) return;
    try {
      await api.deleteExpense(id);
      loadExpenses();
    } catch (err) {
      alert('Failed to delete expense');
    }
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
          <input type="text" placeholder="Search by category or description..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
            {loading ? (
              <tr><td colSpan={8} className="p-20 text-center animate-pulse">Loading expenses...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={8} className="p-20 text-center text-slate-400">No expenses recorded.</td></tr>
            ) : (
              expenses.map((exp) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Expenses;
