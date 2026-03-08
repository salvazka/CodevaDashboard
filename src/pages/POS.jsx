import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
    Search, ArrowLeft, MoreVertical, Plus, MinusCircle, ArrowRight,
    LayoutDashboard, CreditCard, Package, Users, Settings as SettingsIcon,
    ShoppingCart, Trash2, User, Loader2, X, Check, Clock, CheckCircle2, List
} from 'lucide-react';
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

export default function POS() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [members, setMembers] = useState([]);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState([]);
    const [memberMode, setMemberMode] = useState('guest');
    const [manualName, setManualName] = useState('');
    const [manualPrice, setManualPrice] = useState('');
    const [guestName, setGuestName] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);
    const [transactionStatus, setTransactionStatus] = useState('completed');
    const [viewMode, setViewMode] = useState('new'); // 'new' or 'pending'
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'transfer'
    const [technicianFee, setTechnicianFee] = useState('');
    const [repastaBrand, setRepastaBrand] = useState('');
    const [repastaPkg, setRepastaPkg] = useState('');

    useEffect(() => {
        fetchProducts();
        fetchMembers();
        fetchPendingTransactions();
    }, []);

    const fetchMembers = async () => {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('name');
        if (!error) setMembers(data || []);
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('status', 'active')
                .order('name');

            if (error) {
                const { data: allData, error: allError } = await supabase.from('products').select('*').order('name');
                if (allError) throw allError;
                setProducts(allData || []);
            } else {
                setProducts(data || []);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingTransactions = async () => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select(`
          *,
          members (name, phone),
          transaction_items (product_name, quantity, price)
        `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPendingTransactions(data || []);
        } catch (error) {
            console.error('Error fetching pending transactions:', error);
        }
    };

    const updateTransactionStatus = async (transactionId, newStatus) => {
        try {
            // 1. Fetch transaction details first to pass to invoice
            const { data: transaction, error: fetchError } = await supabase
                .from('transactions')
                .select('*, members(name), transaction_items(product_name, quantity, price)')
                .eq('id', transactionId)
                .single();

            if (fetchError) throw fetchError;

            // 2. Update status
            const { error } = await supabase
                .from('transactions')
                .update({ status: newStatus })
                .eq('id', transactionId);

            if (error) throw error;

            // 3. Refresh pending transactions
            await fetchPendingTransactions();

            // 4. Navigate to invoice if completed
            if (newStatus === 'completed') {
                navigate('/invoice', {
                    state: {
                        cart: transaction.transaction_items?.map(i => ({ name: i.product_name, quantity: i.quantity, price: i.price })) || [],
                        total: transaction.total,
                        customerName: transaction.members?.name || transaction.guest_name || 'Guest',
                        type: transaction.member_id ? 'Member' : 'Guest',
                        date: new Date().toISOString(),
                        paymentMethod: transaction.payment_method || 'cash' // Default to cash if not set
                    }
                });
            } else {
                alert(`Transaction updated to ${newStatus}!`);
            }

        } catch (error) {
            console.error('Error updating transaction:', error);
            alert('Failed to update transaction status');
        }
    };

    const deleteTransaction = async (transactionId) => {
        if (!window.confirm("Are you sure you want to cancel and delete this pending transaction?")) return;

        try {
            // Delete transaction items first (if not cascading) - Supabase usually cascades if set up, 
            // but safe to delete parent if cascade is on. Assuming cascade is on or we delete parent.
            // Actually, let's try deleting the transaction directly.
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', transactionId);

            if (error) throw error;

            await fetchPendingTransactions();
            alert("Transaction cancelled/deleted successfully.");
        } catch (error) {
            console.error("Error deleting transaction:", error);
            alert("Failed to delete transaction: " + error.message);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        m.phone.includes(memberSearchTerm)
    );

    const handleSelectMember = (member) => {
        setSelectedMember(member);
        setMemberSearchTerm('');
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id && !item.isManual);
            if (existing) {
                return prev.map(item =>
                    (item.id === product.id && !item.isManual)
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1, isManual: false }];
        });
    };

    const addManualItem = () => {
        if (!manualName || !manualPrice) return;
        const newItem = {
            id: `manual-${Date.now()}`,
            name: manualName,
            price: parseFloat(manualPrice.toString().replace(/\D/g, '')),
            quantity: 1,
            isManual: true
        };
        setCart(prev => [...prev, newItem]);
        setManualName('');
        setManualPrice('');
    };

    const addRepastaItem = () => {
        if (!repastaBrand || !repastaPkg) return;
        const brandData = REPASTA_TEMPLATES.find(t => t.brand === repastaBrand);
        if (brandData && brandData.packages[repastaPkg]) {
            const newItem = {
                id: `repasta-${Date.now()}`,
                name: `Cleaning & Repasta ${repastaBrand} - ${repastaPkg} Package`,
                price: brandData.packages[repastaPkg],
                quantity: 1,
                isManual: true
            };
            setCart(prev => [...prev, newItem]);
            setRepastaBrand('');
            setRepastaPkg('');
        }
    };

    const removeFromCart = (itemId) => {
        setCart(prev => prev.filter(item => item.id !== itemId));
    };

    const updateQuantity = (itemId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === itemId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const handleBack = () => {
        if (viewMode === 'pending') {
            setViewMode('new');
        } else {
            navigate(-1); // Go back to previous page (Home)
        }
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);

        try {
            const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const customerName = memberMode === 'member' && selectedMember ? selectedMember.name : (guestName || 'Guest');
            const memberId = memberMode === 'member' && selectedMember ? selectedMember.id : null;
            const feeValue = technicianFee ? parseFloat(technicianFee.toString().replace(/\D/g, '')) : 0;

            // 1. Create Transaction
            const { data: transactionData, error: transError } = await supabase
                .from('transactions')
                .insert([{
                    member_id: memberId,
                    total: totalAmount,
                    technician_fee: feeValue,
                    payment_method: paymentMethod,
                    guest_name: memberId ? null : customerName,
                    status: transactionStatus
                }])
                .select()
                .single();

            if (transError) {
                console.error("Transaction Insert Error:", transError);
                throw new Error(`Failed to create transaction: ${transError.message}`);
            }

            const transactionId = transactionData.id;
            const transaction = transactionData; // Alias for consistency

            // 2. Create Transaction Items
            const transactionItems = cart.map(item => ({
                transaction_id: transactionId,
                product_id: item.isManual ? null : item.id,
                product_name: item.name,
                quantity: item.quantity,
                price: item.price
            }));

            const { error: itemsError } = await supabase
                .from('transaction_items')
                .insert(transactionItems);

            if (itemsError) {
                console.error("Items Insert Error:", itemsError);
            }

            // 3. Update Product Stock (Decrease) - only if completed
            if (transactionStatus === 'completed') {
                for (const item of cart) {
                    if (!item.isManual && item.id) {
                        const { data: product } = await supabase.from('products').select('stock').eq('id', item.id).single();
                        if (product && product.stock !== null) {
                            await supabase
                                .from('products')
                                .update({ stock: Math.max(0, product.stock - item.quantity) })
                                .eq('id', item.id);
                        }
                    }
                }

                // 4. Update Member Points (1-6 Cycle) - only if completed
                if (memberId) {
                    const { data: member } = await supabase.from('members').select('points').eq('id', memberId).single();
                    if (member) {
                        let currentPoints = member.points || 0;
                        let newPoints = 0;

                        if (currentPoints < 6) {
                            newPoints = currentPoints + 1;
                        } else {
                            newPoints = 0;
                        }

                        const { error: pointError } = await supabase
                            .from('members')
                            .update({ points: newPoints })
                            .eq('id', memberId);

                        if (pointError) console.error("Point Update Error:", pointError);
                    }
                }
            }

            // Clear cart and reset
            setCart([]);
            setSelectedMember(null);
            setGuestName('');
            setTransactionStatus('completed');
            setTechnicianFee('');

            // Refresh pending transactions if needed
            if (transactionStatus === 'pending') {
                await fetchPendingTransactions();
            }

            // alert(`Transaction ${transactionStatus === 'pending' ? 'saved as pending' : 'completed'} successfully!`);

            // Navigate to Invoice if completed
            if (transactionStatus === 'completed') {
                alert(`Pembayaran Sukses!\n\nHarga Total: Rp ${totalAmount.toLocaleString('id-ID')}\nFee Teknisi: Rp ${feeValue.toLocaleString('id-ID')}\nNet Masuk Kas: Rp ${(totalAmount - feeValue).toLocaleString('id-ID')}`);

                navigate('/invoice', {
                    state: {
                        cart: cart,
                        total: totalAmount,
                        customerName: customerName,
                        type: memberId ? 'Member' : 'Guest',
                        date: new Date().toISOString(),
                        paymentMethod: paymentMethod
                    }
                });
            } else {
                alert('Transaction saved as pending!');
            }

        } catch (error) {
            console.error("Checkout Error:", error);
            alert("Transaction failed! " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleManualPriceChange = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val) {
            val = parseInt(val).toLocaleString('id-ID');
        }
        setManualPrice(val);
    };

    const handleApplyRepastaTemplate = (brand, pkg) => {
        setRepastaBrand(brand);
        setRepastaPkg(pkg);
    };

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const total = subtotal;

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                        {viewMode === 'new' ? 'New Transaction' : 'Pending Transactions'}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode(viewMode === 'new' ? 'pending' : 'new')}
                        className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        {viewMode === 'new' ? (
                            <>
                                <List size={18} />
                                <span>View Pending ({pendingTransactions.length})</span>
                            </>
                        ) : (
                            <>
                                <Plus size={18} />
                                <span>New Transaction</span>
                            </>
                        )}
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {viewMode === 'new' ? (
                    <>
                        {/* LEFT PANEL: Product Selection */}
                        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <div className="p-5 pb-0">
                                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex mb-4">
                                    <button
                                        onClick={() => { setMemberMode('member'); setSelectedMember(null); }}
                                        className={clsx(
                                            "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all",
                                            memberMode === 'member'
                                                ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white ring-1 ring-black/5"
                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                        )}
                                    >
                                        Member
                                    </button>
                                    <button
                                        onClick={() => setMemberMode('guest')}
                                        className={clsx(
                                            "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                                            memberMode === 'guest'
                                                ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white ring-1 ring-black/5"
                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                        )}
                                    >
                                        Guest
                                    </button>
                                </div>

                                {memberMode === 'member' && (
                                    <div className="mb-4">
                                        {selectedMember ? (
                                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3 flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200 flex items-center justify-center font-bold">
                                                        {selectedMember.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedMember.name}</p>
                                                        <p className="text-xs text-slate-500">{selectedMember.phone}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedMember(null)}
                                                    className="p-2 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full text-blue-500 transition-colors"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                                                <input
                                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-t-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
                                                    placeholder="Find member..."
                                                    type="text"
                                                    value={memberSearchTerm}
                                                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                                                />

                                                <div className="bg-white dark:bg-slate-800 border border-t-0 border-slate-100 dark:border-slate-700 rounded-b-xl shadow-sm max-h-48 overflow-y-auto">
                                                    {filteredMembers.length > 0 ? (
                                                        filteredMembers.map(member => (
                                                            <button
                                                                key={member.id}
                                                                onClick={() => handleSelectMember(member)}
                                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between items-center border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors"
                                                            >
                                                                <div>
                                                                    <div className="font-medium text-slate-900 dark:text-white text-sm">{member.name}</div>
                                                                    <div className="text-xs text-slate-500">{member.phone}</div>
                                                                </div>
                                                                <div className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">{member.points} Point</div>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center text-xs text-slate-400">
                                                            No members found.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {memberMode === 'guest' && (
                                    <div className="relative mb-4">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                        <input
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
                                            placeholder="Enter Guest Name (Optional)..."
                                            type="text"
                                            value={guestName}
                                            onChange={(e) => setGuestName(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    <input
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
                                        placeholder="Search products..."
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 pt-0 bg-slate-50/50 dark:bg-slate-950/50">
                                <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1 mt-4">Available Services & Parts</h2>
                                {loading ? (
                                    <div className="flex justify-center p-8">
                                        <Loader2 className="animate-spin text-primary" size={32} />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {filteredProducts.map(product => (
                                            <button
                                                key={product.id}
                                                onClick={() => addToCart(product)}
                                                className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary dark:hover:border-primary hover:shadow-md transition-all text-left flex flex-col h-full group"
                                            >
                                                <div className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">{product.name}</div>
                                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-auto tracking-wide">{product.category}</div>
                                                <div className="mt-3 flex items-center justify-between">
                                                    <div className="text-slate-900 dark:text-white font-bold">{formatRupiah(product.price)}</div>
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                                                        <Plus size={14} />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT PANEL: Cart & Checkout */}
                        <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-slate-900 h-full border-l border-slate-200 dark:border-slate-800 shadow-xl z-20">
                            <div className="p-5 space-y-6 flex-1 overflow-y-auto">
                                {/* Manual Entry Section */}
                                <section className="mb-4">
                                    <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">Repasta Template</h2>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-dotted border-slate-300 dark:border-slate-700 space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-primary text-slate-800 dark:text-slate-200 cursor-pointer"
                                                value={repastaBrand}
                                                onChange={(e) => handleApplyRepastaTemplate(e.target.value, repastaPkg)}
                                            >
                                                <option value="">-- Brand Pasta --</option>
                                                {REPASTA_TEMPLATES.map(t => (
                                                    <option key={t.brand} value={t.brand}>{t.brand}</option>
                                                ))}
                                            </select>
                                            <select
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs focus:ring-1 focus:ring-primary text-slate-800 dark:text-slate-200 cursor-pointer"
                                                value={repastaPkg}
                                                onChange={(e) => handleApplyRepastaTemplate(repastaBrand, e.target.value)}
                                            >
                                                <option value="">-- Package --</option>
                                                <option value="Starter">Starter</option>
                                                <option value="The Next">The Next</option>
                                                <option value="Performance">Performance</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={addRepastaItem}
                                            className="w-full bg-primary hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                            disabled={!repastaBrand || !repastaPkg}
                                        >
                                            <Plus size={14} />
                                            Add Repasta Options
                                        </button>
                                    </div>
                                </section>

                                {/* Manual Entry Section */}
                                <section>
                                    <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">Quick Custom Service</h2>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-dotted border-slate-300 dark:border-slate-700 space-y-3">
                                        <div className="grid grid-cols-3 gap-2">
                                            <input
                                                className="col-span-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white placeholder-slate-400"
                                                placeholder="Service Name"
                                                type="text"
                                                value={manualName}
                                                onChange={(e) => setManualName(e.target.value)}
                                            />
                                            <input
                                                className="col-span-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white placeholder-slate-400"
                                                placeholder="Rp 0"
                                                type="text"
                                                value={manualPrice}
                                                onChange={handleManualPriceChange}
                                            />
                                        </div>
                                        <button
                                            onClick={addManualItem}
                                            className="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                            disabled={!manualName || !manualPrice}
                                        >
                                            <Plus size={14} />
                                            Add Custom Item
                                        </button>
                                    </div>
                                </section>

                                {/* Cart Items */}
                                <section className="flex-1">
                                    <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1 flex justify-between">
                                        <span>Current Order</span>
                                        <span>{cart.length} Items</span>
                                    </h2>

                                    {cart.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                            <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-xs font-medium">Cart is empty</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {cart.map((item) => (
                                                <div key={item.id} className="flex justify-between text-sm items-start bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                                                    <div className="flex-1 pr-2">
                                                        <div className="text-slate-800 dark:text-slate-200 font-semibold">{item.name}</div>
                                                        <div className="flex items-center mt-1">
                                                            <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                                <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-l-lg transition-colors text-slate-500">-</button>
                                                                <span className="text-xs font-medium w-6 text-center">{item.quantity}</span>
                                                                <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-r-lg transition-colors text-slate-500">+</button>
                                                            </div>
                                                            <span className="text-xs text-slate-400 ml-2">x {formatRupiah(item.price)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(item.price * item.quantity)}</span>
                                                        <button
                                                            onClick={() => removeFromCart(item.id)}
                                                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>

                            {/* Total Footer */}
                            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
                                {/* Status Selection */}
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Transaction Status</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setTransactionStatus('completed')}
                                            className={clsx(
                                                "py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                                                transactionStatus === 'completed'
                                                    ? "bg-green-500 text-white shadow-lg"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                            )}
                                        >
                                            <CheckCircle2 size={16} />
                                            Completed
                                        </button>
                                        <button
                                            onClick={() => setTransactionStatus('pending')}
                                            className={clsx(
                                                "py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                                                transactionStatus === 'pending'
                                                    ? "bg-orange-500 text-white shadow-lg"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                            )}
                                        >
                                            <Clock size={16} />
                                            Pending
                                        </button>
                                    </div>
                                </div>

                                {/* Payment Method Selection */}
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Payment Method</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setPaymentMethod('cash')}
                                            className={clsx(
                                                "py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                                                paymentMethod === 'cash'
                                                    ? "bg-blue-500 text-white shadow-lg"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                            )}
                                        >
                                            <span>💵</span>
                                            Cash
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('transfer')}
                                            className={clsx(
                                                "py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                                                paymentMethod === 'transfer'
                                                    ? "bg-blue-500 text-white shadow-lg"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                            )}
                                        >
                                            <span>💳</span>
                                            Transfer
                                        </button>
                                    </div>
                                </div>

                                {/* Technician Fee Input */}
                                <div className="mb-4">
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 px-1">🛠️ Technician Fee (Potongan Teknisi)</label>
                                    <input
                                        type="text"
                                        placeholder="Rp 0"
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-orange-600 dark:text-orange-400 font-semibold transition-all"
                                        value={technicianFee}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/\D/g, '');
                                            if (val) val = parseInt(val).toLocaleString('id-ID');
                                            setTechnicianFee(val);
                                        }}
                                    />
                                    <p className="text-[9px] text-slate-400 px-1 mt-1">Isi jika ada pembagian komisi untuk teknisi. Akan dihitung memotong net-income sistem di History.</p>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between items-end pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <span className="font-bold text-slate-900 dark:text-white">Gross Total</span>
                                        <span className="text-2xl font-bold text-primary">{formatRupiah(total)}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    disabled={cart.length === 0}
                                    className="w-full bg-primary hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-primary text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={24} /> : (
                                        <>
                                            <span>Confirm Payment</span>
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* PENDING TRANSACTIONS VIEW */
                    <div className="flex-1 p-5 overflow-y-auto">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Pending Transactions</h2>
                        {pendingTransactions.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Clock size={48} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">No pending transactions</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingTransactions.map((transaction) => (
                                    <div key={transaction.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-xs text-slate-400 mb-1">{formatDate(transaction.created_at)}</p>
                                                <p className="font-bold text-slate-900 dark:text-white">
                                                    {transaction.members?.name || transaction.guest_name || 'Guest'}
                                                </p>
                                                {transaction.members?.phone && (
                                                    <p className="text-xs text-slate-500">{transaction.members.phone}</p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-primary">{formatRupiah(transaction.total)}</p>
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg mt-1">
                                                    <Clock size={12} />
                                                    Pending
                                                </span>
                                            </div>
                                        </div>

                                        {/* Transaction Items */}
                                        <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                            <p className="text-xs font-bold text-slate-400 mb-2">Items:</p>
                                            {transaction.transaction_items && transaction.transaction_items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                                                    <span>{item.quantity}x {item.product_name}</span>
                                                    <span>{formatRupiah(item.price * item.quantity)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => deleteTransaction(transaction.id)}
                                                className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={16} />
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => updateTransactionStatus(transaction.id, 'completed')}
                                                className="flex-[2] bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle2 size={16} />
                                                Mark as Completed
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
