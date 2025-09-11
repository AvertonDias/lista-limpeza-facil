import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";

export default function PublicListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
        {children}
        <Toaster />
    </AuthProvider>
  );
}
