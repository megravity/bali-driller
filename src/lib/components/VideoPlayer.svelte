<script>
  import Icon from './Icon.svelte';
  let { study, onimport, video = $bindable(), stage = $bindable() } = $props();
  const s = $derived(study.state);
</script>

<main class="player-panel panel">
  <div bind:this={stage} class="stage">
    <div
      class="video-viewport"
      class:pannable={s.zoom > 1}
      role="group"
      aria-label="Video viewer. Click to play or pause; zoom and drag to pan."
      onpointerdown={study.pointerDown}
      onpointermove={study.pointerMove}
      onpointerup={study.pointerUp}
      onpointercancel={study.cancelDrag}
    >
      <video
        bind:this={video}
        playsinline
        preload="auto"
        muted
        style:transform={`translate(${s.panX}px,${s.panY}px) scale(${s.current?.mirror ? -s.zoom : s.zoom},${s.zoom})`}
        onloadedmetadata={study.loadedMetadata}
        onloadeddata={study.loadedData}
        onerror={study.mediaError}
        ontimeupdate={study.checkLoop}
        onended={study.ended}
        onplay={() => (s.playing = true)}
        onpause={() => (s.playing = false)}
        onseeked={study.checkLoop}
      >
        <track kind="captions" />
      </video>
    </div>
    {#if !s.current}
      <div class="empty-state">
        <span class="big-loop" aria-hidden="true">↻</span>
        <h2>{s.loading ? 'Opening your library…' : 'Add a video.'}</h2>
        <button onclick={onimport} disabled={!s.available || s.importing}
          >+ IMPORT VIDEO</button
        >
      </div>
    {/if}
    {#if s.mediaError}
      <div class="video-error" role="alert">
        <h3>This recording could not be played.</h3>
        <p>
          This browser cannot decode the recording. Import an H.264 MP4 or
          another format supported by your browser. Your library copy is kept.
        </p>
      </div>
    {/if}
  </div>
  <div class="view-toolbar">
    <div class="view-actions">
      <button
        id="mirror"
        class="xp-icon-button"
        aria-label="Mirror video"
        aria-pressed={!!s.current?.mirror}
        title="Mirror video (M)"
        onclick={study.mirror}
        disabled={!s.ready}><Icon name="mirror" /></button
      >
      <button
        id="mute"
        class="xp-icon-button"
        aria-label="Mute audio"
        aria-pressed={s.muted}
        title={s.muted
          ? 'Sound off — click to unmute'
          : 'Sound on — click to mute'}
        onclick={study.mute}
        disabled={!s.ready}><Icon name="mute" /></button
      >
    </div>
    <div class="zoom-controls">
      <button
        id="zoom-out"
        aria-label="Zoom out"
        onclick={() => study.changeZoom(-0.25)}
        disabled={!s.ready || s.zoom <= 1}>−</button
      >
      <span id="zoom-level">{Math.round(s.zoom * 100)}%</span>
      <button
        id="zoom-in"
        aria-label="Zoom in"
        onclick={() => study.changeZoom(0.25)}
        disabled={!s.ready || s.zoom >= 4}>+</button
      >
      <button
        id="fit"
        title="Show the whole video and reset pan"
        onclick={study.resetTransform}
        disabled={!s.ready}>Fit</button
      >
      <button
        id="fullscreen"
        title="Fullscreen viewer (F)"
        aria-label="Fullscreen viewer"
        onclick={() => study.fullscreen(stage)}
        disabled={!s.ready}
        ><Icon name="fullscreen" /><span>Full Screen</span></button
      >
    </div>
  </div>
</main>
