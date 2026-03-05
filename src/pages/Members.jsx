import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, SlidersHorizontal, Plus, Phone, Loader2, Trash2 } from 'lucide-react';

export default function Members() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', phone: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('members')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setMembers(data || []);
        } catch (error) {
            console.error('Error fetching members:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const addMember = async (e) => {
        e.preventDefault();
        if (!newMember.name || !newMember.phone) return;

        try {
            setSubmitting(true);
            const { data, error } = await supabase
                .from('members')
                .insert([{ name: newMember.name, phone: newMember.phone, points: 0 }])
                .select();

            if (error) throw error;

            if (data) {
                setMembers([...members, ...data]);
            } else {
                // Fallback if data isn't returned immediately (RLS policies sometimes)
                fetchMembers();
            }

            setShowAddModal(false);
            setNewMember({ name: '', phone: '' });
        } catch (error) {
            console.error('Error adding member:', error.message);
            alert('Failed to add member: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const deleteMember = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;

        try {
            const { error } = await supabase
                .from('members')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchMembers();
        } catch (error) {
            console.error('Error deleting member:', error.message);
            alert('Failed to delete member.');
        }
    };

    const filteredMembers = members.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone.includes(searchTerm)
    );

    return (
        <div className="h-full flex flex-col relative">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 sticky top-0 z-30">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Members</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Manage loyalty & customers</p>
                    </div>
                </div>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search size={20} className="text-slate-400" />
                    </span>
                    <input
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder="Search by name or phone..."
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="p-5 space-y-4 flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500 dark:text-slate-400">No members found.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredMembers.map((member) => (
                            <div key={member.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-blue-500/20 uppercase">
                                        {member.name.substring(0, 2)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">{member.name}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-0.5">
                                            <Phone size={14} className="mr-1" />
                                            {member.phone}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex flex-col items-end">
                                        <div className="flex space-x-1 mb-1">
                                            <span className="text-sm font-bold text-primary">{member.points} Point</span>
                                        </div>
                                        {member.points >= 6 ? (
                                            <p className="text-[10px] font-bold text-white bg-green-500 px-2 py-0.5 rounded-md">Reward Ready!</p>
                                        ) : (
                                            <p className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">Accumulating</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => deleteMember(member.id, member.name)}
                                        className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Delete Member"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
                }
            </main >

            {/* FAB */}
            < button
                onClick={() => setShowAddModal(true)}
                className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-40 hover:scale-105 transition-transform active:scale-95"
            >
                <Plus size={28} />
            </button >

            {/* Add Member Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add New Member</h2>
                            <form onSubmit={addMember} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Full Name</label>
                                    <input
                                        autoFocus
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        placeholder="e.g. John Doe"
                                        value={newMember.name}
                                        onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Phone Number</label>
                                    <input
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        placeholder="e.g. 08123456789"
                                        value={newMember.phone}
                                        onChange={e => setNewMember({ ...newMember, phone: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {submitting ? 'Adding...' : 'Add Member'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
