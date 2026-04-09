import type {
    FormValidationError,
    ServerException as ServerExceptionT,
    ServerValidationException as ServerValidationExceptionT,
} from "./generated/types.gen";

import { StatusCodes, getReasonPhrase } from "http-status-codes";

export class ServerException extends Error {
    static readonly code: number = StatusCodes.INTERNAL_SERVER_ERROR;
    readonly detail: string;
    static subclasses: typeof ServerException[] = [];

    declare ['constructor']: typeof ServerException;

    constructor(data?: { detail?: string; }) {
        super(data?.detail);
        ServerException.subclasses.push(this.constructor);

        this.detail = data?.detail || this.constructor.desc();
        this.message = this.detail;
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
        const { type } = json as { type?: string; };
        const cls = ServerException.subclasses.find((c) => c.type() === type);
        if (!cls) {
            return new ServerException();
        }
        return new cls(json as ServerExceptionT);
    }
}

export class ServerBadRequestException extends ServerException {
    static override readonly code = StatusCodes.BAD_REQUEST;
}

export class ServerUnauthorizedException extends ServerException {
    static override readonly code = StatusCodes.UNAUTHORIZED;
}

export class ServerForbiddenException extends ServerException {
    static override readonly code = StatusCodes.FORBIDDEN;
}
export class ServerNotFoundException extends ServerException {
    static override readonly code = StatusCodes.NOT_FOUND;
}

export class ServerMethodNotAllowedException extends ServerException {
    static override readonly code = StatusCodes.METHOD_NOT_ALLOWED;
}


export class ServerValidationException extends ServerException {
    static override readonly code = StatusCodes.UNPROCESSABLE_ENTITY;
    readonly errors: FormValidationError;

    constructor(data?: { errors?: FormValidationError; detail?: string; }) {
        super({ detail: data?.detail });
        this.errors = data?.errors || { form: {}, fields: {} };
    }

    toJson(): ServerValidationExceptionT {
        return { ...super.toJson(), errors: this.errors };
    }
}
