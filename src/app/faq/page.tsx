"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Logo } from "@/components/icons/logo";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const faqData = [
  {
    question: "O que é o Lista Fácil?",
    answer:
      "É um aplicativo que simplifica a gestão de listas de compras em ambientes compartilhados, como sua casa ou escritório. Ele permite que qualquer pessoa adicione itens à sua lista de compras de forma rápida, usando um link ou QR Code, sem precisar de login.",
  },
  {
    question: "Preciso pagar para usar o aplicativo?",
    answer:
      "Não, o Lista Fácil é totalmente gratuito tanto para administradores de listas quanto para colaboradores.",
  },
  {
    question: "Quem pode adicionar itens à minha lista de compras?",
    answer:
      "Qualquer pessoa que tenha acesso ao seu link público ou que escaneie seu QR Code. Eles não precisam criar uma conta, garantindo um processo rápido e sem barreiras.",
  },
  {
    question: "Como eu sei que um item foi adicionado à minha lista?",
    answer:
      "Você será notificado em tempo real através de notificações push no seu celular ou navegador, desde que você tenha ativado as notificações no seu painel.",
  },
  {
    question: "É possível adicionar um item que não está na minha lista padrão?",
    answer:
      'Sim! A página pública possui um campo para adicionar "itens avulsos". Isso é útil para necessidades pontuais, como "Lâmpada da cozinha" ou "Toner para impressora", que não fazem parte dos seus itens recorrentes.',
  },
  {
    question: "Meus dados estão seguros?",
    answer:
      "Sim. Apenas suas informações públicas (nome e itens padrão) são visíveis na sua página de lista. Suas informações de login e a sua lista de compras completa são privadas e só podem ser acessadas por você através do seu painel de controle (dashboard).",
  },
  {
    question: "Posso gerenciar o que aparece na minha lista pública?",
    answer:
      'Com certeza. No seu painel, você tem controle total sobre os "Itens Padrão". Você pode adicionar, editar ou remover itens a qualquer momento, e as alterações são refletidas instantaneamente na sua página pública.',
  },
  {
    question: 'Para que serve a função "Sugestões ou Dúvidas"?',
    answer:
      "Ela permite que visitantes da sua página pública enviem mensagens diretamente para você. É uma forma fácil de receber sugestões de novos produtos ou esclarecer dúvidas, centralizando toda a comunicação no seu painel.",
  },
];

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8">
            <Logo />
          </div>
          <span className="font-headline text-xl font-semibold hidden sm:inline-block">
            Lista Fácil
          </span>
        </Link>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="font-headline text-4xl font-bold tracking-tight">
              Perguntas Frequentes
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Encontre respostas para as dúvidas mais comuns sobre o Lista Fácil.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqData.map((item, index) => (
              <AccordionItem value={`item-${index + 1}`} key={index}>
                <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
           <div className="mt-12 text-center">
                <Button asChild size="lg">
                    <Link href="/signup">Comece a usar agora</Link>
                </Button>
            </div>
        </div>
      </main>
    </div>
  );
}