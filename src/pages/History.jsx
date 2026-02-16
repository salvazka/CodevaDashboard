import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calendar, FileText, Download, Printer, ArrowUpRight, Loader2 } from 'lucide-react';

export default function History() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
            members (name)
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

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="h-full flex flex-col relative">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between sticky top-0 z-30 print:hidden">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Transaction History</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">View and manage past sales</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrint}
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
                    <h1 className="text-2xl font-bold mb-2">Transaction Report</h1>
                    <p className="text-slate-500">CodevaTech - {new Date().toLocaleDateString()}</p>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">Date</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">Transaction ID</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">Customer</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">Items</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center">
                                            <div className="flex justify-center">
                                                <Loader2 className="animate-spin text-primary" size={24} />
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                            No transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 text-slate-500">
                                                {new Date(tx.created_at).toLocaleDateString()} <br />
                                                <span className="text-xs">{new Date(tx.created_at).toLocaleTimeString()}</span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                                {tx.id.substring(0, 8)}...
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 dark:text-white">
                                                    {tx.members?.name || tx.guest_name || 'Guest'}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {tx.members ? 'Member' : 'Guest'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {tx.items ? tx.items.length : 0} items
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                                {formatRupiah(tx.total)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
