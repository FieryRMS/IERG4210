import type {
    FormValidationError,
    ServerException as ServerExceptionT,
    ServerValidationException as ServerValidationExceptionT,
} from "./generated/types.gen";

import { StatusCodes, getReasonPhrase } from "http-status-codes";

export class ServerException {
    static readonly STATUS_CODE: number = StatusCodes.INTERNAL_SERVER_ERROR;
    readonly name: string;
    readonly code: number;
    readonly message: string;
    readonly stack: string | undefined;
    static subclasses: Map<number | undefined, typeof ServerException> = new Map();

    declare ['constructor']: typeof ServerException;
    static { this.register(this); }

    constructor(data?: { message?: string; stack?: string | null; }, error?: Error) {
        this.code = this.constructor.STATUS_CODE;
        this.name = this.constructor.name;
        this.message = data?.message || error?.message || this.constructor.desc();
        if (import.meta.env.DEV) {
            const temp = { message: this.message, name: this.name, stack: new Error().stack };
            Error.captureStackTrace?.(temp, this.constructor);
            const clientStack = error?.stack || temp.stack;
            this.stack = `--- React Router Stack Start ---
${clientStack}
--- React Router Stack End ---${data?.stack ? `


--- Server Exception Stack Start ---
${data?.stack}
--- Server Exception Stack End ---
` : ""
                }`;
        }
    }

    static register(cls: typeof ServerException) {
        ServerException.subclasses.set(cls.STATUS_CODE, cls);
    }

    static desc(): string {
        return getReasonPhrase(this.STATUS_CODE);
    }

    toJson(): ServerExceptionT {
        return {
            code: this.constructor.STATUS_CODE,
            message: this.message,
            name: this.name,
            stack: this.stack ?? null,
        };
    }

    static fromJson(json: unknown): ServerException {
        if (!json || typeof json !== "object") {
            return new ServerException();
        }
        const { code } = json as { code?: number; };
        const cls = ServerException.subclasses.get(code);
        if (!cls) {
            return new ServerException();
        }
        return new cls(json as ServerExceptionT);
    }

    static isServerException(error: unknown): error is ServerExceptionT {
        return error instanceof ServerException ||
            (typeof error === "object" && error !== null
                && Object.hasOwn(error, "code")
                && Object.hasOwn(error, "message")
                && Object.hasOwn(error, "name")
            );
    }

    toResponse(): Response {
        return Response.json(this.toJson(), { status: this.code });
    }
}

export class ServerBadRequestException extends ServerException {
    static override readonly STATUS_CODE = StatusCodes.BAD_REQUEST;
    static { this.register(this); }
}

export class ServerUnauthorizedException extends ServerException {
    static override readonly STATUS_CODE = StatusCodes.UNAUTHORIZED;
    static { this.register(this); }
}

export class ServerForbiddenException extends ServerException {
    static override readonly STATUS_CODE = StatusCodes.FORBIDDEN;
    static { this.register(this); }
}
export class ServerNotFoundException extends ServerException {
    static override readonly STATUS_CODE = StatusCodes.NOT_FOUND;
    static { this.register(this); }
}

export class ServerMethodNotAllowedException extends ServerException {
    static override readonly STATUS_CODE = StatusCodes.METHOD_NOT_ALLOWED;
    static { this.register(this); }
}

export class ServerConflictException extends ServerException {
    static override readonly STATUS_CODE = StatusCodes.CONFLICT;
    static { this.register(this); }
}



export class ServerValidationException extends ServerException {
    static override readonly STATUS_CODE = StatusCodes.UNPROCESSABLE_ENTITY;
    static { this.register(this); }

    readonly errors: FormValidationError;

    constructor(data?: {
        errors?: FormValidationError; message?: string;
        stack?: string | null;
    }, error?: Error) {
        super({ message: data?.message, stack: data?.stack }, error);
        this.errors = data?.errors || { form: {}, fields: {} };
    }

    toJson(): ServerValidationExceptionT {
        return { ...super.toJson(), errors: this.errors };
    }
}
