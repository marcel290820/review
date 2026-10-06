import type { Content, ReviewState, Selection } from './types';

const tokenKey = 'review-token';

/** Moves the session token from the URL fragment into this tab's session storage. */
function takeToken(): string {
  const token = new URLSearchParams(location.hash.slice(1)).get('token');
  if (token === null) return sessionStorage.getItem(tokenKey) ?? '';
  sessionStorage.setItem(tokenKey, token);
  history.replaceState(null, '', location.pathname);
  return token;
}

const token = takeToken();

async function request<T>(method: string, path: string, payload?: unknown): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const init: RequestInit = { method, headers };
  if (payload !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(payload);
  }
  const response = await fetch(path, init);
  const body = await response.text();
  if (!response.ok) throw new Error(errorMessage(body) || `${response.status} ${response.statusText}`);
  return JSON.parse(body) as T;
}

/** The API reports errors as `{"error": "..."}`; other bodies are shown as sent. */
function errorMessage(body: string): string {
  try {
    return JSON.parse(body).error ?? body;
  } catch {
    return body;
  }
}

const commentPath = (id: string) => `/api/comments/${encodeURIComponent(id)}`;

export const api = {
  content: () => request<Content>('GET', '/api/content'),
  refresh: () => request<ReviewState>('POST', '/api/refresh'),
  addComment: (fileId: string, selection: Selection, body: string) =>
    request<ReviewState>('POST', '/api/comments', { file_id: fileId, ...selection, body }),
  editComment: (id: string, body: string) => request<ReviewState>('PUT', commentPath(id), { body }),
  deleteComment: (id: string) => request<ReviewState>('DELETE', commentPath(id)),
  save: () => request<ReviewState>('POST', '/api/save'),
};
