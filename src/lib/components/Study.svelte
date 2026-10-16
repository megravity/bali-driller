<script>
  import { onMount } from 'svelte';
  import { asset } from '$app/paths';
  import { createStudy } from '#lib/study/player.svelte.js';
  import Icon from './Icon.svelte';
  import Library from './Library.svelte';
  import VideoPlayer from './VideoPlayer.svelte';
  import Playback from './Playback.svelte';
  import StudyDialogs from './StudyDialogs.svelte';

  const study = createStudy();
  const s = study.state;
  let video = $state(),
    stage = $state(),
    shell,
    fileInput,
    dialogs,
    libraryToggle;
  let dropVisible = $state(false);
  let dragDepth = 0;
  function chooseFiles() {
    fileInput.click();
  }
  function outsideLibrary(event) {
    if (
      window.innerWidth <= 1100 &&
      !event.target.closest('#library-panel,#library-toggle')
    )
      s.libraryVisible = false;
  }
  function keydown(event) {
    if (
      event.key === 'Escape' &&
      !document.querySelector('dialog[open]') &&
      window.innerWidth <= 1100
    ) {
      s.libraryVisible = false;
      libraryToggle.focus();
    }
    study.shortcut(event, () => dialogs.showHelp(), stage);
  }
  function dragenter(event) {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepth++;
    dropVisible = true;
  }
  function dragover(event) {
    if (event.dataTransfer.types.includes('Files')) event.preventDefault();
  }
  function dragleave() {
    if (--dragDepth <= 0) {
      dragDepth = 0;
      dropVisible = false;
    }
  }
  function drop(event) {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepth = 0;
    dropVisible = false;
    study.importFiles(event.dataTransfer.files);
  }
  onMount(() => {
    const compact = window.matchMedia('(max-width: 1100px)');
    s.libraryVisible = !compact.matches;
    const resize = (event) => {
      s.libraryVisible = !event.matches;
    };
    compact.addEventListener('change', resize);
    study.initialize(video, asset('/media/demo.mp4'));
    return () => {
      compact.removeEventListener('change', resize);
      study.destroy();
    };
  });
</script>

<svelte:window
  onkeydown={keydown}
  onpointerdown={outsideLibrary}
  onpointerup={study.finishScrub}
  ondragenter={dragenter}
  ondragover={dragover}
  ondragleave={dragleave}
  ondrop={drop}
/>
<svelte:document
  onfullscreenchange={() => (s.expanded = document.fullscreenElement === shell)}
/>

<div bind:this={shell} class="shell" class:library-hidden={!s.libraryVisible}>
  <header class="masthead">
    <Icon name="app" />
    <div class="window-title">
      <h1>
        <span>{s.current?.title || 'Your videos'}</span><span class="app-title">
          — Loop Study</span
        >
      </h1>
    </div>
    <button
      class="window-button"
      aria-label={s.expanded ? 'Restore player' : 'Maximize player'}
      title={s.expanded ? 'Restore player' : 'Maximize player'}
      onclick={() => study.fullscreen(shell)}
      ><Icon name="window-expand" /></button
    >
  </header>
  <nav class="xp-toolbar" aria-label="Application tools">
    <button
      title="Import videos"
      onclick={chooseFiles}
      disabled={!s.available || s.importing}
      ><Icon name="toolbar-import" />Import…</button
    ><span class="toolbar-divider" aria-hidden="true"></span>
    <button
      bind:this={libraryToggle}
      id="library-toggle"
      aria-expanded={s.libraryVisible}
      aria-controls="library-panel"
      onclick={() => (s.libraryVisible = !s.libraryVisible)}>Library</button
    >
    <button
      title="Edit title, creator and tags"
      aria-label="Edit video details"
      onclick={() => dialogs.showProperties()}
      disabled={!s.current}>Properties</button
    >
    <button
      aria-label="Keyboard shortcuts and settings"
      title="Keyboard shortcuts and settings"
      onclick={() => dialogs.showHelp()}>Help</button
    >
  </nav>
  <div class="workspace">
    <Library {study} onimport={chooseFiles} /><VideoPlayer
      {study}
      onimport={chooseFiles}
      bind:video
      bind:stage
    /><Playback {study} onsave={() => dialogs.showSection()} />
  </div>
  <footer class="storage-status" class:storage-failed={!!s.storageError}>
    <span role="status">{s.saveStatus}</span><span
      >Local library · this device</span
    >
  </footer>
  {#if s.storageError}<div class="storage-error" role="alert">
      {s.storageError}{#if s.current}<button onclick={study.persist}
          >Retry save</button
        >{/if}
    </div>{/if}
</div>
{#if dropVisible}<div id="drop-overlay">
    <div>
      +
      <h2>Drop videos to import</h2>
      <p>MP4 / MOV / M4V / WEBM</p>
    </div>
  </div>{/if}
{#if s.message}<div id="toast" role="status">{s.message}</div>{/if}
<input
  bind:this={fileInput}
  type="file"
  accept="video/*,.mov,.mp4,.m4v,.webm"
  multiple
  hidden
  onchange={(event) => {
    study.importFiles(event.currentTarget.files);
    event.currentTarget.value = '';
  }}
/>
<StudyDialogs {study} bind:this={dialogs} />
<noscript
  ><p class="storage-error">
    Enable JavaScript to play videos and save a local study library.
  </p></noscript
>
