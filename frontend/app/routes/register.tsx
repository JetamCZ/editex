import { Link, type ActionFunctionArgs, redirect, Form, useActionData, useNavigation} from 'react-router';
import { Button, Card, TextField, Flex, Text, Heading, Callout } from '@radix-ui/themes';
import api from '../lib/axios.server';
import delay from "~/lib/delay";
import {commitSession, getSession} from "~/lib/sessions.server";

export async function action({request}: ActionFunctionArgs) {
  await delay(1000)

  try {
    const formData = await request.formData();

    if(formData.get("password") !== formData.get("confirm_password")) {
      return {
        error: 'Passwords do not match!',
      }
    }

    const response = await api.post<{ token: string }>('/auth/register', formData);

    const session = await getSession(request);
    session.set("token", response.data?.token);

    return redirect("/profile", {
      headers: {
        "Set-Cookie": await commitSession(session),
      }
    });
  } catch (err: any) {
    console.error("ERROR", "login-action", err.response?.data);

    return {
      error: err.response?.data?.message || 'Registraion failed. Please try again.',
      errors: JSON.stringify(err.response?.data),
    }
  }
}


export default function Register() {
  const actionData = useActionData<typeof action>()
  const error = actionData?.error
  const errors = actionData?.errors

  const navigation = useNavigation();
  const loading = navigation.state !== "idle"

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{ minHeight: '100vh', padding: '1rem' }}
    >
      <Card size="4" style={{ maxWidth: '400px', width: '100%' }}>
        <Flex direction="column" gap="4">
          <img src="/logo.svg" style={{maxHeight: '80px', marginBottom: '1rem'}}/>

          {(error || errors) && (
            <Callout.Root color="red">
              <Callout.Text>{errors ?? error}</Callout.Text>
            </Callout.Root>
          )}

          <Form method="post">
            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Name
                </Text>
                <TextField.Root
                  type="text"
                  placeholder="Enter your name"
                  required
                  name={"name"}
                />
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Email
                </Text>
                <TextField.Root
                  type="email"
                  placeholder="Enter your email"
                  required
                  name="email"
                />
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Password
                </Text>
                <TextField.Root
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  required
                />
              </label>

              <label>
                <Text as="div" size="2" mb="1" weight="bold">
                  Confirm Password
                </Text>
                <TextField.Root
                  type="password"
                  name="confirm_password"
                  placeholder="Confirm your password"
                  required
                />
              </label>

              <Button type="submit" size="3" disabled={loading}>
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </Flex>
          </Form>

          <Text size="2" align="center">
            Already have an account?{' '}
            <Link to="/auth/login" style={{ color: 'var(--accent-9)' }}>
              Login
            </Link>
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}
