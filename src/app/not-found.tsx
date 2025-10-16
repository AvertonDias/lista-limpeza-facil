
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-8 h-24 w-24">
            <Logo />
        </div>
        <h1 className="font-headline text-6xl font-bold tracking-tight text-primary">404</h1>
        <h2 className="mt-4 font-headline text-2xl font-semibold text-foreground">
          Página não encontrada
        </h2>
        <p className="mt-2 text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/">Voltar para o Início</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
