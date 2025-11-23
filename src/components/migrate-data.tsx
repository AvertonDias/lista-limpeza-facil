"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DatabaseZap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MigrateData() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const { toast } = useToast();

  const handleMigration = async () => {
    setIsMigrating(true);

    try {
      const materialsSnapshot = await getDocs(collection(db, "materials"));
      if (materialsSnapshot.empty) {
        toast({
          title: "Nenhum dado para migrar",
          description: "A coleção 'materials' já está vazia.",
        });
        setMigrationDone(true);
        return;
      }

      const batch = writeBatch(db);

      materialsSnapshot.forEach((materialDoc) => {
        // Cria uma nova referência na coleção 'items' com o mesmo ID
        const newItemRef = doc(db, "items", materialDoc.id);
        // Copia os dados do documento antigo para o novo
        batch.set(newItemRef, materialDoc.data());
      });

      await batch.commit();

      toast({
        title: "Migração Concluída!",
        description: `${materialsSnapshot.size} itens foram movidos para a nova coleção.`,
      });
      setMigrationDone(true);
    } catch (error) {
      console.error("Erro durante a migração:", error);
      toast({
        variant: "destructive",
        title: "Erro na Migração",
        description:
          "Ocorreu um erro ao migrar os dados. Verifique o console.",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  if (migrationDone) {
    return (
        <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300">
            <DatabaseZap className="h-4 w-4" />
            <AlertTitle>Migração Completa</AlertTitle>
            <AlertDescription>
                Seus dados foram atualizados. Você pode remover o componente de migração do código.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <Alert className="mb-6">
        <DatabaseZap className="h-4 w-4" />
        <AlertTitle>Atualização de Dados Necessária</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <p>Seus itens precisam ser migrados para a nova estrutura do app.</p>
            <Button onClick={handleMigration} disabled={isMigrating} className="w-full sm:w-auto">
                {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Migrar Dados Agora
            </Button>
        </AlertDescription>
    </Alert>
  );
}
