import { Card, Flex, Heading, Text, Badge } from "@radix-ui/themes";
import { Link } from "react-router";
import type { Project } from "../../types/project";
import Role, {type RoleType} from "~/const/Role";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeColor = (role: RoleType) => {
    switch (role) {
      case Role.OWNER:
        return 'purple';
      case Role.EDITOR:
        return 'blue';
      case Role.VIEWER:
        return 'gray';
    }
  };

  return (
    <Link to={`/project/${project.baseProject}`} style={{ textDecoration: 'none' }}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <Flex direction="column" gap="2">
          <Flex justify="between" align="center">
            <Heading size="4">{project.name}</Heading>
            {project.userRole && (
              <Badge color={getRoleBadgeColor(project.userRole)} size="1">
                {project.userRole}
              </Badge>
            )}
          </Flex>
          <Text size="2" className="text-gray-11">
            Created: {formatDate(project.createdAt)}
          </Text>
          <Text size="2" className="text-gray-11">
            Last updated: {formatDate(project.updatedAt)}
          </Text>
        </Flex>
      </Card>
    </Link>
  );
}
