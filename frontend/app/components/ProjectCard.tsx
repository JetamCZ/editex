import { Badge } from "@radix-ui/themes";
import { Link } from "react-router";
import type { Project } from "../../types/project";
import Role, { type RoleType } from "~/const/Role";
import { FileText } from "lucide-react";

const PROJECT_COLORS = [
  '#1a73e8', '#d93025', '#188038', '#f9ab00',
  '#e8710a', '#7627bb', '#007b83', '#1e8e3e',
  '#c5221f', '#1967d2', '#0277bd', '#00695c',
];

export function getProjectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getRoleBadgeColor(role: RoleType): 'purple' | 'blue' | 'gray' {
  switch (role) {
    case Role.MANAGER: return 'purple';
    case Role.EDITOR: return 'blue';
    default: return 'gray';
  }
}

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const color = getProjectColor(project.name);

  return (
    <Link to={`/project/${project.baseProject}`} style={{ textDecoration: 'none' }}>
      <div
        className="group rounded-xl border overflow-hidden bg-white cursor-pointer hover:shadow-md transition-all duration-150"
        style={{ borderColor: 'var(--gray-a6)' }}
      >
        {/* Document preview area */}
        <div
          className="h-36 flex items-center justify-center border-b"
          style={{
            backgroundColor: `${color}14`,
            borderColor: 'var(--gray-a6)',
          }}
        >
          {/* Mini paper document */}
          <div
            className="w-20 h-28 bg-white rounded-lg shadow border flex flex-col px-2.5 py-2.5 gap-1 overflow-hidden"
            style={{ borderColor: 'var(--gray-a6)' }}
          >
            {/* Colored title bar */}
            <div className="h-1.5 rounded-full" style={{ backgroundColor: color, width: '60%' }} />
            {/* Simulated text lines */}
            <div className="mt-1 flex flex-col gap-1">
              <div className="h-[3px] rounded-full" style={{ backgroundColor: '#d1d5db' }} />
              <div className="h-[3px] rounded-full" style={{ backgroundColor: '#d1d5db', width: '90%' }} />
              <div className="h-[3px] rounded-full" style={{ backgroundColor: '#d1d5db' }} />
              <div className="h-[3px] rounded-full" style={{ backgroundColor: '#e5e7eb', width: '70%' }} />
            </div>
            <div className="mt-1 flex flex-col gap-1">
              <div className="h-[3px] rounded-full" style={{ backgroundColor: '#d1d5db' }} />
              <div className="h-[3px] rounded-full" style={{ backgroundColor: '#d1d5db', width: '85%' }} />
              <div className="h-[3px] rounded-full" style={{ backgroundColor: '#d1d5db' }} />
              <div className="h-[3px] rounded-full" style={{ backgroundColor: '#e5e7eb', width: '60%' }} />
            </div>
          </div>
        </div>

        {/* Card footer */}
        <div className="px-3.5 py-3 flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: `${color}1e` }}
          >
            <FileText size={14} style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium leading-tight truncate"
              style={{ color: 'var(--gray-12)' }}
            >
              {project.name}
            </p>
            <p
              className="text-xs leading-tight mt-0.5"
              style={{ color: 'var(--gray-11)' }}
            >
              {formatRelativeDate(project.updatedAt)}
            </p>
          </div>
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
      </div>
    </Link>
  );
}
