import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Heading, Text, Card, Flex, Button, Badge, Container } from "@radix-ui/themes";
import axios from "axios";
import useAuth from "~/hooks/useAuth";
import {InvitationStatus, type ProjectInvitation} from "../../types/invitation";
import { Mail, Check, X, UserPlus, ArrowLeft } from "lucide-react";
import { Link, useLoaderData, useRevalidator, type LoaderFunctionArgs } from "react-router";
import AppLayout from "../components/AppLayout";
import { getApiClient } from "~/lib/axios.server";

interface InvitationsData {
  receivedInvites: ProjectInvitation[];
  sentInvites: ProjectInvitation[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const api = await getApiClient(request);

  const [receivedResponse, sentResponse] = await Promise.all([
    api.get<ProjectInvitation[]>("/invitations/me"),
    api.get<ProjectInvitation[]>("/invitations/sent"),
  ]);

  return {
    receivedInvites: receivedResponse.data,
    sentInvites: sentResponse.data,
  };
}

export default function InvitationsPage() {
  const { receivedInvites, sentInvites } = useLoaderData<InvitationsData>();
  const { bearerToken } = useAuth();
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();

  const acceptMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/api/invitations/${invitationId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        }
      );
    },
    onSuccess: () => {
      revalidator.revalidate();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/api/invitations/${invitationId}/decline`,
        {},
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        }
      );
    },
    onSuccess: () => {
      revalidator.revalidate();
    },
  });

  const handleAccept = (invitationId: string) => {
    acceptMutation.mutate(invitationId);
  };

  const handleDecline = (invitationId: string) => {
    declineMutation.mutate(invitationId);
  };

  return (
    <AppLayout>
      <Container size="3" className="p-8">
      <Flex direction="column" gap="6">
        <Box>
          <Link to="/dashboard">
            <Button variant="ghost" size="2" mb="4">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <Heading size="8" mb="2">
            Invitations
          </Heading>
          <Text size="3" className="text-gray-11">
            Manage your project invitations
          </Text>
        </Box>

        {receivedInvites.length > 0 && (
          <Box>
            <Flex align="center" gap="2" mb="4">
              <Mail className="h-5 w-5 text-gray-11" />
              <Heading size="6">Received Invitations</Heading>
              <Badge color="blue" variant="soft">
                {receivedInvites.length}
              </Badge>
            </Flex>
            <Flex direction="column" gap="3">
              {receivedInvites.map((invite) => (
                <Card key={invite.id}>
                  <Flex justify="between" align="center">
                    <Box>
                      <Flex align="center" gap="2" mb="1">
                        <Text size="3" weight="bold">
                          {invite.projectName}
                        </Text>
                        <Badge color="gray" variant="soft">
                          {invite.role}
                        </Badge>
                      </Flex>
                      <Text size="2" className="text-gray-11">
                        Invited by {invite.invitedByName || invite.invitedByEmail}
                      </Text>
                      <Text size="1" className="text-gray-10 mt-1">
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </Text>
                    </Box>
                    <Flex gap="2">
                      <Button
                        size="2"
                        variant="soft"
                        color="green"
                        onClick={() => handleAccept(invite.id)}
                        disabled={acceptMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        size="2"
                        variant="soft"
                        color="red"
                        onClick={() => handleDecline(invite.id)}
                        disabled={declineMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                        Decline
                      </Button>
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Box>
        )}

        {sentInvites.length > 0 && (
          <Box>
            <Flex align="center" gap="2" mb="4">
              <UserPlus className="h-5 w-5 text-gray-11" />
              <Heading size="6">Sent Invitations</Heading>
              <Badge color="gray" variant="soft">
                {sentInvites.length}
              </Badge>
            </Flex>
            <Flex direction="column" gap="3">
              {sentInvites.map((invite) => (
                <Card key={invite.id}>
                  <Flex justify="between" align="center">
                    <Box>
                      <Flex align="center" gap="2" mb="1">
                        <Text size="3" weight="bold">
                          {invite.projectName}
                        </Text>
                        <Badge color="gray" variant="soft">
                          {invite.role}
                        </Badge>
                      </Flex>
                      <Text size="2" className="text-gray-11">
                        Invited {invite.invitedUserName || invite.invitedUserEmail}
                      </Text>
                      <Flex align="center" gap="2" mt="1">
                        <Badge
                          color={invite.status === InvitationStatus.PENDING ? "yellow" : "gray"}
                          variant="soft"
                          size="1"
                        >
                          {invite.status}
                        </Badge>
                        <Text size="1" className="text-gray-10">
                          {new Date(invite.createdAt).toLocaleDateString()}
                        </Text>
                      </Flex>
                    </Box>
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Box>
        )}

        {receivedInvites.length === 0 && sentInvites.length === 0 && (
          <Box className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-9 mx-auto mb-4" />
            <Heading size="5" mb="2" className="text-gray-11">
              No invitations
            </Heading>
            <Text size="2" className="text-gray-11">
              You don't have any pending invitations at the moment.
            </Text>
          </Box>
        )}
      </Flex>
    </Container>
    </AppLayout>
  );
}
