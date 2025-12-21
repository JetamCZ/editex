import { Box, Flex, Text, Badge, Avatar } from "@radix-ui/themes";
import getInitials from "~/lib/getInitials";
import type { ActiveUser } from "./hooks/usePresenceUsers";

interface EditorHeaderProps {
  isConnected: boolean;
  fileName: string;
  activeUsers: ActiveUser[];
}

const EditorHeader = ({ isConnected, fileName, activeUsers }: EditorHeaderProps) => {
  return (
    <Box
      p="2"
      style={{
        borderBottom: "1px solid var(--gray-5)",
        backgroundColor: "var(--gray-2)",
      }}
    >
      <Flex justify="between" align="center">
        <Flex gap="2" align="center">
          <Badge color={isConnected ? "green" : "red"} variant="soft">
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Text size="2" weight="medium">
            {fileName}
          </Text>
        </Flex>

        <Flex gap="2" align="center">
          <Text size="1" color="gray">
            {activeUsers.length} active {activeUsers.length === 1 ? "user" : "users"}
          </Text>
          <Flex gap="1">
            {activeUsers.map((user) => (
              <Avatar
                key={user.userId}
                size="1"
                fallback={getInitials(user.userName || "?")}
                style={{
                  backgroundColor: user.color,
                  color: "white",
                }}
                title={`${user.userName} - Line ${user.currentLine}`}
              />
            ))}
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};

export default EditorHeader;
