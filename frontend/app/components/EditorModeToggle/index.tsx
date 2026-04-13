import {SegmentedControl} from "@radix-ui/themes";
import { useTranslation } from 'react-i18next';

export type EditorMode = 'latex' | 'wysiwyg';

interface Props {
    mode: EditorMode;
    onModeChange: (mode: EditorMode) => void;
}

export default function EditorModeToggle({mode, onModeChange}: Props) {
    const { t } = useTranslation();
    return (
        <SegmentedControl.Root
            value={mode}
            onValueChange={(value) => onModeChange(value as EditorMode)}
            size="2"
        >
            <SegmentedControl.Item value="wysiwyg">{t('editorMode.visual')}</SegmentedControl.Item>
            <SegmentedControl.Item value="latex">{t('editorMode.latex')}</SegmentedControl.Item>
        </SegmentedControl.Root>
    );
}
