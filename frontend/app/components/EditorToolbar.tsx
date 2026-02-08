import { Button, Text, Switch } from "@radix-ui/themes";

interface EditorToolbarProps {
    changeHistory: any[];
    isConnected: boolean;
    onReload: () => void;
    onShowChanges: () => void;
    onSendChanges: () => void;
    autoSave: boolean;
    onAutoSaveChange: (value: boolean) => void;
}

const EditorToolbar = (props: EditorToolbarProps) => {
    const hasChanges = props.changeHistory.length > 0;

    return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button onClick={props.onReload} size="2" variant="soft">
                Reload
            </Button>
            <Button
                onClick={props.onSendChanges}
                size="2"
                disabled={!hasChanges || !props.isConnected}
                variant={hasChanges ? "solid" : "soft"}
            >
                Save Changes
            </Button>
            {hasChanges && (
                <span style={{ fontSize: '12px', color: 'var(--gray-11)', fontWeight: 500 }} onClick={props.onShowChanges}>
                    {props.changeHistory.length} unsaved
                </span>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px', cursor: 'pointer' }}>
                <Switch
                    size="1"
                    checked={props.autoSave}
                    onCheckedChange={props.onAutoSaveChange}
                />
                <Text size="2" style={{ color: 'var(--gray-11)', userSelect: 'none' }}>Autosave</Text>
            </label>
        </div>
    );
};

export default EditorToolbar;
