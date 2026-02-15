import pixi from './pixi';
import { Fruits, Height, Width } from './config';
import app from './app';
import { init, saveGame, loadGame, clearGame, setGameOverCallback } from './core';
import './index.css';

// PWA 安装提示
let deferredPrompt: any;

// 调试信息
console.log('=== PWA 调试信息 ===');
console.log('Service Worker 支持:', 'serviceWorker' in navigator);
console.log('beforeinstallprompt 支持:', 'onbeforeinstallprompt' in window);

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('=== beforeinstallprompt 事件触发 ===');
  e.preventDefault();
  deferredPrompt = e;
  console.log('安装提示已保存，可以显示安装按钮');
  
  // 显示安装提示按钮
  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.style.display = 'block';
    console.log('安装按钮已显示');
    installBtn.addEventListener('click', () => {
      console.log('用户点击了安装按钮');
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('用户接受了安装提示');
        } else {
          console.log('用户拒绝了安装提示');
        }
        deferredPrompt = null;
        if (installBtn) {
          installBtn.style.display = 'none';
        }
      });
    });
  }
});

// 检查应用是否已安装
window.addEventListener('appinstalled', () => {
  console.log('=== 应用已安装 ===');
  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.style.display = 'none';
  }
});

const { Loader } = pixi;
// 使用 Vite 的 base，保证 dev/构建后路径一致
const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || '';
const basePath = base.replace(/\/+$/, '') || '';
const images = Fruits.map((i) => {
  const name = i.name.startsWith('/') ? i.name.slice(1) : i.name;
  return basePath ? basePath + '/' + name : '/' + name;
});
const root = document.getElementById('root')!;
const canvas = app.view;
root.appendChild(canvas);

// 先重置 Loader，避免热更新或重复加载导致旧错误状态
if (typeof Loader.shared.reset === 'function') Loader.shared.reset();

// 添加纹理加载监听
console.log('开始加载纹理...', images);
Loader.shared.add(images).load((loader, resources) => {
  console.log('纹理加载完成');
  console.log('加载的资源键:', Object.keys(resources));
  // 确保用 config 的 name（如 /fruits/fruit_1.png）也能取到，避免 Loader 用完整 URL 当 key
  Fruits.forEach((f, idx) => {
    const res = resources[images[idx]] || resources[f.name];
    if (res?.texture && !(resources as any)[f.name]) (resources as any)[f.name] = res;
  });
  // 检查每个纹理是否正确加载
  Fruits.forEach((f) => {
    const resource = (Loader.shared.resources as any)[f.name] || resources[images[Fruits.indexOf(f)]];
    if (!resource?.texture) hasTextureError = true;
    console.log(`${f.name}: 纹理存在=${!!resource?.texture}`);
  });
  if (hasTextureError) showTextureTip();

  setGameOverCallback(() => {
    const el = document.getElementById('failOverlay');
    if (el) el.style.display = 'flex';
  });
  init();
});

// 纹理加载失败时不弹窗阻塞，只打日志并在页面上提示
let hasTextureError = false;
Loader.shared.onError.add((error: any) => {
  hasTextureError = true;
  console.warn('纹理加载失败（请将 fruit_1.png～fruit_11.png 放入 public/fruits/ 目录）:', error?.message || error);
});

function showTextureTip() {
  const el = document.getElementById('textureTip');
  if (el) {
    el.style.display = 'block';
  }
}

// 添加加载进度监听
Loader.shared.onProgress.add((loader) => {
  console.log(`加载进度: ${loader.progress}%`);
});

const resetSize = () => {
  const { innerWidth, innerHeight } = window;
  document.body.style.height = `${innerHeight}px`;
  if (innerWidth / innerHeight > Width / Height) {
    root.style.height = `${innerHeight}px`;
    root.style.width = `${innerHeight / Height * Width}px`;
    canvas.style.transform = `scale(${innerHeight / Height})`;
  } else {
    root.style.width = `${innerWidth}px`;
    root.style.height = `${innerWidth / Width * Height}px`;
    canvas.style.transform = `scale(${innerWidth / Width})`;
  }
};

canvas.style.width = `${Width}px`;
canvas.style.height = `${Height}px`;
resetSize();

window.onresize = resetSize;

// 绑定游戏控制按钮事件
document.getElementById('saveBtn')?.addEventListener('click', saveGame);
document.getElementById('loadBtn')?.addEventListener('click', loadGame);
document.getElementById('clearBtn')?.addEventListener('click', clearGame);

document.getElementById('failConfirmBtn')?.addEventListener('click', () => {
  clearGame();
  const el = document.getElementById('failOverlay');
  if (el) el.style.display = 'none';
});

document.getElementById('textureTipClose')?.addEventListener('click', () => {
  document.getElementById('textureTip')!.style.display = 'none';
});
