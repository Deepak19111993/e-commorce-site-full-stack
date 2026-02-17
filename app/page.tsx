
"use client";

import { useEffect, useState } from "react";
import ProductsAndOrders from "@/components/shared/ProductsAndOrders";

import { useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/loader";

export default function Home() {
  const router = useRouter();
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
        return;
      }
    }
    setCheckingRole(false);
  }, [router]);

  if (checkingRole) return <FullScreenLoader />;

  return (
    <div>
      <ProductsAndOrders />
    </div>
  );
}
