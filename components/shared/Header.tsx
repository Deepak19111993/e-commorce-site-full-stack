"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingBag, Menu } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

export default function Header() {
    const [user, setUser] = useState<any>(null);
    const [checkingUser, setCheckingUser] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            setUser(null);
        }
        setCheckingUser(false);
    }, [pathname]);

    const isActive = (path: string) => pathname === path;
    const linkClass = (path: string) =>
        `transition-colors duration-200 block py-2 md:py-0 ${isActive(path) ? 'text-indigo-600 font-bold' : 'text-gray-600 hover:text-indigo-600'}`;

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        setIsOpen(false);
        router.push('/login');
    };

    const NavLinks = () => (
        <>
            {user?.role !== 'admin' && (
                <Link href="/" onClick={() => setIsOpen(false)} className={linkClass('/')}>Products</Link>
            )}
            {user?.role !== 'admin' && (
                <Link href="/cart" onClick={() => setIsOpen(false)} className={linkClass('/cart')}>Cart</Link>
            )}
            {user?.role !== 'admin' && (
                <Link href="/orders" onClick={() => setIsOpen(false)} className={linkClass('/orders')}>Orders</Link>
            )}
            <Link href="/profile" onClick={() => setIsOpen(false)} className={linkClass('/profile')}>Profile</Link>
            {user?.role === 'admin' && (
                <Link href="/admin/dashboard" onClick={() => setIsOpen(false)} className={linkClass('/admin/dashboard')}>Admin</Link>
            )}
        </>
    );

    return (
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b mb-6 sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                <Link href={user?.role === 'admin' ? '/admin/dashboard' : '/'} className="flex items-center gap-2 group shrink-0">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2 rounded-xl text-white shadow-indigo-100 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                        <ShoppingBag className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 group-hover:to-indigo-600 transition-all">Store</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center space-x-8">
                    {checkingUser ? (
                        <div className="h-6 w-20 bg-gray-100 animate-pulse rounded"></div>
                    ) : user ? (
                        <>
                            <NavLinks />
                            <button
                                onClick={handleLogout}
                                className="text-gray-400 hover:text-rose-600 font-semibold ml-4 transition-colors duration-200"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-6">
                            <Link
                                href="/login"
                                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-6 py-2 rounded-full font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                            >
                                Login
                            </Link>
                            <Link
                                href="/signup"
                                className="text-indigo-600 hover:text-indigo-700 font-semibold"
                            >
                                Signup
                            </Link>
                        </div>
                    )}
                </nav>

                {/* Mobile Navigation */}
                <div className="md:hidden flex items-center gap-4">
                    {!checkingUser && !user && (
                        <Link
                            href="/login"
                            className="text-indigo-600 font-bold text-sm"
                        >
                            Login
                        </Link>
                    )}
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                <Menu className="h-6 w-6" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[280px] sm:w-[350px] flex flex-col p-4">
                            <SheetHeader className="text-left border-b pb-3 mb-2 shrink-0">
                                <SheetTitle className="text-lg font-bold">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-1.5 rounded-lg text-white shadow-md">
                                            <ShoppingBag size={14} />
                                        </div>
                                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">Store</span>
                                    </div>
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto pr-1 -mr-1">
                                <div className="flex flex-col space-y-1 pt-1 pb-4">
                                    {checkingUser ? (
                                        <div className="space-y-3">
                                            <div className="h-8 w-full bg-gray-100 animate-pulse rounded"></div>
                                            <div className="h-8 w-full bg-gray-100 animate-pulse rounded"></div>
                                        </div>
                                    ) : user ? (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1 px-2">Main Menu</p>
                                            <NavLinks />
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1 px-2">Shop</p>
                                            <Link href="/" onClick={() => setIsOpen(false)} className={linkClass('/')}>Browse Products</Link>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-t pt-4 mt-auto shrink-0 space-y-2">
                                {!checkingUser && (
                                    user ? (
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-3 w-full text-rose-600 font-semibold py-2.5 hover:bg-rose-50 rounded-lg px-3 transition-all active:scale-[0.98] group text-sm"
                                        >
                                            <div className="bg-rose-100 p-1.5 rounded-md group-hover:bg-rose-200 transition-colors">
                                                <Menu size={16} className="rotate-90" />
                                            </div>
                                            Logout
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Link
                                                href="/login"
                                                onClick={() => setIsOpen(false)}
                                                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-2.5 rounded-lg font-bold text-center shadow-md shadow-indigo-100 active:scale-[0.98] transition-all hover:opacity-90 text-sm"
                                            >
                                                Login
                                            </Link>
                                            <Link
                                                href="/signup"
                                                onClick={() => setIsOpen(false)}
                                                className="flex-1 border-2 border-indigo-600 text-indigo-600 py-2.5 rounded-lg font-bold text-center active:scale-[0.98] transition-all hover:bg-indigo-50 text-sm"
                                            >
                                                Sign Up
                                            </Link>
                                        </div>
                                    )
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
