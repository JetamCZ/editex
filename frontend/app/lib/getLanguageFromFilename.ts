const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();

    const languageMap: Record<string, string> = {
        'tex': 'latex',
        'js': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'jsx': 'javascript',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'css': 'css',
        'html': 'html',
        'json': 'json',
        'md': 'markdown',
        'yaml': 'yaml',
        'yml': 'yaml',
        'xml': 'xml',
        'sh': 'shell',
        'txt': 'plaintext'
    };
    return languageMap[ext || ''] || 'plaintext';
};

export default getLanguageFromFilename;
