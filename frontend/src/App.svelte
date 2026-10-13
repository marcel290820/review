<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Card from './Card.svelte';
  import Chunk from './Chunk.svelte';
  import { byteIndex, selectionPoint } from './lines';
  import { CHUNK, EAGER_ROWS, review, type Part } from './review.svelte';
  import { linesOf, snapshotOf, type View } from './rows';

  let doc = $state<HTMLElement>();
  let main = $state<HTMLElement>();

  const file = $derived(review.file);
  const preview = $derived(
    review.view === 'preview' && file ? review.markdown.get(snapshotOf(file, 'preview')?.id ?? '')?.html : undefined,
  );
  const diskFlag = $derived(
    review.disk && ['changed', 'missing', 'unavailable'].includes(review.disk.status) ? review.disk.status : null,
  );
  const ticks = $derived(review.rows.length > 40 ? [...review.threads.threads.keys()] : []);
  /** Digits of the longest line number, for the gutter's width. The preview keeps its source's
   * gutter, so its text starts where the source text does. */
  const digits = $derived.by(() => {
    const source = review.view === 'preview' && file ? snapshotOf(file, 'preview') : undefined;
    let last = source ? linesOf(source).length : 0;
    for (const row of review.rows) for (const place of row.places) if (place && place.line > last) last = place.line;
    return Math.max(3, String(last).length);
  });
  const savedName = $derived(review.state?.last_saved?.split(/[\\/]/).at(-1));
  /** Rows show old and new line numbers: a Git diff, or a disk revision. */
  const diffLayout = $derived(Boolean(file?.diff && review.view === 'main') || review.view === 'disk');

  const viewName = (view: View) => (view === 'main' ? (file?.diff ? 'diff' : 'source') : view);

  /** The most useful keys for what is happening now. */
  const hints = $derived.by((): [string, string][] => {
    if (review.draft) return [['enter', 'record'], ['shift/alt+enter', 'new line'], ['esc', 'cancel']];
    if (review.card === 'keys') return [['?', 'close']];
    if (review.card === 'comments') {
      return review.comments.length
        ? [['j k', 'choose'], ['enter', 'go to'], ['e', 'edit'], ['d', 'delete'], ['a', 'close']]
        : [['a', 'close']];
    }
    if (review.view === 'disk') return [['r', 'back to review'], ['[ ]', 'files'], ['?', 'keys']];
    if (review.view === 'preview') return [['b', 'view'], ['[ ]', 'files'], ['?', 'keys']];
    if (review.anchor !== null || review.choice) return [['c', 'comment on selection'], ['esc', 'clear']];
    const keys: [string, string][] = [['v', 'select'], ['c', 'comment']];
    if (review.views.length > 1) keys.push(['b', 'view']);
    keys.push(['a', 'all comments'], ['?', 'keys']);
    return keys;
  });

  // The tab names the file and marks unsaved feedback, so reviews in several tabs stay apart.
  $effect(() => {
    document.title = file ? `${review.state?.dirty ? '● ' : ''}${file.path} · review` : 'review';
  });

  onMount(() => {
    let stop: (() => void) | undefined;
    void review.start().then((s) => (stop = s));
    return () => stop?.();
  });

  // Another file or view starts at its top; going to a comment then scrolls to it.
  $effect(() => {
    void [review.fileIndex, review.view];
    if (main) untrack(() => main!.scrollTo(0, 0));
  });
  $effect(() => review.markParts());
  $effect(() => {
    if (review.editingGone) review.say('This comment was deleted elsewhere. Recording adds it again; esc discards it.', true);
  });
  $effect(() => review.commentParts());
  // Choosing a comment in the list shows its lines, as does deleting the chosen one, which
  // chooses the next; later state changes leave the scroll alone.
  const listedId = $derived(review.inReadingOrder[review.listed]?.id);
  $effect(() => {
    void [listedId, review.card];
    const rows = untrack(() => review.listedRows);
    if (rows) void review.reveal(rows[1], 'center');
  });

  // Files up to EAGER_ROWS draw their remaining chunks one at a time, between frames.
  $effect(() => {
    if (review.rows.length > EAGER_ROWS) return;
    const next = review.parts.find((part) => !part.mounted);
    if (!next) return;
    const timer = setTimeout(() => (next.mounted = true), 0);
    return () => clearTimeout(timer);
  });

  // Larger files draw a chunk when it comes within a screen of the view.
  let observer: IntersectionObserver | undefined;
  const waiting = new WeakMap<Element, Part>();
  function drawNearView(part: Part) {
    return (node: HTMLElement) => {
      if (part.mounted || !main) return;
      observer ??= new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const waits = waiting.get(entry.target);
            if (entry.isIntersecting && waits) waits.mounted = true;
          }
        },
        { root: main, rootMargin: '100% 0px' },
      );
      waiting.set(node, part);
      observer.observe(node);
      return () => observer?.unobserve(node);
    };
  }

  // A dragged passage stays marked exactly while its comment is written.
  $effect(() => {
    const choice = review.choice;
    if (choice) void [review.parts[Math.floor(choice.rows[0] / CHUNK)]?.mounted, review.parts[Math.floor(choice.rows[1] / CHUNK)]?.mounted];
    if (!('highlights' in CSS)) return;
    CSS.highlights.delete('choice');
    if (!choice?.passage) return;
    // Offsets count from the chosen snapshot's line: a diff context row shows the same text
    // on both sides, but its `data-start` may belong to the other one.
    const lines = linesOf(choice.snapshot);
    const point = (row: number, line: number, byte: number): [Node, number] | null => {
      const span = document.getElementById(`r${row}`)?.querySelector<HTMLElement>('[data-start]');
      if (!span) return null;
      let units = byteIndex(span.textContent ?? '')(byte - lines[line - 1].start);
      const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const length = node.textContent?.length ?? 0;
        if (units <= length) return [node, units];
        units -= length;
      }
      return [span, span.childNodes.length];
    };
    const [from, to] = [point(choice.rows[0], choice.first, choice.start), point(choice.rows[1], choice.last, choice.end)];
    if (!from || !to) return;
    const range = document.createRange();
    range.setStart(...from);
    range.setEnd(...to);
    CSS.highlights.set('choice', new Highlight(range));
  });

  function onselectionchange() {
    if (review.readOnly || review.draft || !doc) return;
    const selection = document.getSelection();
    const { anchorNode, focusNode } = selection ?? {};
    if (!selection || selection.isCollapsed || !anchorNode || !focusNode) return;
    if (!doc.contains(anchorNode) || !doc.contains(focusNode)) return;
    const anchor = selectionPoint(anchorNode, selection.anchorOffset);
    const focus = selectionPoint(focusNode, selection.focusOffset);
    if (!anchor && !focus) return;
    if (!anchor || !focus) {
      review.rejectPassage('Select reviewed text, or click line numbers.');
    } else if (anchor.snapshot_id !== focus.snapshot_id) {
      review.rejectPassage('Select one diff side, or press b for its full source.');
    } else {
      review.choosePassage(anchor.snapshot_id, Math.min(anchor.byte, focus.byte), Math.max(anchor.byte, focus.byte));
    }
  }

  /** A click in the text puts the key cursor on its row. */
  function onclick(event: MouseEvent) {
    const row = event.target instanceof Element && doc?.contains(event.target) ? event.target.closest('.row') : null;
    if (row && document.getSelection()?.isCollapsed) review.cursor = Number(row.id.slice(1));
  }

  function listKey(key: string, shift: boolean): boolean {
    const comments = review.inReadingOrder;
    const chosen = comments[review.listed];
    // The same movement keys as the content, as in the terminal; a page is ten comments.
    const by: Record<string, number> = { j: 1, ArrowDown: 1, k: -1, ArrowUp: -1, PageDown: 10, PageUp: -10, ' ': shift ? -10 : 10 };
    const to: Record<string, number> = { g: 0, Home: 0, G: comments.length - 1, End: comments.length - 1 };
    if (key in by || key in to) review.listed = Math.max(0, Math.min(to[key] ?? review.listed + by[key], comments.length - 1));
    else if (key === 'Enter' && chosen) void review.goTo(chosen);
    else if (key === 'e' && chosen) void review.goTo(chosen, true);
    else if (key === 'd' && chosen) void review.remove(chosen);
    else if (key === 'Escape') review.card = null;
    else return false;
    return true;
  }

  /** The first row in view, for moving on from what is shown after the view was scrolled
   * away from the cursor. */
  function rowInView(): number | null {
    const view = main?.getBoundingClientRect();
    const cursor = document.getElementById(`r${review.cursor}`)?.getBoundingClientRect();
    if (!view || (cursor && cursor.bottom > view.top && cursor.top < view.bottom)) return null;
    // Rows span the content column, so its middle meets a row on every line of text.
    const column = doc?.getBoundingClientRect() ?? view;
    const x = column.left + column.width / 2;
    for (let y = view.top + 1; y < view.bottom; y += 8) {
      const row = document.elementFromPoint(x, y)?.closest('.row');
      if (row?.id) return Number(row.id.slice(1));
    }
    return null;
  }

  /** Rows that fit on one screen, less two kept for context. */
  function pageRows(): number {
    const row = document.getElementById(`r${review.cursor}`)?.offsetHeight || 24;
    return Math.max(1, Math.floor((main?.clientHeight ?? 0) / row) - 2);
  }

  function onkeydown(event: KeyboardEvent) {
    const target = event.target;
    const typing =
      target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement || target instanceof HTMLSelectElement;
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (!typing && review.content) void review.save();
      return;
    }
    if (typing || event.ctrlKey || event.metaKey || event.altKey || !review.content || !file) return;
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) return;
    const key = event.key;
    const button = (key === 'Enter' || key === ' ') && target instanceof HTMLButtonElement;
    if (!button) review.notice = null;
    // The list's keys act on the chosen comment; Enter and Space on a focused listed comment
    // activate it instead. Focus on the list follows the chosen comment.
    const onListed = target instanceof Element && target.closest('.listed');
    if (review.card === 'comments' && !(onListed && button) && listKey(key, event.shiftKey)) {
      event.preventDefault();
      if (onListed) document.querySelector<HTMLElement>(`.listed[data-index="${review.listed}"]`)?.focus();
      return;
    }
    // Otherwise Enter and Space keep activating a focused button.
    if (button) return;
    // The preview has no rows to move through, so the movement keys scroll it.
    const page = (main?.clientHeight ?? 0) * 0.9;
    const scroll: Record<string, number> = { j: 48, ArrowDown: 48, k: -48, ArrowUp: -48, PageDown: page, PageUp: -page };
    scroll[' '] = event.shiftKey ? -page : page;
    if (review.view === 'preview' && main && (key in scroll || ['g', 'G', 'Home', 'End'].includes(key))) {
      event.preventDefault();
      if (key in scroll) main.scrollBy({ top: scroll[key] });
      else main.scrollTo({ top: key === 'g' || key === 'Home' ? 0 : main.scrollHeight });
      return;
    }
    const count = review.content.files.length;
    // After scrolling away from the cursor, moving goes on from the rows in view.
    if (['j', 'k', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(key)) review.cursor = rowInView() ?? review.cursor;
    switch (key) {
      case 'j':
      case 'ArrowDown':
        review.move(review.cursor + 1, event.shiftKey);
        break;
      case 'k':
      case 'ArrowUp':
        review.move(review.cursor - 1, event.shiftKey);
        break;
      case 'g':
      case 'Home':
        review.move(0, event.shiftKey);
        break;
      case 'G':
      case 'End':
        review.move(review.rows.length - 1, event.shiftKey);
        break;
      // The content scrolls inside the page, so the keys that scroll a page move the cursor
      // by a screen instead. Shift+Space pages up, as in the browser.
      case 'PageDown':
      case 'PageUp':
      case ' ': {
        const up = key === 'PageUp' || (key === ' ' && event.shiftKey);
        review.move(review.cursor + (up ? -1 : 1) * pageRows(), key !== ' ' && event.shiftKey);
        break;
      }
      case 'v':
        review.keyboard = true;
        review.card = null;
        review.toggleSelecting();
        break;
      case 'c':
      case 'Enter':
        review.compose();
        break;
      case 'Escape':
        if (review.card) review.card = null;
        else if (review.draft) review.cancelDraft();
        else [review.anchor, review.choice] = [null, null];
        break;
      case 'a':
        review.toggleCard('comments');
        break;
      case '?':
        review.toggleCard('keys');
        break;
      case ']':
        review.showFile((review.fileIndex + 1) % count);
        break;
      case '[':
        review.showFile((review.fileIndex + count - 1) % count);
        break;
      case 'b':
        if (review.views.length > 1) review.cycleView();
        else review.say('b switches views of Git changes and Markdown files.');
        break;
      case 'o':
      case 'n':
        if (file.diff) review.setContextSide(key === 'o' ? 'old' : 'new');
        else review.say('o and n apply to Git diffs.');
        break;
      case 'r':
        if (review.disk?.status === 'detached') review.say('Reopen with --root DIR to see changes on disk.', true);
        else review.toggleDisk();
        break;
      case 's':
        void review.save();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  function onbeforeunload(event: BeforeUnloadEvent) {
    if (review.state?.dirty || review.draft?.body.trim()) event.preventDefault();
  }
</script>

<svelte:window {onkeydown} {onbeforeunload} {onclick} />
<svelte:document {onselectionchange} />

<header>
  <div class="bar">
    <span class="brand"><span class="mark" aria-hidden="true"></span>review</span>
    {#if review.content}
      <nav class="tabs" aria-label="Files">
        {#each review.content.files as f, i (f.id)}
          {@const count = review.counts.get(f.id) ?? 0}
          <button
            class="tab"
            aria-current={i === review.fileIndex ? 'page' : undefined}
            aria-label={count ? `${f.path}, ${count} comment${count === 1 ? '' : 's'}` : f.path}
            title={f.path}
            onclick={() => review.showFile(i)}
            >{f.path}{#if count}<span class="count" aria-hidden="true">{count}</span>{/if}</button
          >
        {/each}
      </nav>
    {/if}
    <div class="views">
      {#if review.view === 'disk'}
        <span class="disk-view">disk revision <span class="muted">read-only</span></span>
        <button class="quiet" onclick={() => review.toggleDisk()}>back to review</button>
      {:else}
        {#if diskFlag}
          <button class="disk-flag" class:error={diskFlag !== 'changed'} onclick={() => review.toggleDisk()}>
            <span class="dot" aria-hidden="true"></span>{diskFlag} on disk
          </button>
        {/if}
        {#if review.views.length > 1}
          <div class="switch" role="group" aria-label="View">
            {#each review.views as view (view)}
              <button aria-pressed={review.view === view} onclick={() => review.setView(view)}>{viewName(view)}</button>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  </div>
</header>

<main bind:this={main}>
  {#if !review.content || !file}
    <p class="loading">{review.notice?.text ?? 'Opening the review…'}</p>
  {:else if review.view === 'preview'}
    <div class="doc prose" style:--digits={digits}>
      <article class="preview">
        <p class="preview-note">Preview is read-only. Comments target the source; press <kbd>b</kbd> to return.</p>
        <!-- Inert HTML from the server: raw HTML is escaped, links and images are text. -->
        {@html preview ?? ''}
      </article>
    </div>
  {:else}
    <div
      class="doc"
      class:diff={diffLayout}
      style:--digits={digits}
      bind:this={doc}
      aria-label="{file.path} content"
      role="region"
    >
      {#each review.parts as part (part)}
        <div
          class="chunk"
          style:contain-intrinsic-block-size="auto {part.rows.length * 1.7}em"
          style:min-height={part.mounted ? null : `${part.rows.length * 1.7}em`}
          {@attach drawNearView(part)}
        >
          {#if part.mounted}<Chunk {part} />{/if}
        </div>
      {/each}
      <div class="end" aria-hidden="true"><span>end</span></div>
    </div>
    {#if ticks.length}
      <div class="rail" aria-label="Comments in this file">
        {#each ticks as row (row)}
          <button
            class="tick"
            style:top="{(row / review.rows.length) * 100}%"
            aria-label="Comment at row {row + 1}"
            onclick={() => review.reveal(row, 'center')}
          ></button>
        {/each}
      </div>
    {/if}
  {/if}
</main>

<Card {digits} diff={diffLayout} />

<footer>
  <div class="bar">
    <p class="notice" class:error={review.notice?.error} role="status" aria-live="polite">{review.notice?.text ?? ''}</p>
    {#if !review.notice}
      <p class="hints">
        {#each hints as [key, label] (key)}<span><kbd>{key}</kbd> {label}</span>{/each}
      </p>
    {/if}
    <p class="state">
      <button class="count" onclick={() => review.toggleCard('comments')}>
        {review.comments.length || 'no'} comment{review.comments.length === 1 ? '' : 's'}
      </button>
      {#if review.state?.dirty}
        <span class="unsaved"><span class="dot" aria-hidden="true"></span>unsaved</span>
      {:else if savedName}
        <button class="saved" title="Copy the path {review.state?.last_saved}" onclick={() => review.copySaved()}
          >saved to <code>{savedName}</code></button
        >
      {/if}
      <button
        class="save"
        class:dirty={review.state?.dirty}
        aria-label="Save feedback"
        disabled={review.busy || !review.state}
        title="Saves to {review.state?.output}"
        onclick={() => review.save()}><kbd>s</kbd> save</button
      >
    </p>
  </div>
</footer>
