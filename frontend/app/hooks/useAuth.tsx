// frontend/app/hooks/useAuth.ts

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuth() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("sb_token");
    const n = localStorage.getItem("sb_name");
    if (!t) {
      router.push("/login");
    } else {
      setToken(t);
      setUserName(n || "User");
      setReady(true);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("sb_token");
    localStorage.removeItem("sb_name");
    router.push("/login");
  };

  return { userName, token, ready, logout };
}