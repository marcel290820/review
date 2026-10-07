<script lang="ts">
  import { review } from './review.svelte';
  import type { Comment } from './types';

  let { comment }: { comment: Comment } = $props();

  const chosen = $derived(review.card === 'comments' && review.inReadingOrder[review.listed]?.id === comment.id);
</script>

<div class="note" class:chosen>
  <p>{comment.body}</p>
  <span class="note-actions">
    <button disabled={review.busy} onclick={() => review.goTo(comment, true)}>Edit</button>
    <button disabled={review.busy} onclick={() => review.remove(comment)}>Delete</button>
  </span>
</div>
