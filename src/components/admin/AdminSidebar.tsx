import { NavLink } from "@/components/NavLink";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Briefcase,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  FileCheck,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  Target,
  Users,
} from "lucide-react";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
  },
];

const managementItems = [
  {
    title: "Campaigns",
    url: "/admin/campaigns",
    icon: Megaphone,
  },
  {
    title: "Templates",
    url: "/admin/templates",
    icon: LayoutTemplate,
  },
  {
    title: "Jobs",
    url: "/admin/jobs",
    icon: Briefcase,
  },
  {
    title: "Slots",
    url: "/admin/slots",
    icon: Calendar,
  },
];

const applicationsItems = [
  {
    title: "Applications",
    url: "/admin/applications",
    icon: Users,
  },
  {
    title: "Tasks",
    url: "/admin/tasks",
    icon: ClipboardList,
  },
  {
    title: "Submissions",
    url: "/admin/submissions",
    icon: FileCheck,
  },
];

const assessmentItems = [
  {
    title: "Questions",
    url: "/admin/questions",
    icon: ClipboardCheck,
  },
  {
    title: "Test Results",
    url: "/admin/results",
    icon: FileText,
  },
  {
    title: "Eval Params",
    url: "/admin/evaluations",
    icon: Target,
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <SidebarTrigger className="h-8 w-8" />
          {!isCollapsed && (
            <span className="font-semibold text-sm">Admin Panel</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-2"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Applications */}
        <SidebarGroup>
          <SidebarGroupLabel>Candidates</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {applicationsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Assessments */}
        <SidebarGroup>
          <SidebarGroupLabel>Assessments</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {assessmentItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
