import type { Route } from "./+types/home";
import { Link, useLoaderData } from "react-router";
import { Button, Flex, Container, Heading, Text, Box } from "@radix-ui/themes";
import { FileText, GitBranch, Users, Zap, LogIn, LayoutDashboard } from "lucide-react";
import { getApiClient } from "~/lib/axios.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Editex - Collaborative LaTeX Editor" },
    { name: "description", content: "Create and manage versions of your LaTeX document projects collaboratively" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const api = await getApiClient(request);
    const { data: user } = await api.get("/auth/me");
    return { user };
  } catch (error) {
    return { user: null };
  }
}

export default function Home() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-1 to-gray-3">
      {/* Header */}
      <header className="border-b border-gray-a6 bg-gray-2/80 backdrop-blur-sm sticky top-0 z-10">
        <Container size="4">
          <Flex align="center" justify="between" className="h-16">
            <Flex align="center" gap="2">
              <img src="/logo.svg" className="h-12"/>
            </Flex>

            <Flex gap="3" align="center">
              {user ? (
                <Link to="/dashboard">
                  <Button size="2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link to="/auth/login">
                  <Button size="2">
                    <LogIn className="w-4 h-4" />
                    Login
                  </Button>
                </Link>
              )}
            </Flex>
          </Flex>
        </Container>
      </header>

      {/* Hero Section */}
      <Container size="3" className="py-20">
        <Flex direction="column" align="center" gap="6" className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-3 text-accent-11 border border-accent-6">
            <Zap className="w-4 h-4" />
            <Text size="2" weight="medium">Collaborative LaTeX Editing</Text>
          </div>

          <Heading size="9" className="max-w-3xl">
            Create and Manage Versions of Your LaTeX Documents
          </Heading>

          <Text size="5" className="max-w-2xl text-gray-11">
            Editex is a collaborative text editor designed for LaTeX projects.
            Work together with your team, track changes, and manage document versions seamlessly.
          </Text>

          <Flex gap="3" mt="4">
            <Link to="/auth/register">
              <Button size="3">
                Get Started
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button size="3" variant="outline">
                Sign In
              </Button>
            </Link>
          </Flex>
        </Flex>

        {/* Features Grid */}
        <Flex gap="4" mt="8" wrap="wrap" justify="center">
          <Box className="flex-1 min-w-[280px] max-w-sm p-6 bg-gray-2 rounded-lg border border-gray-a6">
            <Flex direction="column" gap="3">
              <div className="w-12 h-12 rounded-lg bg-accent-3 flex items-center justify-center text-accent-11">
                <GitBranch className="w-6 h-6" />
              </div>
              <Heading size="4">Version Control</Heading>
              <Text size="3" className="text-gray-11">
                Track every change with built-in version control. Save versions, work in parallel variants, and never lose your work.
              </Text>
            </Flex>
          </Box>

          <Box className="flex-1 min-w-[280px] max-w-sm p-6 bg-gray-2 rounded-lg border border-gray-a6">
            <Flex direction="column" gap="3">
              <div className="w-12 h-12 rounded-lg bg-accent-3 flex items-center justify-center text-accent-11">
                <Users className="w-6 h-6" />
              </div>
              <Heading size="4">Real-time Collaboration</Heading>
              <Text size="3" className="text-gray-11">
                Work together with your team in real-time. See changes as they happen and collaborate seamlessly.
              </Text>
            </Flex>
          </Box>

          <Box className="flex-1 min-w-[280px] max-w-sm p-6 bg-gray-2 rounded-lg border border-gray-a6">
            <Flex direction="column" gap="3">
              <div className="w-12 h-12 rounded-lg bg-accent-3 flex items-center justify-center text-accent-11">
                <FileText className="w-6 h-6" />
              </div>
              <Heading size="4">LaTeX Made Easy</Heading>
              <Text size="3" className="text-gray-11">
                Professional document creation with LaTeX syntax support, live preview, and intelligent autocomplete.
              </Text>
            </Flex>
          </Box>
        </Flex>
      </Container>

      {/* Footer */}
      <Box className="border-t border-gray-a6 mt-20 py-8 bg-gray-2">
        <Container size="4">
          <Flex justify="center" gap="2">
            <Text size="2" className="text-gray-11">
              © 2024 Editex. All rights reserved.
            </Text>
          </Flex>
        </Container>
      </Box>
    </div>
  );
}
