import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect, Form, useNavigate, useLoaderData } from "react-router";
import { Dialog, Button, Flex, Text, TextField, Select, Box } from "@radix-ui/themes";
import { getApiClient } from "../lib/axios.server";
import type { Project } from "../../types/project";
import { useState } from "react";

interface Template {
  id: string;
  name: string;
  description: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const api = await getApiClient(request);
  try {
    const response = await api.get<Template[]>('/projects/templates');
    return { templates: response.data };
  } catch (error) {
    console.error("Error loading templates:", error);
    return { templates: [] };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const api = await getApiClient(request);
  const formData = await request.formData();
  const projectName = formData.get("projectName") as string;
  const templateId = formData.get("templateId") as string || "default";

  try {
    const response = await api.post<Project>('/projects', {
      name: projectName,
      templateId: templateId
    });

    return redirect(`/project/${response.data.baseProject}`);
  } catch (error) {
    console.error("Error creating project:", error);
    return { error: "Failed to create project" };
  }
}

export default function DashboardNew() {
  const navigate = useNavigate();
  const { templates } = useLoaderData<typeof loader>();
  const [projectName, setProjectName] = useState("");
  const [templateId, setTemplateId] = useState("default");

  const handleClose = () => {
    navigate("/dashboard");
  };

  const selectedTemplate = templates.find(t => t.id === templateId);

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Create New Project</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Enter a name for your new LaTeX project and select a template.
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

            <Box>
              <Text as="div" size="2" mb="1" weight="bold">
                Template
              </Text>
              <Select.Root value={templateId} onValueChange={setTemplateId} name="templateId">
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  {templates.map((template) => (
                    <Select.Item key={template.id} value={template.id}>
                      {template.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <input type="hidden" name="templateId" value={templateId} />
              {selectedTemplate && (
                <Text as="p" size="1" color="gray" mt="1">
                  {selectedTemplate.description}
                </Text>
              )}
            </Box>
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
