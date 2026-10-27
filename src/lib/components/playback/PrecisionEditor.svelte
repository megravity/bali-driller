<script lang="ts">
  import type { Study } from '#lib/study/types.ts';
  import { formatTime } from '#lib/study/model.ts';
  import { GAP, windowAround } from '#lib/study/precision.ts';

  let { study }: { study: Study } = $props();

  const s = $derived(study.state);
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

<div class="precision-pane">
  <div class="precision-toolbar">
    <span>Drag A or B</span>
    <div>
      <button
        id="timeline-zoom"
        aria-pressed={s.precisionZoom > 0}
        onclick={() => (s.precisionZoom = Math.min(10, s.precisionZoom + 1))}
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
          aria-valuemax={boundary === 'a' ? Math.max(0, s.b - GAP) : s.duration}
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
