
"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode.react";
import { Loader2, Printer, ArrowLeft, Copy, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function PrintPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoDataUri, setLogoDataUri] = useState<string | null>(null);

  const userId = params.userId as string;

  useEffect(() => {
    // Generate the logo as a Data URI to be embedded in the QR Code
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#457B9D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m16 6 4 4-10 10-4-4 10-10"/>
        <path d="m10 12 4 4"/>
        <path d="M12 20h.01"/>
        <path d="M4 12h.01"/>
        <path d="M4 16h.01"/>
        <path d="M8 20h.01"/>
        <path d="m20 8-4-4"/>
      </svg>
    `;
    const encodedSvg = btoa(svgString);
    setLogoDataUri(`data:image/svg+xml;base64,${encodedSvg}`);
    
    if (typeof window !== "undefined" && userId) {
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
    if (!url) return;
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

  if (loading || !logoDataUri) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 print:bg-white print:p-0 print:m-0 print:min-h-0">
      <div className="w-full max-w-lg text-center p-8 bg-white rounded-lg shadow-2xl print:shadow-none print:p-4">
        <div className="mx-auto w-16 h-16 mb-6">
          <ListChecks className="w-full h-full text-primary" />
        </div>
        <h1 className="font-headline text-2xl font-bold text-gray-800 mb-2">
          Está faltando algum item ou algo está quase acabando?
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Escaneie o QR Code abaixo para atualizar a minha lista de compras.
        </p>

        <div className="flex justify-center mb-6">
          {url ? (
            <div className="p-4 bg-white border-4 border-gray-200 rounded-lg">
                <QRCode 
                  value={url} 
                  size={256}
                  level="H"
                  imageSettings={{
                    src: logoDataUri,
                    height: 48,
                    width: 48,
                    excavate: true,
                  }}
                />
            </div>
          ) : (
            <div className="w-64 h-64 bg-gray-200 animate-pulse rounded-lg" />
          )}
        </div>
        
        <p className="text-sm text-gray-500">
          (Não é preciso instalar nada, o link abrirá no seu navegador)
        </p>
        
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
