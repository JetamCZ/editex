import {Tooltip, IconButton, Switch, Text} from "@radix-ui/themes";
import {RotateCw, Save} from "lucide-react";

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
    const count = props.changeHistory.length;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--gray-3)',
            borderRadius: '8px',
            padding: '0 4px',
            height: '36px',
            overflow: 'hidden',
        }}>
            <Tooltip content="Reload file">
                <IconButton
                    size="2"
                    variant="ghost"
                    color="gray"
                    onClick={props.onReload}
                    style={{borderRadius: '6px', width: '32px', height: '32px'}}
                >
                    <RotateCw size={16} strokeWidth={2} />
                </IconButton>
            </Tooltip>

            <Tooltip content={hasChanges ? `Save ${count} change${count > 1 ? 's' : ''}` : 'No unsaved changes'}>
                <div style={{position: 'relative', display: 'inline-flex', overflow: 'visible'}}>
                    <IconButton
                        size="2"
                        variant={hasChanges ? "solid" : "ghost"}
                        color={hasChanges ? "blue" : "gray"}
                        onClick={props.onSendChanges}
                        disabled={!hasChanges || !props.isConnected}
                        style={{borderRadius: '6px', width: '32px', height: '32px'}}
                    >
                        <Save size={16} strokeWidth={2} />
                    </IconButton>
                    {hasChanges && (
                        <span
                            onClick={props.onShowChanges}
                            style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-7px',
                                backgroundColor: 'var(--red-9)',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 700,
                                lineHeight: 1,
                                minWidth: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                padding: '0 4px',
                                cursor: 'pointer',
                                pointerEvents: 'auto',
                            }}
                        >
                            {count}
                        </span>
                    )}
                </div>
            </Tooltip>

            <div style={{
                width: '1px',
                height: '20px',
                backgroundColor: 'var(--gray-6)',
                margin: '0 2px',
            }} />

            <Tooltip content={props.autoSave ? 'Autosave is on' : 'Autosave is off'}>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    padding: '0 6px',
                }}>
                    <Switch
                        size="1"
                        checked={props.autoSave}
                        onCheckedChange={props.onAutoSaveChange}
                    />
                    <Text size="2" style={{color: 'var(--gray-11)', userSelect: 'none'}}>Auto</Text>
                </label>
            </Tooltip>
        </div>
    );
};

export default EditorToolbar;
