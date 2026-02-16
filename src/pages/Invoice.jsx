import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, Printer, ArrowLeft } from 'lucide-react';

export default function Invoice() {
    const location = useLocation();
    const { cart, total, customerName, type, date, paymentMethod } = location.state || {}; // Expects data from POS

    if (!cart) {
        return (
            <div className="h-full flex items-center justify-center p-5">
                <div className="text-center">
                    <p className="text-slate-500 mb-4">No invoice data found.</p>
                    <Link to="/pos" className="text-primary hover:underline">Back to POS</Link>
                </div>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    const formatRupiah = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-5 print:p-0 print:bg-white">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 print:shadow-none print:border-none print:w-full">

                {/* Success Header (Hide on Print) */}
                <div className="text-center mb-8 print:hidden">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="text-green-600" size={32} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Transaction Complete</h1>
                    <p className="text-slate-500 text-sm">Validating purchase...</p>
                </div>

                {/* Invoice Header */}
                <div className="text-center border-b border-dashed border-slate-300 pb-6 mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-widest mb-1">CodevaTech</h2>
                    <p className="text-xs text-slate-500">Computer Service Management</p>
                    <p className="text-xs text-slate-500 mt-1">Tel: +62 851-8351-9490</p>
                </div>

                {/* Info */}
                <div className="flex justify-between text-xs text-slate-500 mb-6">
                    <div>
                        <p>Invoice #: <span className="text-slate-900 font-mono">INV-{Math.floor(Math.random() * 10000)}</span></p>
                        <p>Date: {new Date(date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                        <p>Customer: <span className="font-semibold text-slate-900">{customerName || 'Guest'}</span></p>
                        <p className="uppercase badge badge-sm">{type}</p>
                        <p className="mt-1">Payment: <span className="font-semibold text-slate-900 capitalize">{paymentMethod || 'Cash'}</span></p>
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-3 mb-6">
                    {cart.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                            <div>
                                <span className="font-medium text-slate-900">{item.name}</span>
                                <div className="text-xs text-slate-500">{item.quantity} x {formatRupiah(item.price)}</div>
                            </div>
                            <span className="font-semibold text-slate-900">{formatRupiah(item.quantity * item.price)}</span>
                        </div>
                    ))}
                </div>

                {/* Total */}
                <div className="border-t border-slate-200 pt-4 space-y-2 mb-8">
                    <div className="flex justify-between text-lg font-bold pt-2 mt-2">
                        <span className="text-slate-900">Total</span>
                        <span className="text-primary">{formatRupiah(total)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-slate-400 mb-8">
                    <p>Thank you for choosing CodevaTech!</p>
                    <p>Please keep this receipt for warranty.</p>
                </div>

                {/* Actions (Hide on Print) */}
                <div className="space-y-3 print:hidden">
                    <button
                        onClick={handlePrint}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                        <Printer size={18} />
                        Print Receipt
                    </button>
                    <Link
                        to="/pos"
                        className="block w-full text-center py-3 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors"
                    >
                        Start New Transaction
                    </Link>
                </div>

            </div>
        </div>
    );
}
