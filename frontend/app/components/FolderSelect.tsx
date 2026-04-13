import { Select, TextField, Flex } from "@radix-ui/themes";
import { useMemo, useState } from "react";
import { useProjectFolders } from "~/hooks/useProjectFolders";

interface FolderSelectProps {
    baseProject: string;
    value: string;
    onChange: (path: string) => void;
    excludePath?: string;
    allowCreate?: boolean;
    disabled?: boolean;
    placeholder?: string;
}

const NEW_FOLDER_SENTINEL = "__create_new_folder__";

const normalizePath = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "/") return "/";
    const withLeading = trimmed.startsWith("/") ? trimmed : "/" + trimmed;
    const collapsed = withLeading.replace(/\/+/g, "/").replace(/\/$/, "");
    return collapsed || "/";
};

const displayName = (path: string): string => (path === "/" ? "Root" : path);

export default function FolderSelect({
    baseProject,
    value,
    onChange,
    excludePath,
    allowCreate = false,
    disabled = false,
    placeholder = "Select folder",
}: FolderSelectProps) {
    const { data: projectFolders = [], isLoading } = useProjectFolders(baseProject);

    const options = useMemo(() => {
        const paths = new Set<string>(["/"]);
        projectFolders.forEach((f) => paths.add(f.path));
        return Array.from(paths)
            .filter((p) => p !== excludePath)
            .sort();
    }, [projectFolders, excludePath]);

    const valueIsKnown = options.includes(value);
    const [isCreating, setIsCreating] = useState(false);
    const [draft, setDraft] = useState("");

    const handleSelectChange = (next: string) => {
        if (next === NEW_FOLDER_SENTINEL) {
            setIsCreating(true);
            setDraft("/");
            onChange("/");
            return;
        }
        setIsCreating(false);
        setDraft("");
        onChange(next);
    };

    const handleDraftChange = (raw: string) => {
        setDraft(raw);
        onChange(normalizePath(raw));
    };

    const triggerValue = isCreating
        ? NEW_FOLDER_SENTINEL
        : valueIsKnown
            ? value
            : undefined;

    return (
        <Flex direction="column" gap="2">
            <Select.Root
                value={triggerValue}
                onValueChange={handleSelectChange}
                disabled={disabled || isLoading}
            >
                <Select.Trigger placeholder={placeholder} />
                <Select.Content>
                    {options.map((path) => (
                        <Select.Item key={path} value={path}>
                            {displayName(path)}
                        </Select.Item>
                    ))}
                    {allowCreate && (
                        <>
                            <Select.Separator />
                            <Select.Item value={NEW_FOLDER_SENTINEL}>
                                + New folder…
                            </Select.Item>
                        </>
                    )}
                </Select.Content>
            </Select.Root>
            {isCreating && (
                <TextField.Root
                    placeholder="e.g. /chapters or /images/fig1"
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    onBlur={() => handleDraftChange(normalizePath(draft))}
                    autoFocus
                />
            )}
        </Flex>
    );
}
