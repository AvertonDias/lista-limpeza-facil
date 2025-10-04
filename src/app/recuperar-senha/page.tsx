
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/icons/logo";
import Link from "next/link";
import { auth, sendPasswordResetEmail } from "@/lib/firebase";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada (e de spam) para redefinir sua senha.",
      });
      router.push("/login");
    } catch (error: any) {
      let errorMessage = "Ocorreu um erro. Tente novamente.";
      if (error.code === 'auth/user-not-found') {
        errorMessage = "Nenhuma conta encontrada com este e-mail.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "O formato do email é inválido.";
      }
      toast({
        variant: "destructive",
        title: "Erro ao redefinir senha",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-20 h-20">
            <Logo />
          </div>
          <CardTitle className="font-headline text-3xl">Recuperar Senha</CardTitle>
          <CardDescription>
            Digite seu e-mail para receber o link de redefinição.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordReset}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar e-mail de redefinição
            </Button>
             <p className="text-xs text-center text-muted-foreground pt-2">
              Caso não receba o e-mail, verifique sua caixa de spam.
            </p>
            <Link href="/login" className="text-sm font-medium text-primary hover:underline pt-2">
                Voltar para o login
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
