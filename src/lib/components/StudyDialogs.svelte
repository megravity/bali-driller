<script lang="ts">
  import type { Study } from '#lib/study/types.ts';
  import { formatTime } from '#lib/study/model.ts';
  let { study }: { study: Study } = $props();
  const s = $derived(study.state);
  let editDialog: HTMLDialogElement,
    sectionDialog: HTMLDialogElement,
    confirmDialog: HTMLDialogElement,
    helpDialog: HTMLDialogElement;
  let title = $state(''),
    creator = $state(''),
    tags = $state(''),
    sectionName = $state('');

  export function showProperties() {
    if (!s.current) return;
    title = s.current.title;
    creator = s.current.creator;
    tags = s.current.tags.join(', ');
    editDialog.showModal();
  }
  export function showSection() {
    sectionName = '';
    sectionDialog.showModal();
  }
  export function showHelp() {
    helpDialog.showModal();
  }
</script>

<dialog bind:this={editDialog} aria-labelledby="properties-title">
  <form
    onsubmit={(event) => {
      event.preventDefault();
      if (study.editClip({ title, creator, tags })) editDialog.close();
    }}
  >
    <div class="dialog-heading">
      <h2 id="properties-title">Video Properties</h2>
      <button
        type="button"
        onclick={() => editDialog.close()}
        aria-label="Close">×</button
      >
    </div>
    <label>Title<input bind:value={title} required maxlength="100" /></label>
    <label
      >Creator<input
        bind:value={creator}
        maxlength="80"
        placeholder="Optional creator name"
      /></label
    >
    <label
      >Tags<input
        bind:value={tags}
        maxlength="200"
        placeholder="shortstop, beginner, right hand"
      /></label
    >
    <p class="fineprint">Separate tags with commas.</p>
    <div class="edit-actions">
      <button
        type="button"
        class="remove-button"
        onclick={() => {
          editDialog.close();
          confirmDialog.showModal();
        }}>Remove video</button
      ><button class="primary" type="submit">Save</button>
    </div>
  </form>
</dialog>
<dialog bind:this={sectionDialog} aria-labelledby="section-title">
  <form
    onsubmit={(event) => {
      event.preventDefault();
      if (study.saveSection(sectionName)) sectionDialog.close();
    }}
  >
    <div class="dialog-heading">
      <h2 id="section-title">Save Section</h2>
      <button
        type="button"
        onclick={() => sectionDialog.close()}
        aria-label="Close">×</button
      >
    </div>
    <label
      >Section name<input
        bind:value={sectionName}
        required
        maxlength="80"
        placeholder="e.g. Thumb rollover"
      /></label
    >
    <p id="section-summary">
      {formatTime(s.a)} → {formatTime(s.b)} / {(s.b - s.a).toFixed(2)} seconds / {s
        .current?.speed || 1}×
    </p>
    <button class="primary" type="submit">Save</button>
  </form>
</dialog>
<dialog
  bind:this={confirmDialog}
  aria-labelledby="remove-title"
  onclose={() => {
    if (confirmDialog.returnValue === 'remove') study.removeClip();
  }}
>
  <form method="dialog">
    <div class="dialog-heading">
      <h2 id="remove-title">Remove Video</h2>
      <button value="cancel" aria-label="Cancel">×</button>
    </div>
    <p>
      The library copy and its saved sections will be removed. Your original
      file is kept.
    </p>
    <div class="dialog-actions">
      <button value="cancel">Cancel</button><button
        value="remove"
        class="primary">Remove</button
      >
    </div>
  </form>
</dialog>
<dialog bind:this={helpDialog} aria-labelledby="help-title">
  <div class="dialog-heading">
    <h2 id="help-title">Keyboard Shortcuts & Settings</h2>
    <button onclick={() => helpDialog.close()} aria-label="Close">×</button>
  </div>
  <div class="shortcut-list">
    <span>Play / pause</span><kbd>Space</kbd><span>Restart section + play</span
    ><kbd>R</kbd><span>Set section in / out</span><kbd>A / B</kbd><span
      >Toggle looping</span
    ><kbd>L</kbd><span>Skip 0.5 seconds</span><kbd>← / →</kbd><span
      >Skip 2 seconds</span
    ><kbd>Shift + ← / →</kbd><span>Step by nominal frame</span><kbd>, / .</kbd
    ><span>Playback speed</span><kbd>[ / ]</kbd><span>Mirror</span><kbd>M</kbd
    ><span>Fullscreen viewer</span><kbd>F</kbd>
  </div>
  <div class="section-bottom">
    <details class="step-settings">
      <summary>Frame step settings</summary>
      <div class="metadata-line">
        <span>Frame rate</span><select
          aria-label="Nominal frame rate for stepping"
          value={s.current?.fps || 30}
          onchange={(event) => study.setFps(event.currentTarget.value)}
          disabled={!s.current}
          >{#each [24, 30, 60, 120] as fps}<option value={fps}>{fps} fps</option
            >{/each}</select
        >
      </div>
      <p class="fineprint">
        Frame steps use this rate. Variable-rate recordings may not align
        exactly.
      </p>
    </details>
  </div>
  <p class="fineprint">
    Zoom with + / − below the video, then drag the video to inspect the hands.
    Keyboard shortcuts are paused while you type.
  </p>
  <p class="fineprint">
    Videos, properties and saved sections are stored in this browser on this
    device. Clearing site data removes your library. Keep your original videos.
    Browser storage may be evicted if persistence is not granted.
  </p>
</dialog>
