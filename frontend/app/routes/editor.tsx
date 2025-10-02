import { useState } from "react";
import type { Route } from "./+types/editor";
import { Box, Container, Flex, TextArea } from "@radix-ui/themes";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Editor" },
    { name: "description", content: "LaTeX Editor" },
  ];
}

export default function Editor() {
  const [content, setContent] = useState("");

  return (
    <Container size="4">
      <Flex direction="column" gap="4" py="4">
        <Box>
          <TextArea
            size="3"
            placeholder="Enter your LaTeX code here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ minHeight: "400px", fontFamily: "monospace" }}
          />
        </Box>
      </Flex>
    </Container>
  );
}
