import { AuthProvider } from "@/components/auth-provider";

export default function PublicListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
        {children}
    </AuthProvider>
  );
}
