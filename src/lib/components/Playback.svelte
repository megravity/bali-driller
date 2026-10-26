<script lang="ts">
  import type { Study } from '#lib/study/types.ts';
  import { formatTime, speeds } from '#lib/study/model.ts';
  import { GAP, windowAround } from '#lib/study/precision.ts';
  let { study, onsave }: { study: Study; onsave: () => void } = $props();
  const s = $derived(study.state);
  const left = $derived((s.a / (s.duration || 1)) * 100);
  const right = $derived((s.b / (s.duration || 1)) * 100);
  // Freeze the zoom window during a drag so the slider does not move under the pointer.
  let dragging = $state(false);
  let frozen = $state({ lo: 0, hi: 1 });
  const range = $derived(
    dragging
      ? frozen
      : windowAround(s.a, s.b, s.duration, s.precisionZoom, s.activeBoundary)
  );
  const percent = (value: number) =>
    Math.max(
      0,
      Math.min(100, ((value - range.lo) / (range.hi - range.lo)) * 100)
    );
  let track: HTMLDivElement;
  let pointer: {
    id: number;
    boundary: 'a' | 'b';
    x: number;
    value: number;
    width: number;
  } | null = null;
  function startDrag(event: PointerEvent, boundary: 'a' | 'b') {
    if (!s.ready || event.button !== 0 || pointer) return;
    event.preventDefault();
    frozen = { ...range };
    dragging = true;
    pointer = {
      id: event.pointerId,
      boundary,
      x: event.clientX,
      value: s[boundary],
      width: track.getBoundingClientRect().width
    };
    study.selectBoundary(boundary);
    const handle = event.currentTarget as HTMLButtonElement;
    handle.focus();
    handle.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId) return;
    s.activeBoundary = pointer.boundary;
    study.adjustBoundary(
      pointer.value +
        ((event.clientX - pointer.x) / pointer.width) * (frozen.hi - frozen.lo)
    );
  }
  function endDrag(event: PointerEvent) {
    if (pointer?.id !== event.pointerId) return;
    pointer = null;
    dragging = false;
  }
  function handleKey(event: KeyboardEvent, boundary: 'a' | 'b') {
    const step = event.shiftKey ? 0.01 : 0.05;
    const values: Record<string, number> = {
      ArrowLeft: s[boundary] - step,
      ArrowDown: s[boundary] - step,
      ArrowRight: s[boundary] + step,
      ArrowUp: s[boundary] + step,
      Home: boundary === 'a' ? 0 : s.a + GAP,
      End: boundary === 'a' ? s.b - GAP : s.duration
    };
    if (!(event.key in values)) return;
    event.preventDefault();
    event.stopPropagation();
    study.selectBoundary(boundary);
    study.adjustBoundary(values[event.key]);
  }
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
<section
  id="loop-editor"
  class="sections"
  hidden={!s.editing}
  aria-label="Loop editor"
>
  <div class="editor-heading">
    <h2>Adjust loop</h2>
    <button class="primary" onclick={study.practiseLoop} disabled={!s.ready}
      >Practise loop</button
    >
  </div>
  <div class="editor-grid">
    <details class="overview-pane">
      <summary>Browse whole video</summary>
      <div class="row-label">
        <span>Find a moment</span><button
          id="toggle-loop"
          aria-pressed={s.looping}
          onclick={study.toggleLoop}
          disabled={!s.ready}>{s.looping ? 'Loop on' : 'Loop off'}</button
        >
      </div>
      <div class="timeline-wrap">
        <div class="timeline-track">
          <div
            id="loop-range"
            style:left={`${left}%`}
            style:width={`${right - left}%`}
          ></div>
          <div
            id="progress"
            style:width={`${(s.time / (s.duration || 1)) * 100}%`}
          ></div>
          <span class="timeline-marker" style:left={`${left}%`}>A</span><span
            class="timeline-marker"
            style:left={`${right}%`}>B</span
          >
        </div>
        <input
          id="timeline"
          type="range"
          min="0"
          max={s.duration || 1}
          step="0.001"
          value={s.time}
          aria-label="Video timeline"
          disabled={!s.ready}
          onpointerdown={study.beginScrub}
          onpointercancel={study.finishScrub}
          oninput={(event) => study.scrub(Number(event.currentTarget.value))}
        />
      </div>
      <div class="set-points">
        <button
          id="set-a"
          onclick={() => study.setPoint('a')}
          disabled={!s.ready}>Set start here</button
        ><button
          id="set-b"
          onclick={() => study.setPoint('b')}
          disabled={!s.ready}>Set end here</button
        >
      </div>
      <div class="frame-steps">
        <button onclick={() => study.step(-1)} disabled={!s.ready}
          >− Frame</button
        ><button onclick={() => study.step(1)} disabled={!s.ready}
          >Frame +</button
        >
      </div>
    </details>
    <div class="precision-pane">
      <div class="precision-toolbar">
        <span>Drag A or B</span>
        <div>
          <button
            id="timeline-zoom"
            aria-pressed={s.precisionZoom > 0}
            onclick={() =>
              (s.precisionZoom = Math.min(10, s.precisionZoom + 1))}
            disabled={!s.ready || s.precisionZoom >= 10}>Zoom +</button
          ><button
            id="timeline-whole"
            onclick={() => (s.precisionZoom = 0)}
            disabled={!s.ready}>Whole clip</button
          >
        </div>
      </div>
      <div class="precision-ruler">
        <div class="precision-track" bind:this={track}>
          <div
            id="precision-range"
            style:left={`${percent(s.a)}%`}
            style:width={`${percent(s.b) - percent(s.a)}%`}
          ></div>
          {#each ['a', 'b'] as endpoint}
            {@const boundary = endpoint as 'a' | 'b'}
            <button
              id={'precision-' + boundary}
              class="boundary-marker"
              role="slider"
              aria-label={boundary === 'a' ? 'Loop start A' : 'Loop end B'}
              aria-valuemin={boundary === 'a' ? 0 : s.a + GAP}
              aria-valuemax={boundary === 'a'
                ? Math.max(0, s.b - GAP)
                : s.duration}
              aria-valuenow={s[boundary]}
              aria-valuetext={formatTime(s[boundary])}
              title={(boundary === 'a' ? 'Start' : 'End') +
                ': ' +
                formatTime(s[boundary])}
              disabled={!s.ready}
              hidden={s[boundary] < range.lo || s[boundary] > range.hi}
              style:left={`${percent(s[boundary])}%`}
              onpointerdown={(event) => startDrag(event, boundary)}
              onpointermove={moveDrag}
              onpointerup={endDrag}
              onpointercancel={endDrag}
              onlostpointercapture={endDrag}
              onkeydown={(event) => handleKey(event, boundary)}
              >{boundary.toUpperCase()}</button
            >
          {/each}
        </div>
        <div class="ruler-ticks">
          <span>{range.lo.toFixed(2)} s</span><span
            >{((range.lo + range.hi) / 2).toFixed(2)} s</span
          ><span>{range.hi.toFixed(2)} s</span>
        </div>
      </div>
      <div class="boundary-times">
        <span>A · {formatTime(s.a)}</span><span>B · {formatTime(s.b)}</span>
      </div>
    </div>
  </div>
  <div class="save-row">
    <button id="save-section" onclick={onsave} disabled={!s.ready}
      >Save Section…</button
    ><button
      id="clear-section"
      aria-label="Reset section"
      onclick={study.clearSection}
      disabled={!s.ready}>Reset range</button
    >
  </div>
  <details id="saved-sections" open>
    <summary class="section-intro"
      ><span>Saved Sections</span><span>{s.current?.sections.length || 0}</span
      ></summary
    >
    <div class="section-list">
      {#each s.current?.sections || [] as section, index (section.id)}
        <div
          class="saved-section"
          class:selected={s.selectedSection === section.id}
        >
          <button
            class="section-select"
            onclick={() => study.selectSection(section)}
            disabled={!s.ready}
            ><strong>{String(index + 1).padStart(2, '0')} {section.name}</strong
            ><span>{formatTime(section.a)} → {formatTime(section.b)}</span
            ></button
          >
          <button
            class="section-delete"
            aria-label={'Delete section ' + section.name}
            onclick={() => study.deleteSection(section.id)}>×</button
          >
        </div>
      {:else}<div class="no-sections">No saved sections.</div>{/each}
    </div>
  </details>
</section>
