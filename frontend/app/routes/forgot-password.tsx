import { Link, Form, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { Button, Card, TextField, Flex, Text, Callout } from '@radix-ui/themes';
import { CheckCircledIcon } from '@radix-ui/react-icons';
import api from '../lib/axios.server';
import delay from '~/lib/delay';
import { useTranslation } from 'react-i18next';
import i18n from '~/i18n';

export function meta() {
    return [
        { title: i18n.t('auth.forgotPassword.meta.title') },
        { name: "description", content: i18n.t('auth.forgotPassword.meta.description') },
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
    const { t } = useTranslation();
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
                                    {t('auth.forgotPassword.successMessage')}
                                </Callout.Text>
                            </Callout.Root>

                            <Text size="2" align="center">
                                {t('auth.forgotPassword.checkInbox')}
                            </Text>

                            <Button asChild size="3" variant="outline">
                                <Link to="/auth/login">{t('auth.forgotPassword.backToLogin')}</Link>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Text size="4" weight="bold" align="center">
                                {t('auth.forgotPassword.heading')}
                            </Text>

                            <Text size="2" align="center" color="gray">
                                {t('auth.forgotPassword.description')}
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
                                            {t('auth.forgotPassword.emailLabel')}
                                        </Text>
                                        <TextField.Root
                                            type="email"
                                            name="email"
                                            placeholder={t('auth.forgotPassword.emailPlaceholder')}
                                            required
                                        />
                                    </label>

                                    <Button type="submit" size="3" disabled={loading}>
                                        {loading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
                                    </Button>
                                </Flex>
                            </Form>

                            <Text size="2" align="center">
                                {t('auth.forgotPassword.rememberPassword')}{' '}
                                <Link to="/auth/login" style={{ color: 'var(--accent-9)' }}>
                                    {t('auth.forgotPassword.loginLink')}
                                </Link>
                            </Text>
                        </>
                    )}
                </Flex>
            </Card>
        </Flex>
    );
}
