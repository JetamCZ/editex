import { Link, type ActionFunctionArgs, Form, useActionData, useNavigation} from 'react-router';
import { Button, Card, TextField, Flex, Text, Callout } from '@radix-ui/themes';
import { CheckCircledIcon } from '@radix-ui/react-icons';
import api from '../lib/axios.server';
import delay from "~/lib/delay";

export function meta() {
    return [
        { title: "Register - Editex" },
        { name: "description", content: "Create a new Editex account" },
    ];
}

export async function action({request}: ActionFunctionArgs) {
  await delay(1000)

  try {
    const formData = await request.formData();

    if(formData.get("password") !== formData.get("confirm_password")) {
      return {
        success: false,
        error: 'Passwords do not match!',
      }
    }

    const response = await api.post<{ message: string }>('/auth/register', formData);

    return {
      success: true,
      message: response.data?.message,
      email: formData.get("email") as string,
    };
  } catch (err: any) {
    console.error("ERROR", "register-action", err.response?.data);

    return {
      success: false,
      error: err.response?.data?.error || 'Registration failed. Please try again.',
      errors: JSON.stringify(err.response?.data),
    }
  }
}


export default function Register() {
  const actionData = useActionData<typeof action>()
  const error = actionData?.error
  const errors = actionData?.errors
  const success = actionData?.success

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

          {success ? (
            <>
              <Callout.Root color="green">
                <Callout.Icon>
                  <CheckCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Registration successful! Please check your email to verify your account.
                </Callout.Text>
              </Callout.Root>

              <Text size="2" align="center">
                We've sent a verification link to <strong>{actionData?.email}</strong>.
                Please check your inbox and spam folder.
              </Text>

              <Button asChild size="3" variant="outline">
                <Link to="/auth/login">Go to Login</Link>
              </Button>
            </>
          ) : (
            <>
              {(error || errors) && (
                <Callout.Root color="red">
                  <Callout.Text>{error}</Callout.Text>
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
            </>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}
