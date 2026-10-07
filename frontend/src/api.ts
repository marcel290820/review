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

let token: string | undefined;

async function send(method: string, path: string, payload?: unknown): Promise<string> {
  const headers: Record<string, string> = { Authorization: `Bearer ${(token ??= takeToken())}` };
  const init: RequestInit = { method, headers };
  if (payload !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(payload);
  }
  const response = await fetch(path, init);
  const body = await response.text();
  if (!response.ok) throw new Error(errorMessage(body) || `${response.status} ${response.statusText}`);
  return body;
}

/** The API reports errors as `{"error": "..."}`; other bodies are shown as sent. */
function errorMessage(body: string): string {
  try {
    return JSON.parse(body).error ?? body;
  } catch {
    return body;
  }
}

/**
 * Applies review states in the order they were requested: a response to an older request
 * never replaces a newer one, and a state equal to the one applied last changes nothing.
 */
export class Responses {
  #latest = 0;
  #applied = '';

  /** Numbers a new request. */
  next(): number {
    return ++this.#latest;
  }

  /** The state to apply from the response `text` to `request`, or null to keep the current one. */
  accept(request: number, text: string): ReviewState | null {
    if (request !== this.#latest || text === this.#applied) return null;
    this.#applied = text;
    return JSON.parse(text) as ReviewState;
  }
}

const commentPath = (id: string) => `/api/comments/${encodeURIComponent(id)}`;

/** Calls that return the review state return its JSON text, for {@link Responses}. */
export const api = {
  content: async () => JSON.parse(await send('GET', '/api/content')) as Content,
  refresh: () => send('POST', '/api/refresh'),
  addComment: (fileId: string, selection: Selection, body: string) =>
    send('POST', '/api/comments', { file_id: fileId, ...selection, body }),
  editComment: (id: string, body: string) => send('PUT', commentPath(id), { body }),
  deleteComment: (id: string) => send('DELETE', commentPath(id)),
  save: () => send('POST', '/api/save'),
};
