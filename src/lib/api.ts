export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText);
  }
  return data as T;
}

export type SiteSummary = {
  id: string;
  name: string;
  uploadToken: string;
  createdAt?: string;
  photoCount: number;
  dateCount: number;
  lastUploadAt: string | null;
};

export type PhotoMeta = {
  id: string;
  siteId: string;
  date: string;
  uploadedAt: string;
  note: string;
  originalFilename: string;
  blobKey: string;
  contentType: string;
};
