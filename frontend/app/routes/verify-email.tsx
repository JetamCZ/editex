import { Link, useSearchParams, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { Button, Card, Flex, Text, Callout } from '@radix-ui/themes';
import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import api from '../lib/axios.server';
import { useTranslation } from 'react-i18next';
import i18n from '~/i18n';

export function meta() {
    return [
        { title: i18n.t('auth.verifyEmail.meta.title') },
        { name: "description", content: i18n.t('auth.verifyEmail.meta.description') },
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
    const { t } = useTranslation();
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
                                    {t('auth.verifyEmail.successMessage')}
                                </Callout.Text>
                            </Callout.Root>

                            <Text size="2" align="center">
                                {t('auth.verifyEmail.successSubtext')}
                            </Text>

                            <Button asChild size="3" style={{ width: '100%' }}>
                                <Link to="/auth/login">{t('auth.verifyEmail.goToLogin')}</Link>
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
                                    {t('auth.verifyEmail.expiredMessage')}
                                </Text>
                            )}

                            <Flex direction="column" gap="2" style={{ width: '100%' }}>
                                <Button asChild size="3" variant="outline">
                                    <Link to="/auth/login">{t('auth.verifyEmail.goToLogin')}</Link>
                                </Button>
                            </Flex>
                        </>
                    )}
                </Flex>
            </Card>
        </Flex>
    );
}
