import { useState, useEffect, useRef } from 'react';
import {
    Store,
    UserPlus,
    DollarSign,
    TrendingUp,
    Users,
    Bell,
    Loader2,
    Calendar,
    ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Home() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalSales: 0,
        totalExpenses: 0,
        totalMembers: 0,
        totalOrders: 0
    });
    const [loading, setLoading] = useState(true);

    // Notifications State
    const [pendingSchedules, setPendingSchedules] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationsRef = useRef(null);

    useEffect(() => {
        fetchDashboardData();

        // Handle click outside to close notifications
        function handleClickOutside(event) {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Get current month boundaries
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

            // 1. Fetch Total Sales
            const { data: transactions, error: transError } = await supabase
                .from('transactions')
                .select('total, status')
                .gte('created_at', startOfMonth)
                .lte('created_at', endOfMonth);

            if (transError) throw transError;

            // Only sum completed transactions for accurate sales
            const totalSales = transactions
                ?.filter(t => t.status === 'completed')
                .reduce((sum, t) => sum + (Number(t.total) || 0), 0) || 0;
            const totalOrders = transactions?.length || 0;

            // 2. Fetch Total Expenses
            const { data: expenses, error: expenseError } = await supabase
                .from('expenses')
                .select('amount')
                .gte('date', startOfMonth)
                .lte('date', endOfMonth);

            if (expenseError) throw expenseError;

            const totalExpenses = expenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;

            // 3. Fetch Total Members
            let memberCount = 0;
            try {
                const { count, error: memberError } = await supabase
                    .from('members')
                    .select('*', { count: 'exact', head: true });
                if (!memberError) memberCount = count;
            } catch (err) {
                console.error("Members fetch error:", err);
            }

            // 4. Fetch Pending Schedules
            const { data: tickets, error: ticketsError } = await supabase
                .from('service_tickets')
                .select('*')
                .neq('status', 'Completed')
                .order('created_at', { ascending: false });

            if (!ticketsError && tickets) {
                setPendingSchedules(tickets);
            }

            setStats({
                totalSales,
                totalExpenses,
                totalMembers: memberCount || 0,
                totalOrders
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-0.5">
                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Welcome, Admin</h1>
                </div>

                <div className="relative" ref={notificationsRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Bell size={20} />
                        {pendingSchedules.length > 0 && (
                            <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden pt-1 pb-2 z-40 transform origin-top-right transition-all">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    Pending Schedules
                                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 py-0.5 px-2 rounded-full text-xs">
                                        {pendingSchedules.length}
                                    </span>
                                </h3>
                            </div>

                            <div className="max-h-80 overflow-y-auto w-full">
                                {pendingSchedules.length === 0 ? (
                                    <div className="py-8 text-center px-4">
                                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                            <Calendar size={20} />
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">All caught up!</p>
                                        <p className="text-xs text-slate-400 mt-1">No pending service schedules.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/50 w-full flex flex-col">
                                        {pendingSchedules.map(ticket => (
                                            <button
                                                key={ticket.id}
                                                onClick={() => navigate('/schedules')}
                                                className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3 group"
                                            >
                                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${ticket.status === 'Ready for Pickup' ? 'bg-purple-500' :
                                                        ticket.status === 'In Progress' ? 'bg-orange-500' :
                                                            'bg-slate-400'
                                                    }`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                                        {ticket.activity_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                        {ticket.device_model || ticket.service_type}
                                                    </p>
                                                    <p className="text-xs font-medium text-primary mt-1.5 flex items-center justify-between">
                                                        {ticket.status}
                                                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity -ml-2" />
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {pendingSchedules.length > 0 && (
                                <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={() => navigate('/schedules')}
                                        className="w-full py-1.5 text-xs font-semibold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors text-center"
                                    >
                                        View all schedules
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <main className="p-5 space-y-6 flex-1 overflow-y-auto">
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <Link to="/pos" className="bg-primary text-white p-4 rounded-2xl shadow-lg shadow-primary/20 flex flex-col items-start justify-between h-28 relative overflow-hidden group transition-transform active:scale-95">
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform"></div>
                        <Store size={28} className="mb-2" />
                        <span className="font-semibold text-sm">Open POS</span>
                    </Link>
                    <Link to="/members" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-start justify-between h-28 group hover:border-primary/50 transition-colors active:scale-95">
                        <UserPlus size={28} className="mb-2 text-secondary" />
                        <span className="font-semibold text-sm">Add Member</span>
                    </Link>
                </div>

                {/* Dashboard Summary */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="font-bold text-lg text-slate-800 dark:text-white">
                            Overview ({new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })})
                        </h2>
                        <button onClick={fetchDashboardData} className="text-xs text-primary font-medium hover:underline">
                            Refresh Data
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-10 flex justify-center">
                            <Loader2 className="animate-spin text-primary" size={32} />
                        </div>
                    ) : (
                        <>
                            {/* Total Sales */}
                            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                        <DollarSign size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Sales</p>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatRupiah(stats.totalSales)}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Total Expenses */}
                            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                                        <TrendingUp size={24} className="rotate-180" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Expenses</p>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatRupiah(stats.totalExpenses)}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Net Profit */}
                            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between col-span-2 sm:col-span-1">
                                <div className="flex items-center space-x-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${(stats.totalSales - stats.totalExpenses) >= 0
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                        }`}>
                                        <DollarSign size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Net Profit</p>
                                        <h3 className={`text-2xl font-bold ${(stats.totalSales - stats.totalExpenses) >= 0
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-orange-600 dark:text-orange-400'
                                            }`}>
                                            {formatRupiah(stats.totalSales - stats.totalExpenses)}
                                        </h3>
                                    </div>
                                </div>
                            </div>

                            {/* Total Members */}
                            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Members</p>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalMembers}</h3>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
