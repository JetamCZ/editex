import { Dialog, Button, Text, ScrollArea, Flex } from '@radix-ui/themes';

interface CompilationLogDialogProps {
    log: string;
    isError: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const CompilationLogDialog = ({ log, isError, open, onOpenChange }: CompilationLogDialogProps) => {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: '800px' }}>
                <Dialog.Title>
                    {isError ? 'Compilation Errors' : 'Compilation Log'}
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
                        {log || 'No log available'}
                    </Text>
                </ScrollArea>

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft">Close</Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default CompilationLogDialog;
