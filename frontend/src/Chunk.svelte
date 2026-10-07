<script lang="ts">
  import Composer from './Composer.svelte';
  import Note from './Note.svelte';
  import { segments } from './lines';
  import { review, type Part } from './review.svelte';
  import type { Place, Row } from './rows';

  let { part }: { part: Part } = $props();

  const names = ['m-h', 'm-b', 'm-i', 'm-s', 'm-c', 'm-q', 'm-a', 'm-x'];
  function classOf(flags: number, changed: boolean): string {
    const list = names.filter((_, bit) => flags & (1 << bit));
    if (changed) list.push('w');
    return list.join(' ');
  }

  const label = (place: Place, row: Row) => `Select ${row.places.length > 1 ? `${place.side} ` : ''}line ${place.line}`;
</script>

{#each part.rows as row, i}
  {@const n = part.start + i}
  {#if row.kind === 'hunk'}
    <div class="row hunk" id="r{n}"><span>{row.text}</span></div>
  {:else}
    <div
      class="row {row.kind}"
      id="r{n}"
      class:sel={i >= part.from && i <= part.to}
      class:sel-first={i === part.first}
      class:sel-last={i === part.last}
      class:cur={i === part.cursor}
      class:covered={part.covered.has(i)}
    >
      <span class="gutter">
        {#each row.places as place, column}
          {#if place?.snapshot}
            <button class="n" tabindex="-1" aria-label={label(place, row)} onclick={(e) => review.chooseLine(n, column, e.shiftKey)}
              >{place.line}</button
            >
          {:else}
            <span class="n">{place?.line ?? ''}</span>
          {/if}
        {/each}
        {#if row.places.length > 1}<span class="sign">{row.kind === 'add' ? '+' : row.kind === 'delete' ? '−' : ''}</span>{/if}
      </span>
      <span class="text"
        ><span class="t" data-start={row.target?.start} data-snapshot={row.target?.snapshot.id}
          >{#each segments(row.text, row.marks, row.changes) as s}{#if s.flags || s.changed}<span class={classOf(s.flags, s.changed)}
                >{s.text}</span
              >{:else}{s.text}{/if}{/each}</span
        >{#if i === part.pill}<button class="pill" aria-label="Comment" onclick={() => review.compose()}
            ><span aria-hidden="true">›</span> comment <kbd>c</kbd></button
          >{/if}</span
      >
    </div>
  {/if}
  {#each part.threads.get(i) ?? [] as comment (comment.id)}
    {#if review.draft?.editing?.id === comment.id}
      <Composer />
    {:else}
      <Note {comment} />
    {/if}
  {/each}
  {#if i === part.draft}
    <Composer />
  {/if}
{/each}
