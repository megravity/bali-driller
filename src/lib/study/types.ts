export interface SavedSection {
  id: string;
  name: string;
  a: number;
  b: number;
  speed: number;
}

export interface ClipMetadata {
  id: string;
  title: string;
  creator: string;
  tags: string[];
  duration: number;
  fps: number;
  speed: number;
  mirror: boolean;
  thumbnail: string;
  sections: SavedSection[];
}

export interface Clip extends ClipMetadata {
  source: string;
  isDemo: boolean;
}

export interface StoredClip extends ClipMetadata {
  blob?: Blob;
  source?: string;
  isDemo?: boolean;
  originalName?: string;
}

export type ClipInput = { id: unknown } & Partial<
  Record<Exclude<keyof ClipMetadata, 'id'>, unknown>
>;
export interface ClipDetails {
  title: string;
  creator: string;
  tags: string;
}
export type Study = ReturnType<typeof import('./player.svelte.ts').createStudy>;
export type VideoPointerEvent = PointerEvent & {
  currentTarget: EventTarget & HTMLDivElement;
};

export interface StudyState {
  clips: Clip[];
  current: Clip | null;
  query: string;
  loading: boolean;
  available: boolean;
  importing: boolean;
  ready: boolean;
  playing: boolean;
  time: number;
  duration: number;
  a: number;
  b: number;
  looping: boolean;
  selectedSection: string | null;
  zoom: number;
  panX: number;
  panY: number;
  muted: boolean;
  libraryVisible: boolean;
  mediaError: boolean;
  message: string;
  saveStatus: string;
  storageError: string;
  expanded: boolean;
}
