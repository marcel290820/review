<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { api } from './api';
  import CommentList from './CommentList.svelte';
  import ContentView from './ContentView.svelte';
  import { lineRange, lineSpan, sourceLines, utf8Slice } from './lines';
  import type { Comment, Content, Mode, ReviewState, Selection, Snapshot } from './types';

  const refreshInterval = 2500;

  let content = $state<Content | null>(null);
  let review = $state<ReviewState | null>(null);
  let fileIndex = $state(0);
  let snapshotId = $state('');
  let mode = $state<Mode>('source');
  let contextSide = $state<'old' | 'new'>('new');
  let selection = $state<Selection | null>(null);
  let first = $state(1);
  let last = $state(1);
  let body = $state('');
  /** The comment being edited; null while drafting a new one. */
  let editing = $state<string | null>(null);
  let message = $state('');
  let busy = $state(false);
  let textarea = $state<HTMLTextAreaElement>();
  /** Numbers state requests, so an overtaken response cannot replace a newer one. */
  let latestRequest = 0;

  const file = $derived(content?.files[fileIndex]);
  const snapshot = $derived(file?.snapshots.find((s) => s.id === snapshotId) ?? file?.snapshots.at(-1));
  const lines = $derived(sourceLines(snapshot?.text ?? ''));
  const disk = $derived(review?.disk.find((d) => d.file_id === file?.id));
  const preview = $derived(content?.previews.find((p) => p.snapshot_id === snapshot?.id)?.html);
  const readOnly = $derived(mode === 'preview' || mode === 'revisions');
  const hasDraft = $derived(body !== '' || editing !== null);
  const highlight = $derived(selection && { snapshotId: selection.snapshot_id, first, last });
  const quote = $derived.by(() => {
    const target = selection;
    const source = target && file?.snapshots.find((s) => s.id === target.snapshot_id);
    return target && source ? utf8Slice(source.text, target.start_byte, target.end_byte) : '';
  });

  function errorText(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  async function loadContent() {
    try {
      content = await api.content();
      showFile(0);
    } catch (error) {
      message = errorText(error);
    }
  }

  async function refresh() {
    const request = ++latestRequest;
    try {
      const next = await api.refresh();
      if (request === latestRequest) review = next;
    } catch (error) {
      message = errorText(error);
    }
  }

  /** Applies a change on the server. On failure, reloads the state and shows the error. */
  async function change(action: () => Promise<ReviewState>): Promise<boolean> {
    busy = true;
    const request = ++latestRequest;
    try {
      const next = await action();
      if (request === latestRequest) review = next;
      return true;
    } catch (error) {
      await refresh();
      message = errorText(error);
      return false;
    } finally {
      busy = false;
    }
  }

  /** True when there is no unrecorded draft, or the user agrees to discard it. */
  function draftDiscarded(): boolean {
    return !hasDraft || confirm('Discard this unrecorded comment draft?');
  }

  function clearDraft() {
    body = '';
    editing = null;
  }

  function showFile(index: number) {
    if (!content) return;
    const next = content.files[index];
    fileIndex = index;
    snapshotId = next.snapshots[next.snapshots.length - 1].id;
    mode = next.diff ? 'diff' : 'source';
    clearSelection();
    clearDraft();
  }

  function chooseFile(index: number) {
    if (draftDiscarded()) showFile(index);
  }

  function selectLine(target: Snapshot, line: number, extend: boolean) {
    if (editing) {
      message = 'Finish or cancel editing before choosing another target.';
      return;
    }
    if (extend && selection?.snapshot_id === target.id) {
      first = Math.min(first, line);
      last = Math.max(last, line);
    } else {
      first = last = line;
    }
    snapshotId = target.id;
    selection = { snapshot_id: target.id, ...lineRange(sourceLines(target.text), first, last) };
    message = `${target.side} lines ${first}–${last} selected`;
  }

  function selectNumberedLines() {
    if (!snapshot || editing) return;
    try {
      selection = { snapshot_id: snapshot.id, ...lineRange(lines, first, last) };
      message = '';
    } catch (error) {
      selection = null;
      message = errorText(error);
    }
  }

  function selectText(range: Selection) {
    const source = file?.snapshots.find((s) => s.id === range.snapshot_id);
    if (editing || readOnly || !source) return;
    snapshotId = source.id;
    selection = range;
    [first, last] = lineSpan(sourceLines(source.text), range.start_byte, range.end_byte);
    message = 'Passage selected. Write a comment below.';
  }

  /** A rejected pointer selection also drops the target an earlier, partial drag chose. */
  function rejectSelection(text: string) {
    if (editing || readOnly) return;
    selection = null;
    message = text;
  }

  async function record() {
    if (readOnly || !file || !body.trim()) return;
    const [fileId, id, target, text] = [file.id, editing, selection, body];
    let action: () => Promise<ReviewState>;
    if (id) action = () => api.editComment(id, text);
    else if (target) action = () => api.addComment(fileId, target, text);
    else return;
    if (await change(action)) {
      clearDraft();
      message = 'Comment recorded. Save feedback to write it to disk.';
    }
  }

  function clearSelection() {
    selection = null;
    first = last = 1;
  }

  function cancelDraft() {
    clearDraft();
    selection = null;
  }

  /** Shows a comment's original target, optionally to edit its body. */
  function revisit(comment: Comment, edit: boolean) {
    if (!content || !draftDiscarded()) return;
    const target = comment.target;
    fileIndex = content.files.findIndex((f) => f.id === target.file_id);
    snapshotId = target.snapshot_id;
    mode = 'source';
    selection = { snapshot_id: target.snapshot_id, start_byte: target.start_byte, end_byte: target.end_byte };
    first = target.start_line;
    last = target.end_line;
    editing = edit ? comment.id : null;
    body = edit ? comment.body : '';
    message = `Original ${target.side} lines ${first}–${last}`;
    void tick().then(() => {
      document.getElementById(`line-${first}`)?.scrollIntoView({ block: 'center' });
      if (edit) textarea?.focus();
    });
  }

  async function remove(comment: Comment) {
    if (!confirm('Delete this comment?')) return;
    if (await change(() => api.deleteComment(comment.id))) {
      if (editing === comment.id) clearDraft();
      message = 'Comment deleted. Save to write feedback.';
    }
  }

  async function save() {
    if (hasDraft) {
      message = 'Record or cancel the comment draft before saving feedback.';
      textarea?.focus();
      return;
    }
    if (await change(api.save)) message = `Saved ${review?.last_saved}`;
  }

  async function toggleRevisions() {
    await refresh();
    mode = mode === 'revisions' ? 'source' : 'revisions';
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      if (!busy && review) void (event.target === textarea ? record() : save());
      return;
    }
    const target = event.target;
    const typing =
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
    if (typing || event.ctrlKey || event.metaKey || event.altKey || !content) return;
    const count = content.files.length;
    if (event.key === 'c') {
      event.preventDefault();
      textarea?.focus();
    } else if (event.key === ']') {
      chooseFile((fileIndex + 1) % count);
    } else if (event.key === '[') {
      chooseFile((fileIndex + count - 1) % count);
    }
  }

  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (review?.dirty || hasDraft) event.preventDefault();
  }

  onMount(() => {
    void loadContent();
    void refresh();
    const timer = setInterval(() => {
      if (!busy) void refresh();
    }, refreshInterval);
    return () => clearInterval(timer);
  });
</script>

<svelte:window onkeydown={onKeydown} onbeforeunload={onBeforeUnload} />

<header>
  <h1>Review</h1>
  {#if review}
    <div class="destination">
      Feedback: <code>{review.output}</code>
      {#if review.dirty}
        <span class="badge">Unsaved</span>
      {:else if review.last_saved}
        <span class="badge">Saved</span>
      {/if}
    </div>
    <button disabled={busy} onclick={save}>Save feedback</button>
  {/if}
</header>
<div class="status" role="status" aria-live="polite">
  {message || 'Select source text or line numbers, write a comment, then save feedback.'}
</div>
{#if review && content && file && snapshot}
  <nav aria-label="Review controls">
    <label>
      File
      <select
        aria-label="File"
        value={fileIndex}
        onchange={(e) => {
          chooseFile(Number(e.currentTarget.value));
          e.currentTarget.value = String(fileIndex);
        }}
      >
        {#each content.files as f, i (f.id)}
          <option value={i}>{f.path}</option>
        {/each}
      </select>
    </label>
    <label>
      Side
      <select bind:value={snapshotId} onchange={clearSelection} disabled={editing !== null}>
        {#each file.snapshots as s (s.id)}
          <option value={s.id}>{s.side} · {s.revision.slice(0, 16)}</option>
        {/each}
      </select>
    </label>
    <button aria-pressed={mode === 'source'} onclick={() => (mode = 'source')}>Source</button>
    {#if file.diff}
      <button aria-pressed={mode === 'diff'} onclick={() => (mode = 'diff')}>Unified diff</button>
    {/if}
    {#if preview !== undefined}
      <button aria-pressed={mode === 'preview'} onclick={() => (mode = 'preview')}>Markdown preview</button>
    {/if}
    <button aria-pressed={mode === 'revisions'} onclick={toggleRevisions}>Inspect revisions</button>
  </nav>
  {#if disk}
    <p class="revision-status" class:changed={disk.status !== 'unchanged'}>{disk.status}: {disk.message}</p>
  {/if}
  <main>
    <section aria-label="Reviewed content">
      <ContentView
        {file}
        {snapshot}
        {lines}
        {mode}
        {disk}
        preview={preview ?? ''}
        {highlight}
        bind:contextSide
        onselectline={selectLine}
        onselecttext={selectText}
        onselecterror={rejectSelection}
      />
      <form
        onsubmit={(e) => {
          e.preventDefault();
          void record();
        }}
      >
        <div class="range">
          <label>
            Start line
            <input type="number" min="1" max={lines.length} bind:value={first} onchange={selectNumberedLines} disabled={editing !== null || readOnly} />
          </label>
          <label>
            End line
            <input type="number" min="1" max={lines.length} bind:value={last} onchange={selectNumberedLines} disabled={editing !== null || readOnly} />
          </label>
          <button type="button" onclick={selectNumberedLines} disabled={editing !== null || readOnly}>Select lines</button>
        </div>
        {#if selection}
          <blockquote aria-label="Selected quote">{quote || '(empty file)'}</blockquote>
        {/if}
        <label for="comment">{editing ? 'Edit comment' : 'Comment'}</label>
        <textarea
          id="comment"
          bind:this={textarea}
          bind:value={body}
          rows="4"
          placeholder="Explain what should change…"
          maxlength="32768"
          disabled={busy || readOnly}
        ></textarea>
        <button disabled={busy || readOnly || !body.trim() || (!selection && !editing)}>
          {editing ? 'Update comment' : 'Add comment'}
        </button>
        <button type="button" onclick={cancelDraft} disabled={busy}>Cancel draft</button>
        <small>Ctrl+S in the comment records it. Save feedback writes JSON. [ and ] switch files.</small>
      </form>
    </section>
    <CommentList
      comments={review.comments}
      {busy}
      lastSaved={review.last_saved}
      onrevisit={(c) => revisit(c, false)}
      onedit={(c) => revisit(c, true)}
      ondelete={remove}
    />
  </main>
{:else}
  <p class="loading">{message || 'Loading the local review session…'}</p>
{/if}
