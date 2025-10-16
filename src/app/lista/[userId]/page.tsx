'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  collection,
  query,
  where,
  getDoc,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendEmail } from '@/lib/email';
import FeedbackModal from '@/components/FeedbackModal';
import Loader from '@/components/Loader';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Send } from 'lucide-react';
import { Logo } from '@/components/icons/logo';

interface Material {
  id: string;
  name: string;
  createdAt?: Timestamp | null;
}

interface ShoppingItem {
  id: string;
  materialId: string;
  userId: string;
  createdAt: Timestamp;
}

export default function PublicListPage() {
  const params = useParams<{ userId: string }>();
  const { toast } = useToast();
  const userId = params.userId;

  const [materials, setMaterials] = useState<Material[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [pageOwner, setPageOwner] = useState<{
    displayName: string;
    email: string;
  } | null>(null);

  const notifyOwnerByEmail = useCallback(async (templateId: string, templateParams: Record<string, unknown>) => {
    if (!userId) return;

    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const ownerData = userDoc.data();
        if (ownerData.email) {
          await sendEmail(templateId, {
            ...templateParams,
            to_email: ownerData.email,
            to_name: ownerData.displayName || 'Usuário',
          });
          toast({
            title: 'Notificação Enviada!',
            description: 'O responsável pela lista foi notificado.',
          });
        } else {
          console.error('E-mail do dono da lista não encontrado.');
          toast({
            variant: 'destructive',
            title: 'Erro de Notificação',
            description: 'Não foi possível encontrar o e-mail do responsável.',
          });
        }
      } else {
        console.error('Dono da lista não encontrado:', userId);
      }
    } catch (err) {
      console.error('Falha ao buscar usuário ou enviar e-mail:', err);
      toast({
        variant: 'destructive',
        title: 'Erro de Notificação',
        description: 'Falha ao notificar o responsável pela lista.',
      });
    }
  }, [userId, toast]);


  useEffect(() => {
    if (!userId) {
      setError('ID de usuário inválido.');
      setPageLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', userId as string);
    getDoc(userDocRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setPageOwner({
            displayName: userData.displayName || 'Usuário',
            email: userData.email || '',
          });
        } else {
          setError('Usuário não encontrado.');
        }
      })
      .catch(() => setError('Erro ao buscar informações do usuário.'))
      .finally(() => setPageLoading(false));

    const materialsRef = collection(db, 'materials');
    const materialsQuery = query(materialsRef, where('userId', '==', userId));
    const unsubscribeMaterialsListener = onSnapshot(
      materialsQuery,
      (materialsSnapshot) => {
        const materialsData: Material[] = [];
        materialsSnapshot.forEach((materialDoc) => {
          materialsData.push({
            id: materialDoc.id,
            ...materialDoc.data(),
          } as Material);
        });
        setMaterials(
          materialsData.sort((a, b) => a.name.localeCompare(b.name))
        );
        setIsLoading(false);
      },
      (err) => {
        console.error('Erro ao obter materiais:', err);
        setError('Falha ao carregar os materiais.');
        setIsLoading(false);
      }
    );

    const shoppingListDocRef = doc(db, 'shoppingLists', userId as string);
    const unsubscribeShoppingListener = onSnapshot(
      shoppingListDocRef,
      (doc) => {
        if (doc.exists()) {
          setShoppingList(doc.data().items || []);
        }
      },
      (err) => {
        console.error('Erro ao obter lista de compras:', err);
        setError('Falha ao carregar a lista de compras.');
      }
    );

    return () => {
      unsubscribeMaterialsListener();
      unsubscribeShoppingListener();
    };
  }, [userId]);

  const handleToggleItemInShoppingList = async (material: Material) => {
    if (!userId) return;

    const newList = [...shoppingList];
    const existingItemIndex = newList.findIndex(
      (item) => item.materialId === material.id
    );

    if (existingItemIndex > -1) {
      toast({
        variant: 'default',
        title: 'Item já existe',
        description: 'Esse item já está na lista de compras.',
      });
      return;
    }

    const newItem: ShoppingItem = {
      id: doc(collection(db, 'shoppingList')).id, // Generate a new ID
      materialId: material.id,
      userId,
      createdAt: serverTimestamp() as Timestamp,
    };
    newList.push(newItem);

    const shoppingListDocRef = doc(db, 'shoppingLists', userId);

    try {
      // We use setDoc with merge to create the document if it doesn't exist.
      await setDoc(shoppingListDocRef, { items: newList }, { merge: true });

      toast({
        title: 'Item Adicionado!',
        description: `${material.name} foi adicionado à lista.`,
      });

      await notifyOwnerByEmail('template_ynk7ot9', {
        material_name: material.name,
      });
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao adicionar o item.',
      });
    }
  };

  if (pageLoading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">
          Ocorreu um Erro
        </h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => (window.location.href = '/')} className="mt-6">
          Voltar para a página inicial
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
        <header className="text-center mb-10">
          <div className="inline-block mx-auto h-24 w-24">
            <Logo />
          </div>
          <h1 className="font-headline text-4xl font-bold mt-4 text-gray-800 dark:text-gray-100">
            Lista de Limpeza de {pageOwner?.displayName}
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Clique em um item para adicioná-lo à lista de compras.
          </p>
        </header>

        {isLoading ? (
          <Loader />
        ) : materials.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">
              Nenhum material de limpeza cadastrado no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {materials.map((material) => {
              const isOnList = shoppingList.some(
                (item) => item.materialId === material.id
              );
              return (
                <Card
                  key={material.id}
                  onClick={() =>
                    !isOnList && handleToggleItemInShoppingList(material)
                  }
                  className={`transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
                    isOnList
                      ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                      : 'cursor-pointer bg-card'
                  }`}
                >
                  <CardHeader className="flex flex-col items-center justify-center text-center p-6">
                    <CardTitle className="font-semibold text-lg">
                      {material.name}
                    </CardTitle>
                    {isOnList && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium mt-2">
                        Já está na lista
                      </span>
                    )}
                  </CardHeader>
                  {!isOnList && (
                    <CardContent className="p-0">
                      <div className="flex items-center justify-center w-full bg-accent/30 text-accent-foreground p-3 text-sm font-medium">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar à lista
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <div className="fixed bottom-6 right-6">
          <Button
            onClick={() => setFeedbackOpen(true)}
            size="lg"
            className="rounded-full shadow-lg"
          >
            <Send className="mr-2 h-5 w-5" />
            Enviar Dúvida ou Sugestão
          </Button>
        </div>

        <FeedbackModal
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          userId={userId}
          onFeedbackSent={notifyOwnerByEmail}
        />
      </div>
    </div>
  );
}
