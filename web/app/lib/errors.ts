import type {
    FormValidationError,
    ServerException as ServerExceptionT,
    ServerValidationException as ServerValidationExceptionT,
} from "./generated/types.gen";

import { StatusCodes, getReasonPhrase } from "http-status-codes";

export class ServerException extends Error {
    static readonly code: number = StatusCodes.INTERNAL_SERVER_ERROR;
    readonly detail: string;
    static subclasses: Map<number | undefined, typeof ServerException> = new Map();

    declare ['constructor']: typeof ServerException;
    static { this.register(this); }

    constructor(data?: { detail?: string; }) {
        super(data?.detail);

        this.detail = data?.detail || this.constructor.desc();
        this.message = this.detail;
    }

    static register(cls: typeof ServerException) {
        ServerException.subclasses.set(cls.code, cls);
    }

    static desc(): string {
        return getReasonPhrase(this.code);
    }

    static type(): string {
        return this.constructor.name;
    }

    toJson(): ServerExceptionT {
        return { code: this.constructor.code, detail: this.detail, type: this.constructor.type() };
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
}

export class ServerBadRequestException extends ServerException {
    static override readonly code = StatusCodes.BAD_REQUEST;
    static { this.register(this); }
}

export class ServerUnauthorizedException extends ServerException {
    static override readonly code = StatusCodes.UNAUTHORIZED;
    static { this.register(this); }
}

export class ServerForbiddenException extends ServerException {
    static override readonly code = StatusCodes.FORBIDDEN;
    static { this.register(this); }
}
export class ServerNotFoundException extends ServerException {
    static override readonly code = StatusCodes.NOT_FOUND;
    static { this.register(this); }
}

export class ServerMethodNotAllowedException extends ServerException {
    static override readonly code = StatusCodes.METHOD_NOT_ALLOWED;
    static { this.register(this); }
}


export class ServerValidationException extends ServerException {
    static override readonly code = StatusCodes.UNPROCESSABLE_ENTITY;
    static { this.register(this); }

    readonly errors: FormValidationError;

    constructor(data?: { errors?: FormValidationError; detail?: string; }) {
        super({ detail: data?.detail });
        this.errors = data?.errors || { form: {}, fields: {} };
    }

    toJson(): ServerValidationExceptionT {
        return { ...super.toJson(), errors: this.errors };
    }
}
