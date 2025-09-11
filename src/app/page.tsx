"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  getDoc
} from "firebase/firestore";
import type { Material, ShoppingListItem } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  BookUser,
  Loader2,
  Edit,
} from "lucide-react";
import Header from "@/components/header";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [materialsLoading, setMaterialsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (user) {
      // Listen for materials
      setMaterialsLoading(true);
      const materialsQuery = query(collection(db, "materials"), where("userId", "==", user.uid));
      const unsubscribeMaterials = onSnapshot(materialsQuery, (querySnapshot) => {
        const materialsData: Material[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          materialsData.push({
             id: doc.id,
             name: data.name,
             userId: data.userId
            } as Material);
        });
        setMaterials(materialsData);
        setMaterialsLoading(false);
      }, (error) => {
        console.error("Error fetching materials: ", error);
        toast({
          variant: "destructive",
          title: "Erro ao buscar materiais",
          description: "Não foi possível carregar os materiais.",
        });
        setMaterialsLoading(false);
      });

      // Listen for shopping list
      const shoppingListDocRef = doc(db, "shoppingLists", user.uid);
      const unsubscribeShoppingList = onSnapshot(shoppingListDocRef, (doc) => {
        if (doc.exists()) {
          setShoppingList(doc.data().items || []);
        } else {
            // Create the shopping list if it doesn't exist
            setDoc(shoppingListDocRef, { userId: user.uid, items: [] });
        }
      });


      return () => {
        unsubscribeMaterials();
        unsubscribeShoppingList();
      }
    }
  }, [user, toast]);

  const updateShoppingListInFirestore = async (newList: ShoppingListItem[]) => {
    if (!user) return;
    const shoppingListDocRef = doc(db, "shoppingLists", user.uid);
    await setDoc(shoppingListDocRef, { items: newList, userId: user.uid }, { merge: true });
  }

  const handleAddItemToShoppingList = (item: Material) => {
    const updatedList = [...shoppingList];
    const existingItem = updatedList.find((i) => i.id === item.id);
    if (!existingItem) {
      updatedList.push({ id: item.id, name: item.name });
      updateShoppingListInFirestore(updatedList);
      toast({
        title: "Item Adicionado!",
        description: `${item.name} foi adicionado à sua lista de compras.`,
      });
    } else {
        toast({
            variant: "destructive",
            title: "Item já existe",
            description: `${item.name} já está na sua lista de compras.`,
        });
    }
  };

  const handleRemoveItemFromShoppingList = (itemId: string) => {
    const updatedList = shoppingList.filter((i) => i.id !== itemId);
    updateShoppingListInFirestore(updatedList);
  };
  
  const handleSharePublicList = () => {
    if (!user) return;
    router.push(`/print/${user.uid}`);
  }

  const handleOpenForm = (material: Material | null = null) => {
    setEditingMaterial(material);
    setNewItemName(material?.name || "");
    setIsFormOpen(true);
  };

  const handleSaveMaterial = async () => {
    if (!user) return;
    if (!newItemName.trim()) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Preencha o nome do item.",
      });
      return;
    }

    try {
      if (editingMaterial) {
        // Edit existing material
        const materialDoc = doc(db, "materials", editingMaterial.id);
        await updateDoc(materialDoc, {
            name: newItemName,
        });
        toast({
          title: "Item Atualizado!",
          description: `O item ${newItemName} foi atualizado com sucesso.`,
        });
      } else {
        // Add new material
        await addDoc(collection(db, "materials"), {
            name: newItemName,
            userId: user.uid,
        });
        toast({
          title: "Item Adicionado!",
          description: `O item ${newItemName} foi adicionado à lista de materiais.`,
        });
      }
      setIsFormOpen(false);
      setNewItemName("");
      setEditingMaterial(null);
    } catch(e) {
        console.error("Error saving material: ", e);
        toast({
            variant: "destructive",
            title: "Erro ao salvar",
            description: "Não foi possível salvar o item. Tente novamente.",
        });
    }
  };
  
  const handleDeleteMaterial = async (materialId: string) => {
     try {
        await deleteDoc(doc(db, "materials", materialId));
        handleRemoveItemFromShoppingList(materialId);
        toast({
            title: "Item Removido",
            description: "O item foi removido da sua lista de materiais.",
        });
     } catch(e) {
        console.error("Error deleting material: ", e);
        toast({
            variant: "destructive",
            title: "Erro ao remover",
            description: "Não foi possível remover o item. Tente novamente.",
        });
     }
  }

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
              <h1 className="font-headline text-3xl font-bold tracking-tight">
                Materiais de Limpeza
              </h1>
              <div className="flex gap-2">
                 <Button onClick={handleSharePublicList} variant="outline">
                    <BookUser className="mr-2" />
                    Compartilhar Materiais
                </Button>
                <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
                    setIsFormOpen(isOpen);
                    if (!isOpen) {
                      setEditingMaterial(null);
                      setNewItemName("");
                    }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenForm()}>
                      <Plus className="mr-2" />
                      Adicionar Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingMaterial ? "Editar Item" : "Adicionar Novo Item"}
                      </DialogTitle>
                       <DialogDescription>
                          Adicione ou edite um item da sua lista de materiais para que outros possam adicioná-lo à sua lista de compras.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome do Item</Label>
                        <Input
                          id="name"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Ex: Detergente"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                      <Button onClick={handleSaveMaterial}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {materialsLoading ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 </div>
            ) : materials.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {materials.map((material) => (
                    <Card
                    key={material.id}
                    className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg group cursor-pointer"
                    onClick={() => handleAddItemToShoppingList(material)}
                    >
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="font-headline text-lg">
                        {material.name}
                        </CardTitle>
                        <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); handleOpenForm(material)}}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); handleDeleteMaterial(material.id)}}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </CardHeader>
                    </Card>
                ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    <p className="text-lg">Nenhum item cadastrado.</p>
                    <p>Clique em "Adicionar Item" para começar.</p>
                </div>
            )}
          </div>
          <div className="md:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">
                  Sua Lista de Compras
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shoppingList.length > 0 ? (
                  <div className="space-y-4">
                    <ul className="space-y-3">
                      {shoppingList.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItemFromShoppingList(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                    <Separator />
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>Sua lista de compras está vazia.</p>
                    <p className="text-sm">
                      Clique nos itens para adicionar.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
