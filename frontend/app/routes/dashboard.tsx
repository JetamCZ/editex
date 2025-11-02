import {type LoaderFunctionArgs, useRouteLoaderData} from "react-router";
import { Card, Flex, Heading, Text, Grid, Box } from "@radix-ui/themes";
import { getApiClient } from "../lib/axios.server";
import AppLayout from "../components/AppLayout";
import type {User} from "../../types/user";

export async function loader({ request }: LoaderFunctionArgs) {
  const api = await getApiClient(request)
  
  return {  };
}

export default function Dashboard() {
  const {user} = useRouteLoaderData("auth-user") as {user: User}

  return (
    <AppLayout>
      <div className="p-8">
        <Flex direction="column" gap="6">
          <Box>
            <Heading size="8" mb="2">
              Welcome back, {user.name || user.email}!
            </Heading>
            <Text size="3" className="text-gray-11">
              Here's what's happening with your projects today.
            </Text>
          </Box>
        </Flex>
      </div>
    </AppLayout>
  );
}
