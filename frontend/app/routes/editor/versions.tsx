import {useOutletContext, useNavigate} from "react-router";
import type {Project} from "../../../types/project";
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {
    Box,
    Text,
    Button,
    Flex,
    Heading,
    Card,
    Badge,
    ScrollArea,
    Spinner,
} from "@radix-ui/themes";
import {DownloadIcon, ArrowLeftIcon, PlayIcon, ArchiveIcon} from "@radix-ui/react-icons";
import {useProjectVersionPdfs} from "~/hooks/useProjectPdfs";
import {useCompileCommit} from "~/hooks/useCompileCommit";
import {useProjectDownload} from "~/hooks/useProjectDownload";
import PdfViewer from "~/components/PdfViewer";
import { useTranslation } from 'react-i18next';
import i18n from '~/i18n';

export function meta() {
    return [
        { title: i18n.t('editor.versions.meta.title') },
    ];
}

interface OutletContextType {
    project: Project;
}

export default function VersionsPage() {
    const { t } = useTranslation();
    const {project} = useOutletContext<OutletContextType>();
    const navigate = useNavigate();
    const [selectedHash, setSelectedHash] = useState<string | null>(null);
    const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
    const [headerActionsContainer, setHeaderActionsContainer] = useState<HTMLElement | null>(null);

    const {data: versions = [], isLoading} = useProjectVersionPdfs(project.baseProject, project.branch);
    const compileCommit = useCompileCommit();
    const downloadZip = useProjectDownload();
    const [downloadingHash, setDownloadingHash] = useState<string | null>(null);

    useEffect(() => {
        const container = document.getElementById('header-actions');
        setHeaderActionsContainer(container);
    }, []);

    // When a compile succeeds, auto-select the newly compiled PDF
    useEffect(() => {
        if (compileCommit.isSuccess && compileCommit.data?.pdfUrl) {
            setSelectedPdfUrl(compileCommit.data.pdfUrl);
        }
    }, [compileCommit.isSuccess, compileCommit.data]);

    const handleSelect = (hash: string, pdfUrl: string) => {
        setSelectedHash(hash);
        setSelectedPdfUrl(pdfUrl);
    };

    const handleDownload = (pdfUrl: string, hash: string) => {
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `main-${hash}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleDownloadZip = (hash: string) => {
        setDownloadingHash(hash);
        downloadZip.mutate(
            {baseProject: project.baseProject, branch: project.branch, commitHash: hash},
            {
                onSuccess: (result) => {
                    const link = document.createElement('a');
                    link.href = result.zipUrl;
                    link.download = `${project.baseProject}-${hash}.zip`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setDownloadingHash(null);
                },
                onError: () => setDownloadingHash(null),
            }
        );
    };

    const handleCompile = (hash: string) => {
        setSelectedHash(hash);
        compileCommit.mutate({
            baseProject: project.baseProject,
            branch: project.branch,
            commitHash: hash,
        });
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString();
    };

    const compilingHash = compileCommit.isPending ? compileCommit.variables?.commitHash : null;

    return (
        <>
            {headerActionsContainer && createPortal(
                <Button
                    variant="ghost"
                    size="2"
                    onClick={() => navigate(`/project/${project.baseProject}/${project.branch}`)}
                >
                    <ArrowLeftIcon /> {t('editor.versions.backToEditor')}
                </Button>,
                headerActionsContainer
            )}

            <div style={{flex: 1, display: "flex", overflow: "hidden"}}>
                {/* Left panel: commit list */}
                <div style={{
                    width: "300px",
                    borderRight: "1px solid var(--gray-6)",
                    display: "flex",
                    flexDirection: "column",
                    flexShrink: 0,
                }}>
                    <Box p="4" style={{borderBottom: "1px solid var(--gray-6)"}}>
                        <Heading size="4">{t('editor.versions.heading')}</Heading>
                        <Text size="2" color="gray" mt="1" as="p">
                            {t('editor.versions.description')}
                        </Text>
                    </Box>

                    <ScrollArea style={{flex: 1}}>
                        <Box p="3">
                            {isLoading && (
                                <Flex align="center" gap="2">
                                    <Spinner size="1" />
                                    <Text size="2" color="gray">{t('common.loading')}</Text>
                                </Flex>
                            )}

                            {!isLoading && versions.length === 0 && (
                                <Text size="2" color="gray">{t('editor.versions.noCommits')}</Text>
                            )}

                            <Flex direction="column" gap="2">
                                {versions.map((v) => {
                                    const isSelected = selectedHash === v.hash;
                                    const isCompiling = compilingHash === v.hash;

                                    return (
                                        <Card
                                            key={v.hash}
                                            style={{
                                                cursor: v.hasPdf ? 'pointer' : 'default',
                                                border: isSelected
                                                    ? '1px solid var(--blue-8)'
                                                    : '1px solid var(--gray-5)',
                                                backgroundColor: isSelected ? 'var(--blue-2)' : undefined,
                                            }}
                                            onClick={() => v.hasPdf && v.pdfUrl && handleSelect(v.hash, v.pdfUrl)}
                                        >
                                            <Flex direction="column" gap="2">
                                                <Flex align="center" justify="between" gap="2">
                                                    <Text
                                                        size="1"
                                                        style={{
                                                            fontFamily: 'monospace',
                                                            color: 'var(--gray-11)',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {v.hash}
                                                    </Text>
                                                    {v.hasPdf ? (
                                                        <Badge color="green" size="1">PDF</Badge>
                                                    ) : (
                                                        <Badge color="gray" size="1">{t('editor.versions.noCompile')}</Badge>
                                                    )}
                                                </Flex>

                                                {v.message && (
                                                    <Text size="2" style={{color: 'var(--gray-12)'}}>
                                                        {v.message}
                                                    </Text>
                                                )}

                                                <Text size="1" color="gray">
                                                    {formatDate(v.createdAt)}
                                                </Text>

                                                <Flex gap="1" wrap="wrap" onClick={(e) => e.stopPropagation()}>
                                                    {v.hasPdf && v.pdfUrl ? (
                                                        <Button
                                                            size="1"
                                                            variant="soft"
                                                            onClick={() => handleDownload(v.pdfUrl!, v.hash)}
                                                        >
                                                            <DownloadIcon /> {t('common.download')}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="1"
                                                            variant="soft"
                                                            color="blue"
                                                            disabled={isCompiling}
                                                            onClick={() => handleCompile(v.hash)}
                                                        >
                                                            {isCompiling ? (
                                                                <><Spinner size="1" /> {t('editor.versions.compiling')}</>
                                                            ) : (
                                                                <><PlayIcon /> {t('editor.versions.compile')}</>
                                                            )}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="1"
                                                        variant="soft"
                                                        color="gray"
                                                        disabled={downloadingHash === v.hash}
                                                        onClick={() => handleDownloadZip(v.hash)}
                                                    >
                                                        {downloadingHash === v.hash ? (
                                                            <><Spinner size="1" /> {t('editor.versions.downloadingZip')}</>
                                                        ) : (
                                                            <><ArchiveIcon /> {t('editor.versions.downloadZip')}</>
                                                        )}
                                                    </Button>
                                                </Flex>
                                            </Flex>
                                        </Card>
                                    );
                                })}
                            </Flex>
                        </Box>
                    </ScrollArea>
                </div>

                {/* Right panel: PDF preview */}
                <div style={{flex: 1, display: "flex", flexDirection: "column", overflow: "hidden"}}>
                    {compileCommit.isPending && !selectedPdfUrl && (
                        <Flex align="center" justify="center" direction="column" gap="3" style={{flex: 1}}>
                            <Spinner size="3" />
                            <Text size="2" color="gray">{t('editor.versions.compilingWait')}</Text>
                        </Flex>
                    )}

                    {!compileCommit.isPending && selectedPdfUrl && (
                        <PdfViewer
                            pdfUrl={selectedPdfUrl}
                            fileName={`main-${selectedHash}.pdf`}
                        />
                    )}

                    {!compileCommit.isPending && !selectedPdfUrl && (
                        <Flex align="center" justify="center" style={{flex: 1}}>
                            <Text size="2" color="gray">{t('editor.versions.selectVersion')}</Text>
                        </Flex>
                    )}
                </div>
            </div>
        </>
    );
}
