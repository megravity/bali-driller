<script lang="ts">
  import type { Study } from '#lib/study/types.ts';
  import { formatTime, speeds } from '#lib/study/model.ts';

  let { study }: { study: Study } = $props();

  const s = $derived(study.state);
</script>

<div class="practice-controls">
  <div class="loop-status">
    <button
      id="loop-status"
      aria-pressed={s.looping}
      onclick={study.toggleLoop}
      disabled={!s.ready}
    >
      {s.looping
        ? `${formatTime(s.a)} → ${formatTime(s.b)}`
        : 'Whole video · loop off'}
    </button>
    <span class="time-display"
      ><strong id="current-time">{formatTime(s.time)}</strong><span
        class="time-total"
      >
        / {formatTime(s.duration)}</span
      ></span
    >
  </div>
  <div class="practice-dock">
    <button
      id="play"
      class:is-playing={s.playing}
      aria-label={s.playing ? 'Pause' : 'Play'}
      title="Play / pause (Space)"
      onclick={study.togglePlay}
      disabled={!s.ready}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"
        ><path class="play-glyph" d="M8 5l11 7-11 7z" fill="currentColor" /><g
          class="pause-glyph"
          fill="currentColor"><path d="M7 5h4v14H7zM14 5h4v14h-4z" /></g
        ></svg
      >
    </button>
    <button
      id="restart"
      aria-label="Restart section"
      onclick={study.restart}
      disabled={!s.ready}
      ><span aria-hidden="true">↶</span><span>Restart</span></button
    >
    <select
      id="speed-select"
      aria-label="Playback speed"
      value={s.current?.speed || 1}
      disabled={!s.ready}
      onchange={(event) => study.setSpeed(Number(event.currentTarget.value))}
    >
      {#each speeds as speed}<option value={speed}>{speed * 100}%</option
        >{/each}
    </select>
    <button
      id="edit-loop"
      aria-expanded={s.editing}
      aria-controls="loop-editor"
      onclick={() => study.setEditing(!s.editing)}
      ><span aria-hidden="true">✂</span><span
        >{s.editing ? 'Close editor' : 'Edit loop'}</span
      ></button
    >
  </div>
</div>
