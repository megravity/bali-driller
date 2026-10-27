<script lang="ts">
  import type { Study } from '#lib/study/types.ts';

  let { study }: { study: Study } = $props();

  const s = $derived(study.state);
  const left = $derived((s.a / (s.duration || 1)) * 100);
  const right = $derived((s.b / (s.duration || 1)) * 100);
</script>

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
    <button id="set-a" onclick={() => study.setPoint('a')} disabled={!s.ready}
      >Set start here</button
    ><button id="set-b" onclick={() => study.setPoint('b')} disabled={!s.ready}
      >Set end here</button
    >
  </div>
  <div class="frame-steps">
    <button onclick={() => study.step(-1)} disabled={!s.ready}>− Frame</button
    ><button onclick={() => study.step(1)} disabled={!s.ready}>Frame +</button>
  </div>
</details>
