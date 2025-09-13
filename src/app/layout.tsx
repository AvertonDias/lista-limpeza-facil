import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lista de Limpeza Fácil",
  description: "Gerencie sua lista de compras de limpeza de forma fácil e organizada.",
  // O manifesto e os ícones relacionados a PWA são gerenciados pelo next-pwa em produção.
  // Removê-los daqui evita erros de CORS no ambiente de desenvolvimento.
};

export const viewport: Viewport = {
  themeColor: "#457B9D",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/images/placeholder-icon.png?v=2" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
