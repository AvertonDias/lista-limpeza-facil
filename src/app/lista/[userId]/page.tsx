"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sendEmail } from "@/lib/email";
import FeedbackModal from "@/components/FeedbackModal";
import Loader from "@/components/Loader";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, MessageSquare } from "lucide-react";
import { Logo } from "@/components/icons/logo";

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

export default function MaterialsPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { toast } = useToast();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const formatItemDate = (timestamp?: Timestamp | null) => {
    if (!timestamp || typeof timestamp.toDate !== "function") return null;
    return format(timestamp.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const notifyOwnerByEmail = useCallback(
    async (materialId: string) => {
      if (!userId) return;

      try {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          throw new Error("Usuário (dono da lista) não encontrado.");
        }
        const ownerData = userDoc.data();
        const ownerEmail = ownerData.email;

        if (!ownerEmail) {
          throw new Error("O dono da lista não possui um e-mail configurado.");
        }

        const materialDoc = await getDoc(doc(db, "materials", materialId));
        const materialData = materialDoc.data();

        if (!materialData) {
          console.warn("Material não encontrado:", materialId);
          return;
        }

        const templateParams = {
          to_email: ownerEmail,
          material_name: materialData.name,
          user_id: userId,
        };

        await sendEmail("template_ynk7ot9", templateParams);
        toast({
          title: "Notificação Enviada",
          description: "O responsável pela lista foi notificado.",
        });
      } catch (err) {
        console.error("Falha ao enviar e-mail:", err);
        toast({
          variant: "destructive",
          title: "Erro de Notificação",
          description: "Não foi possível notificar o responsável.",
        });
      }
    },
    [userId, toast]
  );

  useEffect(() => {
    if (!userId) {
      setError("ID de usuário inválido.");
      setPageLoading(false);
      return;
    }

    const materialsRef = collection(db, "materials");
    const materialsQuery = query(materialsRef, where("userId", "==", userId));
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
        setPageLoading(false);
      },
      (err) => {
        console.error("Erro ao obter materiais:", err);
        setError("Falha ao carregar os materiais.");
        setPageLoading(false);
      }
    );

    const shoppingRef = collection(db, "shoppingList");
    const shoppingQuery = query(shoppingRef, where("userId", "==", userId));
    const unsubscribeShoppingListener = onSnapshot(
      shoppingQuery,
      (shoppingSnapshot) => {
        const shoppingData: ShoppingItem[] = [];
        shoppingSnapshot.forEach((shoppingDoc) => {
          shoppingData.push({
            id: shoppingDoc.id,
            ...shoppingDoc.data(),
          } as ShoppingItem);
        });
        setShoppingList(
          shoppingData.sort(
            (a, b) =>
              (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
          )
        );
      },
      (err) => {
        console.error("Erro ao obter lista de compras:", err);
        setError("Falha ao carregar a lista de compras.");
      }
    );

    return () => {
      unsubscribeMaterialsListener();
      unsubscribeShoppingListener();
    };
  }, [userId]);

  const handleToggleItemInShoppingList = async (materialId: string) => {
    if (!userId) return;

    const existingItem = shoppingList.find(
      (item) => item.materialId === materialId
    );

    if (existingItem) {
      toast({
        variant: "destructive",
        title: "Item já existe",
        description: "Esse item já está na lista de compras.",
      });
      return;
    }

    const newItemRef = doc(collection(db, "shoppingList"));
    const newItem: ShoppingItem = {
      id: newItemRef.id,
      materialId,
      userId,
      createdAt: serverTimestamp() as unknown as Timestamp,
    };

    try {
      await setDoc(newItemRef, newItem);
      toast({
        title: "Sucesso!",
        description: "Item adicionado à lista de compras!",
      });
      await notifyOwnerByEmail(materialId);
    } catch (err) {
      console.error("Erro ao adicionar item:", err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao adicionar o item.",
      });
    }
  };

  const handleFeedbackSent = useCallback(
    async (templateId: string, templateParams: Record<string, unknown>) => {
      try {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().email) {
          const ownerEmail = userDoc.data().email;
          const completeParams = {
            ...templateParams,
            to_email: ownerEmail,
          };
          await sendEmail(templateId, completeParams);
          toast({
            title: "Notificação de Feedback Enviada",
            description:
              "O responsável pela lista foi notificado sobre o seu feedback.",
          });
        } else {
          throw new Error("Dono da lista não encontrado ou sem e-mail.");
        }
      } catch (error) {
        console.error("Falha ao enviar e-mail de feedback:", error);
        toast({
          variant: "destructive",
          title: "Erro de Notificação",
          description:
            "Não foi possível notificar o responsável sobre o feedback.",
        });
      }
    },
    [userId, toast]
  );

  if (pageLoading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-20 h-20">
              <Logo />
            </div>
            <CardTitle className="text-destructive">Ocorreu um Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen">
      <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto py-4 px-4 flex items-center gap-4">
          <div className="w-12 h-12">
            <Logo />
          </div>
          <h1 className="font-headline text-2xl font-bold text-gray-800 dark:text-gray-100">
            Materiais de Limpeza
          </h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto py-8 px-4">
        {isLoading ? (
          <Loader />
        ) : materials.length === 0 ? (
          <Card className="text-center p-8">
            <p className="text-muted-foreground">
              Nenhum material de limpeza foi cadastrado ainda.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {materials.map((material) => (
              <Card
                key={material.id}
                className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <p className="font-medium text-base">{material.name}</p>
                  <Button
                    size="icon"
                    className="rounded-full flex-shrink-0"
                    onClick={() => handleToggleItemInShoppingList(material.id)}
                    disabled={shoppingList.some(
                      (item) => item.materialId === material.id
                    )}
                  >
                    <PlusCircle />
                    <span className="sr-only">Adicionar à lista</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Button onClick={() => setFeedbackOpen(true)} size="lg">
            <MessageSquare className="mr-2" />
            Enviar Dúvida ou Sugestão
          </Button>
        </div>

        <FeedbackModal
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          userId={userId}
          onFeedbackSent={handleFeedbackSent}
        />
      </main>
    </div>
  );
}
