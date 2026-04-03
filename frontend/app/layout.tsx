// frontend/app/layout.tsx

"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("sb_token");
    if (!token && pathname !== "/login") {
      router.push("/login");
    }
    if (token && pathname === "/login") {
      router.push("/");
    }
  }, [pathname]);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}