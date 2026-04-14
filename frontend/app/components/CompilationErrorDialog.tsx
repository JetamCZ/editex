import { Dialog, Button, Flex, Text, ScrollArea, Code, Spinner } from "@radix-ui/themes";
import { AlertCircle, Copy, Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from 'react-i18next';
import ReactMarkdown from "react-markdown";
import { useAiDebug } from "~/hooks/useAiDebug";

interface CompilationErrorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    errorMessage: string | null;
    compilationLog: string | null;
    baseProject?: string;
    branch?: string;
    sourceFile?: string;
}

export default function CompilationErrorDialog({
    open,
    onOpenChange,
    errorMessage,
    compilationLog,
    baseProject,
    branch,
    sourceFile,
}: CompilationErrorDialogProps) {
    const { t, i18n } = useTranslation();
    const [copied, setCopied] = useState(false);
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    const aiDebug = useAiDebug();

    const handleCopyLog = async () => {
        if (compilationLog) {
            await navigator.clipboard.writeText(compilationLog);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleAiDebug = async () => {
        if (!baseProject) return;
        setAiExplanation(null);
        setAiError(null);
        try {
            const result = await aiDebug.mutateAsync({
                baseProject,
                branch,
                sourceFile,
                errorMessage,
                compilationLog,
                language: i18n.language,
            });
            if (result.success) {
                setAiExplanation(result.explanation || "");
            } else {
                setAiError(result.errorMessage || t('aiDebug.genericError'));
            }
        } catch (e: any) {
            setAiError(e?.response?.data?.message || e?.message || t('aiDebug.genericError'));
        }
    };

    // Extract error lines from the log (lines containing "!" or "Error")
    const extractErrors = (log: string | null): string[] => {
        if (!log) return [];
        const lines = log.split('\n');
        const errors: string[] = [];
        let capturing = false;
        let captureCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Start capturing on error indicators
            if (line.startsWith('!') || line.includes('Error:') || line.includes('Fatal error')) {
                capturing = true;
                captureCount = 0;
            }

            if (capturing) {
                errors.push(line);
                captureCount++;
                // Capture a few lines after the error for context
                if (captureCount > 5 && !line.startsWith('!') && !line.includes('Error')) {
                    capturing = false;
                }
            }
        }

        return errors;
    };

    const errorLines = extractErrors(compilationLog);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content maxWidth="750px">
                <Dialog.Title>
                    <Flex align="center" gap="2" style={{ color: "var(--red-11)" }}>
                        <AlertCircle className="h-5 w-5" />
                        {t('compilationError.title')}
                    </Flex>
                </Dialog.Title>

                <Flex direction="column" gap="4" mt="4">
                    {/* Error Message */}
                    {errorMessage && (
                        <div style={{
                            padding: "12px 16px",
                            backgroundColor: "var(--red-3)",
                            borderRadius: "6px",
                            border: "1px solid var(--red-6)"
                        }}>
                            <Text size="2" weight="medium" style={{ color: "var(--red-11)" }}>
                                {errorMessage}
                            </Text>
                        </div>
                    )}

                    {/* Extracted Errors */}
                    {errorLines.length > 0 && (
                        <div>
                            <Text size="2" weight="bold" mb="2" style={{ display: "block" }}>
                                {t('compilationError.errorsFound')}
                            </Text>
                            <div style={{
                                padding: "12px",
                                backgroundColor: "var(--gray-2)",
                                borderRadius: "6px",
                                border: "1px solid var(--gray-6)",
                                fontFamily: "monospace",
                                fontSize: "12px",
                                whiteSpace: "pre-wrap",
                                maxHeight: "150px",
                                overflow: "auto"
                            }}>
                                {errorLines.map((line, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            color: line.startsWith('!') ? "var(--red-11)" : "var(--gray-12)"
                                        }}
                                    >
                                        {line}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Debug Section */}
                    {baseProject && (
                        <div>
                            <Flex justify="between" align="center" mb="2">
                                <Text size="2" weight="bold">
                                    {t('aiDebug.title')}
                                </Text>
                                <Button
                                    size="1"
                                    variant="solid"
                                    color="violet"
                                    onClick={handleAiDebug}
                                    disabled={aiDebug.isPending}
                                >
                                    {aiDebug.isPending ? (
                                        <>
                                            <Spinner size="1" /> {t('aiDebug.analyzing')}
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={12} /> {t('aiDebug.button')}
                                        </>
                                    )}
                                </Button>
                            </Flex>

                            {aiError && (
                                <div style={{
                                    padding: "10px 12px",
                                    backgroundColor: "var(--red-2)",
                                    borderRadius: "6px",
                                    border: "1px solid var(--red-6)",
                                    marginBottom: "8px"
                                }}>
                                    <Text size="2" style={{ color: "var(--red-11)" }}>
                                        {aiError}
                                    </Text>
                                </div>
                            )}

                            {aiExplanation && (
                                <ScrollArea
                                    style={{
                                        maxHeight: "320px",
                                        backgroundColor: "var(--violet-2)",
                                        borderRadius: "6px",
                                        border: "1px solid var(--violet-6)"
                                    }}
                                >
                                    <div className="ai-debug-markdown" style={{
                                        padding: "12px 14px",
                                        fontSize: "13px",
                                        lineHeight: 1.55,
                                        color: "var(--gray-12)",
                                        wordBreak: "break-word"
                                    }}>
                                        <ReactMarkdown
                                            components={{
                                                code({ className, children, ...props }) {
                                                    const isBlock = /\n/.test(String(children));
                                                    if (isBlock) {
                                                        return (
                                                            <pre style={{
                                                                background: "var(--gray-1)",
                                                                border: "1px solid var(--gray-6)",
                                                                borderRadius: "6px",
                                                                padding: "10px 12px",
                                                                margin: "8px 0",
                                                                overflowX: "auto",
                                                                fontSize: "12px",
                                                                fontFamily: "var(--code-font-family, monospace)"
                                                            }}>
                                                                <code className={className} {...props}>{children}</code>
                                                            </pre>
                                                        );
                                                    }
                                                    return (
                                                        <code style={{
                                                            background: "var(--gray-3)",
                                                            padding: "1px 5px",
                                                            borderRadius: "4px",
                                                            fontSize: "12px",
                                                            fontFamily: "var(--code-font-family, monospace)"
                                                        }} {...props}>{children}</code>
                                                    );
                                                },
                                                p: ({ children }) => <p style={{ margin: "6px 0" }}>{children}</p>,
                                                ul: ({ children }) => <ul style={{ margin: "6px 0", paddingLeft: "22px" }}>{children}</ul>,
                                                ol: ({ children }) => <ol style={{ margin: "6px 0", paddingLeft: "22px" }}>{children}</ol>,
                                                li: ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
                                                h1: ({ children }) => <h3 style={{ margin: "10px 0 4px", fontSize: "15px", fontWeight: 600 }}>{children}</h3>,
                                                h2: ({ children }) => <h3 style={{ margin: "10px 0 4px", fontSize: "14px", fontWeight: 600 }}>{children}</h3>,
                                                h3: ({ children }) => <h4 style={{ margin: "8px 0 4px", fontSize: "13px", fontWeight: 600 }}>{children}</h4>,
                                                strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                                                a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--violet-11)" }}>{children}</a>,
                                            }}
                                        >
                                            {aiExplanation}
                                        </ReactMarkdown>
                                    </div>
                                </ScrollArea>
                            )}

                            {!aiError && !aiExplanation && !aiDebug.isPending && (
                                <Text size="1" color="gray">
                                    {t('aiDebug.hint')}
                                </Text>
                            )}
                        </div>
                    )}

                    {/* Full Compilation Log */}
                    {compilationLog && (
                        <div>
                            <Flex justify="between" align="center" mb="2">
                                <Text size="2" weight="bold">
                                    {t('compilationError.fullLog')}
                                </Text>
                                <Button
                                    size="1"
                                    variant="soft"
                                    color="gray"
                                    onClick={handleCopyLog}
                                >
                                    {copied ? (
                                        <>
                                            <Check size={12} /> {t('common.copied')}
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={12} /> {t('common.copyLog')}
                                        </>
                                    )}
                                </Button>
                            </Flex>
                            <ScrollArea
                                style={{
                                    maxHeight: "250px",
                                    backgroundColor: "var(--gray-1)",
                                    borderRadius: "6px",
                                    border: "1px solid var(--gray-6)"
                                }}
                            >
                                <Code
                                    style={{
                                        display: "block",
                                        padding: "12px",
                                        fontSize: "11px",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word"
                                    }}
                                >
                                    {compilationLog}
                                </Code>
                            </ScrollArea>
                        </div>
                    )}
                </Flex>

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">
                            {t('common.close')}
                        </Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
}
