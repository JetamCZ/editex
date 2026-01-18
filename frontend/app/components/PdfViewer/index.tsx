import { Box, Text, Button } from '@radix-ui/themes';

interface PdfViewerProps {
    pdfUrl: string;
    fileName: string;
}

const PdfViewer = ({ pdfUrl, fileName }: PdfViewerProps) => {
    return (
        <Box style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box
                p="2"
                style={{
                    borderBottom: '1px solid var(--gray-6)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <Text size="2" weight="bold">{fileName}</Text>
                <Button
                    variant="soft"
                    size="2"
                    onClick={() => window.open(pdfUrl, '_blank')}
                >
                    Open in New Tab
                </Button>
            </Box>
            <iframe
                src={pdfUrl}
                style={{
                    width: '100%',
                    flex: 1,
                    border: 'none'
                }}
                title={fileName}
            />
        </Box>
    );
};

export default PdfViewer;
