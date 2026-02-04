import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <SidebarProvider defaultOpen={true}>
        <div className="flex flex-1 w-full">
          <AdminSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <main className="flex-1 p-6">
              {children}
            </main>
            <Footer />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
