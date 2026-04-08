

import type {
    FormValidationError,
    HttpException as HttpExceptionData,
    HttpNotFoundException as HttpNotFoundExceptionData,
    HttpUnauthorizedException as HttpUnauthorizedExceptionData,
    HttpForbiddenException as HttpForbiddenExceptionData,
    HttpValidationException as HttpValidationExceptionData,
} from "./generated/types.gen";

export class HttpException extends Error {
    readonly type: string;
    readonly msg: string;

    constructor(data: HttpExceptionData) {
        super(data.msg);
        this.name = data.type;
        this.type = data.type;
        this.msg = data.msg;
    }

    static fromJson(json: unknown): HttpException {
        if (!json || typeof json !== "object") {
            return new HttpException({ type: "HTTPException", msg: "Unknown error" });
        }
        const { type } = json as { type?: string; };
        switch (type) {
            case "HTTPNotFoundException":
                return new HttpNotFoundException(json as HttpNotFoundExceptionData);
            case "HTTPUnauthorizedException":
                return new HttpUnauthorizedException(json as HttpUnauthorizedExceptionData);
            case "HTTPForbiddenException":
                return new HttpForbiddenException(json as HttpForbiddenExceptionData);
            case "HTTPValidationException":
                return new HttpValidationException(json as HttpValidationExceptionData);
            default:
                return new HttpException(json as HttpExceptionData);
        }
    }
}

export class HttpNotFoundException extends HttpException {
    constructor(data: HttpNotFoundExceptionData) {
        super(data);
    }
}

export class HttpUnauthorizedException extends HttpException {
    constructor(data: HttpUnauthorizedExceptionData) {
        super(data);
    }
}

export class HttpForbiddenException extends HttpException {
    constructor(data: HttpForbiddenExceptionData) {
        super(data);
    }
}

export class HttpValidationException extends HttpException {
    readonly errors: FormValidationError;

    constructor(data: HttpValidationExceptionData) {
        super(data);
        this.errors = data.errors;
    }
}