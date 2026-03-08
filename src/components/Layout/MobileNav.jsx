import { LayoutDashboard, Store, Package, Users, Settings, FileText, Receipt, CalendarDays, FilePlus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";

const navItems = [
    { icon: LayoutDashboard, label: "Home", path: "/" },
    { icon: CalendarDays, label: "Schedules", path: "/schedules" },
    { icon: FilePlus, label: "Create Invoice", path: "/pos" },
    { icon: Package, label: "Inventory", path: "/inventory" },
    { icon: Receipt, label: "Expenses", path: "/expenses" },
    { icon: Users, label: "Members", path: "/members" },
    { icon: FileText, label: "History", path: "/history" },
    { icon: Settings, label: "Settings", path: "/settings" },
];

export default function MobileNav() {
    const location = useLocation();

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex overflow-x-auto gap-4 z-50 pb-4 justify-start items-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        className="flex flex-col items-center group py-1 min-w-[64px] flex-shrink-0"
                    >
                        <div
                            className={clsx(
                                "p-1 rounded-xl mb-1 transition-all",
                                isActive ? "bg-primary/10" : ""
                            )}
                        >
                            <item.icon
                                size={24}
                                className={clsx(
                                    "transition-colors",
                                    isActive
                                        ? "text-primary"
                                        : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                                )}
                            />
                        </div>
                        <span
                            className={clsx(
                                "text-[10px] font-medium transition-colors",
                                isActive
                                    ? "text-primary"
                                    : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                            )}
                        >
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
