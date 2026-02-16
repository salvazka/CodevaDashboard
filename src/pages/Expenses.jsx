import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Trash2, Calendar, FileText, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Expenses() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: 'operasional', // 'operasional' | 'stock_purchase'
        date: new Date().toISOString().split('T')[0],
        productId: '',
        quantity: ''
    });

    const [products, setProducts] = useState([]); // For stock purchase
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchExpenses();
        fetchProducts();
    }, []);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select(`
                    *,
                    products (name)
                `)
                .order('date', { ascending: false });

            if (error) throw error;
            setExpenses(data || []);
        } catch (error) {
            console.error("Error fetching expenses:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, price')
                .order('name');

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this expense record?")) return;

        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchExpenses();
        } catch (error) {
            alert("Error deleting expense: " + error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // 1. Prepare Expense Data
            const expenseData = {
                description: formData.description,
                amount: parseFloat(formData.amount),
                category: formData.category,
                date: formData.date || new Date(),
                product_id: formData.category === 'stock_purchase' ? formData.productId : null,
                quantity: formData.category === 'stock_purchase' ? parseInt(formData.quantity) : null
            };

            // 2. Insert Expense
            const { error: expenseError } = await supabase
                .from('expenses')
                .insert([expenseData]);

            if (expenseError) throw expenseError;

            // 3. Update Inventory if Stock Purchase
            if (formData.category === 'stock_purchase') {
                // Get current stock first to increment safely
                const { data: productData, error: productFetchError } = await supabase
                    .from('products')
                    .select('stock')
                    .eq('id', formData.productId)
                    .single();

                if (productFetchError) throw productFetchError;

                const newStock = (productData.stock || 0) + parseInt(formData.quantity);

                const { error: stockError } = await supabase
                    .from('products')
                    .update({ stock: newStock })
                    .eq('id', formData.productId);

                if (stockError) throw stockError;
            }

            alert("Expense saved successfully!");
            setIsAddModalOpen(false);
            setFormData({
                description: '',
                amount: '',
                category: 'operasional',
                date: new Date().toISOString().split('T')[0],
                productId: '',
                quantity: ''
            });
            fetchExpenses();

        } catch (error) {
            console.error("Error saving expense:", error);
            alert("Failed to save expense: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    const filteredExpenses = expenses.filter(expense =>
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalExpense = filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Expenses</h1>
                    <p className="text-sm text-slate-500">Track spending & stock purchases</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-primary text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm shadow-primary/30"
                >
                    <Plus size={18} />
                    <span>Add Expense</span>
                </button>
            </header>

            {/* Content */}
            <main className="flex-1 p-6 overflow-hidden flex flex-col">
                {/* Filters & Stats */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search expenses..."
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl border border-red-100 dark:border-red-900/30">
                        <span className="text-xs text-red-500 font-medium uppercase tracking-wider">Total Expenses</span>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                            {formatRupiah(totalExpense)}
                        </p>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1 flex flex-col">
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading expenses...</td>
                                    </tr>
                                ) : filteredExpenses.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No expenses found.</td>
                                    </tr>
                                ) : (
                                    filteredExpenses.map((expense) => (
                                        <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                                                {new Date(expense.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                                                <div className="font-medium">{expense.description}</div>
                                                {expense.category === 'stock_purchase' && expense.products && (
                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                        Product: {expense.products.name} (Qty: {expense.quantity})
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${expense.category === 'stock_purchase'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                                    }`}>
                                                    {expense.category === 'stock_purchase' ? 'Stock Purchase' : 'Operational'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white text-right">
                                                {formatRupiah(expense.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleDelete(expense.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Add Expense Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Expense</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${formData.category === 'operasional'
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                            }`}
                                        onClick={() => setFormData({ ...formData, category: 'operasional', productId: '', quantity: '' })}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <FileText size={16} />
                                            Operational
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all ${formData.category === 'stock_purchase'
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                            }`}
                                        onClick={() => setFormData({ ...formData, category: 'stock_purchase' })}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <Package size={16} />
                                            Stock Purchase
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="date"
                                        required
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/50"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Stock Purchase Specific Fields */}
                            {formData.category === 'stock_purchase' && (
                                <div className="space-y-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Product</label>
                                        <select
                                            required
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/50"
                                            value={formData.productId}
                                            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                                        >
                                            <option value="">Select Product...</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Quantity (Stock to Add)</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/50"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                            placeholder="e.g. 10"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                                <input
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                                    placeholder="e.g. Electricity Bill or Restock Intel i5"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Total Amount (Rp)</label>
                                <input
                                    type="number"
                                    required
                                    min="0.01"
                                    step="0.01"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                                    placeholder="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
