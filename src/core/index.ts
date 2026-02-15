import { Sprite as SpriteType } from '@pixi/sprite';
import pixi from '../pixi';
import b2 from '../box2d';
import app from '../app';
import {
  Ratio, Fruits, PositionIterations, VelocityIterations, TimeStep, Height, Width, Gravity,
} from '../config';
import { b2Body } from '../b2/dynamics/b2_body';
import { playSound } from '../sound';

const { Sprite, Loader } = pixi;
const Graphics = (pixi as any).Graphics;
const world = new b2.World({ x: 0, y: Gravity });

/** 当水果图未加载时使用的占位纹理，避免报错导致精灵不显示 */
function getPlaceholderTexture(): any {
  const key = '__placeholder';
  let t = Loader.shared.resources[key]?.texture;
  if (t) return t;
  const T = (pixi as any).Texture;
  if (T?.WHITE) return T.WHITE;
  if (T?.EMPTY) return T.EMPTY;
  return null;
}

/** 触顶失败：红线距顶部像素、警告区（低于此高度显示红线）、判定为触顶的阈值 */
const TOP_LINE_Y = 20;
const WARNING_ZONE_TOP = 80;
const FAIL_TOP_THRESHOLD = 20;
/** 水果生成后多少毫秒才参与触顶检测，避免刚发射就判负 */
const SPAWN_GRACE_MS = 1800;
let gameOver = false;
let gameOverCallback: () => void = () => {};
export const setGameOverCallback = (cb: () => void) => { gameOverCallback = cb; };

let dangerLine: any;

const createWall = () => {
  const wallBodyDef = new b2.BodyDef();
  const wallFixtureDef = new b2.FixtureDef();
  wallBodyDef.type = b2.staticBody;
  wallFixtureDef.density = 0;
  wallFixtureDef.friction = 0.2;
  wallFixtureDef.restitution = 0.3;
  wallFixtureDef.filter.groupIndex = -20;
  wallFixtureDef.shape = new b2.ChainShape().CreateLoop([
    { x: 0, y: 0 / Ratio },
    { x: 0, y: Height / Ratio },
    { x: Width / Ratio, y: Height / Ratio },
    { x: Width / Ratio, y: 0 / Ratio },
  ]);
  const wallBody = world.CreateBody(wallBodyDef);
  wallBody.CreateFixture(wallFixtureDef);
  wallBody.SetUserData({ type: -1 });
};

const fruitDefaultY = 150 / Ratio;
const fruitBodyDef = new b2.BodyDef();
fruitBodyDef.type = b2.dynamicBody;
fruitBodyDef.position.Set(Width / 2 / Ratio, fruitDefaultY);
const fruitFixtureDefs = Fruits.map((fruit) => {
  const fixtureDef = new b2.FixtureDef();
  fixtureDef.density = 0.03; // 很轻，轻轻落下
  fixtureDef.friction = 0.6; // 摩擦大一点，有点粘
  fixtureDef.restitution = 0; // 无弹力
  fixtureDef.shape = new b2.CircleShape(fruit.radius / Ratio);
  fixtureDef.filter.groupIndex = 1;
  return fixtureDef;
});

let fruitId = 0;
const fruits: {[key: string]: {body: b2Body, sprite: SpriteType, spawnTime: number}} = {};
const contactedFruits = new Map<number, number>();
/** 待合成队列：同种接触后不弹开，延迟一小段时间再真正合并 */
const pendingMerges = new Map<number, { maxId: number; startTime: number }>();
const MERGE_DELAY_MS = 100;
/** 两球心距离小于 (r1+r2)/Ratio + OVERLAP_MARGIN 视为重叠可合成（世界单位） */
const OVERLAP_MARGIN = 0.05;
const mergingFruitSet = new Set();
const createSprite = (type: number, x = -299, y = -299) => {
  const fruit = Fruits[type];
  const sprite = new Sprite();
  sprite.anchor.set(0.5);
  sprite.x = x;
  sprite.y = y;
  const texture = Loader.shared.resources[fruit.name]?.texture;
  if (!texture) {
    console.error(`纹理未找到: ${fruit.name}，请确保 public/fruits/ 下有对应图片`);
    console.log('Loader.resources 中的键:', Object.keys(Loader.shared.resources || {}));
  }
  const tex = texture || Loader.shared.resources['/fruits/fruit_1.png']?.texture || getPlaceholderTexture();
  if (tex) sprite.texture = tex;
  sprite.scale.set(fruit.radius / fruit.imgRadius);
  return sprite;
};
const currentNextFruit = {
  current: 0,
  next: 0,
};
let currentFruitSprite: SpriteType;
let nextFruitSprite: SpriteType;
const setCurrentNextFruit = () => {
  let currentFruit = 0;
  let nextFruit = 0;
  Object.defineProperty(currentNextFruit, 'current', {
    get() {
      return currentFruit;
    },
    set(value) {
      currentFruit = value;
      const fruit = Fruits[value];
      const tex = Loader.shared.resources[fruit.name]?.texture;
      if (tex) currentFruitSprite.texture = tex;
      currentFruitSprite.scale.set(fruit.radius / fruit.imgRadius);
    },
  });
  Object.defineProperty(currentNextFruit, 'next', {
    get() {
      return nextFruit;
    },
    set(value) {
      nextFruit = value;
      const fruit = Fruits[value];
      const tex = Loader.shared.resources[fruit.name]?.texture;
      if (tex) nextFruitSprite.texture = tex;
      nextFruitSprite.scale.set(fruit.radius / fruit.imgRadius);
    },
  });
};
setCurrentNextFruit();
const createFruit = (id: number, x = Width / 2) => {
  playSound('/sounds/drop.mp3');
  let newX = x;
  if (x < 5) newX = 5;
  if (x > Width - 5) newX = Width - 5;
  const fruit = Fruits[id];
  const fruitBody = world.CreateBody(fruitBodyDef);
  fruitBody.SetSleepingAllowed(true);
  fruitBody.SetPositionXY(newX / Ratio, fruitDefaultY);
  fruitBody.CreateFixture(fruitFixtureDefs[id]);
  fruitBody.SetUserData({ type: id, id: fruitId });
  const sprite = createSprite(id);
  app.stage.addChild(sprite);
  fruits[fruitId++] = { body: fruitBody, sprite, spawnTime: Date.now() };
  currentNextFruit.current = currentNextFruit.next;
  if (fruitId < 4) currentNextFruit.next = Math.floor(Math.random() * 2);
  else if (fruitId < 8) currentNextFruit.next = Math.floor(Math.random() * 3);
  else if (fruitId < 16) currentNextFruit.next = Math.round(Math.random() * 3.5);
  else currentNextFruit.next = Math.round(Math.random() * 4);
};

const animationFruits: Array<{
  sprite: SpriteType;
  targetScale: number;
  currentScale: number;
  progress: number;
}> = [];

/** 两同种水果是否重叠（世界坐标） */
function areOverlapping(idA: number, idB: number): boolean {
  const fa = fruits[idA];
  const fb = fruits[idB];
  if (!fa || !fb) return false;
  const posA = fa.body.GetPosition();
  const posB = fb.body.GetPosition();
  const typeA = fa.body.GetUserData().type;
  const typeB = fb.body.GetUserData().type;
  if (typeA !== typeB || typeA >= 10) return false;
  const rA = Fruits[typeA].radius / Ratio;
  const rB = Fruits[typeB].radius / Ratio;
  const dx = posA.x - posB.x;
  const dy = posA.y - posB.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist <= rA + rB + OVERLAP_MARGIN;
}

const doWithContactedFruits = () => {
  contactedFruits.forEach((maxId, minId) => {
    if (!areOverlapping(minId, maxId)) return; // 已分离则取消本次合成
    let top = fruits[maxId];
    let bottom = fruits[minId];
    if (top.body.GetPosition().y > bottom.body.GetPosition().y) {
      const mid = top;
      top = bottom;
      bottom = mid;
    }
    bottom.body.DestroyFixture(bottom.body.GetFixtureList()!);
    const data = bottom.body.GetUserData();
    bottom.body.CreateFixture(fruitFixtureDefs[data.type + 1]);
    bottom.body.SetUserData({ ...data, type: data.type + 1 });
    mergingFruitSet.delete(minId);
    mergingFruitSet.delete(maxId);
    delete fruits[top.body.GetUserData().id];
    world.DestroyBody(top.body);
    app.stage.removeChild(top.sprite);
    const newFruit = Fruits[data.type + 1];
    bottom.sprite.texture = Loader.shared.resources[newFruit.name].texture!;
    playSound('/sounds/merge.mp3');

    // 添加缩放动画
    const targetScale = newFruit.radius / newFruit.imgRadius;
    const startScale = targetScale * 0.5; // 从 50% 大小开始
    bottom.sprite.scale.set(startScale);
    
    animationFruits.push({
      sprite: bottom.sprite,
      targetScale,
      currentScale: startScale,
      progress: 0,
    });
  });
  contactedFruits.clear();
};

/** 每帧检测同种水果是否重叠，重叠则加入待合成（不关接触，靠低 restitution 实现粘住） */
function checkOverlapAndEnqueueMerge() {
  const ids = Object.keys(fruits).map(Number);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const minId = Math.min(ids[i], ids[j]);
      const maxId = Math.max(ids[i], ids[j]);
      if (mergingFruitSet.has(minId) || mergingFruitSet.has(maxId)) continue;
      if (pendingMerges.has(minId) && pendingMerges.get(minId)!.maxId === maxId) continue;
      if (!areOverlapping(minId, maxId)) continue;
      pendingMerges.set(minId, { maxId, startTime: Date.now() });
      mergingFruitSet.add(minId);
      mergingFruitSet.add(maxId);
      return;
    }
  }
}

const loop = () => {
  const now = Date.now();
  pendingMerges.forEach((val, minId) => {
    if (!areOverlapping(minId, val.maxId)) {
      pendingMerges.delete(minId);
      mergingFruitSet.delete(minId);
      mergingFruitSet.delete(val.maxId);
      return;
    }
    if (now - val.startTime >= MERGE_DELAY_MS) {
      contactedFruits.set(minId, val.maxId);
      pendingMerges.delete(minId);
      mergingFruitSet.delete(minId);
      mergingFruitSet.delete(val.maxId);
    }
  });

  world.Step(TimeStep, VelocityIterations, PositionIterations);
  checkOverlapAndEnqueueMerge();
  doWithContactedFruits();
  world.Step(TimeStep, VelocityIterations, PositionIterations);
  checkOverlapAndEnqueueMerge();
  doWithContactedFruits();
  world.Step(TimeStep, VelocityIterations, PositionIterations);
  checkOverlapAndEnqueueMerge();
  doWithContactedFruits();
  
  // 更新合成动画（步进越小动画越慢）
  const ANIM_PROGRESS_STEP = 0.008;
  for (let i = animationFruits.length - 1; i >= 0; i--) {
    const anim = animationFruits[i];
    anim.progress += ANIM_PROGRESS_STEP;
    if (anim.progress >= 1) {
      anim.sprite.scale.set(anim.targetScale);
      animationFruits.splice(i, 1);
    } else {
      // 使用缓动函数 easeOutBack 让动画更生动
      const t = anim.progress;
      const c1 = 1.70158;
      const c3 = c1 + 1;
      const easeOutBack = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      const newScale = anim.currentScale + (anim.targetScale - anim.currentScale) * easeOutBack;
      anim.sprite.scale.set(newScale);
    }
  }
  
  let anyInWarningZone = false;
  Object.keys(fruits).forEach((id) => {
    const fruit = fruits[id];
    const { body, sprite } = fruit;
    const { x, y } = body.GetPosition();
    const angle = body.GetAngle();
    sprite.x = x * Ratio;
    sprite.y = y * Ratio;
    sprite.rotation = angle;

    const fruitAge = Date.now() - fruit.spawnTime;
    if (fruitAge < SPAWN_GRACE_MS) return;
    const fruitRadius = Fruits[body.GetUserData().type].radius;
    const fruitTop = y * Ratio - fruitRadius;

    if (fruitTop < WARNING_ZONE_TOP) anyInWarningZone = true;
    if (!gameOver && fruitTop < FAIL_TOP_THRESHOLD) {
      gameOver = true;
      gameOverCallback();
    }
  });

  // 红线：接近顶部时在距顶 TOP_LINE_Y 处闪烁（用 try-catch 防止 Pixi 版本差异导致报错卡死循环）
  try {
    if (dangerLine) {
      dangerLine.clear();
      if (!gameOver && anyInWarningZone) {
        const flash = 0.4 + 0.6 * Math.sin(Date.now() / 180);
        dangerLine.lineStyle(4, 0xff0000, flash);
        dangerLine.moveTo(0, TOP_LINE_Y);
        dangerLine.lineTo(Width, TOP_LINE_Y);
      }
    }
  } catch (e) {
    dangerLine = null;
  }

  requestAnimationFrame(loop);
};

const rootElement = document.getElementById('root')!;
let lastClickTime = 0;
const tooFrequent = () => {
  const now = new Date().getTime();
  if (now - lastClickTime < 100) return true;
  lastClickTime = now;
  return false;
};

export const init = () => {
  console.log('游戏初始化开始');
  const canvas = document.getElementsByTagName('canvas')[0];
  canvas.addEventListener('touchmove', (event) => {
    const { changedTouches } = event;
    if (changedTouches.length !== 1) return;
    const left = parseFloat(getComputedStyle(rootElement).marginLeft);
    const { clientX } = changedTouches[0];
    // @ts-ignore
    const newX = (clientX - left) / parseFloat(rootElement.childNodes[0].style.transform.slice(6));
    currentFruitSprite.x = newX;
  });
  canvas.addEventListener('touchend', (event) => {
    if (tooFrequent()) return;
    const { changedTouches } = event;
    if (changedTouches.length !== 1) return;
    const left = parseFloat(getComputedStyle(rootElement).marginLeft);
    const { clientX } = changedTouches[0];
    // @ts-ignore
    const newX = (clientX - left) / parseFloat(rootElement.childNodes[0].style.transform.slice(6));
    currentFruitSprite.x = Width / 2;
    // @ts-ignore
    createFruit(currentNextFruit.current, newX);
  });
  canvas.addEventListener('mousemove', (event) => {
    if ('ontouchend' in window) return;
    const { offsetX } = event;
    currentFruitSprite.x = offsetX;
  });
  canvas.addEventListener('click', (event) => {
    if ('ontouchend' in window) return;
    if (tooFrequent()) return;
    const { offsetX } = event;
    currentFruitSprite.x = offsetX;
    createFruit(currentNextFruit.current, offsetX);
  });
  createWall();
  currentFruitSprite = createSprite(currentNextFruit.current, Width / 2, fruitDefaultY * Ratio);
  nextFruitSprite = createSprite(currentNextFruit.next, Width / 2, 50);
  currentFruitSprite.visible = true;
  currentFruitSprite.alpha = 1;
  nextFruitSprite.visible = false; // 不展示“下一个水果”，只保留用于 RNG 与 setter

  app.stage.addChild(currentFruitSprite);
  // 不把 nextFruitSprite 加入舞台，顶部不再显示下一个水果

  try {
    if (Graphics) {
      dangerLine = new Graphics();
      app.stage.addChild(dangerLine);
    }
  } catch (e) {
    console.warn('红线 Graphics 初始化失败，已跳过', e);
    dangerLine = null;
  }

  console.log(`app.stage子元素数量: ${app.stage.children.length}`);
  console.log(`app.stage尺寸: width=${app.stage.width}, height=${app.stage.height}`);

  // 同种水果：关碰撞响应 + 沿接触法线抵消分离速度，实现“不弹、有点粘”
  const worldManifold = new (b2 as any).WorldManifold();
  const tempVec = new (b2 as any).Vec2();
  b2.ContactListener.prototype.PreSolve = (contact: any) => {
    const bodyA = contact.GetFixtureA().GetBody();
    const bodyB = contact.GetFixtureB().GetBody();
    const a = bodyA.GetUserData();
    const b = bodyB.GetUserData();
    if (a.type !== b.type || a.type >= 10) return;
    const minId = Math.min(a.id, b.id);
    const maxId = Math.max(a.id, b.id);
    contact.GetWorldManifold(worldManifold);
    const normal = worldManifold.normal;
    const vA = bodyA.GetLinearVelocity();
    const vB = bodyB.GetLinearVelocity();
    const dotA = (b2 as any).Vec2.DotVV(vA, normal);
    const dotB = (b2 as any).Vec2.DotVV(vB, normal);
    (b2 as any).Vec2.SubVV(vA, (b2 as any).Vec2.MulSV(dotA, normal, tempVec), tempVec);
    bodyA.SetLinearVelocity(tempVec);
    (b2 as any).Vec2.SubVV(vB, (b2 as any).Vec2.MulSV(dotB, normal, tempVec), tempVec);
    bodyB.SetLinearVelocity(tempVec);
    if (mergingFruitSet.has(minId) || mergingFruitSet.has(maxId)) {
      contact.SetEnabled(false);
      return;
    }
    if (pendingMerges.has(minId) && pendingMerges.get(minId)!.maxId === maxId) {
      contact.SetEnabled(false);
      return;
    }
    pendingMerges.set(minId, { maxId, startTime: Date.now() });
    mergingFruitSet.add(minId);
    mergingFruitSet.add(maxId);
    contact.SetEnabled(false);
  };
  loop();
};

// 保存游戏状态
export const saveGame = () => {
  const gameState = {
    fruits: Object.keys(fruits).map((id) => {
      const fruit = fruits[id];
      const position = fruit.body.GetPosition();
      return {
        id: parseInt(id),
        type: fruit.body.GetUserData().type,
        x: position.x,
        y: position.y,
        angle: fruit.body.GetAngle(),
      };
    }),
    fruitId,
    currentFruit: currentNextFruit.current,
    nextFruit: currentNextFruit.next,
  };
  localStorage.setItem('watermelonGame', JSON.stringify(gameState));
};

// 加载游戏状态
export const loadGame = () => {
  const savedData = localStorage.getItem('watermelonGame');
  if (!savedData) {
    return;
  }

  try {
    const gameState = JSON.parse(savedData);

    // 清空当前游戏
    clearGame();

    // 恢复水果
    gameState.fruits.forEach((savedFruit: any) => {
      const fruit = Fruits[savedFruit.type];
      const fruitBody = world.CreateBody(fruitBodyDef);
      fruitBody.SetSleepingAllowed(true);
      fruitBody.SetPositionXY(savedFruit.x, savedFruit.y);
      fruitBody.SetAngle(savedFruit.angle);
      fruitBody.CreateFixture(fruitFixtureDefs[savedFruit.type]);
      fruitBody.SetUserData({ type: savedFruit.type, id: savedFruit.id });

      const sprite = createSprite(savedFruit.type);
      sprite.x = savedFruit.x * Ratio;
      sprite.y = savedFruit.y * Ratio;
      sprite.rotation = savedFruit.angle;
      app.stage.addChild(sprite);

      // 为加载的水果设置一个较早的生成时间，避免被误判为触顶
      fruits[savedFruit.id] = { 
        body: fruitBody, 
        sprite, 
        spawnTime: Date.now() - 10000 // 设置为10秒前生成
      };
    });

    // 恢复游戏状态
    fruitId = gameState.fruitId;
    currentNextFruit.current = gameState.currentFruit;
    currentNextFruit.next = gameState.nextFruit;
  } catch (error) {
    console.error('加载游戏失败:', error);
  }
};

// 清空游戏状态
export const clearGame = () => {
  // 删除所有水果
  Object.keys(fruits).forEach((id) => {
    const fruit = fruits[id];
    world.DestroyBody(fruit.body);
    app.stage.removeChild(fruit.sprite);
    delete fruits[id];
  });

  // 清空接触和合并状态
  contactedFruits.clear();
  pendingMerges.clear();
  mergingFruitSet.clear();

  // 重置水果ID和当前/下一个水果
  fruitId = 0;
  currentNextFruit.current = 0;
  currentNextFruit.next = 0;
  gameOver = false;
};
