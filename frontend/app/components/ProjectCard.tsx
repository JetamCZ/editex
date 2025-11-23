import { Card, Flex, Heading, Text } from "@radix-ui/themes";
import { Link } from "react-router";
import type { Project } from "../../types/project";

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

  return (
    <Link to={`/project/${project.id}`} style={{ textDecoration: 'none' }}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <Flex direction="column" gap="2">
          <Heading size="4">{project.name}</Heading>
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
