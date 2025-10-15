"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  Timestamp,
  getDoc,
  arrayUnion,
} from "firebase/firestore";
import type { Material, ShoppingListItem, Feedback } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  Search,
  MessageSquare,
  Lightbulb,
  ShoppingCart,
  Phone,
} from "lucide-react";
import Header from "@/components/header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { sendEmailAction } from "@/app/actions/send-email";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [whatsAppNumber, setWhatsAppNumber] = useState("");

  const isInitialShoppingListLoad = useRef(true);

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
        materialsData.sort((a, b) => a.name.localeCompare(b.name));
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
      
      // Listen for feedback
      setFeedbackLoading(true);
      const feedbackQuery = query(collection(db, "feedback"), where("listOwnerId", "==", user.uid));
      const unsubscribeFeedback = onSnapshot(feedbackQuery, (snapshot) => {
        const allFeedbacks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
        setFeedback(allFeedbacks);

        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const newFeedback = { id: change.doc.id, ...change.doc.data() } as Feedback;
                if (user.email) {
                    const subject = newFeedback.type === 'suggestion' 
                        ? 'Nova Sugestão Recebida!' 
                        : `Nova Dúvida de ${newFeedback.name || 'Visitante'}`;
                    const fromName = newFeedback.type === 'doubt' ? newFeedback.name : "Visitante Anônimo";

                    sendEmailAction({
                        to: user.email,
                        from: 'Lista de Compras <notificacao@resend.dev>',
                        subject: subject,
                        html: `<p>Olá ${user.displayName || 'Usuário'},</p>
                               <p>Você recebeu uma nova mensagem de <strong>${fromName}</strong>.</p>
                               <p><strong>Mensagem:</strong></p>
                               <blockquote style="border-left: 2px solid #eee; padding-left: 1rem; margin-left: 0;">${newFeedback.text}</blockquote>`
                    });
                }
            }
        });


        setFeedbackLoading(false);
      }, (error) => {
        console.error("Error fetching feedback: ", error);
        setFeedbackLoading(false);
      });


      return () => {
        unsubscribeMaterials();
        unsubscribeFeedback();
      }
    }
  }, [user]);

 useEffect(() => {
    if (!user) return;
    
    let previousList = [...shoppingList];

    const shoppingListDocRef = doc(db, "shoppingLists", user.uid);
    const unsubscribeShoppingList = onSnapshot(shoppingListDocRef, (doc) => {
        if (doc.exists()) {
            const newList = doc.data().items || [];
            
            if (isInitialShoppingListLoad.current) {
                isInitialShoppingListLoad.current = false;
            } else {
              if (newList.length > previousList.length && user.email) {
                const addedItems = newList.filter((newItem: any) => !previousList.some(oldItem => oldItem.id === newItem.id));
                if (addedItems.length > 0) {
                  const newItem = addedItems[addedItems.length - 1];

                   sendEmailAction({
                        to: user.email,
                        from: 'Lista de Compras <notificacao@resend.dev>',
                        subject: `Novo item na sua lista: ${newItem.name}`,
                        html: `<p>Olá ${user.displayName || 'Usuário'},</p>
                               <p>O item <strong>${newItem.name}</strong> foi adicionado à sua lista de compras por um visitante.</p>`
                    });
                }
              }
            }
            // Update both the state and the ref for the next comparison
            setShoppingList(newList);
            previousList = [...newList];
        }
    }, (e) => {
        console.error("Error listening to shopping list: ", e);
    });

    return () => unsubscribeShoppingList();
  }, [user]);

  const updateShoppingListInFirestore = async (newList: ShoppingListItem[]) => {
    if (!user) return;
    const shoppingListDocRef = doc(db, "shoppingLists", user.uid);
    await setDoc(shoppingListDocRef, { items: newList, userId: user.uid }, { merge: true });
  }

  const handleAddItemToShoppingList = (item: Material) => {
    if (!user) return;
    const updatedList = [...shoppingList];
    const existingItem = updatedList.find((i) => i.id === item.id);
    if (!existingItem) {
      const newItem: ShoppingListItem = {
        id: item.id,
        name: item.name,
        createdAt: Timestamp.now(),
      };
      updatedList.push(newItem);
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

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      await deleteDoc(doc(db, "feedback", feedbackId));
       setFeedback(prevFeedback => prevFeedback.filter(item => item.id !== feedbackId));
      toast({
        title: "Mensagem Removida",
        description: "A mensagem foi removida com sucesso.",
      });
    } catch (e) {
      console.error("Error deleting feedback: ", e);
      toast({
        variant: "destructive",
        title: "Erro ao remover",
        description: "Não foi possível remover a mensagem.",
      });
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((material) =>
      material.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [materials, searchQuery]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const formatItemDate = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return null;
    return format(timestamp.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  }

  const formatFeedbackDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return "Data desconhecida";
    return format(timestamp.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  }

  const renderShoppingList = () => (
    <>
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
                {item.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    {formatItemDate(item.createdAt)}
                  </p>
                )}
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
    </>
  );
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 pb-24">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-8">
           <div>
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

              <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                      type="text"
                      placeholder="Pesquisar material..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10"
                  />
              </div>

              {materialsLoading ? (
                  <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
              ) : filteredMaterials.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredMaterials.map((material) => (
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
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation()}}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta ação não pode ser desfeita. Isso removerá o item da sua lista de materiais e também da lista de compras.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteMaterial(material.id)}>Continuar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          </div>
                      </CardHeader>
                      </Card>
                  ))}
                  </div>
              ) : (
                  <div className="text-center text-muted-foreground py-16">
                      <p className="text-lg">{searchQuery ? "Nenhum item encontrado." : "Tente uma busca diferente."}</p>
                      <p>{searchQuery ? "Tente uma busca diferente." : "Clique em 'Adicionar Item' para começar."}</p>
                  </div>
              )}
            </div>

            <div>
                <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                    <h2 className="font-headline text-3xl font-bold tracking-tight">
                    Sugestões e Dúvidas
                    </h2>
                </div>
                {feedbackLoading ? (
                   <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                   </div>
                ) : feedback.length > 0 ? (
                    <div className="space-y-4">
                        {feedback.map(item => (
                            <Card key={item.id}>
                                <CardHeader className="flex flex-row justify-between items-start">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            {item.type === 'doubt' ? <MessageSquare className="text-primary" /> : <Lightbulb className="text-amber-500" />}
                                            {item.type === 'doubt' ? `Dúvida de ${item.name}` : 'Sugestão'}
                                        </CardTitle>
                                        <CardDescription className="text-xs pt-1">
                                            {formatFeedbackDate(item.createdAt)}
                                        </CardDescription>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta ação não pode ser desfeita. Isso removerá permanentemente a mensagem.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteFeedback(item.id)}>Continuar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-foreground">{item.text}</p>
                                 </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-16">
                        <p className="text-lg">Nenhuma sugestão ou dúvida recebida.</p>
                        <p>As mensagens enviadas pela página pública aparecerão aqui.</p>
                    </div>
                )}
            </div>

          </div>
          <div className="hidden md:block md:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">
                  Sua Lista de Compras
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderShoppingList()}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* Mobile Sheet and FAB */}
      <div className="md:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                     <Button className="fixed bottom-6 right-6 z-40 h-16 w-16 rounded-full shadow-lg">
                        <ShoppingCart className="h-6 w-6" />
                        {shoppingList.length > 0 && (
                            <Badge variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 justify-center rounded-full">
                                {shoppingList.length}
                            </Badge>
                        )}
                        <span className="sr-only">Abrir lista de compras</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[90%] flex flex-col p-0">
                    <SheetHeader className="p-6 pb-0">
                        <SheetTitle className="font-headline text-2xl">Lista de Compras</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto py-4 px-4">
                        {renderShoppingList()}
                    </div>
                    <SheetFooter className="p-6 pt-0">
                        <Button onClick={() => setIsSheetOpen(false)} className="w-full">Fechar</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    </div>);
}

    