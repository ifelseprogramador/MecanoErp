import Link from "next/link";
import { ShieldAlert, LogOut } from "lucide-react";
import { requireAdmin, NotPlatformAdminError } from "@/core/admin-auth";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof NotPlatformAdminError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-lg font-semibold">Área restrita</h1>
          <p className="text-muted-foreground max-w-sm text-sm">{err.message}</p>
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/" />} nativeButton={false}>
              Voltar ao painel
            </Button>
            <form action={logout}>
              <Button variant="ghost" type="submit">
                Sair
              </Button>
            </form>
          </div>
        </div>
      );
    }
    throw err;
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center justify-between border-b bg-zinc-950 px-4 py-3 text-zinc-50">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          <span className="font-semibold">MecanoErp — Administração da plataforma</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-zinc-300 hover:text-zinc-50">
            Voltar ao app
          </Link>
          <form action={logout}>
            <Button
              variant="ghost"
              size="icon"
              type="submit"
              aria-label="Sair"
              className="text-zinc-50"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 bg-zinc-50 p-4 md:p-6 dark:bg-zinc-900">{children}</main>
    </div>
  );
}
