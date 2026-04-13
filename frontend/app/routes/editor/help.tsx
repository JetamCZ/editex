import {useNavigate, useOutletContext} from "react-router";
import type {Project} from "../../../types/project";
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {
    Box,
    Text,
    Button,
    Flex,
    Heading,
    Card,
    Tabs,
    Code,
    Separator,
    ScrollArea,
} from "@radix-ui/themes";

export function meta() {
    return [
        { title: "LaTeX Reference - Editex" },
        { name: "description", content: "Quick reference for LaTeX commands and syntax" },
    ];
}

interface OutletContextType {
    project: Project;
}

interface CodeExampleProps {
    code: string;
    description?: string;
}

function CodeExample({code, description}: CodeExampleProps) {
    return (
        <Box mb="3">
            {description && (
                <Text size="2" color="gray" mb="1" as="p">
                    {description}
                </Text>
            )}
            <Box
                style={{
                    backgroundColor: 'var(--gray-2)',
                    borderRadius: '6px',
                    padding: '12px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    whiteSpace: 'pre-wrap',
                    overflowX: 'auto',
                    border: '1px solid var(--gray-4)',
                }}
            >
                {code}
            </Box>
        </Box>
    );
}

interface SectionProps {
    title: string;
    children: React.ReactNode;
}

function Section({title, children}: SectionProps) {
    return (
        <Box mb="6">
            <Heading size="4" mb="3">{title}</Heading>
            {children}
        </Box>
    );
}

const HelpPage = () => {
    const {project} = useOutletContext<OutletContextType>();
    const navigate = useNavigate();
    const [headerActionsContainer, setHeaderActionsContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const container = document.getElementById('header-actions');
        setHeaderActionsContainer(container);
    }, []);

    const headerActions = headerActionsContainer && createPortal(
        <Button
            size="2"
            variant="soft"
            onClick={() => navigate(`/project/${project.id}`)}
        >
            Back to Editor
        </Button>,
        headerActionsContainer
    );

    return (
        <>
            {headerActions}

            <Box className="flex-1 bg-gray-1 overflow-auto">
                <Box className="py-8 px-6 max-w-4xl mx-auto">
                    <Heading size="8" mb="2">LaTeX Reference Guide</Heading>
                    <Text size="3" className="text-gray-11" mb="6" as="p">
                        A quick reference for commonly used LaTeX commands and syntax
                    </Text>

                    <Tabs.Root defaultValue="basics">
                        <Tabs.List mb="4">
                            <Tabs.Trigger value="basics">Basics</Tabs.Trigger>
                            <Tabs.Trigger value="formatting">Formatting</Tabs.Trigger>
                            <Tabs.Trigger value="math">Math</Tabs.Trigger>
                            <Tabs.Trigger value="structure">Structure</Tabs.Trigger>
                            <Tabs.Trigger value="lists">Lists & Tables</Tabs.Trigger>
                            <Tabs.Trigger value="figures">Figures</Tabs.Trigger>
                            <Tabs.Trigger value="references">References</Tabs.Trigger>
                        </Tabs.List>

                        <Tabs.Content value="basics">
                            <Card>
                                <Section title="Document Structure">
                                    <Text as="p" mb="3">
                                        Every LaTeX document starts with a document class declaration and contains content within the document environment.
                                    </Text>
                                    <CodeExample
                                        description="Basic document template"
                                        code={`\\documentclass[12pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{My Document Title}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Your content goes here...

\\end{document}`}
                                    />
                                </Section>

                                <Section title="Document Classes">
                                    <Text as="p" mb="3">
                                        Common document classes and their use cases:
                                    </Text>
                                    <CodeExample
                                        code={`\\documentclass{article}  % For short documents, papers
\\documentclass{report}   % For longer reports with chapters
\\documentclass{book}     % For books
\\documentclass{letter}   % For letters
\\documentclass{beamer}   % For presentations`}
                                    />
                                </Section>

                                <Section title="Common Packages">
                                    <CodeExample
                                        description="Essential packages you'll often need"
                                        code={`\\usepackage[utf8]{inputenc}    % UTF-8 encoding
\\usepackage[T1]{fontenc}       % Font encoding
\\usepackage{amsmath}           % Advanced math
\\usepackage{amssymb}           % Math symbols
\\usepackage{graphicx}          % Images
\\usepackage{hyperref}          % Clickable links
\\usepackage{geometry}          % Page margins
\\usepackage{fancyhdr}          % Custom headers/footers
\\usepackage{listings}          % Code listings
\\usepackage{xcolor}            % Colors
\\usepackage{booktabs}          % Better tables
\\usepackage{caption}           % Figure captions
\\usepackage{subcaption}        % Subfigures`}
                                    />
                                </Section>

                                <Section title="Special Characters">
                                    <Text as="p" mb="3">
                                        These characters have special meaning in LaTeX and need to be escaped:
                                    </Text>
                                    <CodeExample
                                        code={`\\#  \\$  \\%  \\&  \\_  \\{  \\}  \\~{}  \\^{}  \\\\

% Example usage:
The cost is \\$50 and represents 25\\% of the total.
Use the \\_ character for underscores.`}
                                    />
                                </Section>

                                <Section title="Comments">
                                    <CodeExample
                                        description="Comments start with % and continue to end of line"
                                        code={`% This is a comment - it won't appear in the output
Some text % inline comment

% Multi-line comments can use the comment package:
\\usepackage{comment}
\\begin{comment}
This entire block
will be ignored
\\end{comment}`}
                                    />
                                </Section>
                            </Card>
                        </Tabs.Content>

                        <Tabs.Content value="formatting">
                            <Card>
                                <Section title="Text Formatting">
                                    <CodeExample
                                        description="Basic text styles"
                                        code={`\\textbf{Bold text}
\\textit{Italic text}
\\underline{Underlined text}
\\texttt{Monospace/typewriter text}
\\textsc{Small Caps}
\\emph{Emphasized text}  % Usually italic

% Combining styles
\\textbf{\\textit{Bold and italic}}

% Text sizes
{\\tiny tiny}
{\\scriptsize scriptsize}
{\\footnotesize footnotesize}
{\\small small}
{\\normalsize normalsize}
{\\large large}
{\\Large Large}
{\\LARGE LARGE}
{\\huge huge}
{\\Huge Huge}`}
                                    />
                                </Section>

                                <Section title="Alignment">
                                    <CodeExample
                                        code={`% Center alignment
\\begin{center}
This text is centered.
\\end{center}

% Left alignment (default, but can be explicit)
\\begin{flushleft}
This text is left-aligned.
\\end{flushleft}

% Right alignment
\\begin{flushright}
This text is right-aligned.
\\end{flushright}`}
                                    />
                                </Section>

                                <Section title="Spacing">
                                    <CodeExample
                                        code={`% Horizontal spacing
word\\quad word      % 1em space
word\\qquad word     % 2em space
word\\ word          % Normal space (after command)
word\\, word         % Thin space
word\\hspace{2cm}word  % Custom horizontal space

% Vertical spacing
\\vspace{1cm}        % Add vertical space
\\smallskip          % Small vertical skip
\\medskip            % Medium vertical skip
\\bigskip            % Big vertical skip
\\newline            % New line
\\\\                 % Line break
\\\\[1cm]            % Line break with extra space

% Paragraphs
\\par                % New paragraph
\\noindent           % No indent for next paragraph`}
                                    />
                                </Section>

                                <Section title="Colors">
                                    <CodeExample
                                        description="Requires \\usepackage{xcolor}"
                                        code={`\\textcolor{red}{Red text}
\\textcolor{blue}{Blue text}
\\textcolor{green}{Green text}

% Custom colors
\\definecolor{mycolor}{RGB}{100, 150, 200}
\\textcolor{mycolor}{Custom colored text}

% Highlighted/background color
\\colorbox{yellow}{Highlighted text}
\\fcolorbox{black}{yellow}{Boxed highlight}`}
                                    />
                                </Section>

                                <Section title="Fonts">
                                    <CodeExample
                                        code={`% Font families
\\textrm{Roman (serif)}
\\textsf{Sans-serif}
\\texttt{Typewriter (monospace)}

% In math mode
\\mathrm{Roman in math}
\\mathsf{Sans-serif in math}
\\mathtt{Typewriter in math}
\\mathbf{Bold in math}
\\mathit{Italic in math}
\\mathcal{CALLIGRAPHIC}
\\mathbb{BLACKBOARD BOLD}  % Requires amssymb`}
                                    />
                                </Section>
                            </Card>
                        </Tabs.Content>

                        <Tabs.Content value="math">
                            <Card>
                                <Section title="Math Modes">
                                    <CodeExample
                                        code={`% Inline math
The equation $E = mc^2$ is famous.
The equation \\(E = mc^2\\) is equivalent.

% Display math (centered, own line)
$$E = mc^2$$

% Or using brackets
\\[E = mc^2\\]

% Equation environment (numbered)
\\begin{equation}
E = mc^2
\\end{equation}

% Unnumbered equation
\\begin{equation*}
E = mc^2
\\end{equation*}`}
                                    />
                                </Section>

                                <Section title="Common Math Symbols">
                                    <CodeExample
                                        code={`% Greek letters
\\alpha \\beta \\gamma \\delta \\epsilon \\theta
\\lambda \\mu \\pi \\sigma \\omega \\phi

% Capital Greek
\\Gamma \\Delta \\Theta \\Lambda \\Sigma \\Omega

% Operators
\\times \\div \\pm \\mp \\cdot
\\leq \\geq \\neq \\approx \\equiv
\\subset \\supset \\subseteq \\supseteq
\\in \\notin \\cup \\cap

% Arrows
\\rightarrow \\leftarrow \\Rightarrow \\Leftarrow
\\leftrightarrow \\Leftrightarrow

% Misc
\\infty \\partial \\nabla \\forall \\exists
\\emptyset \\therefore \\because`}
                                    />
                                </Section>

                                <Section title="Fractions and Roots">
                                    <CodeExample
                                        code={`% Fractions
\\frac{numerator}{denominator}
\\frac{a+b}{c+d}
\\frac{1}{2}

% Display style fraction (larger)
\\dfrac{a}{b}

% Roots
\\sqrt{x}
\\sqrt[3]{x}    % Cube root
\\sqrt[n]{x}    % nth root`}
                                    />
                                </Section>

                                <Section title="Subscripts and Superscripts">
                                    <CodeExample
                                        code={`x^2             % Superscript
x_i             % Subscript
x^{2n}          % Multi-character superscript
x_{i,j}         % Multi-character subscript
x_i^2           % Both
x^{a^b}         % Nested
{}_a^b X        % Pre-scripts`}
                                    />
                                </Section>

                                <Section title="Sums, Products, Integrals">
                                    <CodeExample
                                        code={`% Summation
\\sum_{i=1}^{n} x_i
\\sum_{i=1}^{\\infty} \\frac{1}{i^2}

% Product
\\prod_{i=1}^{n} x_i

% Integral
\\int_{a}^{b} f(x) \\, dx
\\iint_{D} f(x,y) \\, dA        % Double integral
\\iiint_{V} f(x,y,z) \\, dV     % Triple integral
\\oint_{C} \\vec{F} \\cdot d\\vec{r}  % Contour integral

% Limits
\\lim_{x \\to \\infty} f(x)
\\lim_{n \\to 0} \\frac{\\sin n}{n}`}
                                    />
                                </Section>

                                <Section title="Matrices">
                                    <CodeExample
                                        description="Requires \\usepackage{amsmath}"
                                        code={`% Basic matrix (no delimiters)
\\begin{matrix}
a & b \\\\
c & d
\\end{matrix}

% Parentheses
\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}

% Brackets
\\begin{bmatrix}
a & b \\\\
c & d
\\end{bmatrix}

% Braces
\\begin{Bmatrix}
a & b \\\\
c & d
\\end{Bmatrix}

% Determinant bars
\\begin{vmatrix}
a & b \\\\
c & d
\\end{vmatrix}`}
                                    />
                                </Section>

                                <Section title="Aligned Equations">
                                    <CodeExample
                                        code={`% Align equations at &
\\begin{align}
a &= b + c \\\\
  &= d + e + f \\\\
  &= g
\\end{align}

% Multiple alignment points
\\begin{align}
x &= y & w &= z \\\\
a &= b & c &= d
\\end{align}

% Cases
f(x) = \\begin{cases}
x^2 & \\text{if } x \\geq 0 \\\\
-x^2 & \\text{if } x < 0
\\end{cases}`}
                                    />
                                </Section>

                                <Section title="Brackets and Delimiters">
                                    <CodeExample
                                        code={`% Auto-sizing brackets
\\left( \\frac{a}{b} \\right)
\\left[ \\frac{a}{b} \\right]
\\left\\{ \\frac{a}{b} \\right\\}
\\left| \\frac{a}{b} \\right|
\\left\\| \\frac{a}{b} \\right\\|

% Manual sizes
\\big( \\Big( \\bigg( \\Bigg(

% Mixed delimiters
\\left( \\frac{a}{b} \\right]
\\left. \\frac{a}{b} \\right|_{x=0}`}
                                    />
                                </Section>
                            </Card>
                        </Tabs.Content>

                        <Tabs.Content value="structure">
                            <Card>
                                <Section title="Sections and Chapters">
                                    <CodeExample
                                        code={`% For article class
\\section{Section Name}
\\subsection{Subsection Name}
\\subsubsection{Subsubsection Name}
\\paragraph{Paragraph heading}
\\subparagraph{Subparagraph heading}

% For book/report class (adds chapters)
\\chapter{Chapter Name}
\\section{Section Name}
...

% Unnumbered versions (add *)
\\section*{Unnumbered Section}
\\chapter*{Unnumbered Chapter}`}
                                    />
                                </Section>

                                <Section title="Table of Contents">
                                    <CodeExample
                                        code={`\\tableofcontents    % Generate TOC
\\listoffigures      % List of figures
\\listoftables       % List of tables

% Control depth
\\setcounter{tocdepth}{2}  % Show up to subsections

% Add entry manually
\\addcontentsline{toc}{section}{My Custom Entry}`}
                                    />
                                </Section>

                                <Section title="Page Layout">
                                    <CodeExample
                                        description="Using geometry package"
                                        code={`\\usepackage[
    a4paper,
    margin=2.5cm,
    top=3cm,
    bottom=3cm
]{geometry}

% Or set individually
\\usepackage{geometry}
\\geometry{
    left=2cm,
    right=2cm,
    top=2.5cm,
    bottom=2.5cm
}`}
                                    />
                                </Section>

                                <Section title="Headers and Footers">
                                    <CodeExample
                                        description="Using fancyhdr package"
                                        code={`\\usepackage{fancyhdr}
\\pagestyle{fancy}

\\fancyhf{}  % Clear defaults
\\fancyhead[L]{Left Header}
\\fancyhead[C]{Center Header}
\\fancyhead[R]{Right Header}
\\fancyfoot[C]{\\thepage}  % Page number in center

% Different for odd/even pages
\\fancyhead[LO]{Left on Odd}
\\fancyhead[RE]{Right on Even}`}
                                    />
                                </Section>

                                <Section title="Title Page">
                                    <CodeExample
                                        code={`% Simple title
\\title{Document Title}
\\author{Author Name}
\\date{\\today}
\\maketitle

% Custom title page
\\begin{titlepage}
\\centering
\\vspace*{2cm}
{\\Huge\\bfseries My Title\\par}
\\vspace{1cm}
{\\Large Author Name\\par}
\\vfill
{\\large \\today\\par}
\\end{titlepage}`}
                                    />
                                </Section>

                                <Section title="Abstract">
                                    <CodeExample
                                        code={`\\begin{abstract}
This is the abstract of the document. It provides
a brief summary of the content and main findings.
\\end{abstract}`}
                                    />
                                </Section>

                                <Section title="Appendix">
                                    <CodeExample
                                        code={`\\appendix
\\section{First Appendix}
Content of appendix A...

\\section{Second Appendix}
Content of appendix B...`}
                                    />
                                </Section>
                            </Card>
                        </Tabs.Content>

                        <Tabs.Content value="lists">
                            <Card>
                                <Section title="Bullet Lists">
                                    <CodeExample
                                        code={`\\begin{itemize}
    \\item First item
    \\item Second item
    \\item Third item
\\end{itemize}

% Nested lists
\\begin{itemize}
    \\item First item
    \\begin{itemize}
        \\item Nested item 1
        \\item Nested item 2
    \\end{itemize}
    \\item Second item
\\end{itemize}

% Custom bullet
\\begin{itemize}
    \\item[--] Dash bullet
    \\item[$\\star$] Star bullet
    \\item[$\\checkmark$] Checkmark
\\end{itemize}`}
                                    />
                                </Section>

                                <Section title="Numbered Lists">
                                    <CodeExample
                                        code={`\\begin{enumerate}
    \\item First item
    \\item Second item
    \\item Third item
\\end{enumerate}

% Custom numbering (requires enumitem package)
\\usepackage{enumitem}

\\begin{enumerate}[label=(\\alph*)]  % (a), (b), (c)
    \\item First
    \\item Second
\\end{enumerate}

\\begin{enumerate}[label=\\roman*.]  % i., ii., iii.
    \\item First
    \\item Second
\\end{enumerate}`}
                                    />
                                </Section>

                                <Section title="Description Lists">
                                    <CodeExample
                                        code={`\\begin{description}
    \\item[Term 1] Definition of term 1
    \\item[Term 2] Definition of term 2
    \\item[Another term] Its definition
\\end{description}`}
                                    />
                                </Section>

                                <Section title="Basic Tables">
                                    <CodeExample
                                        code={`\\begin{tabular}{|l|c|r|}
\\hline
Left & Center & Right \\\\
\\hline
A & B & C \\\\
D & E & F \\\\
\\hline
\\end{tabular}

% Column specifiers:
% l = left-aligned
% c = centered
% r = right-aligned
% | = vertical line
% p{width} = paragraph column with fixed width`}
                                    />
                                </Section>

                                <Section title="Better Tables">
                                    <CodeExample
                                        description="Using booktabs package for professional tables"
                                        code={`\\usepackage{booktabs}

\\begin{tabular}{lcc}
\\toprule
Header 1 & Header 2 & Header 3 \\\\
\\midrule
Row 1 & Data & Data \\\\
Row 2 & Data & Data \\\\
Row 3 & Data & Data \\\\
\\bottomrule
\\end{tabular}`}
                                    />
                                </Section>

                                <Section title="Table Environment">
                                    <CodeExample
                                        description="Floating table with caption"
                                        code={`\\begin{table}[htbp]
\\centering
\\caption{My Table Caption}
\\label{tab:mytable}
\\begin{tabular}{lcc}
\\toprule
Column 1 & Column 2 & Column 3 \\\\
\\midrule
A & B & C \\\\
D & E & F \\\\
\\bottomrule
\\end{tabular}
\\end{table}

% Reference: See Table~\\ref{tab:mytable}`}
                                    />
                                </Section>

                                <Section title="Multi-column and Multi-row">
                                    <CodeExample
                                        code={`% Multi-column
\\begin{tabular}{|c|c|c|}
\\hline
\\multicolumn{3}{|c|}{Spanning header} \\\\
\\hline
A & B & C \\\\
\\hline
\\end{tabular}

% Multi-row (requires multirow package)
\\usepackage{multirow}

\\begin{tabular}{|c|c|c|}
\\hline
\\multirow{2}{*}{Spanning} & B & C \\\\
                          & E & F \\\\
\\hline
\\end{tabular}`}
                                    />
                                </Section>
                            </Card>
                        </Tabs.Content>

                        <Tabs.Content value="figures">
                            <Card>
                                <Section title="Including Images">
                                    <CodeExample
                                        description="Requires \\usepackage{graphicx}"
                                        code={`% Basic image
\\includegraphics{image.png}

% With options
\\includegraphics[width=0.8\\textwidth]{image.png}
\\includegraphics[height=5cm]{image.png}
\\includegraphics[scale=0.5]{image.png}
\\includegraphics[width=\\linewidth]{image.png}

% Rotation
\\includegraphics[angle=90]{image.png}

% From subdirectory
\\graphicspath{{images/}}  % Set path
\\includegraphics{myimage}  % No need for full path`}
                                    />
                                </Section>

                                <Section title="Figure Environment">
                                    <CodeExample
                                        code={`\\begin{figure}[htbp]
\\centering
\\includegraphics[width=0.8\\textwidth]{image.png}
\\caption{This is the figure caption}
\\label{fig:mylabel}
\\end{figure}

% Placement options:
% h = here (approximately)
% t = top of page
% b = bottom of page
% p = special page for floats
% ! = override restrictions

% Reference: See Figure~\\ref{fig:mylabel}`}
                                    />
                                </Section>

                                <Section title="Subfigures">
                                    <CodeExample
                                        description="Requires \\usepackage{subcaption}"
                                        code={`\\begin{figure}[htbp]
\\centering
\\begin{subfigure}[b]{0.45\\textwidth}
    \\includegraphics[width=\\textwidth]{image1.png}
    \\caption{First image}
    \\label{fig:sub1}
\\end{subfigure}
\\hfill
\\begin{subfigure}[b]{0.45\\textwidth}
    \\includegraphics[width=\\textwidth]{image2.png}
    \\caption{Second image}
    \\label{fig:sub2}
\\end{subfigure}
\\caption{Overall caption for both images}
\\label{fig:both}
\\end{figure}`}
                                    />
                                </Section>

                                <Section title="Wrapping Text Around Figures">
                                    <CodeExample
                                        description="Requires \\usepackage{wrapfig}"
                                        code={`\\begin{wrapfigure}{r}{0.4\\textwidth}
\\centering
\\includegraphics[width=0.38\\textwidth]{image.png}
\\caption{Wrapped figure}
\\end{wrapfigure}

Your text continues here and will wrap
around the figure on the right side...`}
                                    />
                                </Section>

                                <Section title="TikZ Drawings">
                                    <CodeExample
                                        description="Requires \\usepackage{tikz}"
                                        code={`\\begin{tikzpicture}
% Line
\\draw (0,0) -- (2,2);

% Rectangle
\\draw (0,0) rectangle (2,1);

% Circle
\\draw (1,1) circle (0.5);

% Arrow
\\draw[->] (0,0) -- (2,0);

% Filled shape
\\fill[blue] (0,0) circle (0.3);

% Node with text
\\node at (1,1) {Hello};
\\end{tikzpicture}`}
                                    />
                                </Section>
                            </Card>
                        </Tabs.Content>

                        <Tabs.Content value="references">
                            <Card>
                                <Section title="Labels and References">
                                    <CodeExample
                                        code={`% Create a label
\\section{Introduction}
\\label{sec:intro}

\\begin{equation}
E = mc^2
\\label{eq:einstein}
\\end{equation}

% Reference it
See Section~\\ref{sec:intro} for details.
Equation~\\ref{eq:einstein} shows the famous formula.

% Page reference
This is discussed on page~\\pageref{sec:intro}.`}
                                    />
                                </Section>

                                <Section title="Footnotes">
                                    <CodeExample
                                        code={`This text has a footnote\\footnote{This is the footnote text.}.

% Footnote with custom mark
\\footnotemark[1]
...later...
\\footnotetext[1]{The footnote text}`}
                                    />
                                </Section>

                                <Section title="Citations (BibTeX)">
                                    <CodeExample
                                        description="Create a .bib file with your references"
                                        code={`% In your .bib file (references.bib):
@article{einstein1905,
    author = {Albert Einstein},
    title = {On the Electrodynamics of Moving Bodies},
    journal = {Annalen der Physik},
    year = {1905},
    volume = {17},
    pages = {891--921}
}

@book{knuth1984,
    author = {Donald E. Knuth},
    title = {The TeXbook},
    publisher = {Addison-Wesley},
    year = {1984}
}

% In your .tex file:
According to Einstein~\\cite{einstein1905}, ...
See also~\\cite{knuth1984}.

% At the end of your document:
\\bibliographystyle{plain}  % or: abbrv, alpha, unsrt
\\bibliography{references}  % references.bib`}
                                    />
                                </Section>

                                <Section title="Hyperlinks">
                                    <CodeExample
                                        description="Requires \\usepackage{hyperref}"
                                        code={`% URL
\\url{https://www.example.com}

% Clickable link with custom text
\\href{https://www.example.com}{Click here}

% Email
\\href{mailto:email@example.com}{email@example.com}

% Internal links (to labels)
\\hyperref[sec:intro]{See the introduction}

% Configure hyperref
\\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    urlcolor=cyan,
    citecolor=green
}`}
                                    />
                                </Section>

                                <Section title="Index">
                                    <CodeExample
                                        description="Requires \\usepackage{makeidx} and \\makeindex in preamble"
                                        code={`% In preamble
\\usepackage{makeidx}
\\makeindex

% In document - mark index entries
This is about \\index{LaTeX}LaTeX.
The \\index{document class}document class...

% Subentries
\\index{formatting!bold}
\\index{formatting!italic}

% At the end, print the index
\\printindex`}
                                    />
                                </Section>

                                <Section title="Glossary">
                                    <CodeExample
                                        description="Requires \\usepackage{glossaries} and \\makeglossaries"
                                        code={`% In preamble
\\usepackage{glossaries}
\\makeglossaries

\\newglossaryentry{latex}{
    name=LaTeX,
    description={A document preparation system}
}

\\newacronym{html}{HTML}{Hypertext Markup Language}

% In document
\\gls{latex} is great for typesetting.
\\acrshort{html} is used for web pages.
\\acrfull{html} stands for...

% Print glossary
\\printglossaries`}
                                    />
                                </Section>
                            </Card>
                        </Tabs.Content>
                    </Tabs.Root>

                    <Card mt="6">
                        <Heading size="4" mb="3">Keyboard Shortcuts</Heading>
                        <Text as="p" mb="3">
                            The editor supports these keyboard shortcuts for LaTeX formatting:
                        </Text>
                        <Box style={{display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 24px'}}>
                            <Code>Ctrl+B</Code><Text>Bold (\\textbf)</Text>
                            <Code>Ctrl+I</Code><Text>Italic (\\textit)</Text>
                            <Code>Ctrl+U</Code><Text>Underline (\\underline)</Text>
                            <Code>Ctrl+Shift+U</Code><Text>Bullet list (itemize)</Text>
                            <Code>Ctrl+Shift+O</Code><Text>Numbered list (enumerate)</Text>
                        </Box>
                    </Card>
                </Box>
            </Box>
        </>
    );
};

export default HelpPage;
