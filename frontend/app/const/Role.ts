const Role = {
    OWNER: 'OWNER',
    EDITOR: 'EDITOR',
    VIEWER: 'VIEWER',
}

export type RoleType = typeof Role[keyof typeof Role];

export default Role
