import { clearAuthSession, getStoredAuthSession } from "./auth-client";

type RequestOptions = RequestInit & {
  requiresAuth?: boolean;
};

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/api") {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requiresAuth = true, headers = {}, ...fetchOptions } = options;

    const requestHeaders = new Headers(headers);
    if (!requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/json");
    }
    const session = requiresAuth ? getStoredAuthSession() : null;
    if (session) {
      requestHeaders.set("Authorization", `Bearer ${session.token}`);
    }

    const url = endpoint.startsWith("http")
      ? endpoint 
      : `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
    });

    if (response.status === 401 && requiresAuth) {
      clearAuthSession();
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "An error occurred",
      }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }
}

export const apiClient = new ApiClient();
