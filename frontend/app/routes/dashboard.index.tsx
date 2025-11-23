import { useRouteLoaderData, useLoaderData, Link } from "react-router";
import { Button, Flex, Heading, Text, Grid, Box } from "@radix-ui/themes";
import ProjectCard from "../components/ProjectCard";
import type { User } from "../../types/user";
import type { Project } from "../../types/project";

export default function DashboardIndex() {
  const { user } = useRouteLoaderData("auth-user") as { user: User };
  const { projects } = useRouteLoaderData("dashboard") as { projects: Project[] };

  return (
    <div className="p-8">
      <Flex direction="column" gap="6">
        <Box>
          <Flex justify="between" align="center">
            <Box>
              <Heading size="8" mb="2">
                Welcome back, {user.name || user.email}!
              </Heading>
              <Text size="3" className="text-gray-11">
                Here's what's happening with your projects today.
              </Text>
            </Box>
            <Link to="/dashboard/new">
              <Button size="3">New Project</Button>
            </Link>
          </Flex>
        </Box>

        <Box>
          <Heading size="6" mb="4">
            Your Projects
          </Heading>
          {projects.length === 0 ? (
            <Text className="text-gray-11">
              No projects yet. Create your first project to get started!
            </Text>
          ) : (
            <Grid columns="3" gap="4" width="auto">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </Grid>
          )}
        </Box>
      </Flex>
    </div>
  );
}
