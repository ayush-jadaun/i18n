/**
 * HTTP client for the i18n-platform API.
 *
 * Wraps native `fetch` and provides typed request helpers used by all CLI
 * commands that communicate with the platform API.
 *
 * @module api-client
 */

/**
 * Error thrown when the API returns a non-2xx HTTP status.
 */
export class ApiError extends Error {
  /**
   * @param status - HTTP status code returned by the API
   * @param body   - Response body text
   */
  constructor(
    public readonly status: number,
    body: string,
  ) {
    super(`API error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

/**
 * Lightweight HTTP client for the i18n-platform REST API.
 *
 * All methods throw {@link ApiError} when the server responds with a non-2xx
 * status code.
 *
 * @example
 * ```ts
 * const client = new ApiClient('https://api.example.com', 'sk-...');
 * const keys = await client.get<TranslationKey[]>('/projects/abc/keys');
 * ```
 */
export class ApiClient {
  /**
   * @param baseUrl - Base URL of the i18n-platform API (no trailing slash)
   * @param apiKey  - API key sent in the `Authorization` header
   */
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  /**
   * Builds the default headers sent with every request.
   * @internal
   */
  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  /**
   * Asserts the response is 2xx; throws {@link ApiError} otherwise.
   * @internal
   */
  private async assertOk(res: Response): Promise<void> {
    if (!res.ok) {
      const body = await res.text();
      throw new ApiError(res.status, body);
    }
  }

  /**
   * Sends a GET request and returns the parsed JSON body.
   *
   * @param path - API path (e.g., `/projects/abc/keys`)
   * @returns Parsed response body cast to `T`
   * @throws {ApiError} On non-2xx responses
   */
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.headers(),
    });
    await this.assertOk(res);
    return res.json() as Promise<T>;
  }

  /**
   * Sends a POST request with a JSON body and returns the parsed JSON response.
   *
   * @param path - API path
   * @param body - Request payload, serialized as JSON
   * @returns Parsed response body cast to `T`
   * @throws {ApiError} On non-2xx responses
   */
  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    await this.assertOk(res);
    return res.json() as Promise<T>;
  }

  /**
   * Sends a PUT request with a JSON body and returns the parsed JSON response.
   *
   * @param path - API path
   * @param body - Request payload, serialized as JSON
   * @returns Parsed response body cast to `T`
   * @throws {ApiError} On non-2xx responses
   */
  async put<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    await this.assertOk(res);
    return res.json() as Promise<T>;
  }

  /**
   * Sends a PATCH request with a JSON body and returns the parsed JSON response.
   *
   * @param path - API path
   * @param body - Request payload, serialized as JSON
   * @returns Parsed response body cast to `T`
   * @throws {ApiError} On non-2xx responses
   */
  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    await this.assertOk(res);
    return res.json() as Promise<T>;
  }

  /**
   * Sends a DELETE request.
   *
   * @param path - API path
   * @throws {ApiError} On non-2xx responses
   */
  async delete(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    await this.assertOk(res);
  }
}
