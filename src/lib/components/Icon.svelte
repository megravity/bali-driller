<script lang="ts">
  import AppIcon from './icons/AppIcon.svelte';
  import FullscreenIcon from './icons/FullscreenIcon.svelte';
  import MirrorIcon from './icons/MirrorIcon.svelte';
  import MuteIcon from './icons/MuteIcon.svelte';
  import ToolbarImportIcon from './icons/ToolbarImportIcon.svelte';
  import WindowExpandIcon from './icons/WindowExpandIcon.svelte';

  const icons = {
    app: AppIcon,
    fullscreen: FullscreenIcon,
    mirror: MirrorIcon,
    mute: MuteIcon,
    'toolbar-import': ToolbarImportIcon,
    'window-expand': WindowExpandIcon
  };

  let { name }: { name: keyof typeof icons } = $props();

  const Icon = $derived(icons[name]);
</script>

<Icon />
