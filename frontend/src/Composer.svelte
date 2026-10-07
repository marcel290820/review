<script lang="ts">
  import { location, quoteOf, review } from './review.svelte';

  let textarea = $state<HTMLTextAreaElement>();

  /** Fits the textarea to its text where CSS `field-sizing` is missing. */
  function grow(area: HTMLTextAreaElement) {
    if (CSS.supports('field-sizing', 'content')) return;
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight}px`;
  }

  const editing = $derived(review.draft?.editing?.target);
  const updating = $derived(editing && !review.editingGone);
  const title = $derived.by(() => {
    if (editing) return `Edit ${location(editing.path, editing.side, editing.start_line, editing.end_line)}`;
    const choice = review.choice;
    return choice && review.file ? location(review.file.path, choice.snapshot.side, choice.first, choice.last) : 'Comment';
  });
  const quote = $derived(!editing && review.choice?.passage ? quoteOf(review.choice) : null);
  const body = $derived(review.draft?.body ?? '');

  $effect(() => {
    if (textarea) grow(textarea);
    textarea?.focus();
    textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
  });

  function onkeydown(event: KeyboardEvent) {
    const command = event.ctrlKey || event.metaKey;
    if (command && (event.key === 'Enter' || event.key === 's')) {
      event.preventDefault();
      void review.record();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      review.cancelDraft();
    } else return;
    event.stopPropagation();
  }
</script>

<form
  class="composer"
  onsubmit={(event) => {
    event.preventDefault();
    void review.record();
  }}
>
  <div class="composer-card">
    <span class="composer-title">{title}</span>
    {#if quote !== null}
      <blockquote aria-label="Selected quote">{quote}</blockquote>
    {/if}
    <div class="prompt">
      <span aria-hidden="true">›</span>
      <textarea
        bind:this={textarea}
        value={body}
        oninput={(event) => {
          if (review.draft) review.draft.body = event.currentTarget.value;
          grow(event.currentTarget);
        }}
        {onkeydown}
        aria-label={editing ? 'Edit comment' : 'Comment'}
        readonly={review.busy}
        placeholder="What should change here?"
        maxlength="32768"
        rows="1"
      ></textarea>
    </div>
    <!-- The keys, set into the bottom rule, are also the pointer's actions. -->
    <div class="composer-actions">
      <button type="button" aria-label="Cancel" onclick={() => review.cancelDraft()}>cancel</button>
      <button aria-label={updating ? 'Update comment' : 'Add comment'} disabled={review.busy || !body.trim()}
        >{updating ? 'update' : 'record'}</button
      >
    </div>
  </div>
</form>
