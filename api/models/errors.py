from collections.abc import Mapping

from fastapi import HTTPException


class NotFoundException(HTTPException):
    def __init__(
        self,
        detail: str = "Resource not found",
        headers: Mapping[str, str] | None = None,
    ):
        super().__init__(status_code=404, detail=detail, headers=headers)


class UnauthorizedException(HTTPException):
    def __init__(
        self,
        detail: str = "Unauthorized",
        headers: Mapping[str, str] | None = None,
    ):
        super().__init__(status_code=401, detail=detail, headers=headers)
