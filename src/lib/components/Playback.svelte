<script>
  import Icon from './Icon.svelte';
  import { formatTime, speeds } from '#lib/study/model.js';
  let { study, onsave } = $props();
  const s = $derived(study.state);
  const left = $derived((s.a / (s.duration || 1)) * 100);
  const right = $derived((s.b / (s.duration || 1)) * 100);
</script>

<aside class="sections panel">
  <div class="panel-heading"><h2>Playback</h2></div>
  <section class="transport" aria-label="Playback controls">
    <div class="timeline-labels">
      <span
        ><strong id="current-time">{formatTime(s.time)}</strong><span
          class="time-total"
        >
          / <span>{formatTime(s.duration)}</span></span
        ></span
      >
    </div>
    <div class="timeline-wrap">
      <div class="timeline-track">
        <div
          id="loop-range"
          style:left={`${left}%`}
          style:width={`${Math.max(0, right - left)}%`}
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
        aria-valuetext={`${formatTime(s.time)} of ${formatTime(s.duration)}`}
        disabled={!s.ready}
        onpointerdown={study.beginScrub}
        onpointercancel={study.finishScrub}
        oninput={(event) => study.scrub(Number(event.currentTarget.value))}
      />
    </div>
    <div class="transport-row">
      <div class="transport-buttons">
        <button
          id="play"
          class="play-button"
          class:is-playing={s.playing}
          title="Play / pause (Space)"
          aria-label={s.playing ? 'Pause' : 'Play'}
          onclick={study.togglePlay}
          disabled={!s.ready}
          ><Icon name="play" /><span>{s.playing ? 'Pause' : 'Play'}</span
          ></button
        >
        <button
          id="restart"
          title="Restart section and play (R)"
          aria-label="Restart section"
          onclick={study.restart}
          disabled={!s.ready}
          ><Icon name="restart" /><span>Restart</span></button
        >
        <button
          id="toggle-loop"
          title="Toggle loop (L)"
          aria-pressed={s.looping}
          onclick={study.toggleLoop}
          disabled={!s.ready}
          ><Icon name="toggle-loop" /><span
            >{s.looping ? 'Loop on' : 'Loop'}</span
          ></button
        >
        <button
          id="step-back"
          title="Step back by nominal frame duration (,)"
          onclick={() => study.step(-1)}
          disabled={!s.ready}>− Frame</button
        >
        <button
          id="step-forward"
          title="Step forward by nominal frame duration (.)"
          onclick={() => study.step(1)}
          disabled={!s.ready}>Frame +</button
        >
      </div>
      <div class="speed-group">
        <span class="tiny">Speed</span>
        <div>
          {#each speeds as speed}<button
              class:active={s.current?.speed === speed}
              aria-pressed={s.current?.speed === speed}
              onclick={() => study.setSpeed(speed)}
              disabled={!s.ready}>{speed * 100}%</button
            >{/each}
        </div>
      </div>
    </div>
    <div class="section-row">
      <button id="set-a" onclick={() => study.setPoint('a')} disabled={!s.ready}
        ><span class="point-label">A · Start</span><span id="a-time"
          >{formatTime(s.a)}</span
        ></button
      >
      <button id="set-b" onclick={() => study.setPoint('b')} disabled={!s.ready}
        ><span class="point-label">B · End</span><span id="b-time"
          >{s.b ? formatTime(s.b) : '—'}</span
        ></button
      >
      <button id="save-section" onclick={onsave} disabled={!s.ready}
        ><Icon name="save-section" /><span>Save Section…</span></button
      >
      <button
        id="clear-section"
        title="Reset in and out points"
        aria-label="Reset section"
        onclick={study.clearSection}
        disabled={!s.ready}>×</button
      >
    </div>
  </section>
  <div class="section-intro">
    <h3>Saved Sections</h3>
    <span>{String(s.current?.sections.length || 0).padStart(2, '0')}</span>
  </div>
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
</aside>
