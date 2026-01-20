// Determine language from file extension
const getLanguage = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
        // LaTeX files
        'tex': 'latex',
        'sty': 'latex',
        'cls': 'latex',
        'bib': 'bibtex',
        // Web languages
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'json': 'json',
        'md': 'markdown',
        'css': 'css',
        'scss': 'scss',
        'less': 'less',
        'html': 'html',
        'xml': 'xml',
        'svg': 'xml',
        // Programming languages
        'py': 'python',
        'rb': 'ruby',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'h': 'c',
        'hpp': 'cpp',
        'cs': 'csharp',
        'go': 'go',
        'rs': 'rust',
        'php': 'php',
        'sh': 'shell',
        'bash': 'shell',
        'zsh': 'shell',
        'sql': 'sql',
        'r': 'r',
        // Config files
        'yaml': 'yaml',
        'yml': 'yaml',
        'toml': 'ini',
        'ini': 'ini',
        'conf': 'ini',
        // Plain text
        'txt': 'plaintext',
        'log': 'plaintext',
        'csv': 'plaintext',
    };
    return languageMap[extension || ''] || 'plaintext';
};

export default getLanguage;
