import {Link, redirect, useActionData, useNavigation, Form} from 'react-router';
import type {ActionFunctionArgs} from "react-router";
import {Button, Card, TextField, Flex, Text, Heading, Callout} from '@radix-ui/themes';
import api from '../lib/axios.server';
import delay from "~/lib/delay";
import {commitSession, getSession} from "~/lib/sessions.server";


export async function action({request}: ActionFunctionArgs) {
    await delay(1000)

    try {
        const formData = await request.formData();

        const response = await api.post<{ token: string }>('/auth/login', formData);

        const session = await getSession(request);
        session.set("token", response.data?.token);

        return redirect("/dashboard", {
            headers: {
                "Set-Cookie": await commitSession(session),
            }
        });
    } catch (err: any) {
        console.error("ERROR", "login-action", err);

        return {
            error: err.response?.data?.message || 'Login failed. Please try again.',
        }
    }
}

export default function Login() {
    const actionData = useActionData<typeof action>()
    const error = actionData?.error

    const navigation = useNavigation();
    const loading = navigation.state !== "idle"

    return (
        <Flex
            direction="column"
            align="center"
            justify="center"
            style={{minHeight: '100vh', padding: '1rem'}}
        >
            <Card size="4" style={{maxWidth: '400px', width: '100%'}}>
                <Flex direction="column" gap="4">
                    <Heading size="6" align="center">Login</Heading>

                    {error && (
                        <Callout.Root color="red">
                            <Callout.Text>{error}</Callout.Text>
                        </Callout.Root>
                    )}

                    <Form method="post">
                        <Flex direction="column" gap="3">
                            <label>
                                <Text as="div" size="2" mb="1" weight="bold">
                                    Email
                                </Text>
                                <TextField.Root
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    required
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

                            <Button type="submit" size="3" disabled={loading}>
                                {loading ? 'Logging in...' : 'Login'}
                            </Button>
                        </Flex>
                    </Form>

                    <Text size="2" align="center">
                        Don't have an account?{' '}
                        <Link to="/auth/register" style={{color: 'var(--accent-9)'}}>
                            Register
                        </Link>
                    </Text>
                </Flex>
            </Card>
        </Flex>
    );
}
