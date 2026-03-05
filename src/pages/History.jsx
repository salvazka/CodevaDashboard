import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calendar, FileText, Download, Printer, ArrowUpRight, Loader2, Eye, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export default function History() {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [printMonth, setPrintMonth] = useState(null);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('transactions')
                .select(`
            *,
            members (name),
            transaction_items (product_name, quantity, price)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    const filteredTransactions = transactions.filter(t =>
        (t.members?.name || t.guest_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePrintAll = () => {
        setPrintMonth('ALL');
        setTimeout(() => {
            window.print();
            setPrintMonth(null);
        }, 100);
    };

    const handlePrintMonth = (month) => {
        setPrintMonth(month);
        setTimeout(() => {
            window.print();
            setPrintMonth(null);
        }, 100);
    };

    // Grouping Logic
    const groupedTransactions = filteredTransactions.reduce((acc, tx) => {
        const date = new Date(tx.created_at);
        const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!acc[monthYear]) {
            acc[monthYear] = [];
        }
        acc[monthYear].push(tx);
        return acc;
    }, {});

    // To ensure they render in correct chronological order we get keys of grouped
    const sortedMonthYears = Object.keys(groupedTransactions).sort((a, b) => {
        return new Date(b) - new Date(a);
    });

    return (
        <div className="h-full flex flex-col relative">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between sticky top-0 z-30 print:hidden">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Transaction History</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">View and manage past sales</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrintAll}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                        <Printer size={16} />
                        Print Report
                    </button>
                </div>
            </header>

            <main className="p-5 flex-1 overflow-y-auto">
                {/* Search & Filter */}
                <div className="flex gap-4 mb-6 print:hidden">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="Search by ID or Customer Name..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Date filter could go here */}
                </div>

                {/* Printable Report Header (Only visible on print) */}
                <div className="hidden print:block text-center mb-8">
                    <h1 className="text-2xl font-bold mb-2">
                        {printMonth === 'ALL' || !printMonth ? 'All Transactions Report' : `Transaction Report - ${printMonth}`}
                    </h1>
                    <p className="text-slate-500">CodevaTech - {new Date().toLocaleDateString()}</p>
                </div>

                {/* Tables Grouped by Month */}
                <div className="space-y-8">
                    {loading ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 flex justify-center border border-slate-200 dark:border-slate-800">
                            <Loader2 className="animate-spin text-primary" size={24} />
                        </div>
                    ) : sortedMonthYears.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center text-slate-500 border border-slate-200 dark:border-slate-800">
                            No transactions found.
                        </div>
                    ) : (
                        sortedMonthYears.map((monthYear, index) => {
                            const [month, year] = monthYear.split(' ');
                            const prevYear = index > 0 ? sortedMonthYears[index - 1].split(' ')[1] : null;
                            const showYearHeader = year !== prevYear;
                            const isVisible = !printMonth || printMonth === 'ALL' || printMonth === monthYear;

                            return (
                                <div key={monthYear} className={!isVisible ? 'hidden' : ''}>
                                    {(!printMonth || printMonth === 'ALL') && showYearHeader && (
                                        <div className={clsx("flex items-center gap-4", index === 0 ? "mb-6" : "mt-12 mb-6")}>
                                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{year}</h2>
                                            <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                        </div>
                                    )}
                                    <div
                                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden break-inside-avoid mb-6"
                                    >
                                        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{month}</h3>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-semibold text-slate-500 bg-white dark:bg-slate-800 px-2 py-1 rounded-md shadow-sm border border-slate-100 dark:border-slate-700">
                                                    {groupedTransactions[monthYear].length} transactions
                                                </span>
                                                <button
                                                    onClick={() => handlePrintMonth(monthYear)}
                                                    className="p-1.5 text-slate-400 hover:text-primary print:hidden transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    title={`Print ${monthYear} Report`}
                                                >
                                                    <Printer size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                                    <tr>
                                                        <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">Date</th>
                                                        <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">Transaction ID</th>
                                                        <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">Customer</th>
                                                        <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">Items</th>
                                                        <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 text-right">Total</th>
                                                        <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 text-right print:hidden">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {groupedTransactions[monthYear].map((tx) => (
                                                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-6 py-4 text-slate-500">
                                                                {new Date(tx.created_at).toLocaleDateString()} <br />
                                                                <span className="text-xs">{new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </td>
                                                            <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                                                {tx.id.substring(0, 8)}...
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                                                    {tx.members?.name || tx.guest_name || 'Guest'}
                                                                    <span className={clsx(
                                                                        "text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider",
                                                                        tx.type === 'service' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                                    )}>
                                                                        {tx.type === 'service' ? 'Service' : 'POS'}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-slate-500 mt-1 flex flex-col gap-1">
                                                                    <span>{tx.members ? 'Member' : 'Guest'}</span>
                                                                    {(tx.members?.phone || tx.guest_phone) && (
                                                                        <a
                                                                            href={(() => {
                                                                                let p = tx.members?.phone || tx.guest_phone;
                                                                                p = p.replace(/\D/g, '');
                                                                                if (p.startsWith('0')) p = '62' + p.substring(1);
                                                                                return `https://wa.me/${p}`;
                                                                            })()}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 hover:underline flex items-center gap-1 w-fit"
                                                                        >
                                                                            <MessageCircle size={12} />
                                                                            {tx.members?.phone || tx.guest_phone}
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-slate-500">
                                                                {tx.transaction_items ? tx.transaction_items.length : 0} items
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                                                {formatRupiah(tx.total)}
                                                            </td>
                                                            <td className="px-6 py-4 text-right print:hidden">
                                                                <button
                                                                    onClick={() => {
                                                                        navigate('/invoice', {
                                                                            state: {
                                                                                cart: tx.transaction_items?.map(i => ({ name: i.product_name, quantity: i.quantity, price: i.price })) || [],
                                                                                total: tx.total,
                                                                                customerName: tx.members?.name || tx.guest_name || 'Guest',
                                                                                type: tx.member_id ? 'Member' : 'Guest',
                                                                                date: tx.created_at,
                                                                                paymentMethod: tx.payment_method || 'cash'
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="inline-flex items-center justify-center p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                                    title="View Invoice"
                                                                >
                                                                    <Eye size={18} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
}
