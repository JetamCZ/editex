import { Dialog, Button, Flex, Text, TextField } from "@radix-ui/themes";
import { Form } from "react-router";
import { useState } from "react";
import { useTranslation } from 'react-i18next';

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const { t } = useTranslation();
  const [projectName, setProjectName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim()) {
      return;
    }

    // Submit via form action
    const form = e.target as HTMLFormElement;
    form.submit();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>{t('createProjectModal.title')}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {t('createProjectModal.description')}
        </Dialog.Description>

        <Form method="post" onSubmit={handleSubmit}>
          <input type="hidden" name="intent" value="create-project" />
          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                {t('createProjectModal.projectNameLabel')}
              </Text>
              <TextField.Root
                name="projectName"
                placeholder={t('createProjectModal.projectNamePlaceholder')}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
            </label>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" type="button">
                {t('createProjectModal.cancel')}
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={!projectName.trim()}>
              {t('createProjectModal.submit')}
            </Button>
          </Flex>
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
