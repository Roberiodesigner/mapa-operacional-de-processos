import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mapa-operacional.roberio77.chatgpt.site"),
  title: "Mapa Operacional — Processos que viram execução",
  description: "Planeje visualmente, execute cada etapa e documente seus processos em um único mapa operacional.",
  openGraph: { title: "Mapa Operacional — Processos que viram execução", description: "Transforme processos em mapas. E mapas em execução.", type: "website", url: "/", images: [{ url: "/og.png", width: 1729, height: 910, alt: "Mapa Operacional — processos que viram execução" }] },
  twitter: { card: "summary_large_image", title: "Mapa Operacional", description: "Transforme processos em mapas. E mapas em execução.", images: ["/og.png"] },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
