// Determine language from file extension
const getLanguage = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
        'tex': 'latex',
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'json': 'json',
        'md': 'markdown',
        'css': 'css',
        'html': 'html',
        'py': 'python',
    };
    return languageMap[extension || ''] || 'plaintext';
};

export default getLanguage;
