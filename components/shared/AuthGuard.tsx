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
        const checkAuth = () => {
            const storedUser = localStorage.getItem('user');
            const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/train');

            if (!storedUser && !isPublicRoute) {
                setAuthorized(false);
                router.push('/login');
            } else {
                setAuthorized(true);
            }
        };

        checkAuth();
    }, [pathname, router]);

    if (!authorized && !PUBLIC_ROUTES.includes(pathname) && !pathname.startsWith('/train')) {
        return <FullScreenLoader />;
    }

    return <>{children}</>;
}
