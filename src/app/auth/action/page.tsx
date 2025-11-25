
"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
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
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/icons/logo";
import Link from "next/link";


function AuthActionHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [mode, setMode] = useState<string | null>(null);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidCode, setIsValidCode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchParams) {
        setError("Parâmetros de URL não disponíveis.");
        setIsLoading(false);
        return;
    }
    
    const modeParam = searchParams.get("mode");
    const oobCodeParam = searchParams.get("oobCode");

    if (!modeParam || !oobCodeParam) {
      setError("Link inválido ou expirado. Por favor, tente redefinir a senha novamente.");
      setIsLoading(false);
      return;
    }

    setMode(modeParam);
    setOobCode(oobCodeParam);

    if (modeParam === "resetPassword") {
      verifyPasswordResetCode(auth, oobCodeParam)
        .then(() => {
          setIsValidCode(true);
        })
        .catch(() => {
          setError("O link de redefinição de senha é inválido ou já foi utilizado. Por favor, solicite um novo link.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
        // Handle other modes like 'verifyEmail' if needed in the future
        setError(`Modo de ação não suportado: ${modeParam}`);
        setIsLoading(false);
    }
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "As senhas não coincidem.",
      });
      return;
    }

    if (password.length < 6) {
        toast({
            variant: "destructive",
            title: "Senha fraca",
            description: "A senha deve ter pelo menos 6 caracteres.",
        });
        return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      toast({
        title: "Senha Redefinida!",
        description: "Sua senha foi alterada com sucesso. Você já pode fazer login.",
      });
      router.push("/login");
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Redefinir Senha",
        description: "Ocorreu um erro. O link pode ter expirado. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
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
                <CardFooter>
                     <Button asChild className="w-full">
                        <Link href="/login">Voltar para o Login</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }


  if (mode === "resetPassword" && isValidCode) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-20 h-20">
                        <Logo />
                    </div>
                    <CardTitle className="font-headline text-3xl">Redefinir Senha</CardTitle>
                    <CardDescription>
                        Digite sua nova senha abaixo.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleResetPassword}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                    <Label htmlFor="password">Nova Senha</Label>
                    <div className="relative">
                        <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <div className="relative">
                        <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Repita a nova senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <Button className="w-full" type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Nova Senha
                    </Button>
                </CardFooter>
                </form>
            </Card>
        </div>
    );
  }

  return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
  );
}


export default function AuthActionPage() {
  return (
    <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    }>
      <AuthActionHandler />
    </Suspense>
  );
}
