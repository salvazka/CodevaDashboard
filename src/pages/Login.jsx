import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Monitor, User, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[40%] bg-primary/5 rounded-full blur-3xl"></div>
                <div className="absolute top-[20%] -right-[10%] w-[40%] h-[30%] bg-primary/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[10%] left-[20%] w-[60%] h-[40%] bg-blue-400/5 rounded-full blur-3xl"></div>
            </div>
            <main className="w-full max-w-sm mx-auto relative z-10">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-primary text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                        <Monitor size={40} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">CodevaTech Admin</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Computer Service Management</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 space-y-6">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Welcome back</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Please enter your credentials to access the admin panel.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider" htmlFor="email">
                                Email
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                                </div>
                                <input
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    id="email"
                                    placeholder="Enter your email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider" htmlFor="password">
                                    Password
                                </label>
                                <a className="text-xs text-primary hover:text-blue-700 font-medium" href="#">Forgot?</a>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                                </div>
                                <input
                                    className="block w-full pl-10 pr-10 py-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    id="password"
                                    placeholder="••••••••"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        <div className="pt-2">
                            <button
                                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/30 text-sm font-semibold text-white bg-primary hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? 'Logging in...' : 'Login as Admin'}
                                {!loading && <LogIn className="ml-2" size={18} />}
                            </button>
                        </div>
                    </form>
                    <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-500 mt-4">
                            Having trouble logging in? <br />
                            Contact <a className="text-primary hover:underline" href="#">IT Support</a>
                        </p>
                    </div>
                </div>
                <p className="text-center text-xs text-slate-400 mt-8">
                    © 2023 CodevaTech Systems v1.0.5
                </p>
            </main>
        </div>
    );
}
