import {useRouteLoaderData, Form, useNavigation, useActionData} from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { getApiClient } from "../lib/axios.server";
import AppLayout from "../components/AppLayout";
import type {User} from "../../types/user";
import { Box, Card, Flex, Text, TextField, Button, Heading, Avatar, Separator, Callout } from "@radix-ui/themes";
import { PersonIcon, LockClosedIcon, CheckCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useState, useEffect } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
    const api = await getApiClient(request);

    return { };
}

export async function action({ request }: ActionFunctionArgs) {
    const api = await getApiClient(request);
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Validate password change if provided
    if (newPassword || confirmPassword || currentPassword) {
        if (!currentPassword) {
            return { error: "Current password is required to change password" };
        }
        if (newPassword !== confirmPassword) {
            return { error: "New passwords do not match" };
        }
        if (newPassword.length < 8) {
            return { error: "New password must be at least 8 characters" };
        }
    }

    // TODO: Add API call to update user profile
    // const updateData: any = { name };
    // if (newPassword) {
    //     updateData.currentPassword = currentPassword;
    //     updateData.newPassword = newPassword;
    // }
    // await api.put("/profile", updateData);

    return { success: true };
}

const Profile = () => {
    const {user} = useRouteLoaderData("auth-user") as {user: User}
    const navigation = useNavigation();
    const actionData = useActionData() as { success?: boolean; error?: string } | undefined;
    const isSubmitting = navigation.state === "submitting";

    const [name, setName] = useState(user?.name || "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const initials = user?.name
        ? user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
        : user?.email?.[0]?.toUpperCase() || "U";

    const handleReset = () => {
        setName(user?.name || "");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    };

    // Clear password fields on successful submission
    useEffect(() => {
        if (actionData?.success) {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        }
    }, [actionData]);

    return (
        <AppLayout>
            <Box className="h-full bg-gray-1">
                <Flex
                    direction="column"
                    align="center"
                    className="h-full py-8 px-4"
                    height="max-content"
                >
                    {/* Header */}
                    <Box className="w-full max-w-2xl mb-6">
                        <Heading size="8" mb="2">Profile Settings</Heading>
                        <Text size="3" className="text-gray-11">
                            Manage your personal information and account settings
                        </Text>
                    </Box>

                    {/* Profile Card */}
                    <Card className="w-full max-w-2xl">
                        <Form method="post">
                            <Flex direction="column" gap="6">
                                {/* Success/Error Messages */}
                                {actionData?.error && (
                                    <Callout.Root color="red">
                                        <Callout.Icon>
                                            <ExclamationTriangleIcon />
                                        </Callout.Icon>
                                        <Callout.Text>{actionData.error}</Callout.Text>
                                    </Callout.Root>
                                )}
                                {actionData?.success && (
                                    <Callout.Root color="green">
                                        <Callout.Icon>
                                            <CheckCircledIcon />
                                        </Callout.Icon>
                                        <Callout.Text>Profile updated successfully!</Callout.Text>
                                    </Callout.Root>
                                )}

                                {/* Avatar Section
                                <Flex direction="column" align="center" gap="4" py="4">
                                    <Avatar
                                        size="9"
                                        fallback={initials}
                                        radius="full"
                                        className="shadow-lg"
                                    />
                                    <Button variant="soft" size="2" type="button">
                                        Change Avatar
                                    </Button>
                                </Flex>

                                <Separator size="4" />
                                */}

                                {/* Form Fields */}
                                <Flex direction="column" gap="4">
                                    <Heading size="5">User information</Heading>

                                    {/* Name Field */}
                                    <Box>
                                        <Text as="label" size="2" weight="bold" mb="2" className="block">
                                            Full Name
                                        </Text>
                                        <TextField.Root
                                            name="name"
                                            size="3"
                                            placeholder="Enter your full name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        >
                                            <TextField.Slot>
                                                <PersonIcon height="16" width="16" />
                                            </TextField.Slot>
                                        </TextField.Root>
                                    </Box>

                                </Flex>

                                <Separator size="4" />

                                {/* Password Section */}
                                <Flex direction="column" gap="4">
                                    <Heading size="5">Change Password</Heading>
                                    <Text size="2" className="text-gray-11">
                                        Leave blank if you don't want to change your password
                                    </Text>

                                    {/* Current Password */}
                                    <Box>
                                        <Text as="label" size="2" weight="bold" mb="2" className="block">
                                            Current Password
                                        </Text>
                                        <TextField.Root
                                            name="currentPassword"
                                            type="password"
                                            size="3"
                                            placeholder="Enter current password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                        >
                                            <TextField.Slot>
                                                <LockClosedIcon height="16" width="16" />
                                            </TextField.Slot>
                                        </TextField.Root>
                                    </Box>

                                    {/* New Password */}
                                    <Box>
                                        <Text as="label" size="2" weight="bold" mb="2" className="block">
                                            New Password
                                        </Text>
                                        <TextField.Root
                                            name="newPassword"
                                            type="password"
                                            size="3"
                                            placeholder="Enter new password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        >
                                            <TextField.Slot>
                                                <LockClosedIcon height="16" width="16" />
                                            </TextField.Slot>
                                        </TextField.Root>
                                    </Box>

                                    {/* Confirm Password */}
                                    <Box>
                                        <Text as="label" size="2" weight="bold" mb="2" className="block">
                                            Confirm New Password
                                        </Text>
                                        <TextField.Root
                                            name="confirmPassword"
                                            type="password"
                                            size="3"
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        >
                                            <TextField.Slot>
                                                <LockClosedIcon height="16" width="16" />
                                            </TextField.Slot>
                                        </TextField.Root>
                                    </Box>
                                </Flex>

                                <Separator size="4" />

                                {/* Action Buttons */}
                                <Flex gap="3" justify="end">
                                    <Button
                                        type="button"
                                        variant="soft"
                                        color="gray"
                                        size="3"
                                        onClick={handleReset}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="3"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "Saving..." : "Save Changes"}
                                    </Button>
                                </Flex>
                            </Flex>
                        </Form>
                    </Card>

                    {/* Additional Settings Card */}
                    <Card className="w-full max-w-2xl mt-6">
                        <Flex direction="column" gap="4">
                            <Heading size="5">Account Information</Heading>
                            <Flex direction="column" gap="2">
                                <Flex justify="between" align="center">
                                    <Text size="2" className="text-gray-11">Email Address</Text>
                                    <Text size="2" weight="bold">{user?.email}</Text>
                                </Flex>
                                <Flex justify="between" align="center">
                                    <Text size="2" className="text-gray-11">Account Status</Text>
                                    <Text size="2" weight="bold" className="text-green-11">Active</Text>
                                </Flex>
                                <Flex justify="between" align="center">
                                    <Text size="2" className="text-gray-11">Member Since</Text>
                                    <Text size="2" weight="bold">January 2025</Text>
                                </Flex>
                            </Flex>
                        </Flex>
                    </Card>

                    {/* Danger Zone */}
                    <Card className="w-full max-w-2xl mt-6 border-red-6">
                        <Flex direction="column" gap="4">
                            <Heading size="5" className="text-red-11">Danger Zone</Heading>
                            <Flex justify="between" align="center">
                                <Flex direction="column" gap="1">
                                    <Text size="2" weight="bold">Delete Account</Text>
                                    <Text size="2" className="text-gray-11">
                                        Permanently delete your account and all associated data
                                    </Text>
                                </Flex>
                                <Button variant="soft" color="red" size="2">
                                    Delete Account
                                </Button>
                            </Flex>
                        </Flex>
                    </Card>
                </Flex>
            </Box>
        </AppLayout>
    );
};

export default Profile;
