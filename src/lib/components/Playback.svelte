<script lang="ts">
  import type { Study } from '#lib/study/types.ts';
  import LoopOverview from './playback/LoopOverview.svelte';
  import PracticeDock from './playback/PracticeDock.svelte';
  import PrecisionEditor from './playback/PrecisionEditor.svelte';
  import SavedSections from './playback/SavedSections.svelte';

  let { study, onsave }: { study: Study; onsave: () => void } = $props();

  const s = $derived(study.state);
</script>

<PracticeDock {study} />
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
    <LoopOverview {study} />
    <PrecisionEditor {study} />
  </div>
  <SavedSections {study} {onsave} />
</section>
