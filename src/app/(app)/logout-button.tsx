import { LogOut } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { logoutAction } from "./actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <SidebarMenuButton type="submit" tooltip="Log out">
        <LogOut />
        <span>Log out</span>
      </SidebarMenuButton>
    </form>
  );
}
