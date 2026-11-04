(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const W = canvas.width, H = canvas.height;
  const FLOOR = 222;
  const WORLD_END = 2740;
  const $ = (id) => document.getElementById(id);

  const weapons = [
    { name: 'EMBERBLADE', short: 'EMBER', style: 'sword', color: '#ff9d62', glow: '#ff653d', damage: 15, range: 52, speed: 1, duration: 19, hit: 7, knock: 7, heavy: 31, heavyDamage: 33, special: 'SOLAR BREAK', specialRange: 175, specialDamage: 62 },
    { name: 'MOONPIERCER', short: 'MOON', style: 'spear', color: '#8bdcf0', glow: '#47bde7', damage: 21, range: 76, speed: 0.88, duration: 25, hit: 10, knock: 11, heavy: 36, heavyDamage: 39, special: 'LUNAR LANCE', specialRange: 235, specialDamage: 72 },
    { name: 'FANG & FURY', short: 'FANG', style: 'sword', color: '#df9ce8', glow: '#bd68de', damage: 10, range: 44, speed: 1.28, duration: 15, hit: 5, knock: 5, heavy: 25, heavyDamage: 25, special: 'PHANTOM RUSH', specialRange: 145, specialDamage: 62 },
    { name: 'TITAN MAUL', short: 'TITAN', style: 'hammer', color: '#e7c58a', glow: '#eaa84b', damage: 25, range: 58, speed: 0.76, duration: 31, hit: 15, knock: 16, heavy: 44, heavyDamage: 52, special: 'EARTHSHATTER', specialRange: 175, specialDamage: 100 },
    { name: 'STORMCLEAVER', short: 'STORM', style: 'axe', color: '#a7d7ed', glow: '#62b9ef', damage: 19, range: 64, speed: 0.86, duration: 24, hit: 9, knock: 13, heavy: 38, heavyDamage: 48, special: 'THUNDERFALL', specialRange: 190, specialDamage: 92 },
    { name: 'RIFT DAGGERS', short: 'RIFT', style: 'daggers', color: '#d7a0f2', glow: '#a968e8', damage: 9, range: 47, speed: 1.48, duration: 13, hit: 4, knock: 5, heavy: 23, heavyDamage: 24, special: 'ECHO FLURRY', specialRange: 155, specialDamage: 74 },
    { name: 'FROST REPEATER', short: 'FROST', style: 'crossbow', color: '#a9e7ee', glow: '#61cbe5', damage: 17, range: 240, speed: 0.94, duration: 20, hit: 8, knock: 7, heavy: 32, heavyDamage: 38, special: 'GLACIAL VOLLEY', specialRange: 255, specialDamage: 88, projectile: { speed: 5.5, size: 3, life: 76, pierce: false } },
    { name: 'SUNWEAVER', short: 'SUN', style: 'staff', color: '#ffd17a', glow: '#ff9c4f', damage: 15, range: 205, speed: 1.02, duration: 18, hit: 7, knock: 8, heavy: 30, heavyDamage: 34, special: 'SOLSTICE NOVA', specialRange: 215, specialDamage: 82, projectile: { speed: 4.5, size: 4, life: 78, pierce: true } },
    { name: 'VOIDREAVER', short: 'VOID', style: 'scythe', color: '#c5a4ff', glow: '#8a5cff', damage: 18, range: 88, speed: 0.92, duration: 23, hit: 9, knock: 12, heavy: 41, heavyDamage: 46, special: 'ECLIPSE HARVEST', specialRange: 205, specialDamage: 96 }
  ];

  const keys = Object.create(null);
  const justPressed = new Set();
  let mode = 'title';
  let lastTime = 0;
  let clock = 0;
  let cameraX = 0;
  let shake = 0;
  let flash = 0;
  let score = 0;
  let kills = 0;
  let waveIndex = 0;
  let activeWave = 0;
  let bossSpawned = false;
  let bossDefeated = false;
  let soundOn = true;
  let audioCtx = null;
  let player;
  let enemies = [];
  let projectiles = [];
  let pickups = [];
  let particles = [];
  let texts = [];
  let scenery = [];
  let ambient = [];
  let bossRef = null;
  let menuPulse = 0;

  const waveEvents = [
    { at: 390, types: ['raider', 'raider'] },
    { at: 830, types: ['raider', 'archer', 'raider'] },
    { at: 1320, types: ['brute', 'raider', 'archer'] },
    { at: 1790, types: ['brute', 'raider', 'raider', 'archer'] }
  ];

  function freshPlayer() {
    return {
      x: 72, y: FLOOR, vy: 0, face: 1, hp: 100, maxHp: 100,
      meter: 0, weapon: 0, attack: null, attackCd: 0, combo: 0, potions: 2, potionCd: 0,
      invuln: 0, dash: 0, dashCd: 0, block: false, onGround: true,
      walk: 0, hurt: 0, dead: false, jumpLock: false
    };
  }

  function resetGame() {
    player = freshPlayer();
    enemies = []; projectiles = []; pickups = []; particles = []; texts = [];
    cameraX = 0; shake = 0; flash = 0; score = 0; kills = 0;
    waveIndex = 0; activeWave = 0; bossSpawned = false; bossDefeated = false; bossRef = null;
    clock = 0;
    mode = 'playing';
    sound('start');
    for (let i = 0; i < 18; i++) ambient.push(makeAmbient(true));
  }

  function sound(type) {
    if (!soundOn) return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
      const bank = {
        hit: [115, 47, .12, 'sawtooth'], heavy: [82, 28, .24, 'square'], dash: [240, 660, .10, 'sine'],
        jump: [180, 320, .12, 'triangle'], hurt: [150, 65, .22, 'sawtooth'], parry: [520, 980, .13, 'triangle'],
        special: [72, 440, .42, 'sawtooth'], kill: [270, 650, .18, 'triangle'], start: [110, 440, .36, 'sine'],
        boss: [55, 38, .5, 'square'], win: [220, 880, .65, 'triangle'], potion: [440, 760, .18, 'sine']
      };
      const [from, to, duration, wave] = bank[type] || bank.hit;
      osc.type = wave; osc.frequency.setValueAtTime(from, now); osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(type === 'special' ? 1500 : 900, now);
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(type === 'special' ? .16 : .09, now + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      osc.start(now); osc.stop(now + duration + .02);
    } catch (_) { /* Audio is an optional extra. */ }
  }

  function addText(x, y, text, color = '#fff', size = 9, life = 42) {
    texts.push({ x, y, text, color, size, life, max: life, vy: -.35 });
  }

  function particle(x, y, color, vx, vy, life = 22, size = 2, gravity = .06, square = true) {
    particles.push({ x, y, color, vx, vy, life, max: life, size, gravity, square });
  }

  function burst(x, y, color, amount = 12, power = 2.5, size = 3) {
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = .35 + Math.random() * power;
      particle(x, y, color, Math.cos(a) * s, Math.sin(a) * s, 12 + Math.random() * 24, 1 + Math.random() * size, .045);
    }
    particle(x, y, '#fff3d2', 0, 0, 8, size * 2, 0, false);
  }

  function spawnPickup(x, amount = 1) {
    pickups.push({ x, y: FLOOR - 13, amount, life: 900, phase: Math.random() * 6.28 });
    burst(x, FLOOR - 13, '#83e0a7', 7, 1.4, 2);
  }

  function usePotion() {
    if (!player || player.dead || player.potions <= 0 || player.hp >= player.maxHp || player.potionCd > 0 || player.attack || player.dash > 0) return false;
    const restored = Math.min(38, player.maxHp - player.hp);
    player.potions--;
    player.hp += restored;
    player.potionCd = 34;
    player.invuln = Math.max(player.invuln, 12);
    player.hurt = 0;
    burst(player.x, player.y - 25, '#83e0a7', 22, 2.8, 3);
    addText(player.x, player.y - 58, `+${restored} HP`, '#9df0b5', 10, 48);
    sound('potion');
    return true;
  }

  function makeAmbient(initial = false) {
    return { x: initial ? Math.random() * W : W + 8, y: 45 + Math.random() * 165, vx: -.18 - Math.random() * .35, vy: -.25 - Math.random() * .25, life: 100 + Math.random() * 130, a: .2 + Math.random() * .45, s: Math.random() < .25 ? 2 : 1 };
  }

  function spawnEnemy(type, x, face = -1) {
    const stats = {
      raider: { hp: 48, speed: .58, damage: 8, range: 34, color: '#bc6659', score: 100 },
      archer: { hp: 34, speed: .42, damage: 7, range: 205, color: '#72a7ae', score: 130 },
      brute: { hp: 108, speed: .32, damage: 18, range: 45, color: '#ae8854', score: 220 },
      boss: { hp: 590, speed: .42, damage: 18, range: 90, color: '#c77b56', score: 1800 }
    }[type];
    const e = {
      type, x, y: FLOOR, face, hp: stats.hp, maxHp: stats.hp, speed: stats.speed,
      damage: stats.damage, range: stats.range, color: stats.color, score: stats.score,
      attackCd: 50 + Math.random() * 35, windup: 0, stun: 0, invuln: 0,
      attackMode: 'idle', modeTimer: 0, walk: Math.random() * 8, hurt: 0,
      dead: false, phase: 0, attackCycle: 0, flash: 0, spawned: true
    };
    enemies.push(e);
    return e;
  }

  function startWave(ev) {
    activeWave++;
    ev.types.forEach((type, i) => spawnEnemy(type, ev.at + 100 + i * 64, -1));
    addText(ev.at + 110, 130, `WAVE ${activeWave} — INCOMING`, '#e9bd79', 9, 75);
    burst(ev.at + 70, FLOOR - 4, '#e6a55e', 14, 1.7, 2);
    sound('boss');
  }

  function hurtPlayer(amount, sourceX, heavy = false) {
    if (player.invuln > 0 || player.dead) return;
    const incoming = sourceX < player.x ? -1 : 1;
    if (player.block && player.face === incoming && player.onGround) {
      player.hp = Math.min(player.maxHp, player.hp - Math.max(1, Math.floor(amount * .12)));
      player.meter = Math.min(100, player.meter + (heavy ? 8 : 5));
      player.invuln = 7;
      shake = Math.max(shake, 2.5);
      burst(player.x, player.y - 23, '#8adcf0', 5, 1.2, 2);
      addText(player.x, player.y - 49, 'BLOCK', '#9de8f0', 8, 30);
      sound('parry');
      return;
    }
    player.hp -= amount;
    player.invuln = 48;
    player.hurt = 12;
    player.vy = -2.1;
    player.x += incoming * -8;
    shake = Math.max(shake, heavy ? 7 : 4);
    flash = .13;
    burst(player.x, player.y - 22, '#ff795c', 11, 2.2, 3);
    addText(player.x, player.y - 47, `-${amount}`, '#ff9277', 10, 38);
    sound('hurt');
    if (player.hp <= 0) {
      player.hp = 0; player.dead = true; mode = 'gameover';
      burst(player.x, player.y - 22, '#f3b16e', 35, 3.7, 4);
    }
  }

  function hitEnemy(e, damage, knock, color, heavy = false) {
    if (e.dead || e.invuln > 0) return;
    e.hp -= damage;
    e.invuln = e.type === 'boss' ? 9 : 13;
    e.hurt = 8;
    e.stun = Math.max(e.stun, heavy ? 26 : 12);
    e.x += player.face * knock;
    shake = Math.max(shake, heavy ? 5.5 : 2.5);
    flash = Math.max(flash, .06);
    burst(e.x, e.y - (e.type === 'boss' ? 50 : 24), color, heavy ? 17 : 9, heavy ? 3.1 : 2.1, heavy ? 3 : 2);
    addText(e.x, e.y - (e.type === 'boss' ? 75 : 43), String(damage), heavy ? '#ffe0a2' : '#fff3e7', 9 + (heavy ? 2 : 0), 36);
    player.meter = Math.min(100, player.meter + (heavy ? 14 : 7));
    if (e.hp <= 0) killEnemy(e);
    sound(heavy ? 'heavy' : 'hit');
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true; kills++; score += e.score;
    burst(e.x, e.y - (e.type === 'boss' ? 45 : 22), e.type === 'boss' ? '#f2bb72' : e.color, e.type === 'boss' ? 54 : 20, e.type === 'boss' ? 4.5 : 3, 4);
    addText(e.x, e.y - 61, e.type === 'boss' ? 'WARDEN BROKEN' : `+${e.score}`, '#f0c77f', e.type === 'boss' ? 12 : 9, 65);
    player.meter = Math.min(100, player.meter + (e.type === 'boss' ? 30 : 8));
    if (e.type === 'boss') {
      spawnPickup(e.x - 18, 1); spawnPickup(e.x + 18, 1);
    } else if (Math.random() < (e.type === 'brute' ? .62 : e.type === 'archer' ? .34 : .24)) {
      spawnPickup(e.x, 1);
    }
    if (e.type === 'boss') {
      bossDefeated = true; mode = 'victory'; sound('win'); flash = .65; shake = 15;
    } else sound('kill');
  }

  function beginAttack(kind) {
    if (player.attack || player.attackCd > 0 || player.dead || player.dash > 0) return;
    const w = weapons[player.weapon];
    const heavy = kind === 'heavy';
    const duration = heavy ? w.heavy : Math.max(11, Math.round(w.duration / w.speed));
    const hitFrame = heavy ? Math.round(duration * .52) : Math.round(w.hit / w.speed);
    player.attack = { kind, t: 0, duration, hitFrame, hit: false, id: Math.random() };
    player.attackCd = heavy ? duration + 6 : Math.max(7, Math.round(13 / w.speed));
    if (!heavy) player.combo = (player.combo + 1) % 3;
    else player.combo = 0;
  }

  function doAttackHit(atk) {
    const w = weapons[player.weapon];
    const heavy = atk.kind === 'heavy';
    const range = (heavy ? w.range + 9 : w.range) + (player.combo === 2 && !heavy ? 7 : 0);
    const damage = heavy ? w.heavyDamage : Math.round(w.damage * (player.combo === 2 ? 1.35 : 1));
    if (w.projectile) {
      const spec = w.projectile;
      const speed = spec.speed * (heavy ? 1.18 : 1);
      projectiles.push({ x: player.x + player.face * 15, y: player.y - 31, vx: player.face * speed, vy: 0, damage, color: w.glow, size: spec.size + (heavy ? 2 : 0), life: spec.life, fromPlayer: true, pierce: spec.pierce, heavy, knock: w.knock * (heavy ? 1.65 : 1), hitEnemies: new Set() });
      burst(player.x + player.face * 19, player.y - 31, w.color, heavy ? 11 : 6, 1.6, 2);
      sound(heavy ? 'heavy' : 'hit');
      return;
    }
    let hitCount = 0;
    for (const e of enemies) {
      if (e.dead || Math.abs(e.y - player.y) > 38) continue;
      const dx = (e.x - player.x) * player.face;
      if (dx > 0 && dx < range + (e.type === 'boss' ? 20 : 0) && Math.abs(e.x - player.x) < range + 18) {
        hitEnemy(e, damage, w.knock * (heavy ? 1.7 : 1), w.color, heavy);
        hitCount++;
      }
    }
    const sx = player.x + player.face * (range * .63);
    const sy = player.y - (player.onGround ? 30 : 23);
    burst(sx, sy, w.color, heavy ? 18 : 9, heavy ? 3.2 : 1.8, heavy ? 3 : 2);
    if (hitCount === 0) {
      for (let i = 0; i < 5; i++) particle(sx + player.face * i * 3, sy + (Math.random() - .5) * 16, w.color, player.face * (1 + Math.random()), -.3, 14, 2, .02);
    }
    if (heavy) { shake = Math.max(shake, 5); sound('heavy'); }
  }

  function doSpecial() {
    if (player.meter < 100 || player.dead || player.dash > 0) return;
    player.meter = 0; player.attack = { kind: 'special', t: 0, duration: 44, hitFrame: 17, hit: false };
    player.invuln = Math.max(player.invuln, 35); shake = 10; flash = .24;
    sound('special');
    burst(player.x, player.y - 28, weapons[player.weapon].glow, 28, 3.7, 4);
    addText(player.x, player.y - 69, weapons[player.weapon].special, weapons[player.weapon].color, 11, 58);
  }

  function specialHit() {
    const w = weapons[player.weapon];
    const reach = w.specialRange;
    for (const e of enemies) {
      if (!e.dead && Math.abs(e.x - player.x) < reach && Math.abs(e.y - player.y) < 60) {
        hitEnemy(e, w.specialDamage, 18, w.glow, true);
      }
    }
    if (w.style === 'spear' || w.style === 'crossbow') {
      for (let i = 0; i < 22; i++) particle(player.x + player.face * (i * 10), player.y - 30 + (Math.random() - .5) * 9, w.color, player.face * 2.8, (Math.random() - .5) * 1.5, 24, 3, 0);
    } else if (w.style === 'daggers') {
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        particle(player.x, player.y - 25, w.color, Math.cos(a) * 4, Math.sin(a) * 2.8, 26, 3, 0);
      }
    } else if (w.style === 'axe') {
      for (let i = 0; i < 18; i++) particle(player.x + player.face * (8 + i * 5), FLOOR - 3, '#a7d7ed', player.face * (1 + Math.random() * 2), -Math.random() * 3, 28, 3, .12);
      shake = 17;
    } else {
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        particle(player.x, player.y - 24, w.glow, Math.cos(a) * 3.4, Math.sin(a) * 2.5, 26, 3, .02);
      }
    }
    shake = 13;
  }

  function updatePlayer(dt) {
    const p = player;
    const left = keys.a || keys.arrowleft;
    const right = keys.d || keys.arrowright;
    const moving = left || right;
    p.block = !!(keys.shift && p.onGround && !p.attack);
    if (p.invuln > 0) p.invuln -= dt;
    if (p.hurt > 0) p.hurt -= dt;
    if (p.attackCd > 0) p.attackCd -= dt;
    if (p.dashCd > 0) p.dashCd -= dt;
    if (p.potionCd > 0) p.potionCd -= dt;
    if (p.dash > 0) p.dash -= dt;

    if (pressed('1')) p.weapon = 0;
    if (pressed('2')) p.weapon = 1;
    if (pressed('3')) p.weapon = 2;
    if (pressed('4')) p.weapon = 3;
    if (pressed('5')) p.weapon = 4;
    if (pressed('6')) p.weapon = 5;
    if (pressed('7')) p.weapon = 6;
    if (pressed('8')) p.weapon = 7;
    if (pressed('9')) p.weapon = 8;

    if (pressed('j')) beginAttack('normal');
    if (pressed('k')) beginAttack('heavy');
    if (pressed('u')) doSpecial();
    if (pressed('h')) usePotion();
    if (pressed('l') && p.dashCd <= 0 && p.dash <= 0 && !p.attack) {
      p.dash = 10; p.dashCd = 52; p.invuln = Math.max(p.invuln, 16);
      sound('dash');
      for (let i = 0; i < 6; i++) particle(p.x - p.face * (i * 5), p.y - 19 - Math.random() * 24, '#8bdce9', -p.face * (1 + Math.random()), 0, 14, 3, 0);
    }
    if ((pressed('w') || pressed(' ') || pressed('arrowup')) && p.onGround && !p.block && !p.attack) {
      p.vy = -5.6; p.onGround = false; sound('jump');
      burst(p.x, FLOOR - 3, '#9caebd', 7, 1.1, 2);
    }

    if (p.dash > 0) {
      p.x += p.face * 5.8 * dt;
      if (Math.random() < .8) particle(p.x - p.face * 8, p.y - 21, weapons[p.weapon].color, -p.face * .6, -.1, 12, 3, 0);
    } else {
      const speed = p.block ? 0 : p.attack ? (p.attack.kind === 'heavy' ? .48 : .85) : 1.55;
      if (moving && !p.block) {
        const dir = left ? -1 : 1;
        p.x += dir * speed * dt;
        if (!p.attack) p.face = dir;
        p.walk += dt * (p.attack ? .12 : .21);
      }
    }
    if (p.vy !== 0 || !p.onGround) {
      p.y += p.vy * dt;
      p.vy += .27 * dt;
      if (p.y >= FLOOR) { p.y = FLOOR; p.vy = 0; p.onGround = true; }
    }
    p.x = Math.max(20, Math.min(WORLD_END - 60, p.x));
    if (p.attack) {
      const a = p.attack;
      a.t += dt;
      if (!a.hit && a.t >= a.hitFrame) {
        a.hit = true;
        if (a.kind === 'special') specialHit(); else doAttackHit(a);
      }
      if (a.t >= a.duration) p.attack = null;
    }
    if (!moving && p.onGround) p.walk *= .8;
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.invuln > 0) e.invuln -= dt;
      if (e.hurt > 0) e.hurt -= dt;
      if (e.stun > 0) { e.stun -= dt; e.walk += dt * .08; continue; }
      e.walk += dt * .11;
      const dx = player.x - e.x;
      const dist = Math.abs(dx);
      e.face = dx < 0 ? -1 : 1;
      if (e.type === 'boss') { updateBoss(e, dt, dx, dist); continue; }
      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          if (e.type === 'brute') {
            e.x += e.face * 25;
            if (dist < 66) hurtPlayer(e.damage, e.x, true);
            burst(e.x, FLOOR - 4, '#d9a66a', 10, 2, 3);
          } else if (e.type === 'archer') {
            const aim = Math.atan2((player.y - 25) - (e.y - 37), player.x - e.x);
            projectiles.push({ x: e.x, y: e.y - 37, vx: Math.cos(aim) * 3.1, vy: Math.sin(aim) * 3.1, damage: e.damage, color: '#9fe0dc', size: 3, life: 125 });
          } else if (dist < e.range + 18) hurtPlayer(e.damage, e.x);
        }
        continue;
      }
      if (e.type === 'archer') {
        if (dist < 112) e.x -= e.face * e.speed * 1.2 * dt;
        else if (dist > 240) e.x += e.face * e.speed * dt;
        if (dist < 285 && e.attackCd <= 0) {
          e.windup = 18; e.attackCd = 105;
          addText(e.x, e.y - 58, '!', '#e9c47f', 11, 24);
          setTimeoutSafeFlash(e.x);
        }
      } else {
        const desired = e.type === 'brute' ? 39 : 33;
        if (dist > desired + 6) e.x += e.face * e.speed * dt;
        else if (e.attackCd <= 0) {
          e.windup = e.type === 'brute' ? 32 : 19;
          e.attackCd = e.type === 'brute' ? 102 : 72;
          addText(e.x, e.y - 50, e.type === 'brute' ? '!!' : '!', '#f0c17c', 9, 24);
        }
      }
      if (e.attackCd > 0) e.attackCd -= dt;
      e.x = Math.max(18, Math.min(WORLD_END - 25, e.x));
    }
  }

  function setTimeoutSafeFlash(x) {
    // A small tell marker without a real timer keeps the simulation deterministic.
    particle(x, FLOOR - 48, '#e9c47f', 0, -.15, 17, 2, 0);
  }

  function updateBoss(e, dt, dx, dist) {
    if (e.attackMode === 'idle') {
      if (dist > 112) e.x += e.face * e.speed * dt;
      if (e.attackCd > 0) e.attackCd -= dt;
      if (e.attackCd <= 0) {
        e.attackCycle = (e.attackCycle + 1) % 3;
        e.attackMode = e.attackCycle === 1 ? 'slamTell' : e.attackCycle === 2 ? 'dashTell' : 'burstTell';
        e.modeTimer = e.attackCycle === 1 ? 39 : e.attackCycle === 2 ? 31 : 43;
        addText(e.x, e.y - 90, e.attackCycle === 1 ? 'BREAK!' : e.attackCycle === 2 ? 'CHARGE!' : 'ASHEN RAIN', '#ffc27a', 10, 38);
        sound('boss');
      }
    } else {
      e.modeTimer -= dt;
      if (e.modeTimer <= 0) {
        if (e.attackMode === 'slamTell') {
          e.attackMode = 'idle'; e.attackCd = 72;
          if (dist < 145) hurtPlayer(23, e.x, true);
          shake = 9; burst(e.x, FLOOR - 4, '#efa76a', 28, 3.5, 4);
          for (let i = 0; i < 12; i++) particle(e.x + (Math.random() - .5) * 90, FLOOR - 4, '#e9b46e', (Math.random() - .5) * 3, -Math.random() * 2, 26, 3, .08);
        } else if (e.attackMode === 'dashTell') {
          e.attackMode = 'dash'; e.modeTimer = 22;
          e.dashTarget = player.x;
        } else if (e.attackMode === 'dash') {
          e.attackMode = 'idle'; e.attackCd = 75;
        } else if (e.attackMode === 'burstTell') {
          e.attackMode = 'idle'; e.attackCd = 65;
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            projectiles.push({ x: e.x, y: e.y - 47, vx: Math.cos(a) * 2.15, vy: Math.sin(a) * 1.55, damage: 10, color: '#ee9a62', size: 4, life: 135 });
          }
          burst(e.x, e.y - 45, '#ee9a62', 22, 2.3, 3);
        }
      }
      if (e.attackMode === 'dash') {
        e.x += e.face * 4.5 * dt;
        if (Math.abs(player.x - e.x) < 41 && Math.abs(player.y - e.y) < 34) hurtPlayer(19, e.x, true);
        if (Math.random() < .7) particle(e.x - e.face * 18, FLOOR - 20, '#dc825a', -e.face * 1.4, 0, 13, 3, 0);
      }
    }
    e.phase = e.hp < e.maxHp * .48 ? 1 : 0;
    if (e.phase === 1) e.speed = .58;
    e.x = Math.max(20, Math.min(WORLD_END - 30, e.x));
  }

  function updateProjectiles(dt) {
    for (const p of projectiles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      p.vy += (p.gravity || 0) * dt;
      if (p.fromPlayer) {
        for (const e of enemies) {
          if (e.dead || p.hitEnemies.has(e)) continue;
          const targetY = e.y - (e.type === 'boss' ? 46 : 25);
          if (Math.abs(p.x - e.x) < (e.type === 'boss' ? 23 : 15) && Math.abs(p.y - targetY) < (e.type === 'boss' ? 42 : 20)) {
            hitEnemy(e, p.damage, p.knock || 6, p.color, !!p.heavy);
            p.hitEnemies.add(e);
            if (!p.pierce) { p.dead = true; break; }
          }
        }
      } else if (!p.dead && Math.abs(p.x - player.x) < 15 && Math.abs(p.y - (player.y - 25)) < 17) {
        hurtPlayer(p.damage, p.x, p.size > 5); p.dead = true;
      }
      if (Math.random() < .7) particle(p.x, p.y, p.color, -p.vx * .12, -p.vy * .12, 10, p.fromPlayer ? 2.5 : 2, 0);
    }
    projectiles = projectiles.filter(p => p.life > 0 && !p.dead && p.x > cameraX - 70 && p.x < cameraX + W + 100);
  }

  function updateWorld(dt) {
    clock += dt;
    updatePlayer(dt);
    for (let i = 0; i < waveEvents.length; i++) {
      if (i === waveIndex && player.x > waveEvents[i].at - 210) {
        startWave(waveEvents[i]); waveIndex++;
      }
    }
    if (!bossSpawned && player.x > 2180) {
      bossSpawned = true;
      bossRef = spawnEnemy('boss', 2440, -1);
      addText(2440, 105, 'THE ASHEN WARDEN', '#ffd18b', 13, 100);
      shake = 7; flash = .15; sound('boss');
    }
    updateEnemies(dt);
    updateProjectiles(dt);
    for (const item of pickups) {
      item.life -= dt; item.phase += .07 * dt;
      if (Math.abs(item.x - player.x) < 21 && Math.abs(item.y - (player.y - 12)) < 39 && player.potions < 3) {
        player.potions = Math.min(3, player.potions + item.amount);
        item.dead = true;
        burst(item.x, item.y, '#9df0b5', 16, 2.3, 3);
        addText(item.x, item.y - 23, 'FLASK +1', '#a9f4bd', 9, 42);
        sound('potion');
      }
    }
    pickups = pickups.filter(item => item.life > 0 && !item.dead);
    enemies = enemies.filter(e => !e.dead || e.type === 'boss' && !bossDefeated);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);
    for (const t of texts) { t.y += t.vy * dt; t.life -= dt; }
    texts = texts.filter(t => t.life > 0);
    for (const a of ambient) { a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt; if (a.life <= 0 || a.x < -5 || a.y < 10) Object.assign(a, makeAmbient()); }
    const targetCam = Math.max(0, Math.min(WORLD_END - W, player.x - 170));
    cameraX += (targetCam - cameraX) * Math.min(1, .09 * dt);
    shake *= Math.pow(.82, dt);
    flash = Math.max(0, flash - .025 * dt);
  }

  function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function line(x1, y1, x2, y2, color, width = 1) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#111d31'); sky.addColorStop(.53, '#26364a'); sky.addColorStop(1, '#4c454c');
    rect(0, 0, W, H, '#101b2b'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // Distant stars and an oversized ash moon.
    for (let i = 0; i < 42; i++) {
      const sx = ((i * 83 - cameraX * .08) % (W + 20) + W + 20) % (W + 20);
      const sy = 13 + (i * 37 % 105);
      rect(sx, sy, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1, i % 3 === 0 ? '#e3c99e' : '#8fa4b9');
    }
    ctx.fillStyle = 'rgba(226,198,158,.12)'; ctx.beginPath(); ctx.arc(367 - cameraX * .025, 65, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d6c59f'; ctx.beginPath(); ctx.arc(367 - cameraX * .025, 65, 23, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b3a88f'; ctx.fillRect(352 - cameraX * .025, 57, 7, 5); ctx.fillRect(373 - cameraX * .025, 74, 8, 4); ctx.fillRect(380 - cameraX * .025, 52, 4, 3);
    // Broken mountain silhouettes.
    for (let layer = 0; layer < 3; layer++) {
      const par = .12 + layer * .12; const base = 164 + layer * 12;
      ctx.fillStyle = ['#1c2d40', '#243247', '#303747'][layer];
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = -50; x <= W + 60; x += 24) {
        const wx = x + ((-cameraX * par) % 120);
        const peak = base - (Math.sin((x + layer * 41) * .021) * 13 + Math.cos(x * .047) * 9 + (x * 17 % 13));
        ctx.lineTo(wx, peak);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
    // Ruined skyline in the middle distance.
    const offset = (cameraX * .34) % 180;
    for (let i = -1; i < 5; i++) {
      const x = i * 180 - offset + 20;
      rect(x + 12, 125, 38, 77, '#172638'); rect(x + 7, 120, 48, 7, '#1b2b3e');
      rect(x + 18, 107, 4, 18, '#243449'); rect(x + 14, 102, 12, 5, '#243449');
      rect(x + 63, 145, 26, 58, '#1b293a'); rect(x + 59, 139, 34, 7, '#202f42');
      rect(x + 70, 153, 4, 18, '#d39a69'); rect(x + 72, 153, 1, 17, '#f4bf75');
      rect(x + 110, 132, 20, 70, '#1b2a3e'); rect(x + 106, 125, 28, 8, '#213247');
      rect(x + 116, 116, 8, 10, '#223448');
      // Broken wall crenellations
      for (let j = 0; j < 5; j++) rect(x + 8 + j * 10, 194 - (j % 2) * 5, 8, 15 + (j % 2) * 5, '#1b2b40');
    }
    // Giant broken bridge and foreground silhouettes.
    const fx = -((cameraX * .62) % 320);
    for (let i = -1; i < 3; i++) {
      const x = i * 320 + fx;
      rect(x + 18, 184, 15, 54, '#1a2534'); rect(x + 12, 178, 27, 7, '#253143');
      rect(x + 270, 174, 20, 65, '#182535'); rect(x + 263, 168, 34, 8, '#253143');
      line(x + 32, 183, x + 270, 173, '#29384a', 4);
      rect(x + 92, 206, 2, 14, '#b78159'); rect(x + 210, 199, 2, 18, '#d19a68');
    }
    // Ground plane.
    rect(0, FLOOR + 1, W, H - FLOOR, '#302d34');
    rect(0, FLOOR + 1, W, 6, '#68605a');
    rect(0, FLOOR + 7, W, 2, '#4b4243');
    const tileOffset = -(cameraX % 32);
    for (let x = tileOffset - 32; x < W + 32; x += 32) {
      rect(x, FLOOR + 10, 30, 3, '#39353a');
      rect(x + 5, FLOOR + 20, 16, 2, '#403b3e');
      rect(x + 25, FLOOR + 14, 2, 2, '#9b785e');
      if ((Math.floor((x + cameraX) / 32) % 3) === 0) rect(x + 14, FLOOR + 2, 2, 8, '#756353');
    }
    // Ash cracks / grass tufts.
    for (let i = 0; i < 22; i++) {
      const x = ((i * 67 - cameraX * .95) % (W + 20) + W + 20) % (W + 20);
      const y = FLOOR + 2 + (i % 3);
      if (i % 2 === 0) { line(x, y, x + 4, y - 4, '#6d715f', 1); line(x + 3, y, x + 7, y - 5, '#6d715f', 1); }
      else line(x, y + 5, x + 13, y + 1, '#5d514d', 1);
    }
    // Tiny floating ash motes.
    ctx.globalAlpha = .7;
    for (const a of ambient) { rect(a.x, a.y, a.s, a.s, `rgba(228,190,138,${a.a})`); }
    ctx.globalAlpha = 1;
    // Warm horizon haze.
    const haze = ctx.createLinearGradient(0, 147, 0, 238);
    haze.addColorStop(0, 'rgba(219,139,91,0)'); haze.addColorStop(1, 'rgba(218,140,96,.09)');
    ctx.fillStyle = haze; ctx.fillRect(0, 145, W, 95);
  }

  function drawHero(p, enemy = false) {
    const sx = Math.round(p.x - cameraX), foot = Math.round(p.y);
    if (sx < -60 || sx > W + 60) return;
    const flicker = !enemy && p.invuln > 0 && Math.floor(clock * .9) % 2 === 0;
    if (flicker) return;
    const boss = enemy && p.type === 'boss';
    const brute = enemy && p.type === 'brute';
    const archer = enemy && p.type === 'archer';
    const raider = enemy && p.type === 'raider';
    const face = p.face || 1;
    const walk = Math.sin((p.walk || 0)) * (p.onGround === false ? 0 : 2);
    const attacking = !enemy && p.attack;
    const jumping = !enemy && !p.onGround;
    const hurt = p.hurt > 0;
    const body = boss ? '#573b42' : brute ? '#64503d' : archer ? '#385a60' : raider ? '#604344' : '#243d55';
    const armor = boss ? '#a96751' : brute ? '#b08a58' : archer ? '#83b6ae' : raider ? '#b76a59' : '#75a2b5';
    const bright = boss ? '#e3a06b' : enemy ? '#d8a27c' : '#e6bd88';
    const dark = boss ? '#241e2b' : enemy ? '#252a34' : '#172538';
    const cape = boss ? '#9a4f48' : enemy ? '#834f49' : '#a64848';
    const scale = boss ? 1.85 : brute ? 1.2 : 1;
    ctx.save(); ctx.translate(sx, foot); ctx.scale(face * scale, scale);
    // Ground shadow.
    ctx.globalAlpha = .26; ctx.fillStyle = '#050912'; ctx.beginPath(); ctx.ellipse(0, 0, boss ? 25 : 14, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    // Cape / back cloth in blocky stepped silhouette.
    rect(-10, -45, 13, 26, cape); rect(-13, -37, 5, 17, cape); rect(-9, -20, 10, 7, '#693b43');
    rect(-11, -43, 3, 17, boss ? '#d18461' : '#cf7b5e');
    // Legs and boots, with simple walk cycle.
    const legA = jumping ? -3 : walk, legB = jumping ? 3 : -walk;
    rect(-7 + legA, -17, 6, 12, dark); rect(1 + legB, -17, 6, 12, dark);
    rect(-9 + legA, -7, 9, 5, '#171f2c'); rect(0 + legB, -7, 10, 5, '#171f2c');
    rect(-8 + legA, -12, 7, 3, armor); rect(1 + legB, -12, 7, 3, armor);
    // Torso silhouette and armor plates.
    rect(-9, -42, 19, 25, body); rect(-11, -39, 4, 12, armor); rect(8, -39, 4, 12, armor);
    rect(-7, -41, 15, 5, armor); rect(-6, -34, 13, 10, boss ? '#6e4444' : enemy ? '#435861' : '#41677b');
    rect(-2, -38, 4, 17, bright); rect(-1, -32, 2, 7, '#fff0c7');
    rect(-10, -43, 5, 5, bright); rect(7, -43, 5, 5, armor);
    // Head, hair / helmet, eyes.
    rect(-6, -57, 13, 14, bright); rect(-7, -55, 3, 10, dark); rect(6, -54, 3, 8, dark);
    rect(-7, -60, 15, 6, boss ? '#d58a62' : enemy ? '#372d38' : '#d2a36f');
    rect(-8, -57, 4, 7, boss ? '#934c49' : enemy ? '#67434a' : '#b65c51');
    rect(4, -56, 6, 4, bright); rect(face > 0 ? 3 : -5, -52, 3, 2, '#20232c');
    // Shoulder / pauldron highlights.
    rect(-12, -43, 6, 7, armor); rect(-12, -44, 5, 2, bright);
    // Arms and hand.
    const armRaise = attacking ? -5 : p.block ? -7 : 0;
    rect(7, -38 + armRaise, 5, 13, body); rect(9, -27 + armRaise, 5, 5, bright);
    rect(-12, -38, 5, 12, body); rect(-13, -28, 5, 5, bright);
    // Weapon silhouette, points toward facing direction.
    if (!enemy) {
      const wc = weapons[p.weapon].color;
      if (attacking && p.attack.kind === 'special') {
        rect(11, -40, 5, 26, wc); rect(9, -45, 9, 5, '#fff1cf');
      } else if (p.weapon === 1) {
        rect(11, -32 + armRaise, 3, 29, '#80644d'); rect(12, -58 + armRaise, 2, 29, wc); rect(10, -62 + armRaise, 6, 5, '#e8e1d1');
      } else if (p.weapon === 3) {
        rect(10, -39 + armRaise, 8, 8, '#77624c'); rect(9, -57 + armRaise, 11, 15, wc); rect(11, -62 + armRaise, 7, 5, '#f3e3bd');
      } else if (p.weapon === 4) {
        rect(10, -38 + armRaise, 4, 12, '#80654e'); rect(11, -62 + armRaise, 4, 25, '#9db5c0'); rect(7, -66 + armRaise, 15, 11, wc); rect(7, -66 + armRaise, 4, 11, '#e8f2f5');
      } else if (p.weapon === 5) {
        rect(10, -37 + armRaise, 3, 15, '#79624b'); rect(12, -53 + armRaise, 2, 17, wc); rect(7, -34 + armRaise, 3, 13, '#79624b'); rect(6, -49 + armRaise, 2, 16, wc);
      } else if (p.weapon === 6) {
        rect(9, -37 + armRaise, 12, 4, '#8d755b'); rect(12, -50 + armRaise, 5, 18, wc); rect(8, -54 + armRaise, 13, 3, '#d8edf0'); rect(13, -61 + armRaise, 2, 8, '#d8edf0');
      } else if (p.weapon === 7) {
        rect(12, -64 + armRaise, 3, 47, '#9d7651'); rect(9, -67 + armRaise, 9, 7, wc); rect(11, -70 + armRaise, 5, 4, '#fff0bd');
      } else if (p.weapon === 8) {
        rect(12, -62 + armRaise, 3, 48, '#78618f'); rect(9, -68 + armRaise, 9, 7, '#d8c9fa'); rect(17, -72 + armRaise, 8, 4, wc); rect(21, -78 + armRaise, 7, 5, wc); rect(17, -79 + armRaise, 5, 4, '#f0e8ff'); rect(9, -70 + armRaise, 5, 4, '#f0e8ff');
      } else {
        rect(11, -31 + armRaise, 3, 15, '#896b50'); rect(12, -57 + armRaise, 2, 28, wc); rect(10, -60 + armRaise, 6, 4, '#e4e8e9');
      }
      if (p.block) { rect(9, -45, 8, 19, '#8db9c5'); rect(11, -44, 4, 15, '#d3edf0'); }
    } else {
      if (boss) { rect(10, -43, 6, 20, '#d59b6a'); rect(9, -62, 8, 25, '#eead70'); rect(7, -66, 12, 5, '#f6ce87'); }
      else if (archer) { rect(10, -35, 3, 19, '#9d7851'); rect(9, -48, 5, 17, '#b9a077'); rect(8, -51, 7, 4, '#ead0a1'); }
      else { rect(10, -32, 4, 19, '#79634e'); rect(12, -54, 2, 25, '#d2a77d'); }
    }
    // Boss horns and burning crest.
    if (boss) { rect(-8, -65, 3, -7, '#e6b277'); rect(7, -65, 3, -7, '#e6b277'); rect(-2, -69, 5, 5, '#ffce7a'); }
    ctx.restore();
    // Boss aura / enemy alert accents.
    if (boss && p.attackMode && p.attackMode !== 'idle') {
      ctx.globalAlpha = .22 + Math.sin(clock * .4) * .08; ctx.strokeStyle = '#f0a263'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sx, foot - 29, 29 + Math.sin(clock * .32) * 3, 43, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (enemy && p.windup > 0 && !boss) {
      ctx.fillStyle = '#ffd18a'; ctx.fillRect(sx - 2, foot - 65, 4, 2);
    }
  }

  function drawAttackEffects() {
    if (!player.attack) return;
    const a = player.attack, w = weapons[player.weapon], progress = a.t / a.duration;
    const sx = player.x - cameraX, sy = player.y - 30;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(player.face, 1);
    if (a.kind === 'special') {
      const r = 12 + progress * 90;
      ctx.globalAlpha = Math.max(0, 1 - progress) * .85;
      ctx.strokeStyle = w.glow; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, r, -.85, Math.PI * 1.2); ctx.stroke();
      ctx.strokeStyle = '#fff0cd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r + 7, -.65, Math.PI * 1.3); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (w.projectile) {
      const alpha = Math.sin(Math.min(1, progress) * Math.PI) * .8;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = w.glow; ctx.fillRect(12, -4, a.kind === 'heavy' ? 16 : 10, 3);
      ctx.fillStyle = '#fff2d5'; ctx.fillRect(18, -5, 4, 5);
      ctx.globalAlpha = 1;
    } else {
      const alpha = Math.sin(Math.min(1, progress) * Math.PI) * .9;
      const len = (a.kind === 'heavy' ? 60 : 43) + (player.combo === 2 ? 10 : 0);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = w.glow; ctx.lineWidth = a.kind === 'heavy' ? 8 : 5;
      ctx.beginPath(); ctx.arc(4, -1, len * .65, -.92, .82); ctx.stroke();
      ctx.strokeStyle = '#fff2d5'; ctx.lineWidth = a.kind === 'heavy' ? 2 : 1;
      ctx.beginPath(); ctx.arc(4, -1, len * .65 - 4, -.82, .72); ctx.stroke();
      ctx.globalAlpha = alpha * .45; ctx.fillStyle = w.color;
      ctx.fillRect(14, -13, len * .52, 3); ctx.fillRect(20, 8, len * .32, 2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawPickup(item) {
    const x = item.x - cameraX, y = item.y + Math.sin(item.phase) * 2.3;
    if (x < -15 || x > W + 15) return;
    ctx.globalAlpha = .2 + Math.sin(item.phase * 1.4) * .06;
    ctx.fillStyle = '#79e0a0'; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    rect(x - 4, y - 6, 8, 11, '#376f55'); rect(x - 3, y - 8, 6, 3, '#b9edc6');
    rect(x - 2, y - 4, 4, 7, '#8fe6a8'); rect(x - 1, y - 2, 2, 3, '#e4ffe9');
    rect(x + 4, y - 7, 3, 3, '#d6f7df');
  }

  function drawProjectile(p) {
    const x = p.x - cameraX, y = p.y;
    ctx.globalAlpha = .24; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y, p.size * 2.7, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    rect(x - p.size / 2, y - p.size / 2, p.size, p.size, p.color);
    rect(x - 1, y - 1, 2, 2, '#fff0d3');
  }

  function drawParticles() {
    for (const p of particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      if (p.square) rect(p.x - cameraX, p.y, p.size, p.size, p.color);
      else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x - cameraX, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const t of texts) {
      ctx.globalAlpha = Math.min(1, t.life / 12);
      ctx.fillStyle = 'rgba(6,12,21,.8)'; ctx.fillRect(t.x - cameraX - t.text.length * t.size * .28 - 2, t.y - t.size + 2, t.text.length * t.size * .56 + 4, t.size + 3);
      ctx.fillStyle = t.color; ctx.font = `bold ${t.size}px monospace`; ctx.textAlign = 'center'; ctx.fillText(t.text, t.x - cameraX, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawBossBar() {
    if (!bossSpawned || bossDefeated || !bossRef || bossRef.dead) return;
    const e = bossRef;
    rect(96, 14, 288, 14, 'rgba(5,10,18,.84)');
    rect(98, 16, 284, 10, '#442d35');
    rect(98, 16, 284 * Math.max(0, e.hp / e.maxHp), 10, '#b55e50');
    rect(98, 16, 284 * Math.max(0, e.hp / e.maxHp), 2, '#efb47a');
    ctx.fillStyle = '#f4e0c4'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText('THE ASHEN WARDEN', 240, 11);
    ctx.fillStyle = '#f2c18a'; ctx.textAlign = 'right'; ctx.fillText(`${Math.ceil(Math.max(0, e.hp))} / ${e.maxHp}`, 378, 35);
  }

  function drawHud() {
    // Top-left portrait frame and health.
    rect(9, 9, 131, 38, 'rgba(7,13,23,.84)'); rect(9, 9, 2, 38, '#c99a5b');
    rect(15, 15, 20, 25, '#273c50'); rect(18, 18, 14, 19, '#c58a62'); rect(19, 16, 12, 5, '#d1a36c'); rect(20, 25, 3, 2, '#25303a');
    ctx.fillStyle = '#e9edf1'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left'; ctx.fillText('THE OATHBOUND', 40, 18);
    rect(40, 23, 88, 6, '#3a3036'); rect(40, 23, 88 * (player.hp / player.maxHp), 6, '#be6256'); rect(40, 23, 88 * (player.hp / player.maxHp), 2, '#e99779');
    ctx.fillStyle = '#b9c5d2'; ctx.font = '7px monospace'; ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp} HP`, 40, 37);
    // Resolve meter.
    rect(148, 11, 92, 7, 'rgba(7,13,23,.8)'); rect(150, 13, 88, 3, '#303143');
    rect(150, 13, 88 * (player.meter / 100), 3, '#8a6bd0');
    if (player.meter >= 100) { ctx.globalAlpha = .7 + Math.sin(clock * .3) * .3; rect(147, 10, 94, 9, 'rgba(190,151,242,.13)'); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#b4a7d7'; ctx.font = '6px monospace'; ctx.fillText(player.meter >= 100 ? 'SPECIAL READY  [U]' : 'RESOLVE', 149, 27);
    // Clickable flask counter.
    rect(148, 34, 77, 19, 'rgba(7,13,23,.86)'); rect(150, 36, 14, 15, '#28513f');
    rect(154, 37, 6, 3, '#b9edc6'); rect(153, 40, 8, 9, '#78cf91'); rect(155, 43, 4, 4, '#e4ffe9');
    ctx.fillStyle = player.potions > 0 ? '#b9edc6' : '#738294'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left'; ctx.fillText(`H  x${player.potions}`, 168, 46);
    if (player.potionCd > 0) { ctx.globalAlpha = .35; rect(148, 34, 77, 19, '#07101c'); ctx.globalAlpha = 1; }
    // Weapon readout.
    const w = weapons[player.weapon];
    rect(9, 53, 131, 19, 'rgba(7,13,23,.8)'); rect(13, 57, 10, 10, w.color);
    ctx.fillStyle = '#e4eaf0'; ctx.font = 'bold 8px monospace'; ctx.fillText(w.name, 28, 65);
    ctx.fillStyle = '#9aabc0'; ctx.font = '6px monospace'; ctx.textAlign = 'right'; ctx.fillText('[1–9] / WHEEL', 134, 65);
    // Score / kills.
    ctx.textAlign = 'right'; ctx.fillStyle = '#d0d7e1'; ctx.font = 'bold 8px monospace'; ctx.fillText(`SCORE ${String(score).padStart(6, '0')}`, 468, 16);
    ctx.fillStyle = '#9dacc0'; ctx.font = '7px monospace'; ctx.fillText(`SOULS ${String(kills).padStart(2, '0')}`, 468, 27);
    drawBossBar();
    if (player.dashCd > 0) {
      rect(9, 76, 38, 3, '#282f3d'); rect(9, 76, 38 * (1 - player.dashCd / 52), 3, '#7bcbd4');
      ctx.fillStyle = '#8ba4b5'; ctx.font = '6px monospace'; ctx.textAlign = 'left'; ctx.fillText('DASH', 51, 79);
    }
    // Nine-slot weapon hotbar (also clickable with the mouse).
    const slotW = 18, slotGap = 2, barW = weapons.length * slotW + (weapons.length - 1) * slotGap;
    const barX = Math.round((W - barW) / 2), barY = 248;
    for (let i = 0; i < weapons.length; i++) {
      const x = barX + i * (slotW + slotGap), selected = i === player.weapon;
      rect(x, barY, slotW, 15, selected ? '#493b34' : 'rgba(7,13,23,.82)');
      rect(x, barY, slotW, 2, selected ? weapons[i].color : '#39465a');
      ctx.fillStyle = selected ? '#fff0d2' : '#9aa9bb'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x + slotW / 2, barY + 11);
    }
    if (activeWave > 0 && !bossSpawned && enemies.filter(e => !e.dead).length === 0 && waveIndex < waveEvents.length) {
      ctx.fillStyle = '#b8c2cf'; ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.fillText('GEBIED VEILIG — VOORUIT!', 240, 28);
    }
  }

  function drawOverlay(title, subtitle, lines, accent = '#e9b866') {
    ctx.fillStyle = 'rgba(5,9,17,.76)'; ctx.fillRect(0, 0, W, H);
    // Decorative frame.
    ctx.strokeStyle = 'rgba(224,185,125,.48)'; ctx.lineWidth = 1; ctx.strokeRect(78, 37, 324, 196);
    ctx.strokeStyle = 'rgba(154,183,211,.15)'; ctx.strokeRect(84, 43, 312, 184);
    ctx.fillStyle = accent; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText('✦  THE SHATTERED FRONTIER  ✦', 240, 61);
    ctx.fillStyle = '#f2f1ea'; ctx.font = 'bold 31px Georgia,serif'; ctx.fillText(title, 240, 103);
    ctx.fillStyle = accent; ctx.font = 'bold 8px monospace'; ctx.fillText(subtitle, 240, 121);
    ctx.fillStyle = 'rgba(218,228,239,.9)'; ctx.font = '8px monospace';
    lines.forEach((s, i) => ctx.fillText(s, 240, 151 + i * 14));
    ctx.globalAlpha = .65 + Math.sin(menuPulse * .07) * .35;
    ctx.fillStyle = '#fff0cc'; ctx.font = 'bold 10px monospace'; ctx.fillText('▶  DRUK OP ENTER OF KLIK OM TE SPELEN', 240, 211);
    ctx.globalAlpha = 1;
  }

  function render() {
    const touchControls = $('touchControls');
    if (touchControls) touchControls.style.display = mode === 'playing' ? '' : 'none';
    ctx.save();
    if (shake > .3) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake * .65);
    drawBackground();
    // Subtle environmental lights behind combatants.
    for (const e of enemies) {
      if (e.dead) continue;
      const ex = e.x - cameraX;
      if (e.type === 'boss') {
        ctx.globalAlpha = .12; ctx.fillStyle = '#dc8158'; ctx.beginPath(); ctx.arc(ex, e.y - 30, 49, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    for (const item of pickups) drawPickup(item);
    for (const e of enemies) if (!e.dead) drawHero(e, true);
    drawHero(player, false);
    drawAttackEffects();
    for (const p of projectiles) drawProjectile(p);
    drawParticles();
    if (mode === 'playing') drawHud();
    if (mode === 'title') drawOverlay('ASHEN OATH', 'R I F T B O U N D   /   PIXEL ACTION FIGHTER', ['Acht wapens. Een vervloekt rijk. Geen genade.', 'Klik links voor aanval, rechts voor heavy strike.', 'Verzamel flacons en gebruik H om te genezen.']);
    if (mode === 'paused') drawOverlay('PAUSED', 'DE WERELD WACHT OP JE', ['Druk op P of ENTER om verder te gaan.', 'Gebruik de muis of 1–8 om wapens te wisselen.', 'H gebruikt een genezende flacon.'], '#8bdce9');
    if (mode === 'gameover') drawOverlay('YOU FELL', 'THE ASHEN WARDEN REMAINS', [`Score  ${score}     Souls  ${kills}`, 'Bestudeer hun patronen. Probeer opnieuw.'], '#ec8d75');
    if (mode === 'victory') drawOverlay('OATH KEPT', 'THE WARDEN IS NO MORE', [`Score  ${score}     Souls  ${kills}`, 'De grenslanden zijn vrij... voorlopig.'], '#e8c27f');
    if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = '#fff0d8'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    ctx.restore();
    menuPulse++;
  }

  function pressed(key) {
    const k = key.toLowerCase();
    if (justPressed.has(k)) { justPressed.delete(k); return true; }
    return false;
  }
  function clearPresses() { justPressed.clear(); }

  function frame(now) {
    const dt = Math.min(2.2, (now - (lastTime || now)) / 16.6667 || 1);
    lastTime = now;
    if (mode === 'playing') updateWorld(dt);
    else {
      clock += dt;
      for (const a of ambient) { a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt; if (a.life <= 0 || a.x < -5) Object.assign(a, makeAmbient()); }
      for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.life -= dt; }
      particles = particles.filter(p => p.life > 0);
      for (const t of texts) { t.y += t.vy * dt; t.life -= dt; }
      texts = texts.filter(t => t.life > 0);
      shake *= Math.pow(.82, dt); flash = Math.max(0, flash - .025 * dt);
    }
    render(); clearPresses(); requestAnimationFrame(frame);
  }

  function startOrResume() {
    if (mode === 'title' || mode === 'gameover' || mode === 'victory') resetGame();
    else if (mode === 'paused') { mode = 'playing'; sound('start'); }
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', ' ', 'shift'].includes(k)) e.preventDefault();
    if (!keys[k]) justPressed.add(k);
    keys[k] = true;
    if (k === 'enter' && mode !== 'playing') { startOrResume(); return; }
    if (k === 'p' && (mode === 'playing' || mode === 'paused')) { mode = mode === 'playing' ? 'paused' : 'playing'; return; }
    if (k === 'escape' && mode === 'playing') mode = 'paused';
  }, { passive: false });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; if (mode === 'playing') mode = 'paused'; });
  function canvasPosition(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (mode !== 'playing') { startOrResume(); return; }
    const point = canvasPosition(e);
    // The flask counter and hotbar are actual mouse controls, not just decoration.
    if (point.x >= 145 && point.x <= 229 && point.y >= 32 && point.y <= 55) { usePotion(); return; }
    const slotW = 18, slotGap = 2, barW = weapons.length * slotW + (weapons.length - 1) * slotGap;
    const barX = (W - barW) / 2, barY = 248;
    if (point.y >= barY - 2 && point.y <= barY + 17 && point.x >= barX && point.x <= barX + barW) {
      const slot = Math.floor((point.x - barX) / (slotW + slotGap));
      if (slot >= 0 && slot < weapons.length) player.weapon = slot;
      return;
    }
    if (point.y < 84) return;
    if (point.x < player.x - cameraX) player.face = -1;
    else if (point.x > player.x - cameraX) player.face = 1;
    if (e.button === 0) beginAttack('normal');
    else if (e.button === 2) beginAttack('heavy');
    else if (e.button === 1) doSpecial();
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => {
    if (mode !== 'playing') return;
    e.preventDefault();
    player.weapon = (player.weapon + (e.deltaY > 0 ? 1 : weapons.length - 1)) % weapons.length;
  }, { passive: false });

  document.querySelectorAll('.touch-controls button').forEach((button) => {
    const k = button.dataset.key;
    const down = (e) => { e.preventDefault(); keys[k] = true; };
    const up = (e) => { e.preventDefault(); keys[k] = false; };
    button.addEventListener('pointerdown', (e) => { if (!keys[k]) justPressed.add(k); down(e); });
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('pointerleave', up);
  });

  $('soundButton').addEventListener('click', () => {
    soundOn = !soundOn;
    $('soundButton').innerHTML = soundOn ? '♫ <span>GELUID AAN</span>' : '♫ <span>GELUID UIT</span>';
    if (soundOn) sound('parry');
  });
  $('fullscreenButton').addEventListener('click', async () => {
    const frameEl = $('gameFrame');
    try {
      if (!document.fullscreenElement) await frameEl.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) { /* Fullscreen is optional in restricted browsers. */ }
  });

  player = freshPlayer();
  for (let i = 0; i < 20; i++) ambient.push(makeAmbient(true));
  requestAnimationFrame(frame);
})();
