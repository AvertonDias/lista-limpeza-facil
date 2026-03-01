"use client";

import Link from "next/link";
import { ExternalLink, MessageCircle } from "lucide-react";

export default function Footer() {
  const whatsappUrl = "https://wa.me/5535991210466?text=Olá!%20Gostaria%20de%20ajuda%20no%20Lista%20Fácil.";

  return (
    <footer className="w-full border-t bg-background py-6 print:hidden">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:flex-row px-4 md:px-6">
        <p className="text-sm text-muted-foreground order-2 md:order-1">
          © 2025 Lista Fácil.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 order-1 md:order-2">
          <Link
            href="https://aplicativos-ton.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Conheça meus aplicativos
          </Link>
          <Link
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Suporte
          </Link>
        </div>
      </div>
    </footer>
  );
}
