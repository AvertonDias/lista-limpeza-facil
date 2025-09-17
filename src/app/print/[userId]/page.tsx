"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode.react";
import { Loader2, Printer, ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { logoUri } from "@/lib/logo-uri";
import { useToast } from "@/hooks/use-toast";

export default function PrintPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const userId = params.userId as string;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const publicUrl = `${window.location.origin}/lista/${userId}`;
      setUrl(publicUrl);
      setLoading(false);
    }
  }, [userId]);

  const handlePrint = () => {
    window.print();
  };

  const handleGoBack = () => {
    router.back();
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link Copiado!",
        description: "O link da lista de compras foi copiado para a área de transferência.",
      });
    }, (err) => {
      console.error('Could not copy text: ', err);
      toast({
        variant: "destructive",
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
      });
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 print:bg-white print:p-0 print:m-0 print:min-h-0">
      <div className="w-full max-w-lg text-center p-8 bg-white rounded-lg shadow-2xl print:shadow-none print:p-4">
        <h1 className="font-headline text-2xl font-bold text-gray-800 mb-6">
          Está faltando algum material de limpeza ou algo está quase acabando?
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          Escaneie o QR Code abaixo para atualizar a minha lista de compras.
        </p>
        <p className="text-base text-gray-500 mb-8">
          Você também pode me enviar sugestões ou tirar dúvidas!
        </p>

        <div className="flex justify-center mb-10">
          {url ? (
            <div className="p-4 bg-white border-4 border-gray-200 rounded-lg">
                <QRCode 
                  value={url} 
                  size={256}
                  imageSettings={{
                    src: logoUri,
                    height: 48,
                    width: 48,
                    excavate: true,
                  }}
                  level="H"
                />
            </div>
          ) : (
            <div className="w-64 h-64 bg-gray-200 animate-pulse rounded-lg" />
          )}
        </div>
        
        <div className="mt-12 flex flex-wrap justify-center gap-4 print:hidden">
            <Button onClick={handleGoBack} size="lg" variant="outline">
                <ArrowLeft className="mr-2" />
                Voltar
            </Button>
             <Button onClick={handleCopyLink} size="lg" variant="secondary">
                <Copy className="mr-2" />
                Copiar Link
            </Button>
            <Button onClick={handlePrint} size="lg">
                <Printer className="mr-2" />
                Imprimir
            </Button>
        </div>
      </div>
       <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
