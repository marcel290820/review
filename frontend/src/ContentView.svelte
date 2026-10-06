<script lang="ts">
  import { selectionPoint, sourceLines, type Line } from './lines';
  import type { DiffRow, DiskState, Mode, ReviewFile, Selection, Snapshot } from './types';

  type Props = {
    file: ReviewFile;
    /** The snapshot shown in the source view. */
    snapshot: Snapshot;
    lines: Line[];
    mode: Mode;
    disk: DiskState | undefined;
    /** Sanitized HTML from the server. */
    preview: string;
    highlight: { snapshotId: string; first: number; last: number } | null;
    /** The side that diff context lines target. */
    contextSide: 'old' | 'new';
    onselectline: (snapshot: Snapshot, line: number, extend: boolean) => void;
    onselecttext: (selection: Selection) => void;
    onselecterror: (message: string) => void;
  };

  let {
    file,
    snapshot,
    lines,
    mode,
    disk,
    preview,
    highlight,
    contextSide = $bindable(),
    onselectline,
    onselecttext,
    onselecterror,
  }: Props = $props();

  let container = $state<HTMLElement>();
  /** Lines of each snapshot, for the byte offsets of diff rows. */
  const snapshotLines = $derived(new Map(file.snapshots.map((s) => [s.id, sourceLines(s.text)])));

  /** Deleted lines target the old side, added lines the new side, and context lines `contextSide`. */
  function rowSnapshot(row: DiffRow): Snapshot | undefined {
    const side = row.kind === 'delete' ? 'old' : row.kind === 'add' ? 'new' : contextSide;
    return file.snapshots.find((s) => s.side === side);
  }

  function rowStart(row: DiffRow, target: Snapshot): number | undefined {
    const number = target.side === 'old' ? row.old_line : row.new_line;
    return number === null ? undefined : snapshotLines.get(target.id)?.[number - 1]?.start;
  }

  function isHighlighted(line: number): boolean {
    return highlight?.snapshotId === snapshot.id && line >= highlight.first && line <= highlight.last;
  }

  /** Turns a text selection in reviewed source into a byte-range target. */
  function readSelection() {
    if (mode === 'preview' || mode === 'revisions') return;
    const selected = document.getSelection();
    const { anchorNode, focusNode } = selected ?? {};
    if (!selected || selected.isCollapsed || !anchorNode || !focusNode || !container?.contains(anchorNode)) return;
    const anchor = selectionPoint(anchorNode, selected.anchorOffset);
    const focus = selectionPoint(focusNode, selected.focusOffset);
    if (!anchor || !focus) {
      onselecterror('Select source text without the line-number controls, or use line ranges.');
    } else if (anchor.snapshot_id !== focus.snapshot_id) {
      onselecterror('Select one diff side, or switch to its full Source view.');
    } else {
      onselecttext({
        snapshot_id: anchor.snapshot_id,
        start_byte: Math.min(anchor.byte, focus.byte),
        end_byte: Math.max(anchor.byte, focus.byte),
      });
    }
  }
</script>

<svelte:document onselectionchange={readSelection} />

<div class="content" role="region" aria-label="Source content" bind:this={container}>
  {#if mode === 'preview'}
    <p class="hint">Preview is read-only. Use Source to select a precise comment target.</p>
    <article class="markdown">{@html preview}</article>
  {:else if mode === 'revisions'}
    <p class="hint">Disk revision is read-only. Existing comments remain on the original snapshot.</p>
    {#if disk?.diff.length}
      {#each disk.diff as row}
        <div class="source-row {row.kind}">
          <code class="revision-gutter">{row.old_line ?? ''} → {row.new_line ?? ''}</code>
          <span>{row.kind === 'delete' ? '−' : row.kind === 'add' ? '+' : ' '} {row.text}</span>
        </div>
      {/each}
    {:else}
      <p>{disk?.message}</p>
    {/if}
  {:else if mode === 'diff' && file.diff}
    <label class="hint">
      Context target side
      <select bind:value={contextSide}>
        <option value="new">new</option>
        <option value="old">old</option>
      </select>
    </label>
    {#each file.diff as row}
      {@const target = rowSnapshot(row)}
      {@const start = target && rowStart(row, target)}
      <div class="source-row {row.kind}">
        <div class="diff-gutter">
          {#each file.snapshots as side (side.id)}
            {@const number = side.side === 'old' ? row.old_line : row.new_line}
            {#if number}
              <button aria-label="Select {side.side} line {number}" onclick={(e) => onselectline(side, number, e.shiftKey)}>
                {side.side === 'old' ? '−' : '+'}{number}
              </button>
            {:else}
              <span></span>
            {/if}
          {/each}
        </div>
        {#if target && start !== undefined}
          <span data-start={start} data-snapshot={target.id}>{row.text}</span>
        {:else}
          <span>{row.text}</span>
        {/if}
      </div>
    {/each}
    {#if file.diff.length === 0}
      <p>No textual changes (empty files or mode-only change). Choose Source to comment.</p>
    {/if}
  {:else}
    {#each lines as line (line.number)}
      <div id="line-{line.number}" class="source-row" class:selected={isHighlighted(line.number)}>
        <button class="line-number" aria-label="Select line {line.number}" onclick={(e) => onselectline(snapshot, line.number, e.shiftKey)}>
          {line.number}
        </button>
        <span data-start={line.start} data-snapshot={snapshot.id}>{line.text}</span>
      </div>
    {/each}
  {/if}
</div>
