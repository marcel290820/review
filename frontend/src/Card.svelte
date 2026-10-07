<script lang="ts">
  import { review } from './review.svelte';
  import type { Comment } from './types';

  /** The key reference, one column per group. */
  const KEYS: [string, [string, string][]][] = [
    ['move', [['j k', 'line'], ['g G', 'top, bottom'], ['[ ]', 'previous, next file']]],
    ['comment', [['v', 'select lines'], ['c', 'comment'], ['a', 'all comments'], ['e d', 'edit, delete in the list']]],
    ['view', [['b', 'diff, old, new, preview'], ['o n', 'context lines on old, new'], ['r', 'changes on disk']]],
    ['feedback', [['s', 'save'], ['ctrl+enter', 'record a comment'], ['?', 'close']]],
  ];

  /** Comments under their files, in reading order. */
  const groups = $derived.by(() => {
    const groups: { path: string; comments: { comment: Comment; index: number }[] }[] = [];
    review.inReadingOrder.forEach((comment, index) => {
      const path = comment.target.path;
      if (groups.at(-1)?.path !== path) groups.push({ path, comments: [] });
      groups.at(-1)!.comments.push({ comment, index });
    });
    return groups;
  });

  const place = (c: Comment) => {
    const t = c.target;
    const lines = t.start_line === t.end_line ? `${t.start_line}` : `${t.start_line}–${t.end_line}`;
    return t.side === 'source' ? lines : `${t.side} ${lines}`;
  };

  const output = $derived(review.state?.output ?? '');

  /** A long path keeps its start and its file name. */
  function shortened(path: string): string {
    return path.length <= 72 ? path : `${path.slice(0, 24)}…${path.slice(-44)}`;
  }

  let list = $state<HTMLElement>();
  $effect(() => {
    list?.querySelector(`[data-index="${review.listed}"]`)?.scrollIntoView({ block: 'nearest' });
  });
</script>

{#if review.card === 'comments'}
  <section class="card" aria-label="All comments">
    <div class="card-inner">
      <div class="card-frame">
        <h2 class="card-title">Comments</h2>
        <div class="card-body" bind:this={list}>
        {#if groups.length === 0}
          <p class="empty">No comments yet. Click a line number or drag across text, then press <kbd>c</kbd>.</p>
        {/if}
        {#each groups as group (group.path)}
          <h3 class="card-file">{group.path}</h3>
          {#each group.comments as { comment, index } (comment.id)}
            <button
              class="listed"
              class:chosen={index === review.listed}
              data-index={index}
              onfocus={() => (review.listed = index)}
              onclick={() => {
                review.listed = index;
                void review.goTo(comment);
              }}
            >
              <span class="place">{place(comment)}</span>
              <span class="excerpt">{comment.body}</span>
              <span class="target">{comment.target.quote.split('\n', 1)[0] || '(empty file)'}</span>
            </button>
          {/each}
        {/each}
        </div>
      </div>
    </div>
  </section>
{:else if review.card === 'keys'}
  <section class="card" aria-label="Keys">
    <div class="card-inner">
      <div class="card-frame">
        <h2 class="card-title">Keys</h2>
        <div class="card-body">
        <div class="keys">
          {#each KEYS as [group, pairs] (group)}
            <div>
              <h3>{group}</h3>
              <dl>
                {#each pairs as [key, label] (key)}
                  <div><dt><kbd>{key}</kbd></dt><dd>{label}</dd></div>
                {/each}
              </dl>
            </div>
          {/each}
        </div>
        <p class="pointer">With a pointer: click a line number, shift-click another to extend, or drag across text.</p>
        <p class="output">saves to <code title={output}>{shortened(output)}</code></p>
        </div>
      </div>
    </div>
  </section>
{/if}
