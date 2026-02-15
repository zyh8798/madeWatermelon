/**
 * 音效：把文件放到 public/sounds/ 即可自动生效。
 * drop.mp3 - 掉落时播放  merge.mp3 - 合成时播放  fail.mp3 - 失败时（可选）
 * bgm.mp3  - 页面加载后自动循环播放，无需按钮。
 */

const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || '';
const basePath = base.replace(/\/+$/, '') || '';

function resolveUrl(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  return basePath ? `${basePath}/${p}` : `/${p}`;
}

const audioCache: Record<string, HTMLAudioElement> = {};

export function playSound(url: string, volume = 1): void {
  if (!url) return;
  const fullUrl = resolveUrl(url);
  try {
    let el = audioCache[fullUrl];
    if (!el) {
      el = new Audio(fullUrl);
      audioCache[fullUrl] = el;
    }
    el.volume = Math.max(0, Math.min(1, volume));
    el.currentTime = 0;
    el.play().catch(() => {});
  } catch {
    // 忽略
  }
}

let bgmAudio: HTMLAudioElement | null = null;

export function playBGM(_url?: string, volume = 0.5): void {
  const src = resolveUrl('/sounds/bgm.mp3');
  try {
    if (bgmAudio) {
      bgmAudio.volume = Math.max(0, Math.min(1, volume));
      bgmAudio.play().catch(() => {});
      return;
    }
    bgmAudio = new Audio(src);
    bgmAudio.loop = true;
    bgmAudio.volume = Math.max(0, Math.min(1, volume));
    bgmAudio.play().catch(() => {});
  } catch {
    // ignore
  }
}

export function stopBGM(): void {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
  }
}

export function isBGMPlaying(): boolean {
  return !!(bgmAudio && !bgmAudio.paused);
}
