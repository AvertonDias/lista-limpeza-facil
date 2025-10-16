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
  const params = useParams<{ userId: string }>();
  const { toast } = useToast();
  const userId = params.userId;

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
  
  const notifyOwnerByEmail = useCallback(async (materialName: string) => {
    if (!userId) return;

    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const ownerData = userDoc.data();
        if(ownerData.email) {
            const templateParams = {
              to_email: ownerData.email,
              to_name: ownerData.displayName || 'Usuário',
              material_name: materialName,
              user_id: userId,
            };
    
            await sendEmail("template_ynk7ot9", templateParams);
            toast({
                title: "Notificação Enviada!",
                description: "O responsável pela lista foi notificado.",
            });
        } else {
             console.error("E-mail do dono da lista não encontrado.");
             toast({
                variant: "destructive",
                title: "Erro de Notificação",
                description: "Não foi possível encontrar o e-mail do responsável.",
             });
        }
      } else {
        console.error("Dono da lista não encontrado:", userId);
      }
    } catch (err) {
      console.error("Falha ao buscar usuário ou enviar e-mail:", err);
      toast({
        variant: "destructive",
        title: "Erro de Notificação",
        description: "Falha ao notificar o responsável pela lista.",
      });
    }
  }, [userId, toast]);


  useEffect(() => {
    if (!userId) {
      setError("ID de usuário inválido.");
      setPageLoading(false);
      return;
    }

    const materialsRef = collection(db, "materials");
    const materialsQuery = query(materialsRef);
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
          materialsData.sort(
            (a, b) =>
              (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
          )
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

  const handleToggleItemInShoppingList = async (material: Material) => {
    if (!userId) return;

    const existingItem = shoppingList.find(
      (item) => item.materialId === material.id
    );

    if (existingItem) {
      toast({
          variant: "default",
          title: "Item já existe",
          description: "Esse item já está na lista de compras.",
      });
      return;
    }

    const newItemRef = doc(collection(db, "shoppingList"));
    const newItem: ShoppingItem = {
      id: newItemRef.id,
      materialId: material.id,
      userId,
      createdAt: serverTimestamp() as unknown as Timestamp,
    };

    try {
      await setDoc(newItemRef, newItem);
      toast({
          title: "Item Adicionado!",
          description: "Item adicionado à lista de compras!",
      });
      await notifyOwnerByEmail(material.name);
    } catch (err) {
      console.error("Erro ao adicionar item:", err);
      toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao adicionar o item.",
      });
    }
  };

  if (pageLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 mt-10">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Materiais</h1>

      {materials.length === 0 ? (
        <p className="text-gray-500 text-center">Nenhum material encontrado.</p>
      ) : (
        <ul className="space-y-3">
          {materials.map((material) => (
            <li
              key={material.id}
              className="border rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{material.name}</p>
                {formatItemDate(material.createdAt) && (
                  <p className="text-sm text-gray-500">
                    Adicionado em {formatItemDate(material.createdAt)}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleToggleItemInShoppingList(material)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Adicionar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex justify-center">
        <button
          onClick={() => setFeedbackOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Enviar Feedback
        </button>
      </div>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}