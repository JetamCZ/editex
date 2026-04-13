import { useState } from "react";
import { useRouteLoaderData, Link } from "react-router";
import { Button, Flex, Heading, Text } from "@radix-ui/themes";
import { LayoutGrid, List, Plus, Clock, FileText } from "lucide-react";
import ProjectCard from "../components/ProjectCard";
import ProjectListItem from "../components/ProjectListItem";
import type { User } from "../../types/user";
import type { Project } from "../../types/project";
import { useTranslation } from 'react-i18next';

export default function DashboardIndex() {
  const { t } = useTranslation();
  const { user } = useRouteLoaderData("auth-user") as { user: User };
  const { projects } = useRouteLoaderData("dashboard") as { projects: Project[] };
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="flex flex-col h-full">
      {/* Start a new project bar */}
      <div
        className="border-b px-8 py-5 flex-shrink-0"
        style={{ backgroundColor: 'var(--gray-2)', borderColor: 'var(--gray-a6)' }}
      >
        <Text
          size="1"
          weight="bold"
          className="uppercase tracking-widest block mb-3"
          style={{ color: 'var(--gray-11)', letterSpacing: '0.08em' }}
        >
          {t('dashboard.index.startNewProject')}
        </Text>
        <Link to="/dashboard/new" style={{ textDecoration: 'none' }}>
          <div className="inline-flex flex-col items-center gap-2 group cursor-pointer">
            <div
              className="w-28 h-36 rounded-xl border-2 border-dashed bg-white flex flex-col items-center justify-center gap-2 transition-all duration-150 group-hover:shadow-sm"
              style={{ borderColor: 'var(--gray-a6)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-8)';
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-1)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-a6)';
                (e.currentTarget as HTMLElement).style.backgroundColor = 'white';
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-3)' }}
              >
                <Plus size={20} style={{ color: 'var(--accent-11)' }} />
              </div>
            </div>
            <Text size="2" weight="medium" style={{ color: 'var(--gray-12)' }}>
              {t('dashboard.index.blankProject')}
            </Text>
          </div>
        </Link>
      </div>

      {/* Recent projects section */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <Flex justify="between" align="center" mb="4">
          <Flex align="center" gap="2">
            <Clock size={15} style={{ color: 'var(--gray-11)' }} />
            <Heading size="4">{t('dashboard.index.recentProjects')}</Heading>
          </Flex>

          {/* View mode toggle */}
          <Flex
            align="center"
            gap="0"
            className="rounded-lg border p-0.5"
            style={{ borderColor: 'var(--gray-a6)', backgroundColor: 'var(--gray-2)' }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-100"
              style={{
                backgroundColor: viewMode === 'grid' ? 'white' : 'transparent',
                color: viewMode === 'grid' ? 'var(--gray-12)' : 'var(--gray-11)',
                boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <LayoutGrid size={13} />
              {t('common.grid')}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-100"
              style={{
                backgroundColor: viewMode === 'list' ? 'white' : 'transparent',
                color: viewMode === 'list' ? 'var(--gray-12)' : 'var(--gray-11)',
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <List size={13} />
              {t('common.list')}
            </button>
          </Flex>
        </Flex>

        {projects.length === 0 ? (
          <Flex direction="column" align="center" justify="center" className="py-20 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--gray-3)' }}
            >
              <FileText size={28} style={{ color: 'var(--gray-9)' }} />
            </div>
            <Heading size="4" mb="1">{t('dashboard.index.noProjectsHeading')}</Heading>
            <Text size="2" mb="4" style={{ color: 'var(--gray-11)' }}>
              {t('dashboard.index.noProjectsSubtext')}
            </Text>
            <Link to="/dashboard/new">
              <Button size="2">{t('dashboard.index.createProject')}</Button>
            </Link>
          </Flex>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl border overflow-hidden bg-white"
            style={{ borderColor: 'var(--gray-a6)' }}
          >
            {projects.map((project) => (
              <ProjectListItem key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
