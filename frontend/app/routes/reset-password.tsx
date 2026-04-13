import { Link, Form, useActionData, useNavigation, useSearchParams, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button, Card, TextField, Flex, Text, Callout } from '@radix-ui/themes';
import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import api from '../lib/axios.server';
import delay from '~/lib/delay';
import { useTranslation } from 'react-i18next';
import i18n from '~/i18n';

export function meta() {
    return [
        { title: i18n.t('auth.resetPassword.meta.title') },
        { name: "description", content: i18n.t('auth.resetPassword.meta.description') },
    ];
}

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
        return {
            hasToken: false,
        };
    }

    return {
        hasToken: true,
        token,
    };
}

export async function action({ request }: ActionFunctionArgs) {
    await delay(1000);

    try {
        const formData = await request.formData();
        const token = formData.get('token');
        const newPassword = formData.get('password');
        const confirmPassword = formData.get('confirm_password');

        if (newPassword !== confirmPassword) {
            return {
                success: false,
                error: 'Passwords do not match',
            };
        }

        await api.post('/auth/reset-password', { token, newPassword });

        return {
            success: true,
            error: null,
        };
    } catch (err: any) {
        return {
            success: false,
            error: err.response?.data?.error || 'Failed to reset password. Please try again.',
        };
    }
}

export default function ResetPassword() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const loading = navigation.state !== 'idle';

    if (!token) {
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

                        <Callout.Root color="red">
                            <Callout.Icon>
                                <CrossCircledIcon />
                            </Callout.Icon>
                            <Callout.Text>
                                {t('auth.resetPassword.invalidLink')}
                            </Callout.Text>
                        </Callout.Root>

                        <Button asChild size="3" style={{ width: '100%' }}>
                            <Link to="/auth/forgot-password">{t('auth.resetPassword.requestNewLink')}</Link>
                        </Button>
                    </Flex>
                </Card>
            </Flex>
        );
    }

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
                                    {t('auth.resetPassword.successMessage')}
                                </Callout.Text>
                            </Callout.Root>

                            <Text size="2" align="center">
                                {t('auth.resetPassword.successSubtext')}
                            </Text>

                            <Button asChild size="3" style={{ width: '100%' }}>
                                <Link to="/auth/login">{t('auth.resetPassword.goToLogin')}</Link>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Text size="4" weight="bold" align="center">
                                {t('auth.resetPassword.heading')}
                            </Text>

                            <Text size="2" align="center" color="gray">
                                {t('auth.resetPassword.description')}
                            </Text>

                            {actionData?.error && (
                                <Callout.Root color="red">
                                    <Callout.Text>{actionData.error}</Callout.Text>
                                </Callout.Root>
                            )}

                            <Form method="post">
                                <input type="hidden" name="token" value={token} />

                                <Flex direction="column" gap="3">
                                    <label>
                                        <Text as="div" size="2" mb="1" weight="bold">
                                            {t('auth.resetPassword.newPasswordLabel')}
                                        </Text>
                                        <TextField.Root
                                            type="password"
                                            name="password"
                                            placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
                                            required
                                        />
                                    </label>

                                    <label>
                                        <Text as="div" size="2" mb="1" weight="bold">
                                            {t('auth.resetPassword.confirmPasswordLabel')}
                                        </Text>
                                        <TextField.Root
                                            type="password"
                                            name="confirm_password"
                                            placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                                            required
                                        />
                                    </label>

                                    <Button type="submit" size="3" disabled={loading}>
                                        {loading ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
                                    </Button>
                                </Flex>
                            </Form>

                            <Text size="2" align="center">
                                {t('auth.resetPassword.rememberPassword')}{' '}
                                <Link to="/auth/login" style={{ color: 'var(--accent-9)' }}>
                                    {t('auth.resetPassword.loginLink')}
                                </Link>
                            </Text>
                        </>
                    )}
                </Flex>
            </Card>
        </Flex>
    );
}
