import {Link, useRouteLoaderData} from "react-router";
import { Avatar, DropdownMenu, Flex, Text, TextField } from "@radix-ui/themes";
import { MagnifyingGlassIcon, GearIcon, ExitIcon, HomeIcon, QuestionMarkCircledIcon, EnvelopeClosedIcon } from "@radix-ui/react-icons";
import getInitials from "~/lib/getInitials";
import useAuth from "~/hooks/useAuth";

interface MenuItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface MenuCategory {
  category: string;
  items: MenuItem[];
}

const menuStructure: MenuCategory[] = [
  {
    category: "General",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <HomeIcon /> },
      { label: "Invitations", href: "/invitations", icon: <EnvelopeClosedIcon /> },
      { label: "Profile", href: "/profile", icon: <GearIcon /> },
    ],
  },
  {
    category: "Support",
    items: [
      { label: "Help", href: "/help", icon: <QuestionMarkCircledIcon /> },
      { label: "Documentation", href: "/docs", icon: <QuestionMarkCircledIcon /> },
    ],
  },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const {user} = useAuth()
  const initials = getInitials(user.name)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-1">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-2 border-r border-gray-a6 flex flex-col">
        {/* Logo */}
        <Flex align="center" className="px-6 h-16 border-b border-gray-a6">
          <img src="/logo.svg" className="h-10"/>
        </Flex>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4">
          {menuStructure.map((category, index) => (
            <div key={category.category} className={index > 0 ? "mb-6 pt-3 border-t border-gray-a6" : "mb-6"}>
              <Text size="1" weight="bold" className="text-gray-11 uppercase px-3 mb-2 block">
                {category.category}
              </Text>
              <Flex direction="column" gap="1" mt="2">
                {category.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-4 transition-colors text-gray-12"
                  >
                    {item.icon && <span className="text-gray-11">{item.icon}</span>}
                    <Text size="2">{item.label}</Text>
                  </Link>
                ))}
              </Flex>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-gray-2 border-b border-gray-a6 px-6 flex items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 max-w-xl">
            <TextField.Root
              placeholder="Search..."
              size="2"
            >
              <TextField.Slot>
                <MagnifyingGlassIcon height="16" width="16" />
              </TextField.Slot>
            </TextField.Root>
          </div>

          {/* User Menu */}
          <Flex align="center" gap="3">


            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Flex align="center" gap="3">
                  <Avatar
                      size="2"
                      fallback={initials}
                      radius="full"
                  />
                  <Flex direction="column" align="start" gap="0">
                    <Text size="2" weight="medium">
                      {user?.name || user?.email || "User"}
                    </Text>
                    {user?.name && (
                        <Text size="1" className="text-gray-11">
                          {user.email}
                        </Text>
                    )}
                  </Flex>
                </Flex>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item asChild>
                  <Link to="/profile" className="flex items-center gap-2">
                    <GearIcon />
                    Profile Settings
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item asChild>
                  <Link to="/auth/logout" className="flex items-center gap-2 text-red-11">
                    <ExitIcon />
                    Logout
                  </Link>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Flex>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-app-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
