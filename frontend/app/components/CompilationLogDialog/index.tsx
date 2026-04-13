import { Dialog, Button, Text, ScrollArea, Flex } from '@radix-ui/themes';
import { useTranslation } from 'react-i18next';

interface CompilationLogDialogProps {
    log: string;
    isError: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const CompilationLogDialog = ({ log, isError, open, onOpenChange }: CompilationLogDialogProps) => {
    const { t } = useTranslation();
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: '800px' }}>
                <Dialog.Title>
                    {isError ? t('compilationLog.errorsTitle') : t('compilationLog.logTitle')}
                </Dialog.Title>

                <ScrollArea
                    style={{
                        height: '400px',
                        backgroundColor: '#1e1e1e',
                        padding: '12px',
                        borderRadius: '4px',
                        marginTop: '12px'
                    }}
                >
                    <Text
                        size="1"
                        style={{
                            fontFamily: 'monospace',
                            color: '#d4d4d4',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}
                    >
                        {log || t('compilationLog.noLog')}
                    </Text>
                </ScrollArea>

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft">{t('compilationLog.close')}</Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default CompilationLogDialog;
