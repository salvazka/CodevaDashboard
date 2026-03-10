import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Clock, Loader2, CalendarDays, Laptop, MapPin, CheckCircle2, X, Receipt, MessageCircle, Trash2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const REPASTA_TEMPLATES = [
    { brand: 'Maxtor CTG8', packages: { 'Starter': 150000, 'The Next': 190000, 'Performance': 220000 } },
    { brand: 'Maxtor CTG10', packages: { 'Starter': 250000, 'The Next': 280000, 'Performance': 300000 } },
    { brand: 'Arctic MX-4', packages: { 'Starter': 180000, 'The Next': 230000, 'Performance': 280000 } },
    { brand: 'Arctic MX-6', packages: { 'Starter': 200000, 'The Next': 250000, 'Performance': 300000 } },
    { brand: 'Arctic MX-7', packages: { 'Starter': 220000, 'The Next': 270000, 'Performance': 320000 } },
    { brand: 'Grizzly Duronout', packages: { 'Starter': 225000, 'The Next': 275000, 'Performance': 325000 } },
    { brand: 'Grizzly Kryonaut', packages: { 'Starter': 300000, 'The Next': 350000, 'Performance': 400000 } },
    { brand: 'Thermalright TF-8', packages: { 'Starter': 270000, 'The Next': 330000, 'Performance': 380000 } },
    { brand: 'Thermalright TFX', packages: { 'Starter': 350000, 'The Next': 400000, 'Performance': 450000 } },
    { brand: 'Noctua HT-01', packages: { 'Starter': 230000, 'The Next': 280000, 'Performance': 335000 } },
    { brand: 'Noctua HT-02', packages: { 'Starter': 260000, 'The Next': 310000, 'Performance': 360000 } },
    { brand: 'Helios V2', packages: { 'Starter': 300000, 'The Next': 350000, 'Performance': 400000 } },
    { brand: 'Honeywell 7950', packages: { 'Starter': 320000, 'The Next': 370000, 'Performance': 420000 } }
];

export default function Schedules() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showRepastaModal, setShowRepastaModal] = useState(false);
    const [showFabMenu, setShowFabMenu] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTicketId, setEditTicketId] = useState(null);

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
        notes: '',
        technician_name: ''
    });
    const [repastaBrand, setRepastaBrand] = useState('');
    const [repastaPkg, setRepastaPkg] = useState('');

    const handleApplyRepastaTemplate = (brand, pkg) => {
        setRepastaBrand(brand);
        setRepastaPkg(pkg);

        if (brand && pkg) {
            const template = REPASTA_TEMPLATES.find(t => t.brand === brand);
            if (template && template.packages[pkg]) {
                const price = template.packages[pkg];
                setNewTicket(prev => ({
                    ...prev,
                    activity_name: `Cleaning & Repasta ${brand} (${pkg})`,
                    estimated_total: price.toLocaleString('id-ID')
                }));
            }
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const openEditModal = (ticket) => {
        let scDateTime = '';
        if (ticket.scheduled_at) {
            const d = new Date(ticket.scheduled_at);
            const offset = d.getTimezoneOffset() * 60000;
            const localIso = (new Date(d.getTime() - offset)).toISOString();
            scDateTime = localIso.slice(0, 16);
        }

        setNewTicket({
            guest_name: ticket.guest_name || '',
            guest_phone: ticket.guest_phone || '',
            device_model: ticket.device_model || '',
            activity_name: ticket.activity_name || '',
            service_type: ticket.service_type || 'In-Store',
            location: ticket.location || '',
            scheduled_at: scDateTime,
            status: ticket.status || 'Scheduled',
            estimated_total: ticket.estimated_total ? ticket.estimated_total.toLocaleString('id-ID') : '',
            notes: ticket.notes || '',
            technician_name: ticket.technician_name || ''
        });
        setEditTicketId(ticket.id);
        setIsEditing(true);
        setShowAddModal(true);
        setShowFabMenu(false);
    };

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
            let formattedDate = null;
            if (newTicket.scheduled_at) {
                const d = new Date(newTicket.scheduled_at);
                formattedDate = d.toISOString();
            }

            const payload = {
                guest_name: newTicket.guest_name,
                guest_phone: newTicket.guest_phone,
                device_model: newTicket.device_model,
                activity_name: newTicket.activity_name,
                service_type: newTicket.service_type,
                location: newTicket.location,
                status: newTicket.status,
                notes: newTicket.notes,
                technician_name: newTicket.technician_name,
                scheduled_at: formattedDate,
                estimated_total: newTicket.estimated_total ? parseFloat(newTicket.estimated_total.toString().replace(/\D/g, '')) : 0
            };

            if (isEditing) {
                const { error } = await supabase
                    .from('service_tickets')
                    .update(payload)
                    .eq('id', editTicketId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('service_tickets')
                    .insert([payload]);
                if (error) throw error;
            }

            setShowAddModal(false);
            setShowRepastaModal(false);
            setIsEditing(false);
            setEditTicketId(null);
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
                notes: '',
                technician_name: ''
            });
            setRepastaBrand('');
            setRepastaPkg('');
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

        const feeStr = window.prompt("Masukkan Potongan Fee Teknisi (Angka saja, kosongkan jika tidak ada):", "0");
        if (feeStr === null) return; // Cancelled

        const feeValue = parseFloat(feeStr.replace(/\D/g, '')) || 0;

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
                    technician_fee: feeValue,
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

            alert(`Pembayaran Sukses!\n\nHarga Total: Rp ${ticket.estimated_total.toLocaleString('id-ID')}\nFee Teknisi: Rp ${feeValue.toLocaleString('id-ID')}\nNet Masuk Kas: Rp ${(ticket.estimated_total - feeValue).toLocaleString('id-ID')}`);

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

    const handlePriceChange = (e, field) => {
        let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
        if (val) {
            val = parseInt(val).toLocaleString('id-ID'); // Format with dots
        }
        setNewTicket({ ...newTicket, [field]: val });
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
                                                    hour: '2-digit', minute: '2-digit', hour12: false
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
                                        <div className="flex items-center gap-1 text-xs mt-0.5">
                                            <MapPin size={12} />
                                            {ticket.location ? (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ticket.location)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                    title="Open in Google Maps"
                                                >
                                                    {ticket.location}
                                                </a>
                                            ) : (
                                                ticket.service_type
                                            )}
                                        </div>
                                        {ticket.technician_name && (
                                            <p className="mt-1 text-xs text-slate-500 font-semibold bg-slate-200/50 dark:bg-slate-700/50 w-fit px-1.5 py-0.5 rounded-md">
                                                PIC: {ticket.technician_name}
                                            </p>
                                        )}
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
                                    <div className={clsx("flex gap-2", ticket.status !== 'Completed' && "ml-auto")}>
                                        <button onClick={() => openEditModal(ticket)} className="px-2 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Edit Schedule">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => deleteTicket(ticket.id, ticket.activity_name)} className="px-2 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg transition-colors" title="Delete Schedule">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* FAB Menu */}
            {showFabMenu && (
                <div className="fixed bottom-40 right-5 flex flex-col gap-3 z-40 items-end">
                    <button
                        onClick={() => {
                            setShowRepastaModal(true);
                            setShowFabMenu(false);
                        }}
                        className="bg-white dark:bg-slate-800 text-slate-700 dark:text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                        📋 Quick Template Repasta
                    </button>
                    <button
                        onClick={() => {
                            setShowAddModal(true);
                            setShowFabMenu(false);
                        }}
                        className="bg-white dark:bg-slate-800 text-slate-700 dark:text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                        ➕ New Service Ticket
                    </button>
                </div>
            )}

            {/* FAB */}
            <button
                onClick={() => setShowFabMenu(!showFabMenu)}
                className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-40 hover:scale-105 transition-transform active:scale-95"
            >
                <Plus size={28} className={clsx("transition-transform duration-200", showFabMenu ? "rotate-45" : "rotate-0")} />
            </button>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pb-24 md:pb-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                {isEditing ? 'Edit Service Ticket' : 'New Service Ticket'}
                            </h2>
                            <button onClick={() => { setShowAddModal(false); setIsEditing(false); }} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={addTicket} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Guest/Customer Name</label>
                                    <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
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
                                    <div className="relative">
                                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                                        <input
                                            type="datetime-local"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                                            value={newTicket.scheduled_at}
                                            onChange={e => setNewTicket({ ...newTicket, scheduled_at: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Location / Address</label>
                                    <input type="text" placeholder="In-Store or specify address" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        value={newTicket.location} onChange={e => setNewTicket({ ...newTicket, location: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">PIC / Handled By</label>
                                    <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        value={newTicket.technician_name} onChange={e => setNewTicket({ ...newTicket, technician_name: e.target.value })}>
                                        <option value="">-- Select Technician --</option>
                                        <option value="Vian">Vian</option>
                                        <option value="Sandy">Sandy</option>
                                        <option value="Bang aby">Bang aby</option>
                                        <option value="Om tony">Om tony</option>
                                        <option value="Ferdy">Ferdy</option>
                                        <option value="Zacky">Zacky</option>
                                    </select>
                                </div>
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
                                    <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        value={newTicket.estimated_total} onChange={e => handlePriceChange(e, 'estimated_total')} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Notes</label>
                                <textarea rows="3" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                    value={newTicket.notes} onChange={e => setNewTicket({ ...newTicket, notes: e.target.value })}></textarea>
                            </div>

                            <button type="submit" disabled={submitting} className="w-full py-3 mt-4 rounded-xl bg-primary text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                                {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Ticket'}
                            </button>
                        </form>
                    </div>
                </div >
            )
            }

            {/* Repasta Modal */}
            {
                showRepastaModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pb-24 md:pb-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Template Repasta</h2>
                                <button onClick={() => { setShowRepastaModal(false); setIsEditing(false); }} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={addTicket} className="space-y-4">
                                {/* Repasta Templates Section */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 mt-2 mb-2">
                                    <label className="block text-xs font-bold text-slate-400 mb-2 tracking-wider uppercase">📋 Select Repasta Template</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            required
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs focus:ring-2 focus:ring-primary"
                                            value={repastaBrand}
                                            onChange={(e) => handleApplyRepastaTemplate(e.target.value, repastaPkg)}
                                        >
                                            <option value="">-- Brand Pasta --</option>
                                            {REPASTA_TEMPLATES.map(t => (
                                                <option key={t.brand} value={t.brand}>{t.brand}</option>
                                            ))}
                                        </select>
                                        <select
                                            required
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs focus:ring-2 focus:ring-primary"
                                            value={repastaPkg}
                                            onChange={(e) => handleApplyRepastaTemplate(repastaBrand, e.target.value)}
                                        >
                                            <option value="">-- Package --</option>
                                            <option value="Starter">Starter</option>
                                            <option value="The Next">The Next</option>
                                            <option value="Performance">Performance</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Guest/Customer Name</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
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
                                    <input required type="text" placeholder="e.g. Cleaning & Repasta Maxtor CTG8 (Starter)" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold"
                                        value={newTicket.activity_name} onChange={e => setNewTicket({ ...newTicket, activity_name: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Scheduled Date/Time</label>
                                        <div className="relative">
                                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="datetime-local"
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                                                value={newTicket.scheduled_at}
                                                onChange={e => setNewTicket({ ...newTicket, scheduled_at: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Location / Address</label>
                                        <input type="text" placeholder="In-Store or specify address" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                            value={newTicket.location} onChange={e => setNewTicket({ ...newTicket, location: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">PIC / Handled By</label>
                                        <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                            value={newTicket.technician_name} onChange={e => setNewTicket({ ...newTicket, technician_name: e.target.value })}>
                                            <option value="">-- Select Technician --</option>
                                            <option value="Vian">Vian</option>
                                            <option value="Sandy">Sandy</option>
                                            <option value="Bang aby">Bang aby</option>
                                            <option value="Om tony">Om tony</option>
                                            <option value="Ferdy">Ferdy</option>
                                            <option value="Zacky">Zacky</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Service Type</label>
                                        <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                            value={newTicket.service_type} onChange={e => setNewTicket({ ...newTicket, service_type: e.target.value })}>
                                            <option value="In-Store">In-Store</option>
                                            <option value="On-Site">On-Site / Call out</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Estimated Total (Rp)</label>
                                        <input type="text" className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold"
                                            value={newTicket.estimated_total} onChange={e => handlePriceChange(e, 'estimated_total')} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Notes</label>
                                    <textarea rows="3" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        value={newTicket.notes} onChange={e => setNewTicket({ ...newTicket, notes: e.target.value })}></textarea>
                                </div>

                                <button type="submit" disabled={submitting || !repastaBrand || !repastaPkg} className="w-full py-3 mt-4 rounded-xl bg-primary text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                                    {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Record'}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
