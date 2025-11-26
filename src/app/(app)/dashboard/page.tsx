"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  orderBy,
} from "firebase/firestore";
import type { Item, ShoppingListItem, Feedback } from "@/types";
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
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import emailjs from '@emailjs/browser';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [itemsLoading, setItemsLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const isInitialShoppingListLoad = useRef(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);
  

  useEffect(() => {
    if (user) {
      // Init EmailJS
      emailjs.init({ publicKey: "Yj5CBlcpbHrHQeYik" });
      
      // Listen for items
      setItemsLoading(true);
      const itemsQuery = query(collection(db, "items"), where("userId", "==", user.uid));
      const unsubscribeItems = onSnapshot(itemsQuery, (querySnapshot) => {
        const itemsData: Item[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          itemsData.push({
             id: doc.id,
             name: data.name,
             userId: data.userId
            } as Item);
        });
        itemsData.sort((a, b) => a.name.localeCompare(b.name));
        setItems(itemsData);
        setItemsLoading(false);
      }, (error) => {
        console.error("Error fetching items: ", error);
        toast({
          variant: "destructive",
          title: "Erro ao buscar itens",
          description: "Não foi possível carregar seus itens padrão.",
        });
        setItemsLoading(false);
      });
      
      // Listen for feedback
      setFeedbackLoading(true);
      const feedbackQuery = query(
        collection(db, "feedback"), 
        where("listOwnerId", "==", user.uid)
      );
      const unsubscribeFeedback = onSnapshot(feedbackQuery, (snapshot) => {
        const allFeedbacks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
        // Sort feedback by date on the client-side
        allFeedbacks.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setFeedback(allFeedbacks);
        setFeedbackLoading(false);
      }, (error) => {
        console.error("Error fetching feedback: ", error);
        setFeedbackLoading(false);
      });


      return () => {
        unsubscribeItems();
        unsubscribeFeedback();
      }
    }
  }, [user, toast]);

 useEffect(() => {
    if (!user) return;
    
    let previousList = [...shoppingList];

    const shoppingListDocRef = doc(db, "shoppingLists", user.uid);
    const unsubscribeShoppingList = onSnapshot(shoppingListDocRef, (doc) => {
        if (doc.exists()) {
            const newList = doc.data().items || [];
            
            if (isInitialShoppingListLoad.current) {
                isInitialShoppingListLoad.current = false;
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

  const handleAddItemToShoppingList = (item: Item) => {
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

  const handleOpenForm = (item: Item | null = null) => {
    setEditingItem(item);
    setNewItemName(item?.name || "");
    setIsFormOpen(true);
  };

  const handleSaveItem = async () => {
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
      if (editingItem) {
        // Edit existing item
        const itemDoc = doc(db, "items", editingItem.id);
        await updateDoc(itemDoc, {
            name: newItemName,
        });
        toast({
          title: "Item Atualizado!",
          description: `O item ${newItemName} foi atualizado com sucesso.`,
        });
      } else {
        // Add new item
        await addDoc(collection(db, "items"), {
            name: newItemName,
            userId: user.uid,
        });
        toast({
          title: "Item Adicionado!",
          description: `O item ${newItemName} foi adicionado à sua lista padrão.`,
        });
      }
      setIsFormOpen(false);
      setNewItemName("");
      setEditingItem(null);
    } catch(e) {
        console.error("Error saving item: ", e);
        toast({
            variant: "destructive",
            title: "Erro ao salvar",
            description: "Não foi possível salvar o item. Tente novamente.",
        });
    }
  };
  
  const handleDeleteItem = async (itemId: string) => {
     try {
        await deleteDoc(doc(db, "items", itemId));
        handleRemoveItemFromShoppingList(itemId);
        toast({
            title: "Item Removido",
            description: "O item foi removido da sua lista padrão.",
        });
     } catch(e) {
        console.error("Error deleting item: ", e);
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

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

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
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                 <Avatar className="h-8 w-8 bg-muted">
                    <AvatarFallback>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-medium">{item.name}</p>
                    {item.createdAt && (
                    <p className="text-xs text-muted-foreground">
                        {formatItemDate(item.createdAt)}
                    </p>
                    )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
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
      <div className="text-center text-muted-foreground py-8 space-y-2">
        <ShoppingCart className="mx-auto h-12 w-12" />
        <p className="font-medium">Sua lista de compras está vazia.</p>
        <p className="text-sm">
          Clique nos itens disponíveis para adicionar.
        </p>
      </div>
    )}
    </>
  );
  return (
    <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
        <div>
            <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            <h1 className="font-headline text-3xl font-bold tracking-tight">
                Meus Itens Padrão
            </h1>
            <div className="flex gap-2">
                
                <Button onClick={handleSharePublicList} variant="outline">
                    <BookUser className="mr-2" />
                    Compartilhar
                </Button>
                <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
                    setIsFormOpen(isOpen);
                    if (!isOpen) {
                    setEditingItem(null);
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
                        {editingItem ? "Editar Item" : "Adicionar Novo Item"}
                    </DialogTitle>
                    <DialogDescription>
                        Adicione ou edite um item da sua lista padrão para que outros possam adicioná-lo à sua lista de compras.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do Item</Label>
                        <Input
                        id="name"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Ex: Café, Leite"
                        />
                    </div>
                    </div>
                    <DialogFooter>
                    <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveItem}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
                </Dialog>
            </div>
            </div>
            
            <div className="relative my-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    type="text"
                    placeholder="Pesquisar item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 bg-background"
                />
            </div>

            {itemsLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : filteredItems.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item) => (
                    <Card
                    key={item.id}
                    className="group/item flex flex-col overflow-hidden transition-shadow hover:shadow-lg cursor-pointer bg-background"
                    onClick={() => handleAddItemToShoppingList(item)}
                    >
                    <CardHeader className="flex-row items-start justify-between p-4">
                        <CardTitle className="font-headline text-base font-semibold leading-snug">
                        {item.name}
                        </CardTitle>
                        <div className="flex flex-col gap-1 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleOpenForm(item); }}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso removerá o item da sua lista padrão e também da lista de compras.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Continuar</AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        </div>
                    </CardHeader>
                    </Card>
                ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-16 rounded-lg bg-background">
                    <p className="text-lg font-medium">{searchQuery ? "Nenhum item encontrado" : "Nenhum item cadastrado"}</p>
                    <p className="text-sm">{searchQuery ? "Tente uma busca diferente." : "Clique em 'Adicionar Item' para começar."}</p>
                </div>
            )}
        </div>

        <div id="feedback">
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
                        <Card key={item.id} className="bg-background">
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
                <div className="text-center text-muted-foreground py-16 bg-background rounded-lg">
                    <p className="text-lg font-medium">Nenhuma mensagem recebida.</p>
                    <p className="text-sm">As sugestões e dúvidas enviadas pela página pública aparecerão aqui.</p>
                </div>
            )}
        </div>

        </div>
        <div className="hidden lg:block lg:col-span-2">
        <Card className="sticky top-24 bg-background">
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
        
        {/* Mobile Sheet and FAB */}
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                        <Button className="h-16 w-16 rounded-full shadow-lg">
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
    </div>
  );
}
