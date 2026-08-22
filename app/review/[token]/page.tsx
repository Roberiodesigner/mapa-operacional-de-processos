import type { Metadata } from "next";
import PublicReview from "./public-review";
import "./review.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Revisão segura | Mapa Operacional",
    description: "Revise um mapa, marque o ponto desejado e registre seu comentário com segurança.",
    robots: { index: false, follow: false },
    openGraph: {
      title: "Revisão segura | Mapa Operacional",
      description: "Visualização protegida para comentários de clientes.",
      images: [],
    },
    twitter: {
      card: "summary",
      title: "Revisão segura | Mapa Operacional",
      description: "Visualização protegida para comentários de clientes.",
      images: [],
    },
  };
}

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicReview token={token} />;
}
