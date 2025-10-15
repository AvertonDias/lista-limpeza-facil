"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDoc,
  getDocs,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Trash2,
  ShoppingCart,
  Search,
  MessageSquarePlus,
} from "lucide-react";
import { Logo } from "@/components/icons/logo";
import { CheckIcon } from "@/components/icons/check-icon";
import { PlusIcon } from "@/components/icons/plus-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendEmail } from "@/lib/email";

interface UserData {
    displayName?: string;
    email?: string;
}

type FeedbackType = "suggestion" | "doubt" | null;

export default function PublicListPage() {
  const { toast } = useToast();
  const params = useParams();

  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageOwner, setPageOwner] = useState<UserData | null>(null);
  const [customItemName, setCustomItemName] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Feedback Modal State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const userId = params.userId as string;

  useEffect(() => {
    if (!userId) {
      setError("ID de usuário inválido.");
      setPageLoading(false);
      return;
    }

    let unsubscribeMaterials: (() => void) | undefined;
    let unsubscribeShoppingList: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        setPageLoading(true);

        const userDocRef = doc(db, "users", userId);
        const materialsQuery = query(collection(db, "materials"), where("userId", "==", userId));
        const shoppingListDocRef = doc(db, "shoppingLists", userId);

        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setPageOwner({ 
            displayName: userData.displayName || 'Dono(a) da Lista',
            email: userData.email 
          });
        } else {
          // If the user document doesn't exist, we can't get the email.
          console.error("Documento do usuário não encontrado.");
          setError("Não foi possível encontrar o proprietário da lista.");
          setPageOwner(null);
        }

        const materialsSnapshot = await getDocs(materialsQuery);
        const materialsData: Material[] = [];
        materialsSnapshot.forEach((doc) => {
          materialsData.push({ id: doc.id, ...doc.data() } as Material);
        });
        materialsData.sort((a, b) => a.name.localeCompare(b.name));
        setMaterials(materialsData);

        const shoppingListDoc = await getDoc(shoppingListDocRef);
        if (shoppingListDoc.exists()) {
          const items = shoppingListDoc.data().items || [];
          items.sort((a: ShoppingListItem, b: ShoppingListItem) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          setShoppingList(items);
        } else {
          await setDoc(shoppingListDocRef, { userId: userId, items: [] });
        }

        setPageLoading(false);

        unsubscribeMaterials = onSnapshot(
          materialsQuery,
          (querySnapshot) => {
            const materialsData: Material[] = [];
            querySnapshot.forEach((doc) => {
              materialsData.push({ id: doc.id, ...doc.data() } as Material);
            });
            materialsData.sort((a, b) => a.name.localeCompare(b.name));
            setMaterials(materialsData);
          },
          (e) => {
            console.error("Error listening to materials: ", e);
            setError("Falha ao carregar os materiais.");
          }
        );

        unsubscribeShoppingList = onSnapshot(
          shoppingListDocRef,
          (doc) => {
            if (doc.exists()) {
              const newList = doc.data().items || [];
              newList.sort((a: ShoppingListItem, b: ShoppingListItem) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
              setShoppingList(newList);
            }
          },
          (e) => {
            console.error("Error listening to shopping list: ", e);
            setError("Falha ao carregar a lista de compras.");
          }
        );

      } catch (e) {
        console.error("Error setting up listeners: ", e);
        setError("Falha ao carregar a página. Verifique o link e tente novamente.");
        setPageLoading(false);
      }
    };

    setupListeners();

    return () => {
      unsubscribeMaterials?.();
      unsubscribeShoppingList?.();
    };
  }, [userId]);
  
  const notifyOwnerByEmail = (templateParams: Record<string, unknown>) => {
    if (!pageOwner?.email) {
      console.log("Dono da lista não tem e-mail, não é possível notificar.");
      return;
    }
    
    const templateID = 'template_ynk7ot9'; 

    sendEmail(templateID, {
      ...templateParams,
      to_email: pageOwner.email,
      to_name: pageOwner.displayName || 'Dono(a) da Lista',
    })
    .then((response) => {
       console.log('E-mail enviado com sucesso!', response.status, response.text);
    }, (err) => {
       console.error('Falha ao enviar e-mail.', err);
    });
  }


  const updateShoppingListInFirestore = async (newList: ShoppingListItem[]) => {
    if (!userId) return;
    const shoppingListDocRef = doc(db, "shoppingLists", userId);
    await setDoc(shoppingListDocRef, { items: newList, userId: userId }, { merge: true });
  }
  
  const handleToggleItemInShoppingList = async (item: Material) => {
    const updatedList = [...shoppingList];
    const existingItemIndex = updatedList.findIndex((i) => i.id === item.id);
    
    if (existingItemIndex > -1) {
        toast({
            title: "Item já está na lista!",
            description: `${item.name} já foi adicionado à lista de compras.`,
        });

    } else {
       const newItem: ShoppingListItem = { 
         id: item.id, 
         name: item.name,
         createdAt: Timestamp.now()
       };
       updatedList.push(newItem);
        await updateShoppingListInFirestore(updatedList);
        
        notifyOwnerByEmail({
          subject: `Novo item na sua lista: ${newItem.name}`,
          message: `O item <strong>${newItem.name}</strong> foi adicionado à sua lista de compras por um visitante.`,
        });
        
        toast({
          title: "Item Adicionado!",
          description: `${item.name} foi adicionado à lista de compras.`,
        });
    }
  };

  const handleAddCustomItem = async () => {
    if (!customItemName.trim()) {
      toast({
        variant: "destructive",
        title: "Nome inválido",
        description: "Por favor, digite o nome do item.",
      });
      return;
    }
    const newItem: ShoppingListItem = {
      id: `custom-${Date.now()}`,
      name: customItemName.trim(),
      createdAt: Timestamp.now()
    };
    const updatedList = [...shoppingList, newItem];
    await updateShoppingListInFirestore(updatedList);

    notifyOwnerByEmail({
        subject: `Novo item (avulso) na sua lista: ${newItem.name}`,
        message: `O item avulso "<strong>${newItem.name}</strong>" foi adicionado à sua lista de compras por um visitante.`,
    });

    toast({
      title: "Item Adicionado!",
      description: `${newItem.name} foi adicionado à lista.`,
    });
    setCustomItemName("");
  };

  const handleRemoveItemFromShoppingList = async (itemId: string) => {
    const updatedList = shoppingList.filter((i) => i.id !== itemId);
    await updateShoppingListInFirestore(updatedList);
  };
  
  const handleFeedbackSubmit = async () => {
    if (!feedbackType || !feedbackText.trim() || (feedbackType === 'doubt' && !feedbackName.trim())) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos necessários.",
      });
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      await addDoc(collection(db, "feedback"), {
        listOwnerId: userId,
        type: feedbackType,
        text: feedbackText,
        name: feedbackType === 'doubt' ? feedbackName : null,
        createdAt: serverTimestamp(),
        status: "new",
      });

      const subject = feedbackType === 'suggestion' ? 'Nova Sugestão Recebida!' : `Nova Dúvida de ${feedbackName}`;
      const fromName = feedbackType === 'doubt' ? feedbackName : "Visitante Anônimo";

      notifyOwnerByEmail({
          subject: subject,
          message: `Você recebeu uma nova mensagem de <strong>${fromName}</strong>.<br><br><strong>Mensagem:</strong><br>${feedbackText}`,
      });


      toast({
        title: "Mensagem Enviada!",
        description: "Obrigado pelo seu feedback.",
      });

      setIsFeedbackModalOpen(false);
      setFeedbackType(null);
      setFeedbackName("");
      setFeedbackText("");
    } catch (error) {
      console.error("Error sending feedback: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: "Não foi possível enviar sua mensagem. Tente novamente.",
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const shoppingListIds = useMemo(() => new Set(shoppingList.map(item => item.id)), [shoppingList]);
  
  const filteredMaterials = useMemo(() => {
    return materials
      .filter((material) => !shoppingListIds.has(material.id))
      .filter((material) =>
        material.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [materials, searchQuery, shoppingListIds]);

  if (pageLoading) {
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

  const renderShoppingList = () => (
    <>
      <div className="w-full space-y-2 mb-4">
        <Input 
          type="text" 
          placeholder="Adicionar item avulso"
          value={customItemName}
          onChange={(e) => setCustomItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCustomItem()}
        />
        <Button type="submit" onClick={handleAddCustomItem} className="w-full">Adicionar</Button>
      </div>
      <Separator className="mb-4" />
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
          <p>A lista de compras está vazia.</p>
          <p className="text-sm">
            Clique nos itens disponíveis para adicionar.
          </p>
        </div>
      )}
    </>
  );

  return (
     <div className="flex min-h-screen w-full flex-col">
       <header className="sticky top-0 z-30 flex flex-col gap-4 border-b bg-background/95 p-4 md:px-6">
            <div className="flex items-center justify-between self-start gap-2 w-full">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8">
                        <Logo />
                    </div>
                    <span className="font-headline text-xl font-semibold">Lista de Limpeza Fácil</span>
                </div>
                <div className="md:hidden">
                    {/* Placeholder for potential mobile-only actions */}
                </div>
            </div>
            <Dialog open={isFeedbackModalOpen} onOpenChange={(isOpen) => {
                setIsFeedbackModalOpen(isOpen);
                if (!isOpen) {
                  setFeedbackType(null);
                  setFeedbackName("");
                  setFeedbackText("");
                }
            }}>
                <DialogTrigger asChild>
                    <Button className="w-full">
                        <MessageSquarePlus className="mr-2 h-4 w-4" />
                        Sugestões ou Dúvidas
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Deixe sua mensagem</DialogTitle>
                        <DialogDescription>
                            Sua opinião é importante! Selecione o tipo de mensagem que deseja enviar.
                        </DialogDescription>
                    </DialogHeader>
                    {!feedbackType ? (
                        <div className="flex justify-center gap-4 py-8">
                            <Button onClick={() => setFeedbackType('suggestion')} size="lg">Sugestão</Button>
                            <Button onClick={() => setFeedbackType('doubt')} size="lg" variant="secondary">Dúvida</Button>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <h3 className="font-medium text-lg text-center">{feedbackType === 'suggestion' ? 'Enviar Sugestão' : 'Tirar Dúvida'}</h3>
                            {feedbackType === 'doubt' && (
                                <div className="space-y-2">
                                    <Label htmlFor="name">Seu Nome</Label>
                                    <Input 
                                        id="name" 
                                        placeholder="Digite seu nome"
                                        value={feedbackName}
                                        onChange={(e) => setFeedbackName(e.target.value)}
                                    />
                                </div>
                            )}
                             <div className="space-y-2">
                                <Label htmlFor="message">{feedbackType === 'suggestion' ? 'Sugestão' : 'Dúvida'}</Label>
                                <Textarea 
                                    id="message" 
                                    placeholder={`Digite sua ${feedbackType === 'suggestion' ? 'sugestão' : 'dúvida'} aqui...`}
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)} 
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                         {feedbackType && (
                             <>
                                <Button variant="ghost" onClick={() => setFeedbackType(null)}>Voltar</Button>
                                <Button onClick={handleFeedbackSubmit} disabled={isSubmittingFeedback}>
                                    {isSubmittingFeedback && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Enviar
                                </Button>
                             </>
                         )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </header>
       <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 pb-24">
        {error ? (
             <div className="text-center text-destructive py-16">{error}</div>
        ) : (
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                     <div className="flex items-center justify-between mb-6 gap-2">
                        <h1 className="font-headline text-3xl font-bold tracking-tight">
                            Itens Disponíveis
                        </h1>
                    </div>
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            type="text"
                            placeholder="Pesquisar item..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10"
                        />
                    </div>
                     <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                        {filteredMaterials.map((material) => {
                            const isInList = shoppingListIds.has(material.id);
                            return (
                                <Card
                                key={material.id}
                                className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg group cursor-pointer"
                                onClick={() => handleToggleItemInShoppingList(material)}
                                >
                                    <CardHeader className="flex-row items-center justify-between p-4">
                                        <CardTitle className="font-headline text-base">
                                        {material.name}
                                        </CardTitle>
                                        <div className="flex justify-end gap-1">
                                            {isInList ? (
                                                <CheckIcon className="h-5 w-5 text-primary" />
                                            ) : (
                                                <PlusIcon className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </CardHeader>
                                </Card>
                            );
                        })}
                    </div>
                </div>
                 <div className="hidden lg:block lg:col-span-1">
                    <Card className="sticky top-24">
                      <CardHeader>
                          <CardTitle className="font-headline text-2xl">
                            Lista de Compras
                          </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {renderShoppingList()}
                      </CardContent>
                    </Card>
                </div>
            </div>
        )}
       </main>
       
        {/* Mobile Sheet and FAB */}
        <div className="lg:hidden">
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
     </div>
  );
}

    