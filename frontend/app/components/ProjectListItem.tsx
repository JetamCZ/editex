import { Badge } from "@radix-ui/themes";
import { Link } from "react-router";
import type { Project } from "../../types/project";
import Role, { type RoleType } from "~/const/Role";
import { FileText } from "lucide-react";
import { getProjectColor, formatRelativeDate } from "./ProjectCard";

function getRoleBadgeColor(role: RoleType): 'purple' | 'blue' | 'gray' {
  switch (role) {
    case Role.MANAGER: return 'purple';
    case Role.EDITOR: return 'blue';
    default: return 'gray';
  }
}

interface ProjectListItemProps {
  project: Project;
}

export default function ProjectListItem({ project }: ProjectListItemProps) {
  const color = getProjectColor(project.name);

  return (
    <Link to={`/project/${project.baseProject}`} style={{ textDecoration: 'none' }}>
      <div
        className="flex items-center gap-3 px-5 py-3 transition-colors cursor-pointer border-b last:border-b-0 hover:bg-[var(--gray-2)]"
        style={{ borderColor: 'var(--gray-a6)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: `${color}14` }}
        >
          <FileText size={16} style={{ color }} />
        </div>
        <p
          className="flex-1 min-w-0 text-sm font-medium truncate"
          style={{ color: 'var(--gray-12)' }}
        >
          {project.name}
        </p>
        <p
          className="text-xs flex-shrink-0 tabular-nums"
          style={{ color: 'var(--gray-11)' }}
        >
          {formatRelativeDate(project.updatedAt)}
        </p>
        {project.userRole && (
          <Badge
            color={getRoleBadgeColor(project.userRole)}
            size="1"
            variant="soft"
            className="flex-shrink-0"
          >
            {project.userRole}
          </Badge>
        )}
      </div>
    </Link>
  );
}
