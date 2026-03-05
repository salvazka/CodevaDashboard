import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Clock, Loader2, CalendarDays, Laptop, MapPin, CheckCircle2, X, Receipt, MessageCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export default function Schedules() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [newTicket, setNewTicket] = useState({
        guest_name: '',
        guest_phone: '',
        device_model: '',
        activity_name: '',
        service_type: 'In-Store',
        location: '',
        scheduled_at: '',
        status: 'Scheduled',
        estimated_total: '',
        notes: ''
    });

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('service_tickets')
                .select(`
                    *,
                    members (name, phone)
                `)
                .neq('status', 'Billed')
                .order('created_at', { ascending: false });

            // If table doesn't exist yet, this will error, but we handle gracefully for now
            if (error) {
                console.error("Error fetching tickets. Run migrations.", error);
                setTickets([]);
                return;
            }
            setTickets(data || []);
        } catch (error) {
            console.error('Error fetching tickets:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const addTicket = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const payload = {
                ...newTicket,
                scheduled_at: newTicket.scheduled_at || null,
                estimated_total: newTicket.estimated_total ? parseFloat(newTicket.estimated_total) : 0
            };

            const { error } = await supabase
                .from('service_tickets')
                .insert([payload]);

            if (error) throw error;

            setShowAddModal(false);
            setNewTicket({
                guest_name: '',
                guest_phone: '',
                device_model: '',
                activity_name: '',
                service_type: 'In-Store',
                location: '',
                scheduled_at: '',
                status: 'Scheduled',
                estimated_total: '',
                notes: ''
            });
            fetchTickets();
        } catch (error) {
            console.error('Error adding ticket:', error.message);
            alert('Failed to add ticket. Make sure database schema is updated.');
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            const { error } = await supabase
                .from('service_tickets')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            fetchTickets();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const deleteTicket = async (id, activityName) => {
        if (!window.confirm(`Are you sure you want to delete the schedule "${activityName}"? This action cannot be undone.`)) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from('service_tickets')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchTickets();
        } catch (error) {
            console.error('Error deleting ticket:', error.message);
            alert('Failed to delete schedule.');
            setLoading(false);
        }
    };

    const handleCheckoutBill = async (ticket) => {
        if (!window.confirm("Proceed to checkout and create an invoice for this service?")) return;
        try {
            setLoading(true);
            const { data: tx, error: txError } = await supabase
                .from('transactions')
                .insert([{
                    type: 'service',
                    service_ticket_id: ticket.id,
                    member_id: ticket.member_id,
                    guest_name: ticket.guest_name,
                    guest_phone: ticket.guest_phone,
                    total_amount: ticket.estimated_total,
                    total: ticket.estimated_total,
                    payment_method: 'cash',
                    status: 'completed'
                }])
                .select()
                .single();

            if (txError) throw txError;

            const itemName = ticket.activity_name + (ticket.device_model ? ` (${ticket.device_model})` : '');
            const { error: itemError } = await supabase
                .from('transaction_items')
                .insert([{
                    transaction_id: tx.id,
                    product_id: ticket.product_id,
                    product_name: itemName,
                    quantity: 1,
                    price: ticket.estimated_total,
                    price_at_sale: ticket.estimated_total
                }]);

            if (itemError) throw itemError;

            await supabase
                .from('service_tickets')
                .update({ status: 'Billed' })
                .eq('id', ticket.id);

            navigate('/invoice', {
                state: {
                    cart: [{ name: itemName, quantity: 1, price: ticket.estimated_total }],
                    total: ticket.estimated_total,
                    customerName: ticket.members?.name || ticket.guest_name || 'Guest',
                    type: ticket.member_id ? 'Member' : 'Guest',
                    date: new Date().toISOString(),
                    paymentMethod: 'cash'
                }
            });
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Failed to checkout ticket.');
            setLoading(false);
        }
    };

    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Scheduled': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'In Progress': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            case 'Ready for Pickup': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'Completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    const filteredTickets = tickets.filter(ticket =>
        (ticket.guest_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket.members?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket.device_model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket.activity_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col relative">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 sticky top-0 z-30">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Service Schedules</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Manage repair tickets and queues</p>
                    </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder="Search tickets..."
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="p-5 flex-1 overflow-y-auto space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <CalendarDays size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No service tickets found.</p>
                        <p className="text-xs mt-1">Click the + button to create a new ticket.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                        {filteredTickets.map(ticket => (
                            <div key={ticket.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <span className={clsx("px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", getStatusColor(ticket.status))}>
                                            {ticket.status}
                                        </span>
                                        <h3 className="font-bold text-slate-900 dark:text-white mt-2 mb-1">{ticket.activity_name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-primary">{formatRupiah(ticket.estimated_total)}</p>
                                        <p className="text-xs text-slate-400 mt-1 flex items-center justify-end gap-1">
                                            <CalendarDays size={12} />
                                            {ticket.scheduled_at
                                                ? new Date(ticket.scheduled_at).toLocaleString('id-ID', {
                                                    day: 'numeric', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })
                                                : 'Unscheduled'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                                    <div>
                                        <p className="font-semibold text-xs text-slate-500 mb-1">Customer</p>
                                        <p>{ticket.members?.name || ticket.guest_name || 'Walk-in Guest'}</p>
                                        {(ticket.members?.phone || ticket.guest_phone) && (
                                            <a
                                                href={(() => {
                                                    let p = ticket.members?.phone || ticket.guest_phone;
                                                    p = p.replace(/\D/g, '');
                                                    if (p.startsWith('0')) p = '62' + p.substring(1);
                                                    return `https://wa.me/${p}`;
                                                })()}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 hover:underline flex items-center gap-1 w-fit text-xs mt-0.5"
                                            >
                                                <MessageCircle size={12} />
                                                {ticket.members?.phone || ticket.guest_phone}
                                            </a>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-xs text-slate-500 mb-1">Device & Location</p>
                                        <p className="flex items-center gap-1"><Laptop size={14} /> {ticket.device_model || 'Unknown'}</p>
                                        <p className="flex items-center gap-1 text-xs mt-0.5"><MapPin size={12} /> {ticket.location || ticket.service_type}</p>
                                    </div>
                                </div>

                                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto">
                                    <button onClick={() => updateStatus(ticket.id, 'Scheduled')} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold whitespace-nowrap">
                                        Schedule
                                    </button>
                                    <button onClick={() => updateStatus(ticket.id, 'In Progress')} className="px-3 py-1.5 bg-orange-100/50 hover:bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 rounded-lg text-xs font-semibold whitespace-nowrap">
                                        In Progress
                                    </button>
                                    <button onClick={() => updateStatus(ticket.id, 'Ready for Pickup')} className="px-3 py-1.5 bg-purple-100/50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg text-xs font-semibold whitespace-nowrap">
                                        Ready
                                    </button>
                                    <button onClick={() => updateStatus(ticket.id, 'Completed')} className="px-3 py-1.5 bg-green-100/50 hover:bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-lg text-xs font-semibold whitespace-nowrap">
                                        Complete
                                    </button>
                                    {ticket.status === 'Completed' && (
                                        <button onClick={() => handleCheckoutBill(ticket)} className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold whitespace-nowrap shadow-md shadow-primary/20 flex items-center gap-1">
                                            <Receipt size={14} /> Checkout & Bill
                                        </button>
                                    )}
                                    <button onClick={() => deleteTicket(ticket.id, ticket.activity_name)} className={clsx("px-2 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg transition-colors", ticket.status !== 'Completed' && "ml-auto")} title="Delete Schedule">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* FAB */}
            <button
                onClick={() => setShowAddModal(true)}
                className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-40 hover:scale-105 transition-transform active:scale-95"
            >
                <Plus size={28} />
            </button>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pb-24 md:pb-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Service Ticket</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={addTicket} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Guest/Customer Name</label>
                                    <input required type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        value={newTicket.guest_name} onChange={e => setNewTicket({ ...newTicket, guest_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Phone</label>
                                    <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        value={newTicket.guest_phone} onChange={e => setNewTicket({ ...newTicket, guest_phone: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Device Model</label>
                                <input required type="text" placeholder="e.g. Lenovo Thinkpad X1, iPhone 13" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                    value={newTicket.device_model} onChange={e => setNewTicket({ ...newTicket, device_model: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Issue / Activity Name</label>
                                <input required type="text" placeholder="e.g. LCD Replacement, Formatting OS" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                    value={newTicket.activity_name} onChange={e => setNewTicket({ ...newTicket, activity_name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Scheduled Date/Time</label>
                                    <input type="datetime-local" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        value={newTicket.scheduled_at} onChange={e => setNewTicket({ ...newTicket, scheduled_at: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Location / Address</label>
                                    <input type="text" placeholder="In-Store or specify address" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        value={newTicket.location} onChange={e => setNewTicket({ ...newTicket, location: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Service Type</label>
                                    <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        value={newTicket.service_type} onChange={e => setNewTicket({ ...newTicket, service_type: e.target.value })}>
                                        <option value="In-Store">In-Store</option>
                                        <option value="On-Site">On-Site / Call out</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Estimated Total (Rp)</label>
                                    <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        value={newTicket.estimated_total} onChange={e => setNewTicket({ ...newTicket, estimated_total: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Notes</label>
                                <textarea rows="3" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                    value={newTicket.notes} onChange={e => setNewTicket({ ...newTicket, notes: e.target.value })}></textarea>
                            </div>

                            <button type="submit" disabled={submitting} className="w-full py-3 mt-4 rounded-xl bg-primary text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                                {submitting ? 'Saving...' : 'Create Ticket'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
