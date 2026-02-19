'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FullScreenLoader } from '@/components/ui/loader';

const PUBLIC_ROUTES = ['/login', '/signup'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        // Run auth check on every route change
        const checkAuth = () => {
            const storedUser = localStorage.getItem('user');
            const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

            if (!storedUser && !isPublicRoute) {
                // Not logged in and trying to access private route
                setAuthorized(false);
                router.push('/login');
            } else {
                setAuthorized(true);
            }
        };

        checkAuth();
    }, [pathname, router]);

    // Show nothing (or a loader) while checking authorization for private routes
    if (!authorized && !PUBLIC_ROUTES.includes(pathname)) {
        return <FullScreenLoader />;
    }

    return <>{children}</>;
}
