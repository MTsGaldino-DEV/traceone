import type { Metadata } from "next";
import { Archivo, Atkinson_Hyperlegible_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: "--font-atkinson-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TraceOne",
    template: "%s | TraceOne",
  },
  description: "Controle de medidores: entrega ao técnico e conciliação com o GDIS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${atkinsonMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
