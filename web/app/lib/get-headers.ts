export function getHeaders(requestOrHeaders: Request | Pick<Headers, "get">): Pick<Headers, "get"> {
	if (requestOrHeaders instanceof Request) {
		return requestOrHeaders.headers;
	}

	return requestOrHeaders;
}
