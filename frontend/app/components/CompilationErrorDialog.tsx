import { Dialog, Button, Flex, Text, ScrollArea, Code } from "@radix-ui/themes";
import { AlertCircle, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useTranslation } from 'react-i18next';

interface CompilationErrorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    errorMessage: string | null;
    compilationLog: string | null;
}

export default function CompilationErrorDialog({
    open,
    onOpenChange,
    errorMessage,
    compilationLog,
}: CompilationErrorDialogProps) {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopyLog = async () => {
        if (compilationLog) {
            await navigator.clipboard.writeText(compilationLog);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
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
            <Dialog.Content maxWidth="700px">
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
