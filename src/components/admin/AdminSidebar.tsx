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
  ChevronLeft,
  ChevronRight,
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
import { cn } from "@/lib/utils";

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
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar">
        <div className="flex items-center justify-between px-2 py-3">
          {!isCollapsed && (
            <span className="font-semibold text-sm text-sidebar-foreground">Admin Panel</span>
          )}
          <button
            onClick={toggleSidebar}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-md",
              "hover:bg-sidebar-accent text-sidebar-foreground transition-colors",
              isCollapsed && "mx-auto"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
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
                      className="flex items-center gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
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
          <SidebarGroupLabel className="text-sidebar-foreground/70">Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Candidates */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Candidates</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {applicationsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
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
          <SidebarGroupLabel className="text-sidebar-foreground/70">Assessments</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {assessmentItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
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
