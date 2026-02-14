import pixi from './pixi';
import { Fruits, Height, Width } from './config';
import app from './app';
import { init, saveGame, loadGame, clearGame } from './core';
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
const images = Fruits.map((i) => i.name);
const root = document.getElementById('root')!;
const canvas = app.view;
root.appendChild(canvas);
Loader.shared.add(images).load(init);

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
