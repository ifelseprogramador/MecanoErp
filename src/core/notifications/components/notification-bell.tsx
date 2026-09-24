"use client";

import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/core/format";
import { markNotificationRead } from "../actions";
import { NOTIFICATION_CATEGORY_META } from "../category";
import type { NotificationCategory } from "../validation";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  createdAt: Date;
  readAt: Date | null;
}

/**
 * Sino de avisos que o dono da plataforma manda — no cabeçalho de toda
 * página autenticada (`(app)/layout.tsx`), não só um módulo. Marca como
 * lida ao ABRIR o dropdown (não precisa clicar em cada uma) — mesmo
 * modelo mental de e-mail/notificação de celular.
 */
export function NotificationBell({ initialItems }: { initialItems: NotificationItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [, startTransition] = useTransition();
  const unreadCount = items.filter((i) => !i.readAt).length;

  function handleOpenChange(open: boolean) {
    if (!open) return;
    const unread = items.filter((i) => !i.readAt);
    if (unread.length === 0) return;
    setItems((prev) => prev.map((i) => (i.readAt ? i : { ...i, readAt: new Date() })));
    startTransition(() => {
      for (const item of unread) {
        void markNotificationRead(item.id);
      }
    });
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notificações" className="relative" />
        }
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="bg-destructive absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notificações</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.length === 0 ? (
            <p className="text-muted-foreground px-2 py-3 text-center text-sm">
              Nenhuma notificação ainda.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col divide-y overflow-y-auto">
              {items.map((item) => {
                const meta = NOTIFICATION_CATEGORY_META[item.category];
                const Icon = meta.icon;
                return (
                  <li key={item.id} className="flex gap-2 px-2 py-2.5 text-sm">
                    <div className={`mt-0.5 shrink-0 rounded-md p-1 ${meta.className}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        {!item.readAt && (
                          <span className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                        )}
                        <span className="truncate font-medium">{item.title}</span>
                      </div>
                      <p className="text-muted-foreground text-xs whitespace-pre-wrap">
                        {item.body}
                      </p>
                      <span className="text-muted-foreground text-[11px]">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
