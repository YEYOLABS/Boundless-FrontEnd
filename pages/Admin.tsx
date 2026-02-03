
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { User, UserRole, Driver } from '../types';
import StatusBadge from '../components/StatusBadge';
import { UserPlus, Shield, X, Trash2, FileText, Upload, IdCard, Calendar, Phone, Globe, Edit } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

const Admin: React.FC = () => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [newUser, setNewUser] = useState<Partial<User>>({
    username: '',
    pin: '',
    role: 'tour_manager' as UserRole,
    organisationId: currentUser?.organisationId || 'org1',
    name: '',
    uid: '',
    phoneNumber: '',
    email: ''
  });

  // Specific driver fields
  const [driverFields, setDriverFields] = useState({
    passportNumber: '',
    pdpNumber: '',
    passportFile: null as File | null,
    pdpFile: null as File | null,
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        // Update existing user
        const userData = {
          name: newUser.name,
          role: newUser.role,
          phoneNumber: newUser.phoneNumber,
          email: newUser.email
        };
        await api.updateUser(editingUser.uid, userData);
      } else {
        // Add new user
        if (newUser.role === 'driver') {
          const formData = new FormData();
          // Base user fields
          formData.append('username', newUser.username || '');
          formData.append('pin', newUser.pin || '');
          formData.append('role', newUser.role || '');
          formData.append('name', newUser.name || '');
          formData.append('organisationId', newUser.organisationId || '');
          formData.append('uid', newUser.username || '');
          formData.append('phoneNumber', newUser.phoneNumber || '');
          formData.append('email', newUser.email || '');

          // Driver compliance fields
          formData.append('passportNumber', driverFields.passportNumber);
          formData.append('pdpNumber', driverFields.pdpNumber);
          formData.append('pdpExpiry', driverFields.pdpExpiry);

          // Files
          if (driverFields.passportFile) formData.append('passportDocument', driverFields.passportFile);
          if (driverFields.pdpFile) formData.append('pdpDocument', driverFields.pdpFile);

          await api.addDriverWithDocs(formData);
        } else {
          const userData = { ...newUser, uid: newUser.username };
          await api.addUser(userData);
        }
      }

      setIsModalOpen(false);
      setEditingUser(null);
      setNewUser({ username: '', pin: '', role: 'tour_manager', name: '', organisationId: currentUser?.organisationId || 'org1', phoneNumber: '', email: '' });
      setDriverFields({ passportNumber: '', pdpNumber: '', pdpExpiry: '', passportFile: null, pdpFile: null });
      loadUsers();
    } catch (err) {
      alert(`Failed to ${editingUser ? 'update' : 'authorize'} identity: ` + err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setNewUser({
      username: user.username,
      pin: '', // Don't prefill PIN for security
      role: user.role,
      organisationId: user.organisationId,
      name: user.name,
      uid: user.uid,
      phoneNumber: user.phoneNumber || '',
      email: user.email || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser?.uid) {
      alert("You cannot delete your own account.");
      return;
    }
    if (!confirm("Are you sure you want to revoke access for this user?")) return;
    try {
      await api.deleteUser(id);
      loadUsers();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Identity Access</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Governing system operators.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30"
        >
          <UserPlus size={20} />
          Create Account
        </button>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <tr>
              <th className="px-10 py-6">Identity</th>
              <th className="px-10 py-6">Access Level</th>
              <th className="px-10 py-6">System ID</th>
              <th className="px-10 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={4} className="p-20 text-center animate-pulse font-bold text-slate-400">Synchronizing Permissions...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="p-20 text-center text-slate-400 italic">No operators found in current registry.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-inner">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-3">
                       <Shield size={16} className={u.role === 'owner' ? 'text-amber-500' : 'text-indigo-400'} />
                       <span className="text-xs font-black uppercase tracking-widest text-slate-700">{u.role.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <code className="text-[10px] bg-slate-100 px-3 py-1.5 rounded-lg text-slate-500 font-bold">{u.uid}</code>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => handleEditUser(u)}
                        className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.uid)}
                        className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-zoomIn flex flex-col max-h-[90vh]">
            <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingUser ? 'Edit Terminal Access' : 'New Terminal Access'}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{editingUser ? 'Update Privilege Level' : 'Configure Privilege Level'}</p>
              </div>
              <button onClick={() => {
                setIsModalOpen(false);
                setEditingUser(null);
                setNewUser({ username: '', pin: '', role: 'tour_manager', name: '', organisationId: currentUser?.organisationId || 'org1', phoneNumber: '', email: '' });
                setDriverFields({ passportNumber: '', pdpNumber: '', pdpExpiry: '', passportFile: null, pdpFile: null });
              }} className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-10 overflow-y-auto custom-scrollbar">
              <form onSubmit={handleAddUser} className="space-y-6">
                {/* Standard Fields */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Legal Name</label>
                  <input 
                    required 
                    value={newUser.name} 
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</label>
                    <input
                      required
                      disabled={!!editingUser}
                      value={newUser.username}
                      onChange={e => setNewUser({...newUser, username: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        type="tel"
                        value={newUser.phoneNumber}
                        onChange={e => setNewUser({...newUser, phoneNumber: e.target.value})}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-slate-700"
                        placeholder="+27 82 000 0000"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                  <div className="relative">
                    <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-slate-700"
                      placeholder="user@company.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {!editingUser && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security PIN</label>
                      <input
                        required={!editingUser}
                        maxLength={4}
                        type="password"
                        value={newUser.pin}
                        onChange={e => setNewUser({...newUser, pin: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-slate-700 tracking-[0.5em]"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Terminal Role</label>
                    <select
                      required
                      value={newUser.role}
                      onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-bold text-slate-700"
                    >
                      <option value="ops">Operations Manager (Fleet/Issues)</option>
                      <option value="tour_manager">Tour Manager (Schedules/Expenses)</option>
                      <option value="owner">System Owner (Super Access)</option>
                      <option value="driver">Driver (Mobile Terminal)</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Driver Fields - Only show when adding new driver */}
                {newUser.role === 'driver' && !editingUser && (
                  <div className="pt-6 border-t border-slate-100 space-y-6 animate-fadeIn">
                    <div className="bg-indigo-50/50 p-6 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                         <Shield className="text-indigo-600" size={16} />
                         <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Compliance Data</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Passport Number
                          </label>
                          <div className="relative">
                            <IdCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              required
                              value={driverFields.passportNumber}
                              onChange={e => setDriverFields({...driverFields, passportNumber: e.target.value})}
                              className="w-full pl-12 pr-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-bold text-slate-700"
                              placeholder="e.g. Z1234567"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PrDP Number</label>
                          <input 
                            required 
                            value={driverFields.pdpNumber} 
                            onChange={e => setDriverFields({...driverFields, pdpNumber: e.target.value})}
                            className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-bold text-slate-700"
                            placeholder="e.g. PDP-X99"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PrDP Expiry</label>
                          <div className="relative">
                            <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              required 
                              type="date"
                              value={driverFields.pdpExpiry} 
                              onChange={e => setDriverFields({...driverFields, pdpExpiry: e.target.value})}
                              className="w-full pl-11 pr-5 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-600 font-bold text-slate-700"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passport Copy</p>
                          <label className="cursor-pointer flex items-center justify-center gap-2 p-4 bg-white border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 transition-colors group h-[80px]">
                            <input
                              type="file"
                              className="hidden"
                              onChange={e => setDriverFields({...driverFields, passportFile: e.target.files?.[0] || null})}
                            />
                            {driverFields.passportFile ? (
                              <div className="flex items-center gap-2 text-indigo-600 font-bold text-[10px] truncate">
                                <FileText size={14} />
                                <span className="truncate">{driverFields.passportFile.name}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-indigo-500">
                                <Upload size={18} />
                                <span className="text-[8px] font-black uppercase">Attach File</span>
                              </div>
                            )}
                          </label>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PrDP Permit Copy</p>
                          <label className="cursor-pointer flex items-center justify-center gap-2 p-4 bg-white border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 transition-colors group h-[80px]">
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={e => setDriverFields({...driverFields, pdpFile: e.target.files?.[0] || null})}
                            />
                            {driverFields.pdpFile ? (
                              <div className="flex items-center gap-2 text-indigo-600 font-bold text-[10px] truncate">
                                <FileText size={14} />
                                <span className="truncate">{driverFields.pdpFile.name}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-indigo-500">
                                <Upload size={18} />
                                <span className="text-[8px] font-black uppercase">Attach File</span>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-4 pt-6 sticky bottom-0 bg-white">
                  <button type="button" onClick={() => {
                    setIsModalOpen(false);
                    setEditingUser(null);
                    setNewUser({ username: '', pin: '', role: 'tour_manager', name: '', organisationId: currentUser?.organisationId || 'org1', phoneNumber: '', email: '' });
                    setDriverFields({ passportNumber: '', pdpNumber: '', pdpExpiry: '', passportFile: null, pdpFile: null });
                  }} className="flex-1 py-5 font-black text-slate-400 text-xs uppercase tracking-widest">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-[2] bg-indigo-600 py-5 rounded-2xl font-black text-white text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        {editingUser ? 'Updating...' : 'Authorizing...'}
                      </div>
                    ) : (
                      editingUser ? 'Update Identity' : 'Authorize Identity'
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

export default Admin;