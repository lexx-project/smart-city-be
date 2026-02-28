import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Inject the current authenticated staff user from req.user */
export const CurrentUser = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;
        return data ? user?.[data] : user;
    },
);
