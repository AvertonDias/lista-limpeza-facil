"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ShoppingListItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons/logo';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

export default function SharedListPage() {
  const params = useParams();
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.listId) {
      try {
        const decodedString = decodeURIComponent(atob(params.listId as string));
        const list = JSON.parse(decodedString);
        if (Array.isArray(list)) {
          setShoppingList(list);
        } else {
            throw new Error("Formato de lista inválido.");
        }
      } catch (e) {
        console.error("Falha ao decodificar ou analisar o listId", e);
        setError("Não foi possível carregar a lista. O link pode estar corrompido ou expirado.");
      }
    }
  }, [params.listId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="absolute top-8 left-8 flex items-center gap-2">
            <div className="w-10 h-10">
                <Logo />
            </div>
            <h1 className="font-headline text-xl font-semibold">Lista Limpeza Fácil</h1>
        </div>
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-center text-2xl">Lista de Compras Compartilhada</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-center text-destructive">{error}</p>
          ) : shoppingList.length > 0 ? (
            <ul className="space-y-3">
              {shoppingList.map((item, index) => (
                <li key={item.id}>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{item.name}</span>
                        </div>
                         {item.quantity && <span className="text-muted-foreground">Quantidade: <span className="font-bold text-foreground">{item.quantity}</span></span>}
                    </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground">Esta lista de compras está vazia.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
