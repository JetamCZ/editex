import { Box, Text, Button } from '@radix-ui/themes';

interface PdfViewerProps {
    pdfUrl: string;
    fileName: string;
}

const PdfViewer = ({ pdfUrl, fileName }: PdfViewerProps) => {
    return (
        <Box style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
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
