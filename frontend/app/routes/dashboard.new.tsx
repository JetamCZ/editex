import { type ActionFunctionArgs, redirect, Form, useNavigate } from "react-router";
import { Dialog, Button, Flex, Text, TextField, Card, Heading, Box } from "@radix-ui/themes";
import { getApiClient } from "../lib/axios.server";
import type { Project } from "../../types/project";
import { useState } from "react";

export async function action({ request }: ActionFunctionArgs) {
  const api = await getApiClient(request);
  const formData = await request.formData();
  const projectName = formData.get("projectName") as string;

  try {
    const response = await api.post<Project>('/projects', {
      name: projectName
    });

    return redirect(`/project/${response.data.id}`);
  } catch (error) {
    console.error("Error creating project:", error);
    return { error: "Failed to create project" };
  }
}

export default function DashboardNew() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");

  const handleClose = () => {
    navigate("/dashboard");
  };

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Create New Project</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Enter a name for your new LaTeX project.
        </Dialog.Description>

        <Form method="post">
          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Project Name
              </Text>
              <TextField.Root
                name="projectName"
                placeholder="My LaTeX Project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
            </label>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" type="button" onClick={handleClose}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={!projectName.trim()}>
              Create Project
            </Button>
          </Flex>
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
