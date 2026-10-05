<script lang="ts">
  import { onMount } from 'svelte';
  import { boundary, lineRange, sourceLines } from './selection.js';
  import type { Comment, Content, DiffRow, Snapshot, State } from './types';

  let content = $state<Content | null>(null);
  let view = $state<State | null>(null);
  let fileIndex = $state(0);
  let snapshotId = $state('');
  let mode = $state('source');
  let contextSide = $state('new');
  let selection = $state<{ snapshot_id: string; start_byte: number; end_byte: number } | null>(null);
  let first = $state(1);
  let last = $state(1);
  let body = $state('');
  let editing = $state<string | null>(null);
  let message = $state('');
  let busy = $state(false);
  let textarea = $state<HTMLTextAreaElement>();
  let serial = 0;
  const fragment = new URLSearchParams(location.hash.slice(1));
  const token = fragment.get('token') || sessionStorage.getItem('review-token') || '';
  if (fragment.has('token')) { sessionStorage.setItem('review-token', token); history.replaceState(null, '', location.pathname); }

  let file = $derived(content?.files[fileIndex]);
  let snapshot = $derived(file?.snapshots.find(s => s.id === snapshotId) || file?.snapshots.at(-1));
  let disk = $derived(view?.disk.find(d => d.file_id === file?.id));
  let source = $derived(sourceLines(snapshot?.text || ''));
  let snapshotLines = $derived(new Map(file?.snapshots.map(s => [s.id, sourceLines(s.text)])));
  let preview = $derived(content?.previews.find(p => p.snapshot_id === snapshot?.id)?.html || '');
  let quote = $derived.by(() => {
    if (!selection || !file) return '';
    const target = selection;
    const s = file.snapshots.find(s => s.id === target.snapshot_id);
    return s ? new TextDecoder().decode(new TextEncoder().encode(s.text).slice(target.start_byte, target.end_byte)) : '';
  });

  async function request<T = State>(path: string, method = 'GET', payload?: unknown): Promise<T> {
    const response = await fetch(path, { method, headers: { Authorization: `Bearer ${token}`, ...(payload !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}) });
    const text = await response.text();
    if (!response.ok) { let error = text; try { error = JSON.parse(text).error || text; } catch {} throw Error(error); }
    return JSON.parse(text);
  }
  async function loadContent() {
    try {
      content = await request<Content>('/api/content');
      snapshotId = content.files[0].snapshots.at(-1)!.id; mode = content.files[0].diff ? 'diff' : 'source';
    } catch (error) { message = String(error); }
  }
  async function load() {
    const sequence = ++serial;
    try {
      const next = await request('/api/refresh', 'POST');
      if (sequence === serial) view = next;
    } catch (error) { message = String(error); }
  }
  async function mutate(path: string, method: string, payload?: unknown) {
    busy = true; const sequence = ++serial;
    try { const next = await request(path, method, payload); if (sequence === serial) view = next; return true; }
    catch (error) { await load(); message = String(error); return false; }
    finally { busy = false; }
  }
  function chooseFile(index: number) {
    if ((body || editing) && !confirm('Discard this unrecorded comment draft?')) return;
    fileIndex = index; snapshotId = content!.files[index].snapshots.at(-1)!.id;
    mode = content!.files[index].diff ? 'diff' : 'source'; selection = null; editing = null; body = ''; first = last = 1;
  }
  function selectLine(s: Snapshot, number: number, extend = false) {
    if (editing) { message = 'Finish or cancel editing before choosing another target.'; return; }
    if (!extend || selection?.snapshot_id !== s.id) { first = last = number; }
    else { first = Math.min(first, number); last = Math.max(last, number); }
    snapshotId = s.id; selection = { snapshot_id: s.id, ...lineRange(s.text, first, last) };
    message = `${s.side} lines ${first}–${last} selected`;
  }
  function numericSelection() {
    if (!snapshot || editing) return;
    try { selection = { snapshot_id: snapshot.id, ...lineRange(snapshot.text, first, last) }; message = ''; }
    catch (error) { selection = null; message = String(error); }
  }
  function pointerSelection() {
    if (editing || mode === 'current' || mode === 'preview') return;
    const selected = window.getSelection();
    if (!selected || selected.isCollapsed || !selected.anchorNode || !selected.focusNode) return;
    const a = boundary(selected.anchorNode, selected.anchorOffset); const b = boundary(selected.focusNode, selected.focusOffset);
    if (!a || !b) { message = 'Select source text without the line-number controls, or use line ranges.'; return; }
    if (a.snapshot_id !== b.snapshot_id) { message = 'Select one diff side, or switch to its full Source view.'; return; }
    const s = file!.snapshots.find(s => s.id === a.snapshot_id)!;
    snapshotId = s.id; selection = { snapshot_id: s.id, start_byte: Math.min(a.byte, b.byte), end_byte: Math.max(a.byte, b.byte) };
    first = sourceLines(s.text).findIndex(l => l.end > selection!.start_byte) + 1;
    last = sourceLines(s.text).findIndex(l => l.end >= selection!.end_byte) + 1;
    message = 'Passage selected. Write a comment below.';
  }
  async function record() {
    if (mode === 'current' || mode === 'preview') return;
    if (!file || (!selection && !editing) || !body.trim()) return;
    const ok = await mutate(editing ? `/api/comments/${editing}` : '/api/comments', editing ? 'PUT' : 'POST', editing ? { body } : { file_id: file.id, ...selection, body });
    if (ok) { body = ''; editing = null; message = 'Comment recorded. Save feedback to write it to disk.'; }
  }
  function revisit(c: Comment, edit = false) {
    if ((body || editing) && !confirm('Discard this unrecorded comment draft?')) return;
    fileIndex = content!.files.findIndex(f => f.id === c.target.file_id);
    snapshotId = c.target.snapshot_id; mode = 'source'; selection = { snapshot_id: snapshotId, start_byte: c.target.start_byte, end_byte: c.target.end_byte };
    first = c.target.start_line; last = c.target.end_line; editing = edit ? c.id : null; body = edit ? c.body : '';
    message = `Original ${c.target.side} lines ${first}–${last}`;
    setTimeout(() => { document.getElementById(`line-${first}`)?.scrollIntoView({ block: 'center' }); if (edit) textarea?.focus(); }, 0);
  }
  async function remove(c: Comment) {
    if (!confirm('Delete this comment?')) return;
    if (await mutate(`/api/comments/${c.id}`, 'DELETE')) { if (editing === c.id) { body = ''; editing = null; } message = 'Comment deleted. Save to write feedback.'; }
  }
  async function save() {
    if (body || editing) { message = 'Record or cancel the comment draft before saving feedback.'; textarea?.focus(); return; }
    if (await mutate('/api/save', 'POST')) message = `Saved ${view!.last_saved}`;
  }
  function rowSnapshot(row: DiffRow) { return file?.snapshots.find(s => s.side === (row.kind === 'delete' ? 'old' : row.kind === 'add' ? 'new' : contextSide)); }
  function rowLine(row: DiffRow, s: Snapshot | undefined) { return (s?.side === 'old' ? row.old_line : row.new_line) || 1; }
  function key(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 's') { event.preventDefault(); if (!busy && view) { if (event.target === textarea) void record(); else void save(); } return; }
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
    if (event.key === 'c') textarea?.focus();
    if (event.key === ']' && content) chooseFile((fileIndex + 1) % content.files.length);
    if (event.key === '[' && content) chooseFile((fileIndex + content.files.length - 1) % content.files.length);
  }
  onMount(() => {
    void loadContent(); void load();
    const timer = setInterval(() => { if (!busy) void load(); }, 2500);
    const leave = (event: BeforeUnloadEvent) => { if (view?.dirty || body || editing) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', leave); window.addEventListener('keydown', key);
    return () => { clearInterval(timer); window.removeEventListener('beforeunload', leave); window.removeEventListener('keydown', key); };
  });
</script>

<header>
  <h1>Review</h1>
  {#if view}
    <div class="destination">Feedback: <code>{view.output}</code><span class="badge">{view.dirty ? 'Unsaved' : 'Saved'}</span></div>
    <button disabled={busy} onclick={save}>Save feedback</button>
  {/if}
</header>
<div class="status" role="status" aria-live="polite">{message || 'Select source text or line numbers, write a comment, then save feedback.'}</div>
{#if view && content && file && snapshot}
  <nav aria-label="Review controls">
    <label>File <select aria-label="File" value={fileIndex} onchange={(e) => { chooseFile(Number(e.currentTarget.value)); e.currentTarget.value = String(fileIndex); }}>
      {#each content.files as f, i}<option value={i}>{f.path}</option>{/each}
    </select></label>
    <label>Side <select bind:value={snapshotId} onchange={() => { selection = null; first = last = 1; }} disabled={!!editing}>
      {#each file.snapshots as s}<option value={s.id}>{s.side} · {s.revision.slice(0, 16)}</option>{/each}
    </select></label>
    <button aria-pressed={mode === 'source'} onclick={() => mode = 'source'}>Source</button>
    {#if file.diff}<button aria-pressed={mode === 'diff'} onclick={() => mode = 'diff'}>Unified diff</button>{/if}
    {#if preview}<button aria-pressed={mode === 'preview'} onclick={() => mode = 'preview'}>Markdown preview</button>{/if}
    <button aria-pressed={mode === 'current'} onclick={async () => { await load(); mode = mode === 'current' ? 'source' : 'current'; }}>Inspect revisions</button>
  </nav>
  <p class:changed={disk?.status !== 'unchanged'} class="revision-status">{disk?.status}: {disk?.message}</p>
  <main>
    <section aria-label="Reviewed content">
      <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (Focusable scroll region; line buttons and ranges provide keyboard selection.) -->
      <div class="content" role="region" aria-label="Source content" tabindex="0" onmouseup={pointerSelection} onkeyup={() => pointerSelection()}>
        {#if mode === 'preview'}
          <p class="hint">Preview is read-only. Use Source to select a precise comment target.</p>
          <article class="markdown">{@html preview}</article>
        {:else if mode === 'current'}
          <p class="hint">Disk revision is read-only. Existing comments remain on the original snapshot.</p>
          {#if disk?.diff.length}
            {#each disk.diff as row}<div class="source-row {row.kind}"><code class="revision-gutter">{row.old_line ?? ''} → {row.new_line ?? ''}</code><span>{row.kind === 'delete' ? '−' : row.kind === 'add' ? '+' : ' '} {row.text}</span></div>{/each}
          {:else}<p>{disk?.message}</p>{/if}
        {:else if mode === 'diff' && file.diff}
          <label class="hint">Context target side <select bind:value={contextSide}><option value="new">new</option><option value="old">old</option></select></label>
          {#each file.diff as row}
            {@const s = rowSnapshot(row)}
            {@const number = rowLine(row, s)}
            <div class="source-row {row.kind}">
              <div class="diff-gutter">
                {#each file.snapshots as side}
                  {@const n = side.side === 'old' ? row.old_line : row.new_line}
                  {#if n}<button aria-label="Select {side.side} line {n}" onclick={(e) => selectLine(side, n, e.shiftKey)}>{side.side === 'old' ? '−' : '+'}{n}</button>{:else}<span></span>{/if}
                {/each}
              </div>
              {#if s && (row.old_line || row.new_line)}<span data-start={snapshotLines.get(s.id)![number - 1].start} data-snapshot={s.id}>{row.text}</span>{:else}<span>{row.text}</span>{/if}
            </div>
          {/each}
          {#if !file.diff.length}<p>No textual changes (empty files or mode-only change). Choose Source to comment.</p>{/if}
        {:else}
          {#each source as line}
            <div id="line-{line.number}" class="source-row" class:selected={selection?.snapshot_id === snapshot.id && line.number >= first && line.number <= last}>
              <button class="line-number" aria-label="Select line {line.number}" onclick={(e) => selectLine(snapshot!, line.number, e.shiftKey)}>{line.number}</button>
              <span data-start={line.start} data-snapshot={snapshot.id}>{line.text}</span>
            </div>
          {/each}
        {/if}
      </div>
      <form onsubmit={(e) => { e.preventDefault(); void record(); }}>
        <div class="range">
          <label>Start line <input type="number" min="1" max={source.length} bind:value={first} onchange={numericSelection} disabled={!!editing || mode === 'current' || mode === 'preview'}></label>
          <label>End line <input type="number" min="1" max={source.length} bind:value={last} onchange={numericSelection} disabled={!!editing || mode === 'current' || mode === 'preview'}></label>
          <button type="button" onclick={numericSelection} disabled={!!editing || mode === 'current' || mode === 'preview'}>Select lines</button>
        </div>
        {#if selection}<blockquote aria-label="Selected quote">{quote || '(empty file)'}</blockquote>{/if}
        <label for="comment">{editing ? 'Edit comment' : 'Comment'}</label>
        <textarea id="comment" bind:this={textarea} bind:value={body} rows="4" placeholder="Explain what should change…" maxlength="32768" disabled={busy || mode === 'current' || mode === 'preview'}></textarea>
        <button disabled={busy || mode === 'current' || mode === 'preview' || !body.trim() || (!selection && !editing)}>{editing ? 'Update comment' : 'Add comment'}</button>
        <button type="button" onclick={() => { body = ''; editing = null; selection = null; }} disabled={busy}>Cancel draft</button>
        <small>Ctrl+S in the comment records it. Save feedback writes JSON. [ and ] switch files.</small>
      </form>
    </section>
    <aside aria-label="Comments">
      <h2>Comments <span class="badge">{view.comments.length}</span></h2>
      {#if !view.comments.length}<p class="hint">Select a passage or click a line number to add the first comment.</p>{/if}
      {#each view.comments as c (c.id)}
        <article class="comment">
          <button class="comment-target" onclick={() => revisit(c)}>{c.target.path} · {c.target.side} L{c.target.start_line}–{c.target.end_line}</button>
          <blockquote>{c.target.quote || '(empty file)'}</blockquote><p>{c.body}</p>
          <button disabled={busy} onclick={() => revisit(c, true)}>Edit</button>
          <button disabled={busy} onclick={() => remove(c)}>Delete</button>
        </article>
      {/each}
      {#if view.last_saved}<p class="hint">Last save: <code>{view.last_saved}</code></p>{/if}
    </aside>
  </main>
{:else}<p class="loading">{message || 'Loading the local review session…'}</p>{/if}
