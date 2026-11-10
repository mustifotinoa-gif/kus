import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Flame,
  Sparkles,
  HelpCircle,
  Play,
  Languages,
  Zap,
  ShoppingBag,
  Heart,
  Coins,
  Check,
  Shield,
  Crosshair,
} from 'lucide-react';

// --- Types & Constants ---
type GameState = 'menu' | 'playing' | 'gameover';
type Language = 'tr' | 'en';
type DifficultyId = 'very_easy' | 'easy' | 'hard' | 'very_hard' | 'impossible';
type Rarity = 'common' | 'basic' | 'rare' | 'epic' | 'legendary';

interface SkinAbility {
  id: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  cooldown: number; // in seconds
  duration: number; // in seconds
  icon: string;
  type: 'shield' | 'flash' | 'bass' | 'slowmo' | 'titan_blast' | 'plasma_laser' | 'g_toilet_flush';
}

interface CharacterSkin {
  id: string;
  nameTr: string;
  nameEn: string;
  rarity: Rarity;
  cost: number;
  descriptionTr: string;
  descriptionEn: string;
  headType: 'classic' | 'camera' | 'speaker' | 'tv' | 'titan_speaker' | 'titan_camera' | 'g_toilet';
  color: string;
  accent: string;
  ability: SkinAbility;
}

interface DifficultyConfig {
  id: DifficultyId;
  nameTr: string;
  nameEn: string;
  hp: number;
  baseSpeed: number;
  pipeInterval: number;
  pipeGap: number;
  hasCannons: boolean;
  cannonChance: number;
  cannonFireRate: number; // seconds
  hasBotBirds: boolean;
  botBirdCount: number;
  color: string;
  borderColor: string;
  badgeTr: string;
  badgeEn: string;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
  hasCannon?: boolean;
  cannonOnTop?: boolean;
  cannonY?: number;
  lastShotTime?: number;
}

interface Cannonball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface GroundTank {
  id: number;
  xOffset: number;
  lastShotTime: number;
  fireCooldown: number;
  recoil: number;
}

interface TankShell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Butterfly {
  id: number;
  xOffset: number;
  hoverHeight: number;
  wingColor: string;
  accentColor: string;
  size: number;
  flutterSpeed: number;
  phase: number;
}

interface BotBird {
  x: number;
  y: number;
  baseY: number;
  vy: number;
  vx: number;
  amplitude: number;
  frequency: number;
  phase: number;
  radius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation?: number;
  vRot?: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  alpha: number;
  vy: number;
  color: string;
  scale: number;
}

interface Flower {
  xOffset: number;
  type: 'tulip' | 'daisy' | 'rose' | 'sunflower';
  color: string;
  size: number;
  stemHeight: number;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const GROUND_HEIGHT = 100;
const GRAVITY = 0.38;
const JUMP_FORCE = -7.5;
const CRATE_PRICE = 50;

// Increased pipe gaps and intervals per request: "boruların arası bir tık artsın"
const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  very_easy: {
    id: 'very_easy',
    nameTr: 'Çok Kolay',
    nameEn: 'Very Easy',
    hp: 10,
    baseSpeed: 1.8,
    pipeInterval: 310,
    pipeGap: 180,
    hasCannons: false,
    cannonChance: 0,
    cannonFireRate: 999,
    hasBotBirds: false,
    botBirdCount: 0,
    color: 'from-emerald-500 to-green-600',
    borderColor: 'border-emerald-500',
    badgeTr: 'Yavaş & Geniş Borular (10 HP)',
    badgeEn: 'Slow & Wide Pipes (10 HP)',
  },
  easy: {
    id: 'easy',
    nameTr: 'Kolay',
    nameEn: 'Easy',
    hp: 7,
    baseSpeed: 2.2,
    pipeInterval: 280,
    pipeGap: 168,
    hasCannons: false,
    cannonChance: 0,
    cannonFireRate: 999,
    hasBotBirds: false,
    botBirdCount: 0,
    color: 'from-teal-500 to-cyan-600',
    borderColor: 'border-teal-500',
    badgeTr: 'Dengeli & Ferah (7 HP)',
    badgeEn: 'Moderate & Fair (7 HP)',
  },
  hard: {
    id: 'hard',
    nameTr: 'Zor',
    nameEn: 'Hard',
    hp: 4,
    baseSpeed: 2.7,
    pipeInterval: 255,
    pipeGap: 156,
    hasCannons: true,
    cannonChance: 0.45,
    cannonFireRate: 2.4,
    hasBotBirds: false,
    botBirdCount: 0,
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500',
    badgeTr: 'Top Atarlar & Hızlı (4 HP)',
    badgeEn: 'Cannons & Fast (4 HP)',
  },
  very_hard: {
    id: 'very_hard',
    nameTr: 'Çok Zor',
    nameEn: 'Very Hard',
    hp: 1,
    baseSpeed: 3.4,
    pipeInterval: 235,
    pipeGap: 148,
    hasCannons: true,
    cannonChance: 0.8,
    cannonFireRate: 1.5,
    hasBotBirds: false,
    botBirdCount: 0,
    color: 'from-rose-600 to-red-700',
    borderColor: 'border-rose-500',
    badgeTr: 'Bayağı Hızlı & Yoğun Topçu (1 HP)',
    badgeEn: 'Blazing Speed & Dense Cannons (1 HP)',
  },
  impossible: {
    id: 'impossible',
    nameTr: 'İmkansız',
    nameEn: 'Impossible',
    hp: 1,
    baseSpeed: 3.8,
    pipeInterval: 220,
    pipeGap: 142,
    hasCannons: true,
    cannonChance: 0.9,
    cannonFireRate: 1.3,
    hasBotBirds: true,
    botBirdCount: 2,
    color: 'from-purple-600 to-indigo-900',
    borderColor: 'border-purple-500',
    badgeTr: '2 Düşman Bot Kuş + Toplar (1 HP)',
    badgeEn: '2 Rogue Bot Birds + Cannons (1 HP)',
  },
};

// Skibidi Toilet & Toilet Tower Defense Inspired Character Skins with Unique Superpowers
const SKINS: CharacterSkin[] = [
  {
    id: 'classic',
    nameTr: 'Klasik Sarı Kuş',
    nameEn: 'Classic Bird',
    rarity: 'common',
    cost: 0,
    descriptionTr: 'Efsanevi orijinal sarı kuş.',
    descriptionEn: 'The legendary original yellow bird.',
    headType: 'classic',
    color: '#facc15',
    accent: '#ea580c',
    ability: {
      id: 'feather_shield',
      nameTr: 'Altın Tüy Kalkanı',
      nameEn: 'Golden Feather Shield',
      descriptionTr: '4 saniye boyunca dokunulmazlık kalkanı sağlar.',
      descriptionEn: 'Grants an impenetrable shield for 4 seconds.',
      cooldown: 12,
      duration: 4,
      icon: '🛡️',
      type: 'shield',
    },
  },
  {
    id: 'cameraman',
    nameTr: 'Kamera Kuş (Cameraman)',
    nameEn: 'Cameraman Bird',
    rarity: 'basic',
    cost: 50,
    descriptionTr: 'TTD İttifakının sadık güvenlik kamerası.',
    descriptionEn: 'Faithful CCTV agent of the Alliance.',
    headType: 'camera',
    color: '#94a3b8',
    accent: '#334155',
    ability: {
      id: 'camera_flash',
      nameTr: 'Güvenlik Flaşı',
      nameEn: 'CCTV Stun Flash',
      descriptionTr: 'Ekrandaki tüm mermileri patlatır ve 3.5 saniye kalkan verir.',
      descriptionEn: 'Detonates all bullets on screen and gives a 3.5s shield.',
      cooldown: 10,
      duration: 3.5,
      icon: '📸',
      type: 'flash',
    },
  },
  {
    id: 'speakerman',
    nameTr: 'Hoparlör Kuş (Speakerman)',
    nameEn: 'Speakerman Bird',
    rarity: 'basic',
    cost: 50,
    descriptionTr: 'Yüksek desibelli ses dalgaları yayar.',
    descriptionEn: 'Pumping out massive bass soundwaves.',
    headType: 'speaker',
    color: '#f97316',
    accent: '#1e293b',
    ability: {
      id: 'bass_shockwave',
      nameTr: 'Mega Bas Dalgası',
      nameEn: 'Mega Bass Shockwave',
      descriptionTr: 'Etrafına 360° ses şok dalgası saçar, mermileri savurur ve coin çeker.',
      descriptionEn: 'Emits a 360° sonic shockwave that repels threats & collects coins.',
      cooldown: 9,
      duration: 3,
      icon: '🔊',
      type: 'bass',
    },
  },
  {
    id: 'tvman',
    nameTr: 'Televizyon Kuş (TV Man)',
    nameEn: 'TV Man Bird',
    rarity: 'rare',
    cost: 100,
    descriptionTr: 'Neon CRT ekranında hipnotik ışık saçar.',
    descriptionEn: 'Hypnotic glow from a classic CRT monitor.',
    headType: 'tv',
    color: '#38bdf8',
    accent: '#0f172a',
    ability: {
      id: 'hypnotic_slowmo',
      nameTr: 'Hipnotik Zaman Yavaşlatma',
      nameEn: 'Hypnotic Slow-Mo',
      descriptionTr: 'Zamanı 4.5 saniye boyunca %65 yavaşlatır! Borulardan geçmek çocuk oyuncağı olur.',
      descriptionEn: 'Slows down time by 65% for 4.5 seconds for effortless navigation.',
      cooldown: 14,
      duration: 4.5,
      icon: '⏳',
      type: 'slowmo',
    },
  },
  {
    id: 'titan_speaker',
    nameTr: 'Titan Hoparlör Kuş',
    nameEn: 'Titan Speakerman Bird',
    rarity: 'epic',
    cost: 200,
    descriptionTr: 'Kırmızı çekirdekli devasa robotik ses savaşçısı.',
    descriptionEn: 'Massive acoustic war machine with red core.',
    headType: 'titan_speaker',
    color: '#ef4444',
    accent: '#7f1d1d',
    ability: {
      id: 'titan_core_blast',
      nameTr: 'Kırmızı Çekirdek Patlaması',
      nameEn: 'Red Core Sound Cannon',
      descriptionTr: 'Önüne yıkıcı ses ışını fırlatır, mermileri yok eder ve 4.5 saniye kalkan açar.',
      descriptionEn: 'Fires forward acoustic blast, destroying cannonballs & granting 4.5s shield.',
      cooldown: 13,
      duration: 4.5,
      icon: '📢',
      type: 'titan_blast',
    },
  },
  {
    id: 'titan_camera',
    nameTr: 'Titan Kamera Kuş',
    nameEn: 'Titan Cameraman Bird',
    rarity: 'legendary',
    cost: 400,
    descriptionTr: 'Efsanevi mavi plazma çekirdekli Titan şampiyon.',
    descriptionEn: 'Legendary blue plasma core titan warrior.',
    headType: 'titan_camera',
    color: '#3b82f6',
    accent: '#1e3a8a',
    ability: {
      id: 'plasma_hammer_shield',
      nameTr: 'Mavi Plazma Çekici & Lazer',
      nameEn: 'Plasma Hammer & Laser',
      descriptionTr: '5.5 saniye kırılmaz plazma zırhı ve ekranı yaran dev mavi plazma ışını.',
      descriptionEn: '5.5s unbreakable blue plasma armor and continuous piercing laser beam.',
      cooldown: 15,
      duration: 5.5,
      icon: '⚡',
      type: 'plasma_laser',
    },
  },
  {
    id: 'g_toilet',
    nameTr: 'G-Tuvalet Kuş (Boss)',
    nameEn: 'G-Toilet Bird (Boss)',
    rarity: 'legendary',
    cost: 500,
    descriptionTr: 'Lazer gözlüklü efsanevi saray tuvaleti.',
    descriptionEn: 'Golden laser-visor flying throne boss.',
    headType: 'g_toilet',
    color: '#eab308',
    accent: '#a16207',
    ability: {
      id: 'skibidi_flush_vortex',
      nameTr: 'Skibidi Sifon Girdabı & G-Lazer',
      nameEn: 'Skibidi Flush Vortex & Lasers',
      descriptionTr: 'Ekrandaki tüm top mermilerini sifonlayıp yok eder, 5.5 saniye altın kalkan ve tüm coinleri çeker!',
      descriptionEn: 'Flushes away all cannonballs in a toilet vortex, 5.5s gold shield & coin magnet!',
      cooldown: 16,
      duration: 5.5,
      icon: '🚽',
      type: 'g_toilet_flush',
    },
  },
];

// Multi-language strings
const TRANSLATIONS = {
  tr: {
    title: 'ZIPLAYAN KUŞ',
    subTitle: 'Skibidi & Tower Defense Sürümü',
    startInstruction: 'Zıplamak için BOŞLUK veya DOKUN',
    score: 'Puan',
    bestScore: 'En Yüksek',
    speed: 'Hız',
    speedBoost: 'HIZ ARTTI!',
    gameOver: 'OYUN BİTTİ',
    newBest: 'YENİ REKOR!',
    restart: 'Yeniden Başlat',
    menu: 'Ana Menü',
    playNow: 'Oyuna Başla',
    selectDifficulty: 'Zorluk Seviyesi Seç',
    market: 'Market & Sandık',
    openCrate: 'Sandık Aç',
    crateCost: '50 Coin',
    coins: 'Coin',
    hp: 'Can',
    equipped: 'Kullanımda',
    equip: 'Kuşu Seç',
    locked: 'Kilitli',
    rarityChances: 'Sandık Şansları: Basic %30, Nadir %20, Epic %10, Efsanevi %1',
    basic: 'Basic (%30)',
    rare: 'Nadir (%20)',
    epic: 'Epic (%10)',
    legendary: 'Efsanevi (%1)',
    common: 'Standart',
    crateOpening: 'Sandık Açılıyor...',
    congratsUnlocked: 'Tebrikler! Yeni Karakter Açıldı:',
    close: 'Kapat',
    sound: 'Ses',
    rulesTitle: 'Oyun Kuralları, Tanklar & Kelebekler',
    rule1: 'Her geçilen boruda +10 Puan ve +5 Coin kazanırsın!',
    rule2: 'Her 50 puanda oyun hızı %10 artar.',
    rule3: 'Çiçeklerin arasında uçuşan rengarenk Kelebekler vardır! 🦋',
    rule4: 'DİKKAT: Çiçeklerin arasındaki Tanklar sana yukarı doğru top mermisi ateşler! 🎯',
    rule5: 'Kuşunun Skibidi Özel Gücünü (E tuşu veya Ekrandaki Buton) kullanarak mermileri yok et ve kalkan aç!',
  },
  en: {
    title: 'FLAPPY BIRD',
    subTitle: 'Skibidi & Tower Defense Edition',
    startInstruction: 'Press SPACE or TAP to Jump',
    score: 'Score',
    bestScore: 'Best Score',
    speed: 'Speed',
    speedBoost: 'SPEED UP!',
    gameOver: 'GAME OVER',
    newBest: 'NEW RECORD!',
    restart: 'Play Again',
    menu: 'Main Menu',
    playNow: 'Start Game',
    selectDifficulty: 'Select Difficulty',
    market: 'Shop & Crates',
    openCrate: 'Open Crate',
    crateCost: '50 Coins',
    coins: 'Coins',
    hp: 'HP',
    equipped: 'Equipped',
    equip: 'Equip',
    locked: 'Locked',
    rarityChances: 'Crate Rates: Basic 30%, Rare 20%, Epic 10%, Legendary 1%',
    basic: 'Basic (30%)',
    rare: 'Rare (20%)',
    epic: 'Epic (10%)',
    legendary: 'Legendary (1%)',
    common: 'Standard',
    crateOpening: 'Summoning Crate...',
    congratsUnlocked: 'Awesome! New Unit Unlocked:',
    close: 'Close',
    sound: 'Sound',
    rulesTitle: 'Rules, Tanks & Butterflies',
    rule1: 'Pass pipes to earn +10 Points and +5 Coins!',
    rule2: 'Speed increases by 10% every 50 points.',
    rule3: 'Colorful butterflies flutter among the flowers! 🦋',
    rule4: 'WARNING: Ground tanks stationed between flowers aim and shoot shells at you! 🎯',
    rule5: 'Use your Skibidi Superpower (Press E or Button) to neutralize shells and shield yourself!',
  },
};

// Web Audio sound synthesizer
class SoundController {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playFlap() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.11);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // failsafe
    }
  }

  playScore() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [659.25, 880.0].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.05;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.005, start + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.17);
      });
    } catch {
      // failsafe
    }
  }

  playCoin() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // failsafe
    }
  }

  playCannonShoot() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } catch {
      // failsafe
    }
  }

  playHit() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
    } catch {
      // failsafe
    }
  }

  playSpeedUp() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        const start = now + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.16);
      });
    } catch {
      // failsafe
    }
  }

  playLegendaryFanfare() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.09;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.28, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.32);
      });
    } catch {
      // failsafe
    }
  }

  playFlushSound() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.6);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.62);
    } catch {
      // failsafe
    }
  }

  playLaserSound() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.33);
    } catch {
      // failsafe
    }
  }

  playBassDrop() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.45);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.46);
    } catch {
      // failsafe
    }
  }
}

const sounds = new SoundController();

export default function App() {
  const [lang, setLang] = useState<Language>('tr');
  const [muted, setMuted] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [gameState, setGameState] = useState<GameState>('menu');

  // Selected Difficulty
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>('very_easy');

  // Coins & Unlocked Skins
  const [coins, setCoins] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('flappy_coins') || 100);
    } catch {
      return 100;
    }
  });

  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('flappy_unlocked_skins');
      return stored ? JSON.parse(stored) : ['classic'];
    } catch {
      return ['classic'];
    }
  });

  const [equippedSkinId, setEquippedSkinId] = useState<string>(() => {
    try {
      return localStorage.getItem('flappy_equipped_skin') || 'classic';
    } catch {
      return 'classic';
    }
  });

  // Summoning Crate Modal
  const [isOpeningCrate, setIsOpeningCrate] = useState(false);
  const [summonedSkin, setSummonedSkin] = useState<CharacterSkin | null>(null);

  // Gameplay State
  const [score, setScore] = useState<number>(0);
  const [currentHp, setCurrentHp] = useState<number>(DIFFICULTIES.very_easy.hp);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('flappy_best_score') || 0);
    } catch {
      return 0;
    }
  });
  const [currentSpeedRatio, setCurrentSpeedRatio] = useState<number>(1.0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Superpower Cooldown & Active State
  const [powerCooldown, setPowerCooldown] = useState<number>(0);
  const [powerActiveTimer, setPowerActiveTimer] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // References for 60FPS Game Loop
  const birdRef = useRef({
    x: 95,
    y: 250,
    radius: 16,
    vy: 0,
    rotation: 0,
    wingAngle: 0,
    invincibleTimer: 0,
  });

  const hpRef = useRef<number>(DIFFICULTIES.very_easy.hp);
  const pipesRef = useRef<Pipe[]>([]);
  const cannonballsRef = useRef<Cannonball[]>([]);
  const tankShellsRef = useRef<TankShell[]>([]);
  const botBirdsRef = useRef<BotBird[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const groundOffsetRef = useRef<number>(0);
  const hillOffsetRef = useRef<number>(0);
  const speedRef = useRef<number>(DIFFICULTIES.very_easy.baseSpeed);
  const scoreRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>('menu');
  const screenShakeRef = useRef<number>(0);
  const speedBoostFlashRef = useRef<number>(0);
  const difficultyRef = useRef<DifficultyConfig>(DIFFICULTIES.very_easy);
  const equippedSkinRef = useRef<CharacterSkin>(SKINS[0]);

  // Power state refs
  const powerCooldownRef = useRef<number>(0);
  const powerActiveTimerRef = useRef<number>(0);
  const laserBeamActiveRef = useRef<boolean>(false);
  const flushVortexEffectRef = useRef<number>(0);
  const bassShockwaveRadiusRef = useRef<number>(0);

  // Sync state with refs
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    difficultyRef.current = DIFFICULTIES[selectedDifficulty];
    hpRef.current = DIFFICULTIES[selectedDifficulty].hp;
    setCurrentHp(DIFFICULTIES[selectedDifficulty].hp);
  }, [selectedDifficulty]);

  useEffect(() => {
    const skin = SKINS.find((s) => s.id === equippedSkinId) || SKINS[0];
    equippedSkinRef.current = skin;
    try {
      localStorage.setItem('flappy_equipped_skin', equippedSkinId);
    } catch {
      // ignore
    }
  }, [equippedSkinId]);

  useEffect(() => {
    try {
      localStorage.setItem('flappy_coins', String(coins));
    } catch {
      // ignore
    }
  }, [coins]);

  useEffect(() => {
    try {
      localStorage.setItem('flappy_unlocked_skins', JSON.stringify(unlockedSkins));
    } catch {
      // ignore
    }
  }, [unlockedSkins]);

  useEffect(() => {
    sounds.muted = muted;
  }, [muted]);

  // Flowers on grass
  const flowersRef = useRef<Flower[]>([
    { xOffset: 20, type: 'tulip', color: '#ef4444', size: 10, stemHeight: 18 },
    { xOffset: 55, type: 'daisy', color: '#ffffff', size: 12, stemHeight: 15 },
    { xOffset: 95, type: 'sunflower', color: '#fbbf24', size: 14, stemHeight: 20 },
    { xOffset: 140, type: 'rose', color: '#ec4899', size: 11, stemHeight: 16 },
    { xOffset: 180, type: 'daisy', color: '#67e8f9', size: 12, stemHeight: 14 },
    { xOffset: 220, type: 'tulip', color: '#f97316', size: 10, stemHeight: 19 },
    { xOffset: 265, type: 'sunflower', color: '#eab308', size: 13, stemHeight: 17 },
    { xOffset: 310, type: 'rose', color: '#a855f7', size: 11, stemHeight: 16 },
    { xOffset: 355, type: 'daisy', color: '#ffffff', size: 12, stemHeight: 15 },
    { xOffset: 390, type: 'tulip', color: '#ef4444', size: 9, stemHeight: 17 },
  ]);

  // Butterflies fluttering among the flowers! ("çiçeklerin arasına kelebek ekle")
  const butterfliesRef = useRef<Butterfly[]>([
    { id: 1, xOffset: 40, hoverHeight: 28, wingColor: '#38bdf8', accentColor: '#0284c7', size: 7, flutterSpeed: 0.02, phase: 0 },
    { id: 2, xOffset: 115, hoverHeight: 34, wingColor: '#fb923c', accentColor: '#ea580c', size: 8, flutterSpeed: 0.024, phase: 1.5 },
    { id: 3, xOffset: 195, hoverHeight: 26, wingColor: '#f472b6', accentColor: '#db2777', size: 7, flutterSpeed: 0.022, phase: 3.1 },
    { id: 4, xOffset: 280, hoverHeight: 38, wingColor: '#facc15', accentColor: '#ca8a04', size: 9, flutterSpeed: 0.025, phase: 4.2 },
    { id: 5, xOffset: 370, hoverHeight: 30, wingColor: '#a78bfa', accentColor: '#7c3aed', size: 8, flutterSpeed: 0.021, phase: 2.3 },
  ]);

  // Ground Tanks stationed among the flowers! ("ayrıca çikçeklerin arasında tank olsun bize ateş etsinler")
  const groundTanksRef = useRef<GroundTank[]>([
    { id: 1, xOffset: 100, lastShotTime: 0, fireCooldown: 3.4, recoil: 0 },
    { id: 2, xOffset: 320, lastShotTime: 0, fireCooldown: 3.8, recoil: 0 },
  ]);

  // Activate Character Skibidi / TTD Superpower
  const triggerSuperpower = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (powerCooldownRef.current > 0) return;

    const currentSkin = equippedSkinRef.current;
    const ability = currentSkin.ability;

    powerActiveTimerRef.current = ability.duration;
    powerCooldownRef.current = ability.cooldown;
    setPowerActiveTimer(ability.duration);
    setPowerCooldown(ability.cooldown);

    switch (ability.type) {
      case 'g_toilet_flush':
        sounds.playFlushSound();
        flushVortexEffectRef.current = 60;
        screenShakeRef.current = 14;
        cannonballsRef.current = [];
        tankShellsRef.current = []; // flush away all ground tank shells!
        botBirdsRef.current.forEach((bot) => {
          bot.x = CANVAS_WIDTH + 80;
        });
        setCoins((c) => c + 15);
        break;

      case 'plasma_laser':
      case 'titan_blast':
        sounds.playLaserSound();
        laserBeamActiveRef.current = true;
        screenShakeRef.current = 12;
        cannonballsRef.current = [];
        tankShellsRef.current = [];
        break;

      case 'bass':
        sounds.playBassDrop();
        bassShockwaveRadiusRef.current = 20;
        cannonballsRef.current = [];
        tankShellsRef.current = [];
        setCoins((c) => c + 5);
        break;

      case 'slowmo':
        sounds.playSpeedUp();
        break;

      case 'flash':
        sounds.playLaserSound();
        cannonballsRef.current = [];
        tankShellsRef.current = [];
        break;

      default:
        sounds.playSpeedUp();
        break;
    }

    floatingTextsRef.current.push({
      id: Date.now(),
      text: ability.nameTr,
      x: CANVAS_WIDTH / 2,
      y: 170,
      alpha: 1.4,
      vy: -1,
      color: currentSkin.color,
      scale: 1.25,
    });
  }, []);

  // Start / Reset Game
  const startPlaying = useCallback(() => {
    const diff = DIFFICULTIES[selectedDifficulty];
    difficultyRef.current = diff;

    birdRef.current = {
      x: 95,
      y: 250,
      radius: 16,
      vy: 0,
      rotation: 0,
      wingAngle: 0,
      invincibleTimer: 0,
    };

    pipesRef.current = [];
    cannonballsRef.current = [];
    tankShellsRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    speedRef.current = diff.baseSpeed;
    scoreRef.current = 0;
    screenShakeRef.current = 0;
    speedBoostFlashRef.current = 0;
    hpRef.current = diff.hp;

    // Reset tank timers
    groundTanksRef.current.forEach((t) => {
      t.lastShotTime = performance.now() + Math.random() * 2000;
      t.recoil = 0;
    });

    powerActiveTimerRef.current = 0;
    powerCooldownRef.current = 0;
    setPowerActiveTimer(0);
    setPowerCooldown(0);

    if (diff.hasBotBirds) {
      botBirdsRef.current = [
        {
          x: CANVAS_WIDTH + 100,
          y: 180,
          baseY: 180,
          vy: 0,
          vx: diff.baseSpeed * 0.9,
          amplitude: 45,
          frequency: 0.04,
          phase: 0,
          radius: 15,
        },
        {
          x: CANVAS_WIDTH + 260,
          y: 330,
          baseY: 330,
          vy: 0,
          vx: diff.baseSpeed * 0.95,
          amplitude: 55,
          frequency: 0.035,
          phase: Math.PI,
          radius: 15,
        },
      ];
    } else {
      botBirdsRef.current = [];
    }

    setScore(0);
    setCurrentHp(diff.hp);
    setCurrentSpeedRatio(1.0);
    setIsNewRecord(false);
    setGameState('playing');
  }, [selectedDifficulty]);

  // Jump trigger
  const handleJump = useCallback(() => {
    if (gameStateRef.current === 'gameover' || gameStateRef.current === 'menu') {
      return;
    }

    birdRef.current.vy = JUMP_FORCE;
    sounds.playFlap();

    const skin = equippedSkinRef.current;
    const puffColor = skin.headType === 'titan_camera' ? '#60a5fa' : skin.color;
    for (let i = 0; i < 4; i++) {
      particlesRef.current.push({
        x: birdRef.current.x - 14,
        y: birdRef.current.y + 4 + (Math.random() * 8 - 4),
        vx: -1.5 - Math.random() * 1.5,
        vy: (Math.random() - 0.5) * 2,
        size: 3 + Math.random() * 3,
        color: puffColor,
        alpha: 0.8,
        decay: 0.04,
      });
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameStateRef.current === 'menu' || gameStateRef.current === 'gameover') {
          startPlaying();
        } else {
          handleJump();
        }
      } else if (e.code === 'KeyE' || e.code === 'KeyQ' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        triggerSuperpower();
      } else if (e.code === 'Enter') {
        if (gameStateRef.current === 'gameover' || gameStateRef.current === 'menu') {
          startPlaying();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (gameStateRef.current !== 'menu') {
          startPlaying();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJump, startPlaying, triggerSuperpower]);

  // Crate Summoning
  const openCrate = () => {
    if (coins < CRATE_PRICE || isOpeningCrate) return;

    setCoins((prev) => prev - CRATE_PRICE);
    setIsOpeningCrate(true);
    setSummonedSkin(null);

    const roll = Math.random() * 100;
    let chosenRarity: Rarity = 'common';

    if (roll < 1) {
      chosenRarity = 'legendary';
    } else if (roll < 1 + 10) {
      chosenRarity = 'epic';
    } else if (roll < 1 + 10 + 20) {
      chosenRarity = 'rare';
    } else if (roll < 1 + 10 + 20 + 30) {
      chosenRarity = 'basic';
    } else {
      chosenRarity = 'common';
    }

    const candidateSkins = SKINS.filter((s) => s.rarity === chosenRarity);
    const wonSkin = candidateSkins[Math.floor(Math.random() * candidateSkins.length)] || SKINS[1];

    setTimeout(() => {
      setIsOpeningCrate(false);
      setSummonedSkin(wonSkin);

      if (wonSkin.rarity === 'legendary') {
        sounds.playLegendaryFanfare();
      } else {
        sounds.playSpeedUp();
      }

      setUnlockedSkins((prev) => {
        if (!prev.includes(wonSkin.id)) {
          return [...prev, wonSkin.id];
        } else {
          setCoins((c) => c + 25);
          return prev;
        }
      });
    }, 1400);
  };

  // Main Canvas Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const spawnPipe = () => {
      const diff = difficultyRef.current;
      const minTopHeight = 60;
      const maxTopHeight = CANVAS_HEIGHT - GROUND_HEIGHT - diff.pipeGap - 60;
      const topHeight = Math.floor(minTopHeight + Math.random() * (maxTopHeight - minTopHeight));
      const bottomY = topHeight + diff.pipeGap;

      const willHaveCannon = diff.hasCannons && Math.random() < diff.cannonChance;
      const cannonOnTop = topHeight < 140 ? true : Math.random() < 0.5;
      const cannonY = cannonOnTop ? topHeight - 20 : bottomY + 20;

      pipesRef.current.push({
        x: CANVAS_WIDTH + 20,
        topHeight,
        bottomY,
        passed: false,
        hasCannon: willHaveCannon,
        cannonOnTop,
        cannonY,
        lastShotTime: performance.now(),
      });
    };

    const triggerDeath = () => {
      sounds.playHit();
      screenShakeRef.current = 16;
      setGameState('gameover');
      gameStateRef.current = 'gameover';

      const colors = ['#fde047', '#eab308', '#f97316', '#ffffff', '#ef4444', '#38bdf8'];
      for (let i = 0; i < 28; i++) {
        const angle = Math.random() * Math.PI * 2;
        const mag = 2 + Math.random() * 6;
        particlesRef.current.push({
          x: birdRef.current.x,
          y: birdRef.current.y,
          vx: Math.cos(angle) * mag,
          vy: Math.sin(angle) * mag - 1,
          size: 4 + Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: 0.02 + Math.random() * 0.02,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.3,
        });
      }

      if (scoreRef.current > bestScore) {
        setBestScore(scoreRef.current);
        setIsNewRecord(true);
        try {
          localStorage.setItem('flappy_best_score', String(scoreRef.current));
        } catch {
          // ignore
        }
      }
    };

    const handleDamage = (amount: number = 1) => {
      if (powerActiveTimerRef.current > 0 || birdRef.current.invincibleTimer > 0) return;

      const newHp = Math.max(0, hpRef.current - amount);
      hpRef.current = newHp;
      setCurrentHp(newHp);
      sounds.playHit();
      screenShakeRef.current = 10;
      birdRef.current.invincibleTimer = 45;

      floatingTextsRef.current.push({
        id: Date.now() + Math.random(),
        text: `-${amount} HP`,
        x: birdRef.current.x,
        y: birdRef.current.y - 18,
        alpha: 1,
        vy: -1.8,
        color: '#ef4444',
        scale: 1.2,
      });

      if (newHp <= 0) {
        triggerDeath();
      }
    };

    // Draw rich ground with grass, blooming flowers, fluttering butterflies & shooting ground tanks!
    const drawGround = (offsetX: number, timestamp: number, birdPos: { x: number; y: number }) => {
      const groundY = CANVAS_HEIGHT - GROUND_HEIGHT;

      // 1. Soil
      const dirtGrad = ctx.createLinearGradient(0, groundY, 0, CANVAS_HEIGHT);
      dirtGrad.addColorStop(0, '#78350f');
      dirtGrad.addColorStop(0.2, '#582307');
      dirtGrad.addColorStop(1, '#381404');
      ctx.fillStyle = dirtGrad;
      ctx.fillRect(0, groundY, CANVAS_WIDTH, GROUND_HEIGHT);

      // Pebbles
      ctx.fillStyle = '#92400e';
      const pebbleSpacing = 40;
      for (let x = -((offsetX * 0.8) % pebbleSpacing); x < CANVAS_WIDTH + pebbleSpacing; x += pebbleSpacing) {
        ctx.beginPath();
        ctx.arc(x + 10, groundY + 45, 3.5, 0, Math.PI * 2);
        ctx.arc(x + 28, groundY + 68, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Grass band
      const grassHeight = 24;
      const grassGrad = ctx.createLinearGradient(0, groundY - 2, 0, groundY + grassHeight);
      grassGrad.addColorStop(0, '#4ade80');
      grassGrad.addColorStop(0.35, '#22c55e');
      grassGrad.addColorStop(1, '#15803d');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, groundY, CANVAS_WIDTH, grassHeight);

      // Blades
      ctx.fillStyle = '#86efac';
      const bladeStep = 12;
      ctx.beginPath();
      for (let x = -(offsetX % bladeStep) - bladeStep; x < CANVAS_WIDTH + bladeStep * 2; x += bladeStep) {
        ctx.moveTo(x, groundY);
        ctx.lineTo(x + bladeStep / 2, groundY - 6);
        ctx.lineTo(x + bladeStep, groundY);
      }
      ctx.closePath();
      ctx.fill();

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, groundY + grassHeight - 2, CANVAS_WIDTH, 3);

      // 3. Blooming Flowers
      const flowerSway = Math.sin(timestamp * 0.004) * 2.5;

      flowersRef.current.forEach((flower, idx) => {
        const flowerX = ((flower.xOffset - offsetX * 0.95) % (CANVAS_WIDTH + 60) + (CANVAS_WIDTH + 60)) % (CANVAS_WIDTH + 60) - 30;
        const stemBaseY = groundY + 4;
        const flowerHeadX = flowerX + flowerSway * (idx % 2 === 0 ? 1 : -1);
        const flowerHeadY = stemBaseY - flower.stemHeight;

        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(flowerX, stemBaseY);
        ctx.quadraticCurveTo(flowerX - flowerSway * 0.5, stemBaseY - flower.stemHeight * 0.5, flowerHeadX, flowerHeadY);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(flowerX + 3, stemBaseY - flower.stemHeight * 0.4, 4, 2, 0.4, 0, Math.PI * 2);
        ctx.fill();

        if (flower.type === 'tulip') {
          ctx.fillStyle = flower.color;
          ctx.beginPath();
          ctx.arc(flowerHeadX, flowerHeadY, flower.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        } else if (flower.type === 'sunflower') {
          ctx.fillStyle = '#f59e0b';
          for (let p = 0; p < 8; p++) {
            const angle = (p * Math.PI * 2) / 8;
            ctx.beginPath();
            ctx.arc(flowerHeadX + Math.cos(angle) * 5, flowerHeadY + Math.sin(angle) * 5, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.arc(flowerHeadX, flowerHeadY, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = flower.color;
          for (let p = 0; p < 5; p++) {
            const angle = (p * Math.PI * 2) / 5;
            ctx.beginPath();
            ctx.arc(flowerHeadX + Math.cos(angle) * 4, flowerHeadY + Math.sin(angle) * 4, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(flowerHeadX, flowerHeadY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 4. Fluttering Butterflies among the flowers! ("çiçeklerin arasına kelebek ekle")
      butterfliesRef.current.forEach((b) => {
        const bX = ((b.xOffset - offsetX * 0.92) % (CANVAS_WIDTH + 80) + (CANVAS_WIDTH + 80)) % (CANVAS_WIDTH + 80) - 40;
        const bY = groundY - 14 - b.hoverHeight + Math.sin(timestamp * 0.005 + b.phase) * 7;
        const wingFlap = Math.abs(Math.sin(timestamp * b.flutterSpeed + b.phase));

        ctx.save();
        ctx.translate(bX, bY);

        // Antennae
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(-3, -8);
        ctx.moveTo(0, -3);
        ctx.lineTo(3, -8);
        ctx.stroke();

        // Left Wing
        ctx.save();
        ctx.scale(wingFlap, 1);
        ctx.fillStyle = b.wingColor;
        ctx.strokeStyle = b.accentColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(-b.size * 0.7, -1, b.size * 0.8, b.size * 0.5, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Left Wing inner pattern
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-b.size * 0.7, -1, b.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Right Wing
        ctx.save();
        ctx.scale(wingFlap, 1);
        ctx.fillStyle = b.wingColor;
        ctx.strokeStyle = b.accentColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(b.size * 0.7, -1, b.size * 0.8, b.size * 0.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right Wing inner pattern
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.size * 0.7, -1, b.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Butterfly Body
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.8, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // 5. Ground Tanks nestled in the meadow & flowers! ("ayrıca çikçeklerin arasında tank olsun bize ateş etsinler")
      groundTanksRef.current.forEach((tank) => {
        const tankX = ((tank.xOffset - offsetX * 0.95) % (CANVAS_WIDTH + 140) + (CANVAS_WIDTH + 140)) % (CANVAS_WIDTH + 140) - 70;
        const tankY = groundY + 2;

        ctx.save();
        ctx.translate(tankX, tankY);

        // Caterpillar Treads (Tracks)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(-18, 4, 36, 12, 5);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Wheels
        ctx.fillStyle = '#64748b';
        for (let w = -12; w <= 12; w += 8) {
          ctx.beginPath();
          ctx.arc(w, 10, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Armored Hull / Chassis
        ctx.fillStyle = '#365314'; // military olive green
        ctx.beginPath();
        ctx.moveTo(-16, 4);
        ctx.lineTo(-12, -4);
        ctx.lineTo(12, -4);
        ctx.lineTo(16, 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Camouflage stripe
        ctx.fillStyle = '#4d7c0f';
        ctx.fillRect(-6, -3, 8, 5);

        // Turret Angle aiming up/towards bird
        const targetAngle = Math.atan2(birdPos.y - (tankY - 6), birdPos.x - tankX);
        // Clamp turret angle between -15 deg and -80 deg so it aims into the sky
        const clampedAngle = Math.min(Math.max(targetAngle, -Math.PI * 0.5), -Math.PI * 0.1);

        ctx.save();
        ctx.translate(0, -6);
        ctx.rotate(clampedAngle);

        // Barrel kickback recoil
        const recoilOffset = tank.recoil > 0 ? -tank.recoil : 0;

        // Long Cannon Barrel
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0 + recoilOffset, -2.5, 20, 5);
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1;
        ctx.strokeRect(0 + recoilOffset, -2.5, 20, 5);

        // Muzzle brake
        ctx.fillStyle = '#374151';
        ctx.fillRect(18 + recoilOffset, -4, 4, 8);

        ctx.restore();

        // Turret Dome
        ctx.fillStyle = '#3f6212';
        ctx.beginPath();
        ctx.arc(0, -6, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Red turret commander hatch light
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, -8, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    };

    // Draw Pipe with Cannon
    const drawPipe = (pipe: Pipe) => {
      const rimHeight = 26;
      const rimOverlap = 5;
      const pipeWidth = 68;

      const createPipeGradient = (x1: number, x2: number) => {
        const grad = ctx.createLinearGradient(x1, 0, x2, 0);
        grad.addColorStop(0, '#15803d');
        grad.addColorStop(0.18, '#22c55e');
        grad.addColorStop(0.42, '#86efac');
        grad.addColorStop(0.7, '#16a34a');
        grad.addColorStop(1, '#14532d');
        return grad;
      };

      // Top pipe
      ctx.fillStyle = createPipeGradient(pipe.x, pipe.x + pipeWidth);
      ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight - rimHeight);
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(pipe.x, -2, pipeWidth, pipe.topHeight - rimHeight + 2);

      // Top flange rim
      const rimX = pipe.x - rimOverlap;
      const rimW = pipeWidth + rimOverlap * 2;
      const topRimY = pipe.topHeight - rimHeight;
      ctx.fillStyle = createPipeGradient(rimX, rimX + rimW);
      ctx.fillRect(rimX, topRimY, rimW, rimHeight);
      ctx.strokeRect(rimX, topRimY, rimW, rimHeight);

      // Bottom pipe
      const bottomBodyY = pipe.bottomY + rimHeight;
      const bottomBodyH = CANVAS_HEIGHT - GROUND_HEIGHT - bottomBodyY;
      ctx.fillStyle = createPipeGradient(pipe.x, pipe.x + pipeWidth);
      ctx.fillRect(pipe.x, bottomBodyY, pipeWidth, bottomBodyH);
      ctx.strokeRect(pipe.x, bottomBodyY, pipeWidth, bottomBodyH + 4);

      // Bottom flange rim
      const bottomRimY = pipe.bottomY;
      ctx.fillStyle = createPipeGradient(rimX, rimX + rimW);
      ctx.fillRect(rimX, bottomRimY, rimW, rimHeight);
      ctx.strokeRect(rimX, bottomRimY, rimW, rimHeight);

      // Top Atar (Cannon on Pipe)
      if (pipe.hasCannon && pipe.cannonY !== undefined) {
        const cX = pipe.x + pipeWidth / 2;
        const cY = pipe.cannonY;

        ctx.save();
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cX, cY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cX - 22, cY - 6, 16, 12);
        ctx.strokeRect(cX - 22, cY - 6, 16, 12);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cX - 24, cY - 5, 3, 10);

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(cX, cY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    // Draw Bird & Superpower Visual FX
    const drawBirdWithPower = (
      x: number,
      y: number,
      rotation: number,
      wingPhase: number,
      skin: CharacterSkin,
      isInvulnerable: boolean,
      isPowerActive: boolean
    ) => {
      ctx.save();
      ctx.translate(x, y);

      // Skibidi Toilet Vortex
      if (flushVortexEffectRef.current > 0) {
        ctx.save();
        const vortexRadius = 35 + (60 - flushVortexEffectRef.current) * 1.5;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, vortexRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, vortexRadius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Bass Shockwave Ring
      if (bassShockwaveRadiusRef.current > 0 && bassShockwaveRadiusRef.current < 180) {
        ctx.save();
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.7)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, bassShockwaveRadiusRef.current, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Piercing Laser Beam
      if (laserBeamActiveRef.current) {
        ctx.save();
        const beamGrad = ctx.createLinearGradient(15, 0, 320, 0);
        beamGrad.addColorStop(0, '#60a5fa');
        beamGrad.addColorStop(0.5, '#3b82f6');
        beamGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');

        ctx.fillStyle = beamGrad;
        ctx.fillRect(15, -6, 320, 12);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(15, -2, 280, 4);

        ctx.fillStyle = '#93c5fd';
        ctx.beginPath();
        ctx.arc(15, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Power Shield Bubble
      if (isPowerActive) {
        ctx.save();
        const shieldPulse = Math.sin(Date.now() * 0.015) * 3;
        const shieldRadius = 26 + shieldPulse;

        ctx.strokeStyle = skin.rarity === 'legendary' ? '#facc15' : '#60a5fa';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = skin.rarity === 'legendary' ? 'rgba(250, 204, 21, 0.25)' : 'rgba(96, 165, 250, 0.22)';
        ctx.fill();
        ctx.restore();
      }

      ctx.rotate(rotation);

      if (isInvulnerable && !isPowerActive && Math.floor(Date.now() / 80) % 2 === 0) {
        ctx.globalAlpha = 0.35;
      }

      // Tail
      ctx.fillStyle = skin.accent;
      ctx.beginPath();
      ctx.moveTo(-14, -2);
      ctx.lineTo(-24, -8);
      ctx.lineTo(-20, 2);
      ctx.lineTo(-24, 8);
      ctx.lineTo(-13, 5);
      ctx.closePath();
      ctx.fill();

      // Body
      ctx.fillStyle = skin.color;
      ctx.strokeStyle = skin.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Belly
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(4, 4, 9, 7, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Head Accessories
      if (skin.headType === 'camera') {
        ctx.fillStyle = '#334155';
        ctx.fillRect(2, -14, 16, 12);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, -14, 16, 12);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(17, -8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(5, -11, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (skin.headType === 'speaker') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(4, -14, 14, 14);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(4, -14, 14, 14);
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(11, -7, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (skin.headType === 'tv') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(3, -15, 17, 15);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(3, -15, 17, 15);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('^o^', 5, -5);
      } else if (skin.headType === 'titan_speaker') {
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(2, -16, 18, 16);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(11, -8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(16, -11, 8, 6);
      } else if (skin.headType === 'titan_camera') {
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(2, -16, 18, 16);
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(11, -8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(11, -8, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (skin.headType === 'g_toilet') {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(-2, -5, 12, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ca8a04';
        ctx.stroke();

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(6, -8, 14, 5);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(7, -5, 6.5, 7.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(9, -5, 3.2, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(8.5, -7, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Beak
      ctx.fillStyle = '#fb923c';
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(11, -2);
      ctx.lineTo(24, 1);
      ctx.lineTo(12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing
      ctx.save();
      ctx.translate(-3, 0);
      ctx.rotate(Math.sin(wingPhase) * 0.45);
      ctx.fillStyle = skin.accent;
      ctx.beginPath();
      ctx.ellipse(-2, 0, 10, 6, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    };

    // Draw Bot Bird
    const drawBotBird = (bot: BotBird, time: number) => {
      ctx.save();
      ctx.translate(bot.x, bot.y);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 19 + Math.sin(time * 0.01) * 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(-4, -22);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-4, -22, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(3, -5, 12, 4);

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(10, -2);
      ctx.lineTo(22, 0);
      ctx.lineTo(11, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    // Background scenery
    const drawBackground = () => {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT - GROUND_HEIGHT);
      skyGrad.addColorStop(0, '#38bdf8');
      skyGrad.addColorStop(0.45, '#7dd3fc');
      skyGrad.addColorStop(0.85, '#bae6fd');
      skyGrad.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT);

      const sunX = CANVAS_WIDTH - 70;
      const sunY = 70;
      ctx.fillStyle = 'rgba(254, 240, 138, 0.8)';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
      ctx.fill();

      const hillBaseY = CANVAS_HEIGHT - GROUND_HEIGHT;
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.moveTo(0, hillBaseY);
      for (let x = 0; x <= CANVAS_WIDTH; x += 20) {
        const hillY = hillBaseY - 50 + Math.sin((x + hillOffsetRef.current * 0.4) * 0.015) * 22;
        ctx.lineTo(x, hillY);
      }
      ctx.lineTo(CANVAS_WIDTH, hillBaseY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.moveTo(0, hillBaseY);
      for (let x = 0; x <= CANVAS_WIDTH; x += 15) {
        const hillY = hillBaseY - 26 + Math.sin((x + hillOffsetRef.current * 0.9) * 0.025) * 14;
        ctx.lineTo(x, hillY);
      }
      ctx.lineTo(CANVAS_WIDTH, hillBaseY);
      ctx.closePath();
      ctx.fill();
    };

    // Main render loop
    const render = (time: number) => {
      const dtRaw = Math.min((time - lastTime) / 16.66, 2.5);
      lastTime = time;

      const dtSec = (dtRaw * 16.66) / 1000;
      if (powerActiveTimerRef.current > 0) {
        powerActiveTimerRef.current = Math.max(0, powerActiveTimerRef.current - dtSec);
        setPowerActiveTimer(powerActiveTimerRef.current);
      }
      if (powerCooldownRef.current > 0) {
        powerCooldownRef.current = Math.max(0, powerCooldownRef.current - dtSec);
        setPowerCooldown(powerCooldownRef.current);
      }

      const isSlowMo = powerActiveTimerRef.current > 0 && equippedSkinRef.current.ability.type === 'slowmo';
      const dt = isSlowMo ? dtRaw * 0.4 : dtRaw;

      if (flushVortexEffectRef.current > 0) {
        flushVortexEffectRef.current -= 1.5 * dtRaw;
      }
      if (bassShockwaveRadiusRef.current > 0) {
        bassShockwaveRadiusRef.current += 6 * dtRaw;
        if (bassShockwaveRadiusRef.current > 200) bassShockwaveRadiusRef.current = 0;
      }
      if (laserBeamActiveRef.current && powerActiveTimerRef.current <= 0) {
        laserBeamActiveRef.current = false;
      }

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Screen shake
      ctx.save();
      if (screenShakeRef.current > 0) {
        const sx = (Math.random() - 0.5) * screenShakeRef.current;
        const sy = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(sx, sy);
        screenShakeRef.current = Math.max(0, screenShakeRef.current - 0.7);
      }

      drawBackground();

      const bird = birdRef.current;
      const diff = difficultyRef.current;
      const skin = equippedSkinRef.current;

      if (bird.invincibleTimer > 0) {
        bird.invincibleTimer -= dt;
      }

      // Menu State
      if (gameStateRef.current === 'menu') {
        bird.y = 250 + Math.sin(time * 0.005) * 8;
        bird.rotation = Math.sin(time * 0.005) * 0.08;
        bird.wingAngle += 0.2 * dt;
        groundOffsetRef.current += 1.8 * dt;
        hillOffsetRef.current += 0.6 * dt;
      }

      // Playing State
      if (gameStateRef.current === 'playing') {
        const currentSpeed = speedRef.current;

        groundOffsetRef.current += currentSpeed * dt;
        hillOffsetRef.current += currentSpeed * 0.4 * dt;

        bird.vy += GRAVITY * dt;
        bird.y += bird.vy * dt;
        bird.wingAngle += 0.25 * dt;

        const targetRot = Math.min(Math.max((bird.vy / 10) * 0.8, -0.45), 1.25);
        bird.rotation += (targetRot - bird.rotation) * 0.18;

        if (bird.y - bird.radius < 0) {
          bird.y = bird.radius;
          bird.vy = 0;
        }

        const groundY = CANVAS_HEIGHT - GROUND_HEIGHT;
        if (bird.y + bird.radius >= groundY) {
          bird.y = groundY - bird.radius;
          triggerDeath();
        }

        // Spawn Pipes
        const pipes = pipesRef.current;
        const lastPipe = pipes[pipes.length - 1];
        if (!lastPipe || CANVAS_WIDTH - lastPipe.x >= diff.pipeInterval) {
          spawnPipe();
        }

        // Update Pipes
        for (let i = pipes.length - 1; i >= 0; i--) {
          const pipe = pipes[i];
          pipe.x -= currentSpeed * dt;

          if (pipe.hasCannon && pipe.cannonY !== undefined) {
            const timeSinceLastShot = (time - (pipe.lastShotTime || 0)) / 1000;
            if (timeSinceLastShot >= diff.cannonFireRate && pipe.x < CANVAS_WIDTH && pipe.x > 80) {
              pipe.lastShotTime = time;
              sounds.playCannonShoot();
              cannonballsRef.current.push({
                x: pipe.x + 10,
                y: pipe.cannonY,
                vx: -3.6 - currentSpeed * 0.4,
                vy: (Math.random() - 0.5) * 0.8,
                radius: 6,
              });
            }
          }

          if (!pipe.passed && pipe.x + 68 < bird.x) {
            pipe.passed = true;
            const newScore = scoreRef.current + 10;
            scoreRef.current = newScore;
            setScore(newScore);
            sounds.playScore();

            setCoins((c) => c + 5);
            sounds.playCoin();

            floatingTextsRef.current.push({
              id: Date.now() + Math.random(),
              text: '+10',
              x: bird.x + 10,
              y: bird.y - 12,
              alpha: 1,
              vy: -1.6,
              color: '#facc15',
              scale: 1.1,
            });

            floatingTextsRef.current.push({
              id: Date.now() + 1 + Math.random(),
              text: '+5 🪙',
              x: bird.x + 24,
              y: bird.y + 4,
              alpha: 1,
              vy: -1.4,
              color: '#fbbf24',
              scale: 1.0,
            });

            if (newScore > 0 && newScore % 50 === 0) {
              const boostCount = Math.floor(newScore / 50);
              const newSpeed = diff.baseSpeed * Math.pow(1.10, boostCount);
              speedRef.current = newSpeed;
              const ratio = Math.pow(1.10, boostCount);
              setCurrentSpeedRatio(ratio);
              sounds.playSpeedUp();
              speedBoostFlashRef.current = 25;

              floatingTextsRef.current.push({
                id: Date.now() + 20,
                text: `${Math.round((ratio - 1) * 100)}% SPEED UP!`,
                x: CANVAS_WIDTH / 2,
                y: 190,
                alpha: 1.2,
                vy: -0.8,
                color: '#ec4899',
                scale: 1.4,
              });
            }
          }

          // Collision check with pipes
          const birdLeft = bird.x - bird.radius + 3;
          const birdRight = bird.x + bird.radius - 3;
          const birdTop = bird.y - bird.radius + 3;
          const birdBottom = bird.y + bird.radius - 3;

          const pipeLeft = pipe.x - 3;
          const pipeRight = pipe.x + 68 + 3;

          const inHorizontal = birdRight > pipeLeft && birdLeft < pipeRight;
          const hitTop = inHorizontal && birdTop < pipe.topHeight;
          const hitBottom = inHorizontal && birdBottom > pipe.bottomY;

          if (hitTop || hitBottom) {
            handleDamage(1);
          }

          if (pipe.x + 80 < -50) {
            pipes.splice(i, 1);
          }
        }

        // Update Pipe Cannonballs
        for (let b = cannonballsRef.current.length - 1; b >= 0; b--) {
          const ball = cannonballsRef.current[b];
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;

          const dist = Math.hypot(ball.x - bird.x, ball.y - bird.y);
          if (dist < ball.radius + bird.radius - 2) {
            handleDamage(1);
            cannonballsRef.current.splice(b, 1);
            continue;
          }

          if (ball.x < -20) {
            cannonballsRef.current.splice(b, 1);
          }
        }

        // Ground Tanks firing logic! ("ayrıca çikçeklerin arasında tank olsun bize ateş etsinler")
        groundTanksRef.current.forEach((tank) => {
          if (tank.recoil > 0) {
            tank.recoil = Math.max(0, tank.recoil - 0.4 * dt);
          }

          const groundY = CANVAS_HEIGHT - GROUND_HEIGHT;
          const tankX = ((tank.xOffset - groundOffsetRef.current * 0.95) % (CANVAS_WIDTH + 140) + (CANVAS_WIDTH + 140)) % (CANVAS_WIDTH + 140) - 70;
          const tankY = groundY + 2;

          // If tank is active on screen and ready to fire:
          if (tankX > 20 && tankX < CANVAS_WIDTH - 20) {
            const timeSinceShot = (time - tank.lastShotTime) / 1000;
            if (timeSinceShot >= tank.fireCooldown) {
              tank.lastShotTime = time;
              tank.recoil = 6;
              sounds.playCannonShoot();

              // Calculate angle towards bird
              const angle = Math.atan2(bird.y - (tankY - 6), bird.x - tankX);
              const clampedAngle = Math.min(Math.max(angle, -Math.PI * 0.5), -Math.PI * 0.1);
              const shellSpeed = 4.2;

              tankShellsRef.current.push({
                x: tankX + Math.cos(clampedAngle) * 22,
                y: tankY - 6 + Math.sin(clampedAngle) * 22,
                vx: Math.cos(clampedAngle) * shellSpeed - currentSpeed * 0.35,
                vy: Math.sin(clampedAngle) * shellSpeed,
                radius: 5,
              });

              // Muzzle flash particles
              for (let p = 0; p < 4; p++) {
                particlesRef.current.push({
                  x: tankX + Math.cos(clampedAngle) * 22,
                  y: tankY - 6 + Math.sin(clampedAngle) * 22,
                  vx: Math.cos(clampedAngle) * 2 + (Math.random() - 0.5),
                  vy: Math.sin(clampedAngle) * 2 + (Math.random() - 0.5),
                  size: 3 + Math.random() * 3,
                  color: '#fbbf24',
                  alpha: 0.9,
                  decay: 0.05,
                });
              }
            }
          }
        });

        // Update Ground Tank Shells
        for (let s = tankShellsRef.current.length - 1; s >= 0; s--) {
          const shell = tankShellsRef.current[s];
          shell.x += shell.vx * dt;
          shell.y += shell.vy * dt;

          // Tiny smoke trail
          if (Math.random() < 0.6) {
            particlesRef.current.push({
              x: shell.x,
              y: shell.y,
              vx: (Math.random() - 0.5) * 0.5,
              vy: (Math.random() - 0.5) * 0.5,
              size: 2.5,
              color: '#f97316',
              alpha: 0.7,
              decay: 0.04,
            });
          }

          // Check hit with bird
          const dist = Math.hypot(shell.x - bird.x, shell.y - bird.y);
          if (dist < shell.radius + bird.radius - 2) {
            handleDamage(1);
            tankShellsRef.current.splice(s, 1);
            continue;
          }

          // Offscreen shell
          if (shell.x < -30 || shell.y < -30 || shell.x > CANVAS_WIDTH + 30 || shell.y > CANVAS_HEIGHT) {
            tankShellsRef.current.splice(s, 1);
          }
        }

        // Update Bot Birds
        if (diff.hasBotBirds) {
          botBirdsRef.current.forEach((bot) => {
            bot.phase += bot.frequency * dt;
            bot.y = bot.baseY + Math.sin(bot.phase) * bot.amplitude;
            bot.x -= (currentSpeed * 0.95 + 0.5) * dt;

            if (bot.x < -40) {
              bot.x = CANVAS_WIDTH + 60 + Math.random() * 120;
              bot.baseY = 120 + Math.random() * 260;
            }

            const dist = Math.hypot(bot.x - bird.x, bot.y - bird.y);
            if (dist < bot.radius + bird.radius) {
              handleDamage(99);
            }
          });
        }
      }

      // Draw Pipes
      pipesRef.current.forEach((pipe) => drawPipe(pipe));

      // Draw Pipe Cannonballs
      cannonballsRef.current.forEach((ball) => {
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ball.x - 1, ball.y - 1, ball.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Ground Tank Shells
      tankShellsRef.current.forEach((shell) => {
        ctx.save();
        // Shell fiery aura
        ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
        ctx.beginPath();
        ctx.arc(shell.x, shell.y, shell.radius + 3, 0, Math.PI * 2);
        ctx.fill();

        // Metallic shell body
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(shell.x, shell.y, shell.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Tip glow
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(shell.x, shell.y, shell.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Bot Birds
      botBirdsRef.current.forEach((bot) => drawBotBird(bot, time));

      // Draw Ground, Flowers, Butterflies & Tanks!
      drawGround(groundOffsetRef.current, time, { x: bird.x, y: bird.y });

      // Draw Bird & Superpower FX
      drawBirdWithPower(
        bird.x,
        bird.y,
        bird.rotation,
        bird.wingAngle,
        skin,
        bird.invincibleTimer > 0,
        powerActiveTimerRef.current > 0
      );

      // Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= p.decay * dt;
        if (p.rotation !== undefined && p.vRot !== undefined) {
          p.rotation += p.vRot * dt;
        }

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Floating Texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y += ft.vy * dt;
        ft.alpha -= 0.018 * dt;

        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.min(1, Math.max(0, ft.alpha));
        ctx.font = `bold ${Math.round(16 * ft.scale)}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(ft.text, ft.x + 2, ft.y + 2);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // Speed boost screen flash
      if (speedBoostFlashRef.current > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(236, 72, 153, ${(speedBoostFlashRef.current / 25) * 0.3})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        speedBoostFlashRef.current -= 0.8 * dt;
        ctx.restore();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [bestScore]);

  const t = TRANSLATIONS[lang];
  const speedPercentage = Math.round((currentSpeedRatio - 1) * 100);
  const activeDiff = DIFFICULTIES[selectedDifficulty];
  const currentSkin = equippedSkinRef.current;
  const ability = currentSkin.ability;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-2 sm:p-4 select-none font-game">
      {/* Top Navigation & Stats Bar */}
      <header className="w-full max-w-[420px] flex items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl mb-2 sm:mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-400 flex items-center justify-center shadow-lg shadow-yellow-500/30 text-slate-950 font-bold text-lg">
            🐤
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wide bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500 bg-clip-text text-transparent leading-none">
              {t.title}
            </h1>
            <span className="text-[10px] text-slate-400 font-medium">
              {t.subTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Coins Badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-sm">
            <Coins className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span>{coins}</span>
          </div>

          {/* Market / Shop Button */}
          <button
            onClick={() => setShowMarket(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 active:scale-95 transition text-xs font-bold border border-purple-400/30 text-white shadow-md shadow-purple-900/30"
            title={t.market}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-purple-200" />
            <span className="hidden sm:inline">{t.market}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition text-xs font-bold border border-slate-700 text-yellow-300"
            title="Dili Değiştir / Change Language"
          >
            <Languages className="w-3.5 h-3.5" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setMuted(!muted)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition text-xs border border-slate-700"
            title={t.sound}
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          {/* Rules / Info */}
          <button
            onClick={() => setShowRules(true)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 transition text-xs border border-slate-700 text-slate-300"
            title={t.rulesTitle}
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
          </button>
        </div>
      </header>

      {/* Main Game Screen Box */}
      <div className="relative w-full max-w-[400px] flex flex-col items-center">
        {/* In-Game HUD: Health Bar, Difficulty, Speed */}
        <div className="w-full flex items-center justify-between px-3 py-1.5 mb-1.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
            <span className="font-arcade text-rose-400 font-bold">
              {currentHp}/{activeDiff.hp} {t.hp}
            </span>
          </div>

          <div className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-bold text-slate-300">
            {lang === 'tr' ? activeDiff.nameTr : activeDiff.nameEn}
          </div>

          <div className="flex items-center gap-1">
            <Zap className={`w-3.5 h-3.5 ${speedPercentage > 0 ? 'text-pink-400 animate-pulse' : 'text-slate-500'}`} />
            <span className={`font-arcade font-bold ${speedPercentage > 0 ? 'text-pink-400' : 'text-slate-400'}`}>
              +{speedPercentage}%
            </span>
          </div>
        </div>

        {/* Canvas Screen */}
        <div
          className="relative rounded-3xl overflow-hidden shadow-2xl shadow-sky-900/40 border-4 border-slate-800 bg-sky-300 w-full aspect-[400/600] touch-none cursor-pointer"
          onClick={() => {
            if (gameState === 'playing') handleJump();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            if (gameState === 'playing') handleJump();
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full block"
          />

          {/* Large In-Game Score Display */}
          {gameState === 'playing' && (
            <div className="absolute top-4 inset-x-0 flex flex-col items-center pointer-events-none">
              <span className="font-arcade text-4xl text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] tracking-wider">
                {score}
              </span>
            </div>
          )}

          {/* In-Game Superpower Action Button */}
          {gameState === 'playing' && (
            <div className="absolute bottom-5 right-5 z-20 pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerSuperpower();
                }}
                disabled={powerCooldown > 0}
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-2xl transition active:scale-95 border-2 cursor-pointer ${
                  powerActiveTimer > 0
                    ? 'bg-amber-500 border-yellow-300 text-slate-950 animate-pulse shadow-yellow-500/50'
                    : powerCooldown <= 0
                    ? 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 border-yellow-400/80 text-white shadow-purple-600/50 hover:scale-105'
                    : 'bg-slate-900/80 border-slate-700 text-slate-500 cursor-not-allowed opacity-85'
                }`}
                title={lang === 'tr' ? ability.nameTr : ability.nameEn}
              >
                <span className="text-xl leading-none">{ability.icon}</span>
                <span className="text-[9px] font-black tracking-tighter uppercase mt-0.5">
                  {powerActiveTimer > 0
                    ? `${powerActiveTimer.toFixed(1)}s`
                    : powerCooldown > 0
                    ? `${Math.ceil(powerCooldown)}s`
                    : 'GÜÇ (E)'}
                </span>
              </button>
            </div>
          )}

          {/* MAIN MENU & DIFFICULTY SELECTION */}
          {gameState === 'menu' && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[3px] flex flex-col justify-between p-4 sm:p-5 text-center select-none overflow-y-auto">
              <div className="pt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 text-xs font-semibold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Skibidi, Tanks & Butterflies
                </div>
                <h2 className="font-arcade text-2xl sm:text-3xl text-yellow-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] tracking-wider">
                  {t.title}
                </h2>
                <p className="text-slate-300 text-xs mt-1">
                  {t.selectDifficulty}
                </p>
              </div>

              {/* Difficulty Selection Cards */}
              <div className="flex flex-col gap-1.5 my-2">
                {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((diffKey) => {
                  const d = DIFFICULTIES[diffKey];
                  const isSelected = selectedDifficulty === diffKey;
                  return (
                    <button
                      key={diffKey}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDifficulty(diffKey);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left transition flex items-center justify-between border cursor-pointer ${
                        isSelected
                          ? `bg-slate-800 ${d.borderColor} border-2 shadow-lg scale-[1.02]`
                          : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${d.color}`} />
                        <div>
                          <div className="font-bold text-xs text-white">
                            {lang === 'tr' ? d.nameTr : d.nameEn}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {lang === 'tr' ? d.badgeTr : d.badgeEn}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-arcade text-[10px] text-rose-400 flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-rose-500" />
                          {d.hp}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Start Button */}
              <div className="pb-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startPlaying();
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 active:scale-95 text-slate-950 font-extrabold text-sm tracking-wider shadow-lg shadow-yellow-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>{t.playNow}</span>
                </button>

                <div className="text-[10px] text-slate-400 mt-2">
                  {t.startInstruction}
                </div>
              </div>
            </div>
          )}

          {/* GAME OVER SCREEN */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-5 text-center select-none animate-in fade-in zoom-in-95 duration-200">
              <div className="w-full max-w-[320px] bg-slate-900/95 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl flex flex-col items-center">
                <h2 className="font-arcade text-2xl text-rose-500 drop-shadow-md tracking-wider mb-3">
                  {t.gameOver}
                </h2>

                <div className="w-full bg-slate-950/80 rounded-2xl p-4 border border-slate-800 mb-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">{t.score}</span>
                    <span className="font-arcade text-2xl text-yellow-400 font-bold">{score}</span>
                  </div>

                  <div className="h-px bg-slate-800 w-full my-0.5" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-slate-400 font-medium">{t.bestScore}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isNewRecord && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">
                          {t.newBest}
                        </span>
                      )}
                      <span className="font-arcade text-base text-amber-300 font-bold">{bestScore}</span>
                    </div>
                  </div>

                  <div className="h-px bg-slate-800 w-full my-0.5" />

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">{t.coins}</span>
                    <span className="font-arcade text-amber-400 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      {coins}
                    </span>
                  </div>
                </div>

                <div className="w-full flex flex-col gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startPlaying();
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 active:scale-95 text-slate-950 font-extrabold text-sm tracking-wide shadow-lg shadow-yellow-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                    <span>{t.restart}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGameState('menu');
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs tracking-wide transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{t.menu}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Shortcuts / Controls */}
        <div className="w-full mt-2 sm:mt-3 flex items-center justify-between px-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-md text-[10px] font-mono text-slate-300">
              SPACE
            </span>
            <span>{lang === 'tr' ? 'Zıpla' : 'Jump'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-purple-900/60 border border-purple-500/50 rounded-md text-[10px] font-mono text-purple-200 font-bold">
              E
            </span>
            <span>{lang === 'tr' ? ability.nameTr : ability.nameEn}</span>
          </div>

          <button
            onClick={() => {
              if (gameState === 'playing') setGameState('menu');
              else startPlaying();
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-amber-300 transition text-[11px]"
          >
            <span>{gameState === 'playing' ? t.menu : t.playNow}</span>
          </button>
        </div>
      </div>

      {/* TOILET TOWER DEFENSE MARKET & CRATE SUMMON MODAL */}
      {showMarket && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-purple-500/40 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-purple-400" />
                <h3 className="font-extrabold text-base text-white tracking-wide">
                  {t.market}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                  <Coins className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{coins}</span>
                </div>
                <button
                  onClick={() => setShowMarket(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 my-3 rounded-2xl bg-gradient-to-r from-purple-900/60 via-indigo-900/50 to-slate-900 border border-purple-500/30 flex flex-col items-center text-center shrink-0">
              <div className="text-3xl mb-1 animate-bounce">📦</div>
              <h4 className="font-bold text-sm text-purple-200">
                Toilet Tower Defense Sandığı
              </h4>
              <p className="text-[11px] text-purple-300/80 mb-2">
                {t.rarityChances}
              </p>

              <button
                disabled={coins < CRATE_PRICE || isOpeningCrate}
                onClick={openCrate}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase shadow-lg transition flex items-center gap-2 ${
                  coins >= CRATE_PRICE && !isOpeningCrate
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:brightness-110 active:scale-95 cursor-pointer shadow-yellow-500/25'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Coins className="w-4 h-4 fill-slate-950" />
                <span>{isOpeningCrate ? t.crateOpening : `${t.openCrate} (${t.crateCost})`}</span>
              </button>
            </div>

            {/* Skins & Powers Collection */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {SKINS.map((skin) => {
                const isUnlocked = unlockedSkins.includes(skin.id);
                const isEquipped = equippedSkinId === skin.id;

                let rarityBadge = 'bg-slate-800 text-slate-400';
                if (skin.rarity === 'basic') rarityBadge = 'bg-blue-500/20 text-blue-300';
                else if (skin.rarity === 'rare') rarityBadge = 'bg-cyan-500/20 text-cyan-300';
                else if (skin.rarity === 'epic') rarityBadge = 'bg-purple-500/20 text-purple-300';
                else if (skin.rarity === 'legendary') rarityBadge = 'bg-amber-500/20 text-amber-300';

                return (
                  <div
                    key={skin.id}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                      isEquipped
                        ? 'bg-slate-800/90 border-yellow-500'
                        : isUnlocked
                        ? 'bg-slate-900/90 border-slate-800'
                        : 'bg-slate-950/60 border-slate-800/50 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xl shadow-md shrink-0 border"
                        style={{ backgroundColor: skin.color, borderColor: skin.accent }}
                      >
                        {skin.headType === 'camera' && '📹'}
                        {skin.headType === 'speaker' && '🔊'}
                        {skin.headType === 'tv' && '📺'}
                        {skin.headType === 'titan_speaker' && '📢'}
                        {skin.headType === 'titan_camera' && '⚡'}
                        {skin.headType === 'g_toilet' && '🚽'}
                        {skin.headType === 'classic' && '🐤'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">
                            {lang === 'tr' ? skin.nameTr : skin.nameEn}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${rarityBadge}`}>
                            {skin.rarity}
                          </span>
                        </div>
                        <div className="text-[10px] text-amber-300/90 font-medium mt-0.5 flex items-center gap-1">
                          <span>{skin.ability.icon}</span>
                          <span>{lang === 'tr' ? skin.ability.nameTr : skin.ability.nameEn}:</span>
                          <span className="text-slate-400">
                            {lang === 'tr' ? skin.ability.descriptionTr : skin.ability.descriptionEn}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isEquipped ? (
                        <span className="px-2.5 py-1 rounded-xl bg-yellow-400 text-slate-950 font-extrabold text-[10px]">
                          {t.equipped}
                        </span>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => setEquippedSkinId(skin.id)}
                          className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] border border-slate-700 cursor-pointer"
                        >
                          {t.equip}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium">
                          🔒 {t.locked}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowMarket(false)}
              className="mt-3 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* SUMMON REVEAL POPUP */}
      {summonedSkin && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-yellow-500 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <Sparkles className="w-8 h-8 text-yellow-400 mb-2 animate-bounce" />
            <h3 className="font-arcade text-lg text-yellow-400 mb-1">
              {t.congratsUnlocked}
            </h3>

            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-4xl shadow-xl my-4 border-2 animate-pulse"
              style={{ backgroundColor: summonedSkin.color, borderColor: summonedSkin.accent }}
            >
              {summonedSkin.headType === 'camera' && '📹'}
              {summonedSkin.headType === 'speaker' && '🔊'}
              {summonedSkin.headType === 'tv' && '📺'}
              {summonedSkin.headType === 'titan_speaker' && '📢'}
              {summonedSkin.headType === 'titan_camera' && '⚡'}
              {summonedSkin.headType === 'g_toilet' && '🚽'}
              {summonedSkin.headType === 'classic' && '🐤'}
            </div>

            <h4 className="font-bold text-base text-white">
              {lang === 'tr' ? summonedSkin.nameTr : summonedSkin.nameEn}
            </h4>
            <span className="text-xs uppercase font-extrabold text-amber-400 mt-1">
              ★ {summonedSkin.rarity} ★
            </span>
            <div className="p-3 my-2 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-amber-300">
              <span className="font-bold">{summonedSkin.ability.icon} {lang === 'tr' ? summonedSkin.ability.nameTr : summonedSkin.ability.nameEn}:</span>{' '}
              <span className="text-slate-300">{lang === 'tr' ? summonedSkin.ability.descriptionTr : summonedSkin.ability.descriptionEn}</span>
            </div>

            <button
              onClick={() => {
                setEquippedSkinId(summonedSkin.id);
                setSummonedSkin(null);
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-yellow-500/30 cursor-pointer"
            >
              {t.equip} & {t.close}
            </button>
          </div>
        </div>
      )}

      {/* RULES & INFO MODAL */}
      {showRules && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-yellow-400" />
                {t.rulesTitle}
              </h3>
              <button
                onClick={() => setShowRules(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                  🪙
                </span>
                <span>{t.rule1}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                  ⚡
                </span>
                <span>{t.rule2}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                  🦋
                </span>
                <span>{t.rule3}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                  🎯
                </span>
                <span>{t.rule4}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
                  ✨
                </span>
                <span>{t.rule5}</span>
              </li>
            </ul>

            <button
              onClick={() => setShowRules(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
