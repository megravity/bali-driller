<script lang="ts">
  import { asset } from '$app/paths';
  import Study from '#lib/components/Study.svelte';
</script>

<svelte:head>
  <title>Loop Study</title>
  <meta name="theme-color" content="#242424" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <link rel="manifest" href={asset('manifest.webmanifest')} />
  <link rel="icon" href={asset('assets/icon.svg')} />
  <link rel="apple-touch-icon" href={asset('assets/icon-180.png')} />
  <meta
    name="description"
    content="A private video practice library. Slow down, mirror and loop your recordings, and save sections in your browser."
  />
</svelte:head>

<Study />
