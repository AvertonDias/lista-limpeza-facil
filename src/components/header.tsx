"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/icons/logo";
import { LogOut, User, Edit, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { doc, updateDoc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [currentUserData, setCurrentUserData] = useState({
    displayName: "",
    photoURL: "",
  });

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setCurrentUserData({
            displayName: userData.displayName || user.email || "Usuário",
            photoURL: user.photoURL || "",
          });
          setDisplayName(userData.displayName || "");
          const rawNumber = userData.whatsapp || "";
          setWhatsappNumber(formatWhatsApp(rawNumber));
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleProfileSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const digitsOnly = whatsappNumber.replace(/\D/g, "");
      const userDocRef = doc(db, "users", user.uid);
      
      await updateDoc(userDocRef, {
        displayName: displayName,
        whatsapp: digitsOnly,
      });

      if (user.displayName !== displayName) {
        await updateProfile(user, { displayName });
      }

      toast({
        title: "Perfil Atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
      setIsProfileModalOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar seu perfil. Tente novamente.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatWhatsApp = (value: string) => {
    if (!value) return "";
    const digitsOnly = value.replace(/\D/g, "");
    
    if (digitsOnly.length <= 2) {
      return `(${digitsOnly}`;
    }
    if (digitsOnly.length <= 7) {
      return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2)}`;
    }
    return `(${digitsOnly.slice(0, 2)}) ${digitsOnly.slice(2, 7)}-${digitsOnly.slice(7, 11)}`;
  }

  const handleWhatsAppInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsappNumber(formatWhatsApp(e.target.value));
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(' ');
    const initials = names.map(n => n[0]).join('');
    return initials.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8">
            <Logo />
          </div>
          <span className="font-headline text-xl font-semibold">Lista de Limpeza Fácil</span>
        </Link>
        <div className="ml-auto">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={currentUserData.photoURL || undefined} alt={currentUserData.displayName || ""} />
                    <AvatarFallback>{currentUserData.displayName ? getInitials(currentUserData.displayName) : <User />}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUserData.displayName || 'Usuário'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Editar Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize seu nome de exibição e número do WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="whatsapp" className="text-right">
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                value={whatsappNumber}
                onChange={handleWhatsAppInputChange}
                placeholder="(XX) XXXXX-XXXX"
                className="col-span-3"
                maxLength={15}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleProfileSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    