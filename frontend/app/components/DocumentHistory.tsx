import { useState, useEffect } from "react";
import { Box, Flex, Text, Badge, ScrollArea, Card } from "@radix-ui/themes";
import { documentService } from "~/lib/document.service";
import type { DocumentChangeHistory } from "~/types/collaboration";

interface Props {
  fileId: string;
  bearerToken: string;
}

const DocumentHistory = ({ fileId, bearerToken }: Props) => {
  const [history, setHistory] = useState<DocumentChangeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const data = await documentService.getHistory(fileId, bearerToken);
        setHistory(data);
      } catch (err: any) {
        setError(err.message || "Failed to load history");
        console.error("Error loading history:", err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [fileId, bearerToken]);

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case "INSERT":
        return "green";
      case "DELETE":
        return "red";
      case "MODIFY":
        return "blue";
      default:
        return "gray";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (loading) {
    return (
      <Box p="4">
        <Text color="gray">Loading history...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p="4">
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  if (history.length === 0) {
    return (
      <Box p="4">
        <Text color="gray">No changes yet</Text>
      </Box>
    );
  }

  return (
    <Box p="2">
      <Text size="2" weight="bold" mb="3">
        Document History ({history.length} changes)
      </Text>
      <ScrollArea style={{ height: "400px" }}>
        <Flex direction="column" gap="2">
          {history.map((change) => (
            <Card key={change.id} size="1">
              <Flex direction="column" gap="1">
                <Flex justify="between" align="center">
                  <Flex gap="2" align="center">
                    <Badge color={getChangeTypeColor(change.changeType)} size="1">
                      {change.changeType}
                    </Badge>
                    <Text size="1" weight="medium">
                      Line {change.lineNumber}
                    </Text>
                  </Flex>
                  <Text size="1" color="gray">
                    {formatTimestamp(change.createdAt)}
                  </Text>
                </Flex>

                <Text size="1" color="gray">
                  by {change.userName}
                </Text>

                {change.changeType === "MODIFY" && (
                  <Box>
                    {change.oldContent && (
                      <Text
                        size="1"
                        style={{
                          textDecoration: "line-through",
                          color: "var(--red-9)",
                          fontFamily: "monospace",
                          display: "block",
                        }}
                      >
                        - {change.oldContent}
                      </Text>
                    )}
                    {change.newContent && (
                      <Text
                        size="1"
                        style={{
                          color: "var(--green-9)",
                          fontFamily: "monospace",
                          display: "block",
                        }}
                      >
                        + {change.newContent}
                      </Text>
                    )}
                  </Box>
                )}

                {change.changeType === "INSERT" && change.newContent && (
                  <Text
                    size="1"
                    style={{
                      color: "var(--green-9)",
                      fontFamily: "monospace",
                    }}
                  >
                    + {change.newContent}
                  </Text>
                )}

                {change.changeType === "DELETE" && change.oldContent && (
                  <Text
                    size="1"
                    style={{
                      textDecoration: "line-through",
                      color: "var(--red-9)",
                      fontFamily: "monospace",
                    }}
                  >
                    - {change.oldContent}
                  </Text>
                )}
              </Flex>
            </Card>
          ))}
        </Flex>
      </ScrollArea>
    </Box>
  );
};

export default DocumentHistory;
