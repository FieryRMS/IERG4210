import type {
    FormValidationError,
    ServerException as ServerExceptionT,
    ServerNotFoundException as ServerNotFoundExceptionT,
    ServerUnauthorizedException as ServerUnauthorizedExceptionT,
    ServerForbiddenException as ServerForbiddenExceptionT,
    ServerBadRequestException as ServerBadRequestExceptionT,
    ServerValidationException as ServerValidationExceptionT,
    ServerMethodNotAllowedException as ServerMethodNotAllowedExceptionT,
} from "./generated/types.gen";

import { StatusCodes, getReasonPhrase } from "http-status-codes";

export class ServerException extends Error {
    readonly code: number;
    readonly type: string;
    readonly detail: string;
    readonly reason: string;

    constructor(data?: Partial<ServerExceptionT>) {
        const code = data?.code ?? StatusCodes.INTERNAL_SERVER_ERROR;
        const detail = data?.detail ?? data?.reason ?? getReasonPhrase(code);
        super(detail);
        this.code = code;
        this.type = data?.type ?? this.constructor.name;
        this.name = this.type;
        this.detail = detail;
        this.reason = data?.reason ?? getReasonPhrase(code);
    }

    toJson(): ServerExceptionT {
        return { code: this.code, type: this.type, detail: this.detail, reason: this.reason };
    }

    static fromJson(json: unknown): ServerException {
        if (!json || typeof json !== "object") {
            return new ServerException();
        }
        const { type } = json as { type?: string; };
        switch (type) {
            case "ServerNotFoundException":
                return new ServerNotFoundException(json as ServerNotFoundExceptionT);
            case "ServerUnauthorizedException":
                return new ServerUnauthorizedException(json as ServerUnauthorizedExceptionT);
            case "ServerForbiddenException":
                return new ServerForbiddenException(json as ServerForbiddenExceptionT);
            case "ServerBadRequestException":
                return new ServerBadRequestException(json as ServerBadRequestExceptionT);
            case "ServerValidationException":
                return new ServerValidationException(json as ServerValidationExceptionT);
            default:
                return new ServerException(json as ServerExceptionT);
        }
    }
}

export class ServerBadRequestException extends ServerException {
    constructor(data?: Partial<ServerBadRequestExceptionT>) {
        super({ code: StatusCodes.BAD_REQUEST, ...data });
    }
}

export class ServerUnauthorizedException extends ServerException {
    constructor(data?: Partial<ServerUnauthorizedExceptionT>) {
        super({ code: StatusCodes.UNAUTHORIZED, ...data });
    }
}

export class ServerForbiddenException extends ServerException {
    constructor(data?: Partial<ServerForbiddenExceptionT>) {
        super({ code: StatusCodes.FORBIDDEN, ...data });
    }
}
export class ServerNotFoundException extends ServerException {
    constructor(data?: Partial<ServerNotFoundExceptionT>) {
        super({ code: StatusCodes.NOT_FOUND, ...data });
    }
}

export class ServerMethodNotAllowedException extends ServerException {
    constructor(data?: Partial<ServerMethodNotAllowedExceptionT>) {
        super({ code: StatusCodes.METHOD_NOT_ALLOWED, ...data });
    }
}


export class ServerValidationException extends ServerException {
    readonly errors: FormValidationError;

    constructor(data: { errors: FormValidationError; } & Partial<Omit<ServerValidationExceptionT, "errors">>) {
        super({ code: StatusCodes.UNPROCESSABLE_ENTITY, ...data });
        this.errors = data.errors;
    }

    toJson(): ServerValidationExceptionT {
        return { ...super.toJson(), errors: this.errors };
    }
}
