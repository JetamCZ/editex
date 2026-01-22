import { Dialog, Button, Flex, Text, Tabs, Card, Spinner } from "@radix-ui/themes";
import { useState, useEffect, useRef, useCallback } from "react";
import { useFileContent } from "~/hooks/useMerge";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Check, ArrowLeft, ArrowRight, FileText, Image } from "lucide-react";
import type { FileMergeStatus, Resolution, ResolvedFile } from "../../types/merge";

interface MergeConflictResolverProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    baseProject: string;
    sourceBranch: string;
    targetBranch: string;
    file: FileMergeStatus;
    onResolved: (filePath: string, resolution: Resolution, content?: string) => void;
    currentResolution?: ResolvedFile;
}

export default function MergeConflictResolver({
    open,
    onOpenChange,
    baseProject,
    sourceBranch,
    targetBranch,
    file,
    onResolved,
    currentResolution,
}: MergeConflictResolverProps) {
    const [activeTab, setActiveTab] = useState<'source' | 'target' | 'resolved'>('source');
    const [resolvedContent, setResolvedContent] = useState<string>('');
    const resolvedEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    // Fetch source content
    const { data: sourceContent, isLoading: sourceLoading } = useFileContent({
        baseProject,
        branch: sourceBranch,
        fileId: file.sourceFileId || '',
        enabled: open && !!file.sourceFileId,
    });

    // Fetch target content
    const { data: targetContent, isLoading: targetLoading } = useFileContent({
        baseProject,
        branch: targetBranch,
        fileId: file.targetFileId || '',
        enabled: open && !!file.targetFileId,
    });

    // Initialize resolved content when contents are loaded
    useEffect(() => {
        if (currentResolution?.resolvedContent) {
            setResolvedContent(currentResolution.resolvedContent);
        } else if (sourceContent) {
            setResolvedContent(sourceContent);
        }
    }, [sourceContent, currentResolution]);

    const handleUseSource = useCallback(() => {
        if (file.isBinaryConflict) {
            onResolved(file.filePath, 'USE_SOURCE');
        } else {
            setResolvedContent(sourceContent || '');
            setActiveTab('resolved');
        }
    }, [file, sourceContent, onResolved]);

    const handleUseTarget = useCallback(() => {
        if (file.isBinaryConflict) {
            onResolved(file.filePath, 'USE_TARGET');
        } else {
            setResolvedContent(targetContent || '');
            setActiveTab('resolved');
        }
    }, [file, targetContent, onResolved]);

    const handleSaveResolution = useCallback(() => {
        if (file.isBinaryConflict) {
            // For binary files, just use the current selection
            return;
        }

        // Get the current editor content
        const content = resolvedEditorRef.current?.getValue() || resolvedContent;
        onResolved(file.filePath, 'USE_MERGED', content);
    }, [file, resolvedContent, onResolved]);

    const handleEditorMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
        resolvedEditorRef.current = editor;
    }, []);

    const handleResolvedContentChange = useCallback((value: string | undefined) => {
        setResolvedContent(value || '');
    }, []);

    const isLoading = sourceLoading || targetLoading;

    const getLanguageFromFileName = (fileName: string): string => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'tex': return 'latex';
            case 'bib': return 'bibtex';
            case 'json': return 'json';
            case 'xml': return 'xml';
            case 'html': return 'html';
            case 'css': return 'css';
            case 'js': return 'javascript';
            case 'md': return 'markdown';
            default: return 'plaintext';
        }
    };

    const editorLanguage = getLanguageFromFileName(file.fileName);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content maxWidth="90vw" style={{ width: '1200px', maxHeight: '90vh' }}>
                <Dialog.Title>
                    <Flex align="center" gap="2">
                        {file.isTextFile ? (
                            <FileText className="h-5 w-5" />
                        ) : (
                            <Image className="h-5 w-5" />
                        )}
                        Resolve Conflict: {file.fileName}
                    </Flex>
                </Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    {file.isBinaryConflict
                        ? 'This is a binary file. Choose which version to keep.'
                        : 'Review the differences and create a resolved version.'}
                </Dialog.Description>

                {isLoading ? (
                    <Flex justify="center" align="center" py="9">
                        <Spinner size="3" />
                        <Text ml="2">Loading file contents...</Text>
                    </Flex>
                ) : file.isBinaryConflict ? (
                    // Binary file conflict - just show source/target choice
                    <Flex direction="column" gap="4">
                        <Card>
                            <Flex justify="between" align="center">
                                <Flex direction="column">
                                    <Text weight="bold">Source Version</Text>
                                    <Text size="1" color="gray">
                                        From branch "{sourceBranch}" ({file.sourceFileSize} bytes)
                                    </Text>
                                </Flex>
                                <Button onClick={handleUseSource}>
                                    <ArrowRight className="h-4 w-4" />
                                    Use Source Version
                                </Button>
                            </Flex>
                        </Card>

                        <Card>
                            <Flex justify="between" align="center">
                                <Flex direction="column">
                                    <Text weight="bold">Target Version</Text>
                                    <Text size="1" color="gray">
                                        From branch "{targetBranch}" ({file.targetFileSize} bytes)
                                    </Text>
                                </Flex>
                                <Button onClick={handleUseTarget}>
                                    <ArrowLeft className="h-4 w-4" />
                                    Use Target Version
                                </Button>
                            </Flex>
                        </Card>
                    </Flex>
                ) : (
                    // Text file conflict - show tabs with editors
                    <Flex direction="column" gap="4">
                        {/* Quick action buttons */}
                        <Flex gap="2">
                            <Button variant="soft" onClick={handleUseSource}>
                                <ArrowRight className="h-4 w-4" />
                                Use Source
                            </Button>
                            <Button variant="soft" onClick={handleUseTarget}>
                                <ArrowLeft className="h-4 w-4" />
                                Use Target
                            </Button>
                        </Flex>

                        {/* Tabs for Source / Target / Resolved */}
                        <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                            <Tabs.List>
                                <Tabs.Trigger value="source">
                                    Source ({sourceBranch})
                                </Tabs.Trigger>
                                <Tabs.Trigger value="target">
                                    Target ({targetBranch})
                                </Tabs.Trigger>
                                <Tabs.Trigger value="resolved">
                                    Resolved
                                </Tabs.Trigger>
                            </Tabs.List>

                            <div style={{
                                border: '1px solid var(--gray-6)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                marginTop: '8px',
                                height: '400px'
                            }}>
                                <Tabs.Content value="source" style={{ height: '100%' }}>
                                    <Editor
                                        height="400px"
                                        language={editorLanguage}
                                        value={sourceContent || ''}
                                        theme="vs-light"
                                        options={{
                                            readOnly: true,
                                            minimap: { enabled: false },
                                            fontSize: 13,
                                            wordWrap: 'on',
                                            scrollBeyondLastLine: false,
                                        }}
                                    />
                                </Tabs.Content>

                                <Tabs.Content value="target" style={{ height: '100%' }}>
                                    <Editor
                                        height="400px"
                                        language={editorLanguage}
                                        value={targetContent || ''}
                                        theme="vs-light"
                                        options={{
                                            readOnly: true,
                                            minimap: { enabled: false },
                                            fontSize: 13,
                                            wordWrap: 'on',
                                            scrollBeyondLastLine: false,
                                        }}
                                    />
                                </Tabs.Content>

                                <Tabs.Content value="resolved" style={{ height: '100%' }}>
                                    <Editor
                                        height="400px"
                                        language={editorLanguage}
                                        value={resolvedContent}
                                        onChange={handleResolvedContentChange}
                                        onMount={handleEditorMount}
                                        theme="vs-light"
                                        options={{
                                            readOnly: false,
                                            minimap: { enabled: false },
                                            fontSize: 13,
                                            wordWrap: 'on',
                                            scrollBeyondLastLine: false,
                                        }}
                                    />
                                </Tabs.Content>
                            </div>
                        </Tabs.Root>
                    </Flex>
                )}

                {/* Actions */}
                <Flex gap="3" mt="4" justify="end">
                    <Button variant="soft" color="gray" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    {!file.isBinaryConflict && (
                        <Button onClick={handleSaveResolution}>
                            <Check className="h-4 w-4" />
                            Save Resolution
                        </Button>
                    )}
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
