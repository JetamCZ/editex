import {Link, redirect, useActionData, useNavigation, Form} from 'react-router';
import type {ActionFunctionArgs} from "react-router";
import {Button, Card, TextField, Flex, Text, Callout} from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import api from '../lib/axios.server';
import delay from "~/lib/delay";
import {commitSession, getSession} from "~/lib/sessions.server";

export function meta() {
    return [
        { title: "Login - Editex" },
        { name: "description", content: "Sign in to your Editex account" },
    ];
}

export async function action({request}: ActionFunctionArgs) {
    await delay(1000)

    const formData = await request.formData();
    const intent = formData.get('intent');

    if (intent === 'resend-verification') {
        try {
            const email = formData.get('email');
            await api.post('/auth/resend-verification', { email });
            return {
                verificationSent: true,
                email: email as string,
            };
        } catch (err: any) {
            return {
                error: 'Failed to resend verification email. Please try again.',
            };
        }
    }

    try {
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

        if (err.response?.status === 403 && err.response?.data?.error === 'Email not verified') {
            return {
                emailNotVerified: true,
                email: err.response?.data?.email,
                error: err.response?.data?.message,
            };
        }

        return {
            error: err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.',
        }
    }
}

export default function Login() {
    const actionData = useActionData<typeof action>()
    const error = actionData?.error
    const emailNotVerified = actionData?.emailNotVerified
    const verificationSent = actionData?.verificationSent

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
                    <img src="/logo.svg" style={{maxHeight: '80px', marginBottom: '1rem'}}/>

                    {verificationSent && (
                        <Callout.Root color="green">
                            <Callout.Text>
                                Verification email sent to {actionData?.email}. Please check your inbox.
                            </Callout.Text>
                        </Callout.Root>
                    )}

                    {emailNotVerified && !verificationSent && (
                        <Callout.Root color="amber">
                            <Callout.Icon>
                                <InfoCircledIcon />
                            </Callout.Icon>
                            <Callout.Text>
                                {error}
                            </Callout.Text>
                        </Callout.Root>
                    )}

                    {emailNotVerified && !verificationSent && (
                        <Form method="post">
                            <input type="hidden" name="intent" value="resend-verification" />
                            <input type="hidden" name="email" value={actionData?.email || ''} />
                            <Button type="submit" size="2" variant="outline" style={{ width: '100%' }} disabled={loading}>
                                {loading ? 'Sending...' : 'Resend Verification Email'}
                            </Button>
                        </Form>
                    )}

                    {error && !emailNotVerified && (
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
                        <Link to="/auth/forgot-password" style={{color: 'var(--accent-9)'}}>
                            Forgot password?
                        </Link>
                    </Text>

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
