import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function Layout() {
    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
            <div className="flex flex-1 relative overflow-hidden">
                <Sidebar />
                <div className="flex-1 flex flex-col h-full w-full overflow-y-auto hide-scrollbar pb-24 relative lg:pl-64">
                    <Outlet />
                </div>
            </div>
            <MobileNav />
        </div>
    );
}
