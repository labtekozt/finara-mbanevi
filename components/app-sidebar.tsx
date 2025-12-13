"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ArrowLeftRight,
  Settings,
  LogOut,
  Calculator,
  FileText,
  TrendingUp,
  Calendar,
  ClipboardCheck,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Scale,
  Lock,
  DollarSign,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "canAccessDashboard" as const,
  },
  {
    title: "Kasir",
    href: "/kasir",
    icon: ShoppingCart,
    permission: "canAccessKasir" as const,
  },
  {
    title: "Inventaris",
    href: "/inventaris",
    icon: Package,
    permission: "canAccessInventaris" as const,
  },
  {
    title: "Kalkulator Rabat",
    href: "/kalkulator-rabat",
    icon: Calculator,
    permission: "canAccessInventaris" as const,
  },
  {
    title: "Retur Pembelian",
    href: "/retur-pembelian",
    icon: RotateCcw,
    permission: "canAccessInventaris" as const,
  },
  {
    title: "Retur Penjualan",
    href: "/retur-penjualan",
    icon: RotateCcw,
    permission: "canAccessKasir" as const,
  },
  {
    title: "Hutang & Piutang",
    href: "/hutang-piutang",
    icon: DollarSign,
    permission: "canAccessAkuntansi" as const,
  },
  {
    title: "Akuntansi",
    href: "/akuntansi",
    icon: Calculator,
    permission: "canAccessAkuntansi" as const,
    submenu: [
      {
        title: "Dashboard",
        href: "/akuntansi",
        icon: TrendingUp,
      },
      {
        title: "Daftar Akun",
        href: "/akuntansi/akun",
        icon: Calculator,
      },
      {
        title: "Saldo Awal",
        href: "/akuntansi/saldo-awal",
        icon: Scale,
      },
      {
        title: "Jurnal",
        href: "/akuntansi/jurnal",
        icon: BookOpen,
      },
      {
        title: "Pengeluaran",
        href: "/akuntansi/pengeluaran",
        icon: FileText,
      },
      {
        title: "Buku Besar",
        href: "/akuntansi/buku-besar",
        icon: BookOpen,
      },
      {
        title: "Neraca Saldo",
        href: "/akuntansi/neraca-saldo",
        icon: Scale,
      },
      {
        title: "Laporan",
        href: "/akuntansi/laporan",
        icon: FileText,
      },
      {
        title: "Penutupan",
        href: "/akuntansi/penutupan",
        icon: Lock,
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [openSubmenu, setOpenSubmenu] = React.useState<string | null>(null);

  const filteredMenuItems = menuItems.filter((item) =>
    session?.user?.role
      ? hasPermission(session.user.role, item.permission)
      : false,
  );

  // Auto-open submenu if current path matches (only on mount)
  React.useEffect(() => {
    filteredMenuItems.forEach((item) => {
      if (item.submenu) {
        const isSubmenuActive = item.submenu.some((sub) =>
          pathname.startsWith(sub.href),
        );
        if (isSubmenuActive && openSubmenu === null) {
          setOpenSubmenu(item.href);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Sidebar className="bg-blue-50">
      <SidebarHeader className="border-b border-blue-200 px-6 py-4">
        <h2 className="text-xl font-bold">FINARA</h2>
        <p className="text-xs">Sistem Manajemen Ritel</p>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarMenu>
          {filteredMenuItems.map((item) => {
            if (item.submenu) {
              const isActive = pathname.startsWith(item.href);
              const isOpen = openSubmenu === item.href;

              return (
                <Collapsible
                  key={item.href}
                  open={isOpen}
                  onOpenChange={(open) =>
                    setOpenSubmenu(open ? item.href : null)
                  }
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={(e) => {
                          e.preventDefault();
                          setOpenSubmenu(isOpen ? null : item.href);
                        }}
                        className="hover:bg-blue-100 data-[active=true]:bg-blue-100"
                      >
                        <div className="bg-blue-600 rounded-lg p-2">
                          <item.icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-black">{item.title}</span>
                        <ChevronRight
                          className={`ml-auto h-4 w-4 text-blue-600 transition-transform duration-200 ${
                            isOpen ? "rotate-90" : ""
                          }`}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="border-blue-200">
                        {item.submenu.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.href} className="">
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.href}
                              className="hover:bg-blue-100 data-[active=true]:bg-blue-100 py-5"
                            >
                              <Link href={subItem.href}>
                                <div className="bg-blue-500 rounded-lg p-2">
                                  <subItem.icon className="h-4 w-4 text-white" />
                                </div>
                                <span className="text-black">
                                  {subItem.title}
                                </span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  className="hover:bg-blue-100 data-[active=true]:bg-blue-100 py-5"
                >
                  <Link href={item.href}>
                    <div className="bg-blue-600 rounded-lg p-2">
                      <item.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-gray-900">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-blue-200 p-4 space-y-3 bg-blue-50">
        <div className="flex items-center gap-3">
          <Avatar className="border border-blue-200">
            <AvatarFallback className="bg-blue-100">
              {session?.user?.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">
              {session?.user?.name}
            </p>
            <p className="text-xs">{session?.user?.role}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
        >
          <LogOut className="mr-2 h-4 w-4 text-red-600" />
          Keluar Akun
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
