import { LayoutDashboard, Store, Package, Users, Settings, FileText, Receipt, LogOut, CalendarDays } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { supabase } from "../../lib/supabase";

const navItems = [
    { icon: LayoutDashboard, label: "Home", path: "/" },
    { icon: Store, label: "POS", path: "/pos" },
    { icon: CalendarDays, label: "Schedules", path: "/schedules" },
    { icon: Package, label: "Inventory", path: "/inventory" },
    { icon: Receipt, label: "Expenses", path: "/expenses" },
    { icon: Users, label: "Members", path: "/members" },
    { icon: FileText, label: "History", path: "/history" },
    { icon: Settings, label: "Settings", path: "/settings" },
];

export default function Sidebar() {
    const location = useLocation();

    return (
        <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full fixed inset-y-0 left-0 pt-20 z-10">
            <div className="p-6">
                <h1 className="text-2xl font-bold text-primary">CodevaTech</h1>
                <p className="text-xs text-slate-500">Admin Dashboard</p>
            </div>
            <nav className="flex flex-col gap-2 px-4">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                isActive
                                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            )}
                        >
                            <item.icon size={22} />
                            <span className="font-medium text-sm">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto">
                <button
                    onClick={async () => {
                        await supabase.auth.signOut();
                        // Navigate is handled by ProtectedRoute or we can force it
                        window.location.href = '/login';
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-200"
                >
                    <LogOut size={22} />
                    <span className="font-medium text-sm">Logout</span>
                </button>
            </div>
        </aside>
    );
}
