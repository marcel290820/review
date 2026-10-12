<script lang="ts">
  import { review } from './review.svelte';
  import type { Comment } from './types';

  let { comment }: { comment: Comment } = $props();

  const chosen = $derived(review.card === 'comments' && review.inReadingOrder[review.listed]?.id === comment.id);
</script>

<div class="comment" class:chosen>
  <p>{comment.body}</p>
  <span class="comment-actions">
    <button disabled={review.busy} aria-label="Edit this comment" onclick={() => review.goTo(comment, true)}>edit</button>
    <button disabled={review.busy} aria-label="Delete this comment" onclick={() => review.remove(comment)}>delete</button>
  </span>
</div>
