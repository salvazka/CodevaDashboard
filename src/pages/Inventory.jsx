import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Filter, Package, AlertTriangle, Cpu, Zap, Cable, Loader2, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export default function Inventory() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [newStock, setNewStock] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching inventory:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStock = (item) => {
        setEditingItem(item);
        setNewStock(item.stock?.toString() || '0');
    };

    const saveStock = async (e) => {
        e.preventDefault();
        if (!editingItem) return;

        try {
            setUpdating(true);
            const { error } = await supabase
                .from('products')
                .update({ stock: parseInt(newStock) })
                .eq('id', editingItem.id);

            if (error) throw error;

            // Update local state
            setItems(items.map(i => i.id === editingItem.id ? { ...i, stock: parseInt(newStock) } : i));
            setEditingItem(null);
        } catch (error) {
            console.error('Error updating stock:', error.message);
            alert('Failed to update stock: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const deleteItem = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;

        try {
            setLoading(true);
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setItems(items.filter(item => item.id !== id));
            alert('Product deleted successfully');
        } catch (error) {
            console.error('Error deleting product:', error.message);
            alert('Failed to delete product: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getIconForCategory = (category) => {
        const cat = category.toLowerCase();
        if (cat.includes('service')) return Package;
        if (cat.includes('storage')) return AlertTriangle;
        if (cat.includes('memory')) return Cpu;
        if (cat.includes('power')) return Zap;
        if (cat.includes('cable') || cat.includes('access')) return Cable;
        return Package;
    };

    const [newItem, setNewItem] = useState({ name: '', sku: '', category: 'Product', price: '', stock: '' });
    const [isAdding, setIsAdding] = useState(false);

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            setUpdating(true);
            const { data, error } = await supabase
                .from('products')
                .insert([{
                    name: newItem.name,
                    sku: newItem.sku,
                    category: newItem.category,
                    price: parseFloat(newItem.price.toString().replace(/\D/g, '')) || 0,
                    stock: parseInt(newItem.stock) || 0,
                    status: 'active'
                }])
                .select()
                .single();

            if (error) throw error;

            setItems([...items, data]);
            setIsAdding(false);
            setNewItem({ name: '', sku: '', category: 'Product', price: '', stock: '' });
            alert('Product added successfully!');
        } catch (error) {
            console.error('Error adding product:', error.message);
            alert('Failed to add product: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const handlePriceChange = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val) {
            val = parseInt(val).toLocaleString('id-ID');
        }
        setNewItem({ ...newItem, price: val });
    };

    return (
        <div className="h-full flex flex-col relative">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-0.5">Inventory Management</p>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Stock Control</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <Filter size={20} />
                    </button>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="p-2 rounded-full bg-primary text-white hover:bg-blue-700 transition-colors shadow-lg shadow-primary/30"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </header>

            <main className="p-5 space-y-6 flex-1 overflow-y-auto">
                {/* Search Bar */}
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Search size={20} />
                    </span>
                    <input
                        className="block w-full pl-10 pr-3 py-3 rounded-2xl border-none bg-white dark:bg-slate-900 shadow-sm focus:ring-2 focus:ring-primary text-sm placeholder-slate-400 dark:text-white dark:placeholder-slate-500 transition-shadow"
                        placeholder="Search parts, ID, or category..."
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-3">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-500 mb-1">Total Items</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{items.reduce((acc, item) => acc + (item.stock || 0), 0).toLocaleString()}</h3>
                    </div>
                </div>

                {/* Inventory List */}
                <section className="space-y-4">
                    <h2 className="font-bold text-lg text-slate-800 dark:text-white px-1">Inventory List</h2>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="animate-spin text-primary" size={32} />
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 bg-white dark:bg-slate-900 rounded-2xl">
                            <Package size={48} className="mx-auto text-slate-300 mb-3" />
                            <p>No inventory items found.</p>
                            <p className="text-xs text-slate-400 mt-1">Add items to the 'products' table in Supabase.</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredItems.map((item) => {
                                const Icon = getIconForCategory(item.category);
                                return (
                                    <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <div className="flex items-start space-x-3">
                                            <div className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0 border bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500">
                                                <Icon size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{item.name}</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">Category: {item.category} • SKU: {item.sku || 'N/A'}</p>
                                                <div className="mt-1 inline-flex items-center">
                                                    <span className="w-2 h-2 rounded-full mr-1.5 bg-success"></span>
                                                    <span className="text-xs font-medium text-success">
                                                        In Stock
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                            <div className="text-right mr-2">
                                                <p className="text-lg font-bold text-slate-900 dark:text-white">
                                                    {item.stock !== null ? item.stock : '-'}
                                                </p>
                                                <p className="text-[10px] uppercase font-medium text-slate-400">Units</p>
                                            </div>
                                            <button
                                                onClick={() => handleUpdateStock(item)}
                                                className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-sm bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                            >
                                                Update Stock
                                            </button>
                                            <button
                                                onClick={() => deleteItem(item.id, item.name)}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            {/* Add Product Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add New Product</h2>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Product Name</label>
                                <input
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                                    placeholder="e.g. iPhone 13 Screen"
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Price (Rp)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                                    placeholder="0"
                                    value={newItem.price}
                                    onChange={handlePriceChange}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">SKU / ID</label>
                                    <input
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                                        placeholder="e.g. LCD-IP13"
                                        value={newItem.sku}
                                        onChange={e => setNewItem({ ...newItem, sku: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                                        value={newItem.category}
                                        onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                    >
                                        <option value="Product">Product</option>
                                        <option value="Service">Service</option>
                                        <option value="Part">Part</option>
                                        <option value="Accessory">Accessory</option>
                                        <option value="Thermal Paste/Putty/Pad/Liquid">Thermal Paste/Putty/Pad/Liquid</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Stock</label>
                                    <input
                                        required
                                        type="number"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                                        placeholder="0"
                                        value={newItem.stock}
                                        onChange={e => setNewItem({ ...newItem, stock: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {updating ? 'Adding...' : 'Add Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Stock Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xs p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Update Stock</h2>
                        <p className="text-xs text-slate-500 mb-4">Adjusting stock for: <span className="font-semibold">{editingItem.name}</span></p>
                        <form onSubmit={saveStock} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">New Quantity</label>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setNewStock(String(Math.max(0, parseInt(newStock) - 1)))} className="p-2 bg-slate-100 rounded-lg">-</button>
                                    <input
                                        autoFocus
                                        required
                                        type="number"
                                        className="flex-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
                                        value={newStock}
                                        onChange={e => setNewStock(e.target.value)}
                                    />
                                    <button type="button" onClick={() => setNewStock(String(parseInt(newStock) + 1))} className="p-2 bg-slate-100 rounded-lg">+</button>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {updating ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
