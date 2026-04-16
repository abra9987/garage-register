"use client";

import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import {
  // LayoutDashboard,
  // Upload,
  // Table2,
  // Download,
  FileText,
  List,
  Users,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

// Garage Register nav — disabled for now
// const garageRegisterItems = [
//   { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
//   { title: "New Vehicle", href: "/upload", icon: Upload },
//   { title: "Register", href: "/register", icon: Table2 },
//   { title: "Export", href: "/export", icon: Download },
// ];

const navItems = [
  { title: "New Deal", href: "/deals/new", icon: FileText },
  { title: "Deals", href: "/deals", icon: List },
  { title: "Clients", href: "/clients", icon: Users },
];

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold tracking-tight">
            AD Auto Export
          </h2>
          <p className="text-xs text-muted-foreground">Deal Filing</p>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<a href={item.href} />}
                    isActive={pathname === item.href}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarSeparator className="mb-4" />
        {session?.user?.email && (
          <p className="text-xs text-muted-foreground truncate mb-2">
            {session.user.email}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
