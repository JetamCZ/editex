import { Link, Form, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { Button, Card, TextField, Flex, Text, Callout } from '@radix-ui/themes';
import { CheckCircledIcon } from '@radix-ui/react-icons';
import api from '../lib/axios.server';
import delay from '~/lib/delay';

export function meta() {
    return [
        { title: "Forgot Password - Editex" },
        { name: "description", content: "Reset your Editex password" },
    ];
}

export async function action({ request }: ActionFunctionArgs) {
    await delay(1000);

    try {
        const formData = await request.formData();
        const email = formData.get('email');

        await api.post('/auth/forgot-password', { email });

        return {
            success: true,
            error: null,
        };
    } catch (err: any) {
        return {
            success: false,
            error: err.response?.data?.error || 'Failed to send reset email. Please try again.',
        };
    }
}

export default function ForgotPassword() {
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const loading = navigation.state !== 'idle';

    return (
        <Flex
            direction="column"
            align="center"
            justify="center"
            style={{ minHeight: '100vh', padding: '1rem' }}
        >
            <Card size="4" style={{ maxWidth: '400px', width: '100%' }}>
                <Flex direction="column" gap="4">
                    <img src="/logo.svg" style={{ maxHeight: '80px', marginBottom: '1rem' }} />

                    {actionData?.success ? (
                        <>
                            <Callout.Root color="green">
                                <Callout.Icon>
                                    <CheckCircledIcon />
                                </Callout.Icon>
                                <Callout.Text>
                                    If an account exists with this email, you will receive a password reset link shortly.
                                </Callout.Text>
                            </Callout.Root>

                            <Text size="2" align="center">
                                Please check your email inbox and spam folder.
                            </Text>

                            <Button asChild size="3" variant="outline">
                                <Link to="/auth/login">Back to Login</Link>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Text size="4" weight="bold" align="center">
                                Forgot Password
                            </Text>

                            <Text size="2" align="center" color="gray">
                                Enter your email address and we'll send you a link to reset your password.
                            </Text>

                            {actionData?.error && (
                                <Callout.Root color="red">
                                    <Callout.Text>{actionData.error}</Callout.Text>
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

                                    <Button type="submit" size="3" disabled={loading}>
                                        {loading ? 'Sending...' : 'Send Reset Link'}
                                    </Button>
                                </Flex>
                            </Form>

                            <Text size="2" align="center">
                                Remember your password?{' '}
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
