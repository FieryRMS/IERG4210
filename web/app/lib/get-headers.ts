export function getHeaders(requestOrHeaders: Request | Headers): Headers {
	if (requestOrHeaders instanceof Request) {
		return requestOrHeaders.headers;
	}

	return requestOrHeaders;
}
