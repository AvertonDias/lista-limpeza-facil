"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Always redirect to home page as there is no admin role anymore
      router.push("/");
    }
  }, [user, loading, router]);
  
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
