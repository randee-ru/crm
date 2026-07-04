export type HealthcheckResponse = {
  status: "ok";
  service: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getHealthcheck(): Promise<HealthcheckResponse> {
  return request<HealthcheckResponse>("/health/");
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

