import { Link, useSearchParams, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { Button, Card, Flex, Text, Callout } from '@radix-ui/themes';
import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import api from '../lib/axios.server';

export function meta() {
    return [
        { title: "Verify Email - Editex" },
        { name: "description", content: "Verify your Editex email address" },
    ];
}

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
        return {
            success: false,
            error: 'No verification token provided',
            email: null,
        };
    }

    try {
        await api.post('/auth/verify-email', { token });
        return {
            success: true,
            error: null,
            email: null,
        };
    } catch (err: any) {
        return {
            success: false,
            error: err.response?.data?.error || 'Verification failed',
            email: err.response?.data?.email || null,
        };
    }
}

export default function VerifyEmail() {
    const { success, error, email } = useLoaderData<typeof loader>();

    return (
        <Flex
            direction="column"
            align="center"
            justify="center"
            style={{ minHeight: '100vh', padding: '1rem' }}
        >
            <Card size="4" style={{ maxWidth: '400px', width: '100%' }}>
                <Flex direction="column" gap="4" align="center">
                    <img src="/logo.svg" style={{ maxHeight: '80px', marginBottom: '1rem' }} />

                    {success ? (
                        <>
                            <Callout.Root color="green">
                                <Callout.Icon>
                                    <CheckCircledIcon />
                                </Callout.Icon>
                                <Callout.Text>
                                    Your email has been verified successfully!
                                </Callout.Text>
                            </Callout.Root>

                            <Text size="2" align="center">
                                You can now log in to your account.
                            </Text>

                            <Button asChild size="3" style={{ width: '100%' }}>
                                <Link to="/auth/login">Go to Login</Link>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Callout.Root color="red">
                                <Callout.Icon>
                                    <CrossCircledIcon />
                                </Callout.Icon>
                                <Callout.Text>{error}</Callout.Text>
                            </Callout.Root>

                            {email && error?.includes('expired') && (
                                <Text size="2" align="center">
                                    Your verification link has expired. Please request a new one.
                                </Text>
                            )}

                            <Flex direction="column" gap="2" style={{ width: '100%' }}>
                                <Button asChild size="3" variant="outline">
                                    <Link to="/auth/login">Go to Login</Link>
                                </Button>
                            </Flex>
                        </>
                    )}
                </Flex>
            </Card>
        </Flex>
    );
}
