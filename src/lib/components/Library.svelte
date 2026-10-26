<script lang="ts">
  import type { Study } from '#lib/study/types.ts';
  import { formatTime } from '#lib/study/model.ts';
  let { study, onimport }: { study: Study; onimport: () => void } = $props();
  const s = $derived(study.state);
  const matching = $derived(
    s.clips.filter((clip) =>
      [clip.title, clip.creator, ...clip.tags]
        .join(' ')
        .toLowerCase()
        .includes(s.query.toLowerCase().trim())
    )
  );
</script>

<aside id="library-panel" class="library panel" hidden={!s.libraryVisible}>
  <div class="panel-heading">
    <h2>Video Library</h2>
    <button
      id="library-close"
      aria-label="Close library"
      onclick={() => (s.libraryVisible = false)}>×</button
    >
    <span>{String(s.clips.length).padStart(2, '0')}</span>
  </div>
  <div class="library-tools">
    <button
      class="import-button"
      onclick={onimport}
      disabled={!s.available || s.importing}
      >{s.importing ? 'Adding videos…' : 'Add videos…'}</button
    >
    <label class="search"
      ><span aria-hidden="true">⌕</span><input
        bind:value={s.query}
        placeholder="Search videos"
        aria-label="Search library"
      /></label
    >
  </div>
  <div class="library-list">
    {#each matching as clip (clip.id)}
      <button
        class="clip-card"
        class:selected={s.current?.id === clip.id}
        aria-label={'Open ' + clip.title}
        aria-pressed={s.current?.id === clip.id}
        onclick={() => study.openClip(clip)}
      >
        {#if clip.thumbnail}<img
            class="clip-thumb"
            src={clip.thumbnail}
            alt=""
          />{:else}<span class="clip-thumb thumb-placeholder" aria-hidden="true"
            >↻</span
          >{/if}
        <span class="clip-text"
          ><strong>{clip.title}</strong>
          {#if clip.creator && clip.creator !== 'YOUR IPHONE RECORDING'}<span
              class="creator">{clip.creator}</span
            >{/if}
          <span class="clip-meta">{formatTime(clip.duration)}</span>
        </span>
      </button>
    {:else}
      <p class="list-empty">
        {s.loading
          ? 'Opening your library…'
          : s.query.trim()
            ? 'No recordings match your search.'
            : 'Your library is ready. Import a recording to get started.'}
      </p>
    {/each}
  </div>
</aside>
