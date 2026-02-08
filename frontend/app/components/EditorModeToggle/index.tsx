import {SegmentedControl} from "@radix-ui/themes";

export type EditorMode = 'latex' | 'wysiwyg';

interface Props {
    mode: EditorMode;
    onModeChange: (mode: EditorMode) => void;
}

export default function EditorModeToggle({mode, onModeChange}: Props) {
    return (
        <SegmentedControl.Root
            value={mode}
            onValueChange={(value) => onModeChange(value as EditorMode)}
            size="2"
        >
            <SegmentedControl.Item value="wysiwyg">WYSIWYG</SegmentedControl.Item>
            <SegmentedControl.Item value="latex">LaTeX Code</SegmentedControl.Item>
        </SegmentedControl.Root>
    );
}
