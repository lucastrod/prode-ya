import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRODE YA 2026 | Soluciones YA",
  description: "Plataforma de pronósticos del Mundial 2026 para empleados de Soluciones YA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}

