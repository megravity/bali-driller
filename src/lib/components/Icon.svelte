<script lang="ts">
  let {
    name
  }: {
    name:
      | 'window-expand'
      | 'toolbar-import'
      | 'mirror'
      | 'mute'
      | 'fullscreen'
      | 'play'
      | 'restart'
      | 'toggle-loop'
      | 'save-section'
      | 'app';
  } = $props();
</script>

{#if name === 'window-expand'}
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"
    ><path
      d="M2 3h12v11H2zM2 5h12"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    /></svg
  >
{:else if name === 'toolbar-import'}
  <svg
    class="folder-icon"
    viewBox="0 0 22 18"
    width="21"
    height="18"
    aria-hidden="true"
    ><path d="M1 4V2h8l2 2h9v12H1z" fill="#f3cc58" stroke="#a87f27" /><path
      d="M1 7h20l-3 9H1z"
      fill="#ffe99a"
      stroke="#a87f27"
    /></svg
  >
{:else if name === 'mirror'}
  <svg
    class="xp-icon"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    aria-hidden="true"
    ><defs
      ><linearGradient id="mirror-face" x1="0" y1="0" x2="1" y2="1"
        ><stop stop-color="#daf5ff" /><stop
          offset=".45"
          stop-color="#6fafe7"
        /><stop offset="1" stop-color="#286ab7" /></linearGradient
      ></defs
    ><path
      d="M3 4h7v14H3zM14 4h7v14h-7z"
      fill="url(#mirror-face)"
      stroke="#345b89"
    /><path d="M4 5h5v2H4zM15 5h5v2h-5z" fill="#f4fdff" /><path
      d="M12 2v20"
      stroke="#696963"
      stroke-dasharray="2 1"
    /><path
      d="M5 21h14M5 21l3-2M5 21l3 2M19 21l-3-2M19 21l-3 2"
      fill="none"
      stroke="#805926"
      stroke-width="1.25"
    /><path
      d="M5 14l3-4v6zM19 14l-3-4v6z"
      fill="#fff8bc"
      stroke="#537793"
      stroke-width=".5"
    /></svg
  >
{:else if name === 'mute'}
  <svg
    class="xp-icon"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    aria-hidden="true"
    ><defs
      ><linearGradient id="speaker-face" x1="0" y1="0" x2="1" y2="1"
        ><stop stop-color="#ffffe9" /><stop
          offset=".5"
          stop-color="#dddbb6"
        /><stop offset="1" stop-color="#939b88" /></linearGradient
      ></defs
    ><path
      d="M3 9h4l6-5v16l-6-5H3z"
      fill="url(#speaker-face)"
      stroke="#5c685b"
    /><path d="M4 10h3v4H4z" fill="#b9cfe0" /><path
      d="M8 9l4-3v11"
      fill="none"
      stroke="#fffff2"
    /><g
      class="sound-waves"
      fill="none"
      stroke="#3271b8"
      stroke-width="1.7"
      stroke-linecap="round"><path d="M16 8q4 4 0 8M19 5q7 7 0 14" /></g
    ><g class="mute-badge"
      ><circle cx="18" cy="17" r="5" fill="#f4f3e7" /><path
        d="M15 14l6 6M21 14l-6 6"
        stroke="#982d21"
        stroke-width="3"
      /><path
        d="M15 14l6 6M21 14l-6 6"
        stroke="#e7523f"
        stroke-width="1.5"
      /></g
    ></svg
  >
{:else if name === 'fullscreen'}
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"
    ><path
      d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5"
      fill="none"
      stroke="currentColor"
    /></svg
  >
{:else if name === 'play'}
  <svg class="control-icon" viewBox="0 0 32 32" aria-hidden="true"
    ><defs
      ><linearGradient id="play-disc" x1="0" y1="0" x2="0" y2="1"
        ><stop stop-color="#b0e87c" /><stop
          offset=".44"
          stop-color="#65b634"
        /><stop offset=".5" stop-color="#449a20" /><stop
          offset="1"
          stop-color="#307b17"
        /></linearGradient
      ></defs
    ><circle cx="16" cy="17" r="13" fill="#6f765a" opacity=".3" /><circle
      cx="16"
      cy="15"
      r="13"
      fill="url(#play-disc)"
      stroke="#316c17"
    /><path
      d="M5 12a11 11 0 0 1 21 0"
      fill="none"
      stroke="#e7ffd2"
      stroke-width="1.2"
    /><path
      class="play-glyph"
      d="M12 8l11 7-11 7z"
      fill="#fff"
      stroke="#326d1e"
      stroke-width=".65"
    /><g class="pause-glyph" fill="#fff" stroke="#326d1e" stroke-width=".6"
      ><path d="M10 8h4v14h-4zM18 8h4v14h-4z" /></g
    ></svg
  >
{:else if name === 'restart'}
  <svg class="control-icon" viewBox="0 0 32 32" aria-hidden="true"
    ><defs
      ><linearGradient id="restart-face" x2="0" y2="1"
        ><stop stop-color="#a5d9ff" /><stop
          offset=".5"
          stop-color="#549adb"
        /><stop offset="1" stop-color="#1760ac" /></linearGradient
      ></defs
    ><path
      d="M8 9A12 12 0 1 1 4 21l5-2a7 7 0 1 0 3-6l4 3H3V3z"
      fill="url(#restart-face)"
      stroke="#285786"
      stroke-linejoin="round"
    /><path
      d="M5 6v8h8M12 8a10 10 0 0 1 13 14"
      fill="none"
      stroke="#e4f4ff"
      stroke-width="1"
    /></svg
  >
{:else if name === 'toggle-loop'}
  <svg class="control-icon" viewBox="0 0 32 32" aria-hidden="true"
    ><defs
      ><linearGradient id="loop-top" x2="0" y2="1"
        ><stop stop-color="#9cccf4" /><stop
          offset="1"
          stop-color="#286db2"
        /></linearGradient
      ><linearGradient id="loop-bottom" x2="0" y2="1"
        ><stop stop-color="#c2e797" /><stop
          offset="1"
          stop-color="#4e8b2d"
        /></linearGradient
      ></defs
    ><path
      d="M5 14V8h16V3l9 8-9 8v-5H10"
      fill="url(#loop-top)"
      stroke="#345a83"
      stroke-linejoin="round"
    /><path
      d="M27 18v6H11v5l-9-8 9-8v5h11"
      fill="url(#loop-bottom)"
      stroke="#527539"
      stroke-linejoin="round"
    /><path d="M7 9h15V6M25 23H10v3" fill="none" stroke="#eafff6" /></svg
  >
{:else if name === 'save-section'}
  <svg
    class="small-action-icon"
    viewBox="0 0 18 18"
    width="16"
    height="16"
    aria-hidden="true"
    ><path d="M2 1h12l2 2v13H2z" fill="#6c9dd1" stroke="#315d89" /><path
      d="M5 2h7v5H5z"
      fill="#dce7eb"
      stroke="#527495"
    /><path d="M10 2h2v4h-2z" fill="#4c6381" /><path
      d="M5 10h8v6H5z"
      fill="#fffef2"
      stroke="#527495"
    /><path d="M6 12h6M6 14h6" stroke="#a8b6c3" /></svg
  >
{:else if name === 'app'}
  <svg class="app-icon" viewBox="0 0 24 24" aria-hidden="true"
    ><defs
      ><linearGradient id="app-blue" x2="0" y2="1"
        ><stop stop-color="#97d4ff" /><stop
          offset="1"
          stop-color="#1263bc"
        /></linearGradient
      ></defs
    ><rect
      x="2"
      y="3"
      width="20"
      height="17"
      rx="2"
      fill="url(#app-blue)"
      stroke="#e5f6ff"
    /><path d="M9 7l8 5-8 5z" fill="#fff7c1" /><path
      d="M6 22h12"
      stroke="#fff"
      stroke-width="2"
    /></svg
  >
{/if}
