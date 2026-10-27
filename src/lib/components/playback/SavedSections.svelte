<script lang="ts">
  import type { Study } from '#lib/study/types.ts';
  import { formatTime } from '#lib/study/model.ts';

  let { study, onsave }: { study: Study; onsave: () => void } = $props();

  const s = $derived(study.state);
</script>

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
