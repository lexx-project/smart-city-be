export interface JwtPayload {
    sub: string;       // StaffUser ID
    email: string;
    role: string;      // Role name (e.g. 'ADMIN', 'STAFF', 'SUPERVISOR')
    agencyId: string;
    iat?: number;
    exp?: number;
}
