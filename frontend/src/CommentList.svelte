<script lang="ts">
  import type { Comment } from './types';

  type Props = {
    comments: Comment[];
    busy: boolean;
    lastSaved: string | null;
    onrevisit: (comment: Comment) => void;
    onedit: (comment: Comment) => void;
    ondelete: (comment: Comment) => void;
  };

  let { comments, busy, lastSaved, onrevisit, onedit, ondelete }: Props = $props();
</script>

<aside aria-label="Comments">
  <h2>Comments <span class="badge">{comments.length}</span></h2>
  {#if comments.length === 0}
    <p class="hint">Select a passage or click a line number to add the first comment.</p>
  {/if}
  {#each comments as comment (comment.id)}
    {@const target = comment.target}
    <article class="comment">
      <button class="comment-target" onclick={() => onrevisit(comment)}>
        {target.path} · {target.side} L{target.start_line}–{target.end_line}
      </button>
      <blockquote>{target.quote || '(empty file)'}</blockquote>
      <p>{comment.body}</p>
      <button disabled={busy} onclick={() => onedit(comment)}>Edit</button>
      <button disabled={busy} onclick={() => ondelete(comment)}>Delete</button>
    </article>
  {/each}
  {#if lastSaved}
    <p class="hint">Last save: <code>{lastSaved}</code></p>
  {/if}
</aside>
