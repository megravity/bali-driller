import type {
  Clip,
  ClipDetails,
  SavedSection,
  StudyState,
  VideoPointerEvent
} from './types.ts';
import { clamp, speeds, validSection } from './model.ts';
import { openLibrary, readLastClip, rememberClip } from './storage.ts';

// One controller per mounted app. DOM elements and database handles stay outside reactive state.
export function createStudy() {
  const state = $state<StudyState>({
    clips: [],
    current: null,
    query: '',
    loading: true,
    available: false,
    importing: false,
    ready: false,
    playing: false,
    time: 0,
    duration: 0,
    a: 0,
    b: 0,
    looping: false,
    selectedSection: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    muted: true,
    libraryVisible: true,
    mediaError: false,
    message: '',
    saveStatus: 'Opening local library…',
    storageError: '',
    expanded: false
  });
  let video: HTMLVideoElement;
  let store: Awaited<ReturnType<typeof openLibrary>> | undefined;
  let frame = 0;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let drag: {
    x: number;
    y: number;
    px: number;
    py: number;
    moved: boolean;
  } | null = null;
  let alive = true,
    serial = 0;
  let scrubbing = false,
    resumeAfterScrub = false;
  let saveChain = Promise.resolve();
  let pendingSaves = 0;

  function toast(message: string) {
    state.message = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      state.message = '';
    }, 5000);
  }
  function report(error: unknown) {
    console.error(error);
    toast(
      error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.'
    );
  }
  function persist() {
    if (!state.current || !store) return;
    const snapshot = $state.snapshot(state.current);
    pendingSaves++;
    state.saveStatus = 'Saving…';
    saveChain = saveChain
      .then(() => store!.save(snapshot))
      .then(() => {
        state.storageError = '';
      })
      .catch((error) => {
        state.storageError = `Could not save changes: ${error instanceof Error ? error.message : String(error)}. Check available browser storage and try again.`;
        report(new Error(state.storageError));
      })
      .finally(() => {
        pendingSaves--;
        state.saveStatus = state.storageError
          ? 'Changes could not be saved'
          : pendingSaves
            ? 'Saving…'
            : 'Saved in this browser';
      });
    return saveChain;
  }
  function resetTransform() {
    state.zoom = 1;
    state.panX = state.panY = 0;
  }
  function openClip(clip: Clip | null) {
    serial++;
    video.pause();
    state.ready = false;
    state.playing = false;
    state.current = clip;
    state.selectedSection = null;
    state.a = state.b = state.time = state.duration = 0;
    state.looping = state.mediaError = false;
    resetTransform();
    if (window.innerWidth <= 1100) state.libraryVisible = false;
    if (!clip) {
      video.removeAttribute('src');
      video.load();
      return;
    }
    video.src = clip.source;
    video.load();
    rememberClip(clip.id);
  }
  function loadedMetadata() {
    if (
      !state.current ||
      !Number.isFinite(video.duration) ||
      video.duration <= 0
    )
      return;
    state.ready = true;
    state.duration = state.b = state.current.duration = video.duration;
    video.playbackRate = state.current.speed;
    persist();
  }
  function loadedData() {
    if (!state.current || state.current.thumbnail) return;
    const load = serial;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 112;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#181b1a';
      ctx.fillRect(0, 0, 112, 160);
      const ratio = Math.min(112 / video.videoWidth, 160 / video.videoHeight);
      ctx.drawImage(
        video,
        (112 - video.videoWidth * ratio) / 2,
        (160 - video.videoHeight * ratio) / 2,
        video.videoWidth * ratio,
        video.videoHeight * ratio
      );
      if (load === serial && state.current) {
        state.current.thumbnail = canvas.toDataURL('image/jpeg', 0.65);
        persist();
      }
    } catch {
      /* Thumbnails are optional. */
    }
  }
  function seek(time: number) {
    if (state.ready) {
      video.currentTime = clamp(time, 0, state.duration);
      state.time = video.currentTime;
    }
  }
  async function play() {
    if (!state.ready) return;
    if (
      state.looping &&
      (video.currentTime < state.a || video.currentTime >= state.b - 0.015)
    )
      seek(state.a);
    else if (video.ended) seek(state.a);
    try {
      await video.play();
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'AbortError')
        report(error);
    }
  }
  function togglePlay() {
    if (video.paused) play();
    else video.pause();
  }
  function restart() {
    if (state.ready) {
      seek(state.a);
      play();
    }
  }
  function setSpeed(speed: number) {
    if (!state.current || !speeds.includes(speed)) return;
    state.current.speed = video.playbackRate = speed;
    persist();
  }
  function changeSpeed(delta: number) {
    setSpeed(
      speeds[
        clamp(
          speeds.indexOf(state.current?.speed || 1) + delta,
          0,
          speeds.length - 1
        )
      ]
    );
  }
  function step(delta: number) {
    if (state.ready && state.current) {
      video.pause();
      seek(video.currentTime + delta / state.current.fps);
    }
  }
  function setPoint(which: 'a' | 'b') {
    if (!state.ready) return;
    const time = clamp(video.currentTime, 0, state.duration);
    if (
      !validSection(
        which === 'a' ? time : state.a,
        which === 'b' ? time : state.b,
        state.duration
      )
    ) {
      toast('The start must be at least 0.04 seconds before the end.');
      return;
    }
    state[which] = time;
    state.selectedSection = null;
  }
  function toggleLoop() {
    if (!state.ready) return;
    state.looping = !state.looping;
    if (
      state.looping &&
      (video.currentTime < state.a || video.currentTime >= state.b)
    )
      seek(state.a);
  }
  function checkLoop() {
    if (
      state.ready &&
      state.looping &&
      !scrubbing &&
      !video.paused &&
      !video.seeking &&
      video.currentTime >= state.b - 0.008
    )
      seek(state.a);
    state.time = video.currentTime || 0;
  }
  function ended() {
    if (state.looping) {
      seek(state.a);
      play();
    }
  }
  function beginScrub() {
    scrubbing = true;
    resumeAfterScrub = !video.paused;
    video.pause();
  }
  function scrub(time: number) {
    if (!scrubbing && state.looping && (time < state.a || time >= state.b))
      state.looping = false;
    seek(time);
  }
  function finishScrub() {
    if (!scrubbing) return;
    scrubbing = false;
    if (
      state.looping &&
      (video.currentTime < state.a || video.currentTime >= state.b)
    ) {
      state.looping = false;
      toast('Loop off — playhead is outside the section.');
    }
    if (resumeAfterScrub) play();
    resumeAfterScrub = false;
  }
  function clearSection() {
    state.a = 0;
    state.b = state.duration;
    state.selectedSection = null;
  }
  function saveSection(name: string) {
    if (
      !state.ready ||
      !state.current ||
      !name.trim() ||
      !validSection(state.a, state.b, state.duration)
    )
      return false;
    if (state.current.sections.length >= 500) {
      toast('This video already has 500 saved sections.');
      return false;
    }
    const section = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 80),
      a: state.a,
      b: state.b,
      speed: state.current.speed
    };
    state.current.sections.push(section);
    state.selectedSection = section.id;
    state.looping = true;
    persist();
    return true;
  }
  function selectSection(section: SavedSection) {
    if (!state.ready) return;
    state.a = section.a;
    state.b = section.b;
    state.selectedSection = section.id;
    state.looping = true;
    setSpeed(section.speed);
    seek(section.a);
    play();
  }
  function deleteSection(id: string) {
    if (!state.current) return;
    state.current.sections = state.current.sections.filter(
      (section) => section.id !== id
    );
    if (state.selectedSection === id) state.selectedSection = null;
    persist();
  }
  function editClip({ title, creator, tags }: ClipDetails) {
    if (!state.current || !title.trim()) return false;
    state.current.title = title.trim().slice(0, 100);
    state.current.creator = creator.trim().slice(0, 80);
    state.current.tags = tags
      .split(',')
      .map((tag) => tag.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 20);
    persist();
    return true;
  }
  async function removeClip() {
    if (!state.current || !store) return;
    const id = state.current.id;
    try {
      await saveChain;
      video.pause();
      await store.remove(id);
      state.clips = state.clips.filter((clip) => clip.id !== id);
      openClip(state.clips[0] || null);
      toast('Library copy removed. Original file kept.');
    } catch (error) {
      report(error);
    }
  }
  async function importFiles(files: Iterable<File> | null) {
    if (!store || !files || state.importing) return;
    state.importing = true;
    try {
      const added = await store.importFiles(files);
      if (!alive) return;
      if (added.length) {
        state.clips.push(...added);
        openClip(state.clips.at(-added.length) ?? null);
        toast(
          `${added.length} recording${added.length === 1 ? '' : 's'} saved in this browser.`
        );
        navigator.storage?.persist?.().catch(() => {});
      } else toast('Choose an MP4, MOV, M4V or WebM recording.');
    } catch (error) {
      report(
        new Error(
          `Could not import recordings: ${error instanceof Error ? error.message : String(error)}. The batch was not saved.`
        )
      );
    } finally {
      state.importing = false;
    }
  }
  function mirror() {
    if (state.current) {
      state.current.mirror = !state.current.mirror;
      persist();
    }
  }
  function mute() {
    video.muted = !video.muted;
    state.muted = video.muted;
  }
  function setFps(fps: string | number) {
    if (state.current) {
      state.current.fps = Number(fps);
      persist();
    }
  }
  function changeZoom(delta: number) {
    state.zoom = clamp(state.zoom + delta, 1, 4);
    if (state.zoom === 1) state.panX = state.panY = 0;
  }
  function pointerDown(event: VideoPointerEvent) {
    if (event.button !== 0) return;
    drag = {
      x: event.clientX,
      y: event.clientY,
      px: state.panX,
      py: state.panY,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: VideoPointerEvent) {
    if (!drag) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4)
      drag.moved = true;
    if (state.zoom <= 1) return;
    const maxX = (event.currentTarget.clientWidth * (state.zoom - 1)) / 2;
    const maxY = (event.currentTarget.clientHeight * (state.zoom - 1)) / 2;
    state.panX = clamp(drag.px + event.clientX - drag.x, -maxX, maxX);
    state.panY = clamp(drag.py + event.clientY - drag.y, -maxY, maxY);
  }
  function pointerUp() {
    if (drag && !drag.moved) togglePlay();
    drag = null;
  }
  async function fullscreen(element: HTMLElement) {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await element.requestFullscreen();
    } catch {
      toast('Fullscreen is unavailable here.');
    }
  }
  function shortcut(
    event: KeyboardEvent,
    showHelp: () => void,
    stage: HTMLElement
  ) {
    const target = event.target instanceof Element ? event.target : null;
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      target?.closest('input,textarea,select,[contenteditable]') ||
      document.querySelector('dialog[open]')
    )
      return;
    const key = event.key.toLowerCase();
    if (key === '?') {
      event.preventDefault();
      showHelp();
      return;
    }
    // Preserve the native Space/Enter activation of a focused button.
    if (target?.closest('button') && key === ' ') return;
    if (!state.ready) return;
    const actions: Record<string, () => void> = {
      ' ': togglePlay,
      r: restart,
      a: () => setPoint('a'),
      b: () => setPoint('b'),
      l: toggleLoop,
      arrowleft: () => seek(video.currentTime - (event.shiftKey ? 2 : 0.5)),
      arrowright: () => seek(video.currentTime + (event.shiftKey ? 2 : 0.5)),
      '[': () => changeSpeed(-1),
      ']': () => changeSpeed(1),
      ',': () => step(-1),
      '.': () => step(1),
      m: mirror,
      f: () => fullscreen(stage)
    };
    if (actions[key]) {
      event.preventDefault();
      if (event.repeat && [' ', 'a', 'b', 'l', 'm', 'f', 'r'].includes(key))
        return;
      actions[key]();
    }
  }
  async function initialize(element: HTMLVideoElement, demoSource: string) {
    video = element;
    const tick = () => {
      checkLoop();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    try {
      store = await openLibrary(demoSource);
      if (!alive) {
        store.close();
        return;
      }
      state.clips = await store.list();
      state.available = true;
      if (!alive) return;
      openClip(
        state.clips.find((clip) => clip.id === readLastClip()) ||
          state.clips[0] ||
          null
      );
      state.saveStatus = 'Saved in this browser';
    } catch (error) {
      state.storageError = `The local library could not open: ${error instanceof Error ? error.message : String(error)}. Allow browser storage, then reload.`;
      state.saveStatus = 'Local library unavailable';
      report(new Error(state.storageError));
    } finally {
      state.loading = false;
    }
  }
  function destroy() {
    alive = false;
    cancelAnimationFrame(frame);
    clearTimeout(toastTimer);
    video?.pause();
    video?.removeAttribute('src');
    video?.load();
    saveChain.finally(() => store?.close());
  }
  return {
    state,
    initialize,
    destroy,
    toast,
    persist,
    openClip,
    loadedMetadata,
    loadedData,
    seek,
    play,
    togglePlay,
    restart,
    setSpeed,
    step,
    setPoint,
    toggleLoop,
    checkLoop,
    ended,
    beginScrub,
    scrub,
    finishScrub,
    clearSection,
    saveSection,
    selectSection,
    deleteSection,
    editClip,
    removeClip,
    importFiles,
    mirror,
    mute,
    setFps,
    changeZoom,
    resetTransform,
    pointerDown,
    pointerMove,
    pointerUp,
    cancelDrag: () => {
      drag = null;
    },
    fullscreen,
    shortcut,
    mediaError: () => {
      state.ready = state.playing = false;
      state.mediaError = true;
    }
  };
}
