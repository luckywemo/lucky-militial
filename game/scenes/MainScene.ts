import Phaser from 'phaser';
import Peer, { DataConnection } from 'peerjs';
import { CharacterClass, MissionConfig, MPConfig } from '../../App';

export interface WeaponConfig {
  name: string;
  fireRate: number;
  damage: number;
  recoil: number;
  bullets: number;
  spread: number;
  projectileScale: number;
  projectileTint: number;
  maxAmmo: number;
  isInfinite?: boolean;
  key: string;
  icon: string;
  type: 'kinetic' | 'energy' | 'explosive';
  category: 'pistol' | 'rifle' | 'heavy';
  homing?: boolean;
  speed?: number;
}

export const WEAPONS_CONFIG: Record<string, WeaponConfig> = {
  pistol: { name: 'M9 SIDEARM', fireRate: 350, damage: 15, recoil: 150, bullets: 1, spread: 0.02, projectileScale: 0.8, projectileTint: 0xffcc00, maxAmmo: 999, isInfinite: true, key: 'pistol', icon: '🔫', type: 'kinetic', category: 'pistol', speed: 2000 },
  smg: { name: 'MP5 TACTICAL', fireRate: 100, damage: 10, recoil: 80, bullets: 1, spread: 0.12, projectileScale: 0.6, projectileTint: 0xffaa00, maxAmmo: 45, key: 'smg', icon: '⚔️', type: 'kinetic', category: 'rifle', speed: 2200 },
  shotgun: { name: '870 BREACHER', fireRate: 900, damage: 20, recoil: 2200, bullets: 8, spread: 0.9, projectileScale: 0.9, projectileTint: 0xff4444, maxAmmo: 8, key: 'shotgun', icon: '🔥', type: 'kinetic', category: 'heavy', speed: 1800 },
  launcher: { name: 'M32 GL', fireRate: 1500, damage: 80, recoil: 1200, bullets: 1, spread: 0, projectileScale: 2.5, projectileTint: 0xf97316, maxAmmo: 6, key: 'launcher', icon: '🚀', type: 'explosive', category: 'heavy', speed: 1200 },
  railgun: { name: 'XM-25 RAIL', fireRate: 2000, damage: 150, recoil: 1500, bullets: 1, spread: 0, projectileScale: 4.0, projectileTint: 0x00ffff, maxAmmo: 3, key: 'railgun', icon: '⚡', type: 'energy', category: 'heavy', speed: 4000 },
  plasma: { name: 'X-ION REPEATER', fireRate: 200, damage: 30, recoil: 200, bullets: 1, spread: 0.05, projectileScale: 1.8, projectileTint: 0xff00ff, maxAmmo: 20, key: 'plasma', icon: '🔮', type: 'energy', category: 'rifle', speed: 1600 }
};

const teamColors = { alpha: '#f97316', bravo: '#22d3ee' };

export class MainScene extends Phaser.Scene {
  public declare add: Phaser.GameObjects.GameObjectFactory;
  public declare physics: Phaser.Physics.Arcade.ArcadePhysics;
  public declare cameras: Phaser.Cameras.Scene2D.CameraManager;
  public declare time: Phaser.Time.Clock;
  public declare cache: Phaser.Cache.CacheManager;

  public declare make: Phaser.GameObjects.GameObjectCreator;
  public declare tweens: Phaser.Tweens.TweenManager;
  public declare load: Phaser.Loader.LoaderPlugin;

  public player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private playerShadow!: Phaser.GameObjects.Sprite;
  private playerLabel!: Phaser.GameObjects.Text;
  private weaponLabel!: Phaser.GameObjects.Text;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private unitAuras!: Phaser.GameObjects.Graphics;
  private hitMarker!: Phaser.GameObjects.Image;

  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private bullets!: Phaser.Physics.Arcade.Group;
  private aiBots!: Phaser.Physics.Arcade.Group;
  private otherPlayersGroup!: Phaser.Physics.Arcade.Group;
  private luckBoxes!: Phaser.Physics.Arcade.Group;
  private weaponBoxes!: Phaser.Physics.Arcade.Group;
  private weaponItems!: Phaser.Physics.Arcade.Group;
  private hardpointZone!: Phaser.GameObjects.Arc;
  private hardpointCenter = { x: 1000, y: 1000 };

  private peer: Peer | null = null;
  private connections = new Map<string, DataConnection>();
  private otherPlayers = new Map<string, Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>();
  private otherLabels = new Map<string, Phaser.GameObjects.Text>();
  private botLabels = new Map<string, Phaser.GameObjects.Text>();

  private playerName = 'Guest';
  private playerTeam: 'alpha' | 'bravo' = 'alpha';
  private characterClass: CharacterClass = 'STRIKER';
  private currentWeapon: WeaponConfig = WEAPONS_CONFIG.pistol;
  private health = 100;
  private maxHealth = 100;
  private shield = 100;
  private maxShield = 100;
  private lastFired = 0;
  private kills = 0;
  private deaths = 0;
  private lives = 3;
  private maxLives = 3;
  private points = 0;
  private ammo = 0;
  private isRespawning = false;
  private isMissionOver = false;
  private abilityCooldown = 0;
  private mission?: MissionConfig;
  private mpConfig?: MPConfig;
  private roomId: string | null = null;
  private isHost = false;
  private seededRnd!: Phaser.Math.RandomDataGenerator;

  private teamScores = { alpha: 0, bravo: 0 };
  private safeZoneTimer = 0;
  private invulnerabilityTimer = 0;
  private spawnPoint = { x: 1000, y: 1000 };

  public audioEnabled = true;
  public difficultyModifier = 1;
  public virtualInput = { moveX: 0, moveY: 0, aimAngle: null as number | null, isFiring: false, isAbility: false };

  private muzzleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private abilityEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bloodEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bgMusic?: Phaser.Sound.BaseSound;

  constructor() {
    super('MainScene');
  }

  init(data: any) {
    this.playerName = data.playerName;
    this.characterClass = data.characterClass || 'STRIKER';
    this.mission = data.mission;
    this.mpConfig = data.mpConfig;
    this.roomId = data.roomId;
    this.isHost = data.isHost;

    if (data.squad) {
      const myMember = data.squad.find((m: any) => m.name === this.playerName);
      if (myMember) this.playerTeam = myMember.team;
    }

    this.maxHealth = this.characterClass === 'TITAN' ? 200 : this.characterClass === 'GHOST' ? 100 : 150;
    this.health = this.maxHealth;
    this.maxShield = 100;
    this.shield = this.maxShield;
    this.ammo = this.currentWeapon.maxAmmo;
    this.audioEnabled = data.audioEnabled !== undefined ? data.audioEnabled : true;
    this.difficultyModifier = data.difficultyModifier || 1;
    this.teamScores = { alpha: 0, bravo: 0 };
    this.kills = 0;
    this.points = 0;
    this.lives = this.mission ? 3 : 999;
    this.maxLives = this.mission ? 3 : 999;
    this.isMissionOver = false;
  }

  preload() { }

  create() {
    window.dispatchEvent(new CustomEvent('SCENE_READY'));

    // Initialize seeded random for consistent map generation
    this.seededRnd = new Phaser.Math.RandomDataGenerator([this.roomId || 'mission-seed']);

    this.physics.world.setBounds(0, 0, 2000, 2000);
    this.setupTextures();
    this.add.grid(1000, 1000, 2000, 2000, 256, 256, 0x0a0a0a, 1, 0x1a1a1a, 0.5).setDepth(-10);
    this.createArena();

    this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 400 });
    this.aiBots = this.physics.add.group();
    this.otherPlayersGroup = this.physics.add.group({ immovable: true });
    this.luckBoxes = this.physics.add.group();
    this.weaponBoxes = this.physics.add.group();
    this.weaponItems = this.physics.add.group();
    this.unitAuras = this.add.graphics().setDepth(1);

    if (this.mpConfig?.mode === 'HARDPOINT') {
      this.hardpointZone = this.add.circle(1000, 1000, 128, 0xffffff, 0.1).setDepth(-1).setStrokeStyle(2, 0xffffff);
    }

    const initialTex = `hum_${this.characterClass.toLowerCase()}_${this.currentWeapon.category}`;
    this.playerShadow = this.add.sprite(this.spawnPoint.x, this.spawnPoint.y, 'shadow').setAlpha(0.3).setScale(1.5);
    this.player = this.physics.add.sprite(this.spawnPoint.x, this.spawnPoint.y, initialTex);
    this.player.setCollideWorldBounds(true).setDrag(4500).setCircle(22, 10, 10).setDepth(10);
    this.player.setData('team', this.playerTeam);

    const speedMult = this.characterClass === 'GHOST' ? 1.4 : this.characterClass === 'TITAN' ? 0.8 : 1.1;
    this.player.setMaxVelocity(750 * speedMult);

    this.setupUIElements();
    this.setupEmitters();
    this.setupPhysics();
    this.loadAudioAsync();

    // Initialize 5-second safe zone at battle start
    this.safeZoneTimer = 5000;

    if (this.roomId) this.initMultiplayer();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, 2000, 2000);

    if (this.isHost && this.mpConfig) {
      for (let i = 0; i < this.mpConfig.alphaBots; i++) this.spawnAIBot('alpha');
      for (let i = 0; i < this.mpConfig.bravoBots; i++) this.spawnAIBot('bravo');
    } else if (this.mission) {
      const botCount = Math.floor(8 * this.difficultyModifier);
      for (let i = 0; i < botCount; i++) this.spawnAIBot('bravo');
    }

    if (!this.roomId || this.isHost) {
      this.time.addEvent({ delay: 10000, callback: () => this.spawnLuckBox(), loop: true });
      this.time.addEvent({ delay: 15000, callback: () => this.spawnWeaponBox(), loop: true });
    }

    window.addEventListener('weapon_swap', ((e: CustomEvent) => this.swapWeapon(e.detail.key)) as any);
  }

  private loadAudioAsync() {
    if (!this.audioEnabled) return;
    const audioFiles = [
      { key: 'sfx_pistol', path: '/assets/audio/pistol.wav' },
      { key: 'sfx_shotgun', path: '/assets/audio/shotgun.wav' },
      { key: 'sfx_hit_flesh', path: '/assets/audio/squit.wav' },
      { key: 'sfx_powerup', path: '/assets/audio/p-chi.wav' },
      { key: 'sfx_boost', path: '/assets/audio/thrust.mp3' },
      { key: 'sfx_death_human', path: '/assets/audio/alien-death.flac' },
      { key: 'sfx_victory', path: '/assets/audio/level-complete.wav' },
      { key: 'music_loop', path: '/assets/audio/bg-music.wav' },
    ];
    audioFiles.forEach(({ key, path }) => {
      if (!this.cache.audio.exists(key)) this.load.audio(key, path);
    });
    this.load.once('complete', () => this.initAudio());
    this.load.start();
  }

  private initMultiplayer() {
    // Host doesn't create a new peer - Lobby already created one with the same ID
    // Creating a duplicate peer would cause "Peer ID already taken" error
    // Only clients create a peer to connect to the host
    if (!this.isHost) {
      this.peer = new Peer();
      this.peer.on('open', () => {
        if (this.roomId) {
          const conn = this.peer!.connect(`LM-SCTR-${this.roomId}`);
          this.handleConnection(conn);
        }
      });
      this.peer.on('connection', (conn) => this.handleConnection(conn));
    }
    // Host will receive connections through the Lobby peer
    // No peer initialization needed for host in MainScene
  }

  private handleConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      if (this.isHost) {
        const botData = this.aiBots.getChildren().map((bot: any) => ({
          id: bot.getData('id'),
          x: bot.x, y: bot.y, angle: bot.rotation,
          weaponKey: bot.getData('weaponKey'), team: bot.getData('team')
        }));
        const luckData = this.luckBoxes.getChildren().map((b: any) => ({ id: b.getData('id'), x: b.x, y: b.y }));
        const weaponData = this.weaponBoxes.getChildren().map((b: any) => ({ id: b.getData('id'), x: b.x, y: b.y }));
        const itemData = this.weaponItems.getChildren().map((i: any) => ({ id: i.getData('id'), x: i.x, y: i.y, weaponKey: i.getData('weaponKey') }));
        conn.send({ type: 'initial_sync', bots: botData, luckBoxes: luckData, weaponBoxes: weaponData, itemData, scores: this.teamScores });
      }
    });

    conn.on('data', (data: any) => {
      if (data.type === 'sync') this.syncRemotePlayer(conn.peer, data);
      else if (data.type === 'fire') {
        this.spawnBullet(data.x, data.y, data.angle, data.weaponKey, conn.peer, data.team);
        if (this.isHost) this.connections.forEach(c => { if (c.peer !== conn.peer) c.send(data); });
      }
      else if (data.type === 'score_update') this.teamScores = data.scores;
      else if (data.type === 'hp_move') this.moveHardpoint(data.x, data.y);
      else if (data.type === 'spawn_bot') this.createRemoteBot(data);
      else if (data.type === 'spawn_box') this.createRemoteBox(data);
      else if (data.type === 'spawn_item') this.createRemoteItem(data);
      else if (data.type === 'destroy_object') this.destroyRemoteObject(data);
      else if (data.type === 'bot_sync') this.syncBots(data.bots);
      else if (data.type === 'game_over') {
        this.isMissionOver = true;
        this.playSound('sfx_victory', 0.8, false);
        window.dispatchEvent(new CustomEvent('MISSION_COMPLETE', { detail: { winner: data.winner } }));
      }
      else if (data.type === 'initial_sync') {
        this.teamScores = data.scores;
        data.bots.forEach((b: any) => this.createRemoteBot(b));
        data.luckBoxes.forEach((b: any) => this.createRemoteBox({ ...b, boxType: 'luck' }));
        data.weaponBoxes.forEach((b: any) => this.createRemoteBox({ ...b, boxType: 'weapon' }));
        if (data.itemData) data.itemData.forEach((i: any) => this.createRemoteItem(i));
      }
    });

    conn.on('close', () => {
      this.otherPlayers.get(conn.peer)?.destroy();
      this.otherLabels.get(conn.peer)?.destroy();
      this.otherPlayers.delete(conn.peer);
      this.otherLabels.delete(conn.peer);
    });
  }

  private syncRemotePlayer(id: string, data: any) {
    if (this.isHost) {
      this.connections.forEach(c => { if (c.peer !== id) c.send({ ...data, id }); });
    }
    const targetId = data.id || id;
    let p = this.otherPlayers.get(targetId);
    let l = this.otherLabels.get(targetId);
    if (!p) {
      p = this.physics.add.sprite(data.x, data.y, `hum_striker_pistol`);
      p.setDepth(9).setData('team', data.team).setCircle(22, 10, 10);
      this.otherPlayers.set(targetId, p);
      this.otherPlayersGroup.add(p);
      const teamColor = data.team === 'alpha' ? '#f97316' : '#22d3ee';
      const teamPrefix = data.team === 'alpha' ? '[ALPHA] ' : '[BRAVO] ';
      l = this.add.text(data.x, data.y - 60, teamPrefix + data.name, { fontSize: '12px', color: teamColor, fontStyle: 'bold', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(20);
      this.otherLabels.set(targetId, l);
    }
    p.setPosition(data.x, data.y);
    p.setRotation(data.angle);
    p.setTint(data.team === 'alpha' ? 0xf97316 : 0x22d3ee);
    l?.setPosition(data.x, data.y - 60);
  }

  private setupUIElements() {
    const teamColor = this.playerTeam === 'alpha' ? '#f97316' : '#22d3ee';
    const teamPrefix = this.playerTeam === 'alpha' ? '[ALPHA] ' : '[BRAVO] ';
    this.playerLabel = this.add.text(0, 0, teamPrefix + this.playerName, { fontSize: '13px', fontStyle: '800', color: teamColor, fontFamily: 'monospace' }).setOrigin(0.5).setDepth(20);
    this.weaponLabel = this.add.text(0, 0, this.currentWeapon.name, { fontSize: '10px', fontStyle: 'bold', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(20);
    this.playerHpBar = this.add.graphics().setDepth(20);
    this.hitMarker = this.add.image(0, 0, 'hit_marker').setAlpha(0).setScrollFactor(0).setDepth(200).setScale(0.8);
  }

  private initAudio() {
    if (!this.audioEnabled) return;
    if (!this.bgMusic && this.cache.audio.exists('music_loop')) {
      this.bgMusic = this.sound.add('music_loop', { loop: true, volume: 0.1 });
      this.bgMusic.play();
    }
  }

  private playSound(key: string, volume = 0.5, randomizePitch = true) {
    if (!this.audioEnabled || !this.cache.audio.exists(key)) return;
    this.sound.play(key, { volume, detune: randomizePitch ? Phaser.Math.Between(-200, 200) : 0 });
  }

  private setupTextures() {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.4).fillCircle(32, 32, 28).generateTexture('shadow', 64, 64).clear();
    g.lineStyle(2, 0xffffff).lineBetween(0, 0, 15, 15).lineBetween(15, 0, 0, 15).generateTexture('hit_marker', 15, 15).clear();
    g.fillStyle(0xffffff).fillRect(0, 0, 3, 3).generateTexture('spark', 3, 3).clear();
    g.fillStyle(0xff0000).fillCircle(3, 3, 3).generateTexture('blood_drop', 6, 6).clear();

    const drawHumanoid = (key: string, bodyColor: number, visorColor: number, category: string) => {
      const cx = 32, cy = 32;
      g.fillStyle(0x0a0a0a).fillCircle(cx, cy, 24);
      g.fillStyle(0xd4a373).fillCircle(cx, cy, 18);
      g.fillStyle(bodyColor).fillCircle(cx, cy, 19);
      g.fillStyle(0x1a1a1a).fillRect(cx - 10, cy - 6, 20, 16);
      g.fillStyle(0x1c1917).fillCircle(cx, cy - 4, 14);
      g.fillStyle(visorColor).fillRect(cx + 6, cy - 8, 8, 8);
      g.fillStyle(0xd4a373).fillRect(cx + 2, cy + 6, 12, 6);
      g.fillStyle(0x18181b);
      if (category === 'pistol') g.fillRect(cx + 12, cy + 6, 16, 6);
      else if (category === 'rifle') g.fillRect(cx + 4, cy + 6, 32, 8);
      else g.fillRect(cx + 2, cy + 2, 40, 14);
      g.generateTexture(key, 80, 80).clear();
    };

    const classes: CharacterClass[] = ['STRIKER', 'GHOST', 'TITAN'];
    const colors = { STRIKER: 0x3f6212, GHOST: 0x27272a, TITAN: 0x451a03 };
    const visors = { STRIKER: 0xf97316, GHOST: 0x22d3ee, TITAN: 0xef4444 };
    classes.forEach(c => ['pistol', 'rifle', 'heavy'].forEach(cat => drawHumanoid(`hum_${c.toLowerCase()}_${cat}`, colors[c], visors[c], cat)));

    g.fillStyle(0x1c1917).fillRect(0, 0, 64, 64).generateTexture('wall_block', 64, 64).clear();
    g.fillStyle(0xffffff).fillCircle(3, 3, 3).generateTexture('bullet', 8, 8).clear();
    g.fillStyle(0x0a0a0a).fillRoundedRect(0, 0, 48, 48, 6).generateTexture('luck_box', 48, 48).clear();
    g.fillStyle(0x00ffff, 0.8).fillRoundedRect(0, 0, 48, 48, 6).lineStyle(4, 0xffffff).strokeRoundedRect(4, 4, 40, 40, 4).generateTexture('weapon_box', 48, 48).clear();
  }

  private setupEmitters() {
    this.muzzleEmitter = this.add.particles(0, 0, 'spark', { speed: 400, scale: { start: 1.5, end: 0 }, lifespan: 200, emitting: false, blendMode: 'ADD' });
    this.explosionEmitter = this.add.particles(0, 0, 'spark', { speed: { min: 200, max: 600 }, scale: { start: 2, end: 0 }, lifespan: 300, emitting: false, blendMode: 'ADD' });
    this.abilityEmitter = this.add.particles(0, 0, 'bullet', { scale: { start: 0.1, end: 5 }, alpha: { start: 0.6, end: 0 }, lifespan: 600, emitting: false, blendMode: 'ADD' });
    this.bloodEmitter = this.add.particles(0, 0, 'blood_drop', { speed: { min: 50, max: 300 }, scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 800, emitting: false });
  }

  private setupPhysics() {
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.aiBots, this.walls);
    this.physics.add.collider(this.player, this.aiBots);
    this.physics.add.collider(this.player, this.otherPlayersGroup);
    this.physics.add.collider(this.aiBots, this.aiBots);

    this.physics.add.collider(this.bullets, this.walls, (b: any) => {
      this.explosionEmitter.emitParticleAt(b.x, b.y, 4);
      b.setActive(false).setVisible(false).body.stop();
    });

    this.physics.add.overlap(this.bullets, this.weaponBoxes, (bullet: any, box: any) => {
      this.activateWeaponBox(box);
      bullet.setActive(false).setVisible(false).body.stop();
    });

    this.physics.add.overlap(this.bullets, this.luckBoxes, (bullet: any, box: any) => {
      this.collectLuckBox(box);
      bullet.setActive(false).setVisible(false).body.stop();
    });

    this.physics.add.overlap(this.aiBots, this.bullets, (bot: any, b: any) => {
      if (b.getData('team') !== bot.getData('team')) {
        this.applyDamage(bot, b.getData('damage'), b.getData('ownerTeam'));
        b.setActive(false).setVisible(false).body.stop();
      }
    });

    this.physics.add.overlap(this.player, this.bullets, (p: any, b: any) => {
      if (b.getData('team') !== this.playerTeam) {
        this.takeDamage(b.getData('damage'));
        b.setActive(false).setVisible(false).body.stop();
      }
    });

    this.physics.add.overlap(this.player, this.luckBoxes, (p, box: any) => this.collectLuckBox(box));
    this.physics.add.overlap(this.player, this.weaponBoxes, (p, box: any) => this.activateWeaponBox(box));
    this.physics.add.overlap(this.player, this.weaponItems, (p, item: any) => this.collectWeaponItem(item));
  }

  update(time: number, delta: number) {
    if (this.isMissionOver) return;

    if (!this.isRespawning) {
      this.handleInput();
      this.handleCombat(time);
      this.resolveUnitOverlaps();

      if (this.abilityCooldown > 0) this.abilityCooldown -= delta;
      if (this.safeZoneTimer > 0) this.safeZoneTimer -= delta;
      if (this.invulnerabilityTimer > 0) {
        this.invulnerabilityTimer -= delta;
        this.player.setAlpha(Math.sin(time * 0.05) > 0 ? 0.3 : 1.0);
      } else {
        this.player.setAlpha(1.0);
      }

      if (this.roomId && time % 50 < 10) {
        this.connections.forEach(c => c.send({ type: 'sync', x: this.player.x, y: this.player.y, angle: this.player.rotation, name: this.playerName, team: this.playerTeam }));
      }

      if (this.isHost && this.roomId && time % 100 < 10) {
        const botData = this.aiBots.getChildren().map((bot: any) => ({
          id: bot.getData('id'),
          x: bot.x, y: bot.y, angle: bot.rotation,
          weaponKey: bot.getData('weaponKey'), team: bot.getData('team')
        }));
        this.connections.forEach(c => c.send({ type: 'bot_sync', bots: botData }));
      }
    }

    if (this.isHost && this.mpConfig?.mode === 'HARDPOINT') this.updateHardpoint(time);

    this.playerShadow.setPosition(this.player.x + 6, this.player.y + 6);
    if (this.isHost || !this.roomId) this.updateAIBots(time);

    this.updateAuras();
    this.updateHUD();
    this.checkWinCondition();

    this.playerLabel.setPosition(this.player.x, this.player.y - 60);
    this.weaponLabel.setPosition(this.player.x, this.player.y - 75);
    this.drawHealthBar();

    if (this.shield < this.maxShield) this.shield += 0.08 * (delta / 16.6);
  }

  private checkWinCondition() {
    if (this.mission && !this.isMissionOver) {
      if (this.kills >= this.mission.targetKills) {
        this.isMissionOver = true;
        this.player.body.stop();
        this.player.body.enable = false;
        this.playSound('sfx_victory', 0.8, false);
        window.dispatchEvent(new CustomEvent('MISSION_COMPLETE', { detail: { kills: this.kills, points: this.points } }));
      }
    }

    if (this.mpConfig && this.isHost && !this.isMissionOver) {
      if (this.teamScores.alpha >= this.mpConfig.scoreLimit || this.teamScores.bravo >= this.mpConfig.scoreLimit) {
        this.isMissionOver = true;
        const winner = this.teamScores.alpha >= this.mpConfig.scoreLimit ? 'ALPHA' : 'BRAVO';
        this.playSound('sfx_victory', 0.8, false);
        if (this.roomId) this.connections.forEach(c => c.send({ type: 'game_over', winner }));
        window.dispatchEvent(new CustomEvent('MISSION_COMPLETE', { detail: { winner, alpha: this.teamScores.alpha, bravo: this.teamScores.bravo } }));
      }
    }
  }

  private resolveUnitOverlaps() {
    const units = [this.player, ...this.aiBots.getChildren(), ...this.otherPlayers.values()];
    const minDist = 44;
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const u1 = units[i] as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        const u2 = units[j] as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        if (!u1.active || !u2.active || !u1.body || !u2.body) continue;
        const dx = u2.x - u1.x;
        const dy = u2.y - u1.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < minDist * minDist) {
          const distance = Math.sqrt(distanceSq);
          const overlap = minDist - distance;
          const pushX = (dx / (distance || 1)) * (overlap * 0.5);
          const pushY = (dy / (distance || 1)) * (overlap * 0.5);
          u1.x -= pushX; u1.y -= pushY; u2.x += pushX; u2.y += pushY;
        }
      }
    }
  }

  private handleInput() {
    const { moveX, moveY, aimAngle, isAbility } = this.virtualInput;
    const speed = this.characterClass === 'GHOST' ? 450 : this.characterClass === 'TITAN' ? 300 : 380;
    if (moveX !== 0 || moveY !== 0) {
      this.player.setVelocity(moveX * speed, moveY * speed);
      if (aimAngle === null) this.player.rotation = Math.atan2(moveY, moveX);
    } else {
      this.player.setVelocity(0, 0);
    }
    if (aimAngle !== null) this.player.rotation = aimAngle;
    if (isAbility && this.abilityCooldown <= 0) this.triggerAbility();
  }

  private triggerAbility() {
    this.abilityCooldown = 6000;
    this.abilityEmitter.emitParticleAt(this.player.x, this.player.y, 1);
    this.cameras.main.shake(200, 0.015);
    this.playSound('sfx_boost', 0.5);
    const angle = this.player.rotation;
    this.physics.velocityFromRotation(angle, 1500, this.player.body.velocity);
  }

  private handleCombat(time: number) {
    if (this.virtualInput.isFiring && time > this.lastFired) {
      if (this.ammo <= 0 && !this.currentWeapon.isInfinite) {
        this.swapWeapon('pistol');
        this.showFloatingText(this.player.x, this.player.y - 100, "AMMO_DEPLETED: CYCLING_FALLBACK", "#ff0000");
        return;
      }
      const angle = this.virtualInput.aimAngle !== null ? this.virtualInput.aimAngle : this.player.rotation;
      this.muzzleEmitter.emitParticleAt(this.player.x + Math.cos(angle) * 45, this.player.y + Math.sin(angle) * 45, 8);
      for (let i = 0; i < this.currentWeapon.bullets; i++) {
        const spread = (Math.random() - 0.5) * this.currentWeapon.spread;
        this.spawnBullet(this.player.x, this.player.y, angle + spread, this.currentWeapon.key, 'player', this.playerTeam);
      }
      const recoilForce = this.currentWeapon.recoil;
      if (recoilForce > 0) {
        const recoilAngle = angle + Math.PI;
        this.physics.velocityFromRotation(recoilAngle, recoilForce * 0.45, this.player.body.velocity);
      }
      if (this.roomId) this.connections.forEach(c => c.send({ type: 'fire', x: this.player.x, y: this.player.y, angle, weaponKey: this.currentWeapon.key, team: this.playerTeam }));
      this.playSound(this.currentWeapon.category === 'pistol' ? 'sfx_pistol' : 'sfx_shotgun', 0.4);
      this.lastFired = time + this.currentWeapon.fireRate;
      if (!this.currentWeapon.isInfinite) {
        this.ammo--;
        if (this.ammo <= 0 && this.currentWeapon.key !== 'pistol') this.time.delayedCall(100, () => this.swapWeapon('pistol'));
      }
      this.cameras.main.shake(100, 0.004 * (recoilForce / 1000));
    }
  }

  private spawnBullet(x: number, y: number, angle: number, weaponKey: string, owner: string, team: 'alpha' | 'bravo') {
    const config = WEAPONS_CONFIG[weaponKey] || WEAPONS_CONFIG.pistol;
    const b = this.bullets.get(x, y);
    if (b) {
      b.setActive(true).setVisible(true).enableBody(true, x, y, true, true);
      b.setTint(team === 'alpha' ? 0xf97316 : 0x22d3ee).setScale(config.projectileScale * 1.5);
      b.setData('owner', owner).setData('team', team).setData('damage', config.damage).setData('ownerTeam', team);
      this.physics.velocityFromRotation(angle, config.speed || 1500, b.body.velocity);
      b.rotation = angle;
    }
  }

  private spawnAIBot(team: 'alpha' | 'bravo', id?: string) {
    if (this.isMissionOver) return;
    const botId = id || `bot_${team}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const x = this.isHost ? Phaser.Math.Between(100, 1900) : 0;
    const y = this.isHost ? Phaser.Math.Between(100, 1900) : 0;
    const bot = this.aiBots.create(x, y, 'hum_striker_pistol');
    const baseHp = 100 * this.difficultyModifier;
    const botName = `UNIT_${botId.split('_').pop()}`;

    bot.setTint(team === 'alpha' ? 0xf97316 : 0x22d3ee).setDepth(10)
      .setData('id', botId)
      .setData('name', botName)
      .setData('maxHp', baseHp)
      .setData('hp', baseHp)
      .setData('team', team)
      .setData('lastShot', 0)
      .setData('weaponKey', 'pistol')
      .setData('currentTarget', null)
      .setData('targetAcquiredTime', 0)
      .setData('reactionDelay', Phaser.Math.Between(300, 800) / this.difficultyModifier);
    bot.body.setCircle(22, 10, 10);

    const teamColor = team === 'alpha' ? 0xf97316 : 0x22d3ee;
    const teamPrefix = team === 'alpha' ? '[ALPHA] ' : '[BRAVO] ';
    const label = this.add.text(x, y - 50, teamPrefix + botName, { fontSize: '10px', color: '#' + teamColor.toString(16), fontStyle: 'bold', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(20);
    this.botLabels.set(botId, label);

    if (this.isHost && this.roomId) this.connections.forEach(c => c.send({ type: 'spawn_bot', id: botId, team, x, y, name: botName }));
  }

  private createRemoteBot(data: any) {
    if (this.aiBots.getChildren().find((b: any) => b.getData('id') === data.id)) return;
    const bot = this.aiBots.create(data.x, data.y, 'hum_striker_pistol');
    const botName = data.name || `UNIT_${data.id.split('_').pop()}`;
    const baseHp = 100 * this.difficultyModifier;

    bot.setTint(data.team === 'alpha' ? 0xf97316 : 0x22d3ee).setDepth(10)
      .setData('id', data.id)
      .setData('team', data.team)
      .setData('name', botName)
      .setData('maxHp', baseHp)
      .setData('hp', baseHp)
      .setData('lastShot', 0)
      .setData('weaponKey', 'pistol')
      .setData('currentTarget', null)
      .setData('targetAcquiredTime', 0)
      .setData('reactionDelay', Phaser.Math.Between(300, 800) / this.difficultyModifier);
    bot.body.setCircle(22, 10, 10);

    const teamColor = data.team === 'alpha' ? 0xf97316 : 0x22d3ee;
    const teamPrefix = data.team === 'alpha' ? '[ALPHA] ' : '[BRAVO] ';
    const label = this.add.text(data.x, data.y - 50, teamPrefix + botName, { fontSize: '10px', color: '#' + teamColor.toString(16), fontStyle: 'bold', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(20);
    this.botLabels.set(data.id, label);
  }

  private syncBots(botData: any[]) {
    botData.forEach(data => {
      const bot = this.aiBots.getChildren().find((b: any) => b.getData('id') === data.id) as any;
      if (bot) {
        bot.setPosition(data.x, data.y);
        bot.rotation = data.angle;
        if (bot.getData('weaponKey') !== data.weaponKey) {
          bot.setData('weaponKey', data.weaponKey);
          bot.setTexture(`hum_striker_${WEAPONS_CONFIG[data.weaponKey].category}`);
        }
      } else {
        this.createRemoteBot(data);
      }
    });
  }

  private hasLineOfSight(fromX: number, fromY: number, toX: number, toY: number): boolean {
    // Create a line from bot to target
    const ray = new Phaser.Geom.Line(fromX, fromY, toX, toY);
    const walls = this.walls.getChildren();

    // Check if ray intersects any wall
    for (const wall of walls) {
      const wallSprite = wall as Phaser.Physics.Arcade.Sprite;
      const wallBounds = wallSprite.getBounds();
      if (Phaser.Geom.Intersects.LineToRectangle(ray, wallBounds)) {
        return false; // Wall blocks line of sight
      }
    }
    return true; // Clear line of sight
  }


  private updateAIBots(time: number) {
    if (!this.isHost) return;
    if (this.isMissionOver) { this.aiBots.getChildren().forEach((bot: any) => bot.body.stop()); return; }

    this.aiBots.getChildren().forEach((bot: any) => {
      const team = bot.getData('team');

      // 1. FIND TARGETS
      let nearestTarget: any = null;
      let minDist = 800;
      const allTargets: any[] = [];

      // Collect all potential targets
      if (this.playerTeam !== team) {
        const d = Phaser.Math.Distance.Between(bot.x, bot.y, this.player.x, this.player.y);
        allTargets.push({ entity: this.player, dist: d });
        if (d < minDist) { nearestTarget = this.player; minDist = d; }
      }

      this.otherPlayers.forEach(p => {
        if (p.getData('team') !== team) {
          const d = Phaser.Math.Distance.Between(bot.x, bot.y, p.x, p.y);
          allTargets.push({ entity: p, dist: d });
          if (d < minDist) { nearestTarget = p; minDist = d; }
        }
      });

      this.aiBots.getChildren().forEach((otherBot: any) => {
        if (otherBot !== bot && otherBot.getData('team') !== team) {
          const d = Phaser.Math.Distance.Between(bot.x, bot.y, otherBot.x, otherBot.y);
          allTargets.push({ entity: otherBot, dist: d });
          if (d < minDist) { nearestTarget = otherBot; minDist = d; }
        }
      });

      // 2. CHECK TEAMMATE CLUSTERING (spread positioning)
      const teammates = this.aiBots.getChildren().filter((b: any) =>
        b !== bot && b.getData('team') === team
      );

      let clusterAvoidanceX = 0;
      let clusterAvoidanceY = 0;
      teammates.forEach((teammate: any) => {
        const dist = Phaser.Math.Distance.Between(bot.x, bot.y, teammate.x, teammate.y);
        if (dist < 150) { // Too close to teammate
          const angle = Phaser.Math.Angle.Between(teammate.x, teammate.y, bot.x, bot.y);
          clusterAvoidanceX += Math.cos(angle) * (150 - dist);
          clusterAvoidanceY += Math.sin(angle) * (150 - dist);
        }
      });

      if (nearestTarget) {
        // 3. WEAPON SELECTION
        let desiredWeaponKey = 'pistol';
        if (minDist < 200) desiredWeaponKey = 'shotgun';
        else if (minDist < 500) desiredWeaponKey = 'smg';

        if (bot.getData('weaponKey') !== desiredWeaponKey) {
          bot.setData('weaponKey', desiredWeaponKey);
          bot.setTexture(`hum_striker_${WEAPONS_CONFIG[desiredWeaponKey].category}`);
        }

        const wConfig = WEAPONS_CONFIG[bot.getData('weaponKey')];

        // 4. TACTICAL POSITIONING
        const botHp = bot.getData('hp');
        const maxHp = bot.getData('maxHp');
        const healthPercent = botHp / maxHp;

        let targetX = nearestTarget.x;
        let targetY = nearestTarget.y;
        let moveSpeed = 150 * (0.8 + this.difficultyModifier * 0.2);

        // RETREAT if low health
        if (healthPercent < 0.3) {
          // Move away from target
          const retreatAngle = Phaser.Math.Angle.Between(nearestTarget.x, nearestTarget.y, bot.x, bot.y);
          targetX = bot.x + Math.cos(retreatAngle) * 300;
          targetY = bot.y + Math.sin(retreatAngle) * 300;
          moveSpeed *= 1.3; // Move faster when retreating
        }
        // FLANKING behavior - circle around target
        else if (minDist > 250 && minDist < 600) {
          const baseAngle = Phaser.Math.Angle.Between(bot.x, bot.y, nearestTarget.x, nearestTarget.y);
          // Add perpendicular offset for flanking
          const flankOffset = (bot.getData('id').charCodeAt(0) % 2 === 0) ? Math.PI / 3 : -Math.PI / 3;
          const flankAngle = baseAngle + flankOffset;
          targetX = nearestTarget.x + Math.cos(flankAngle) * 250;
          targetY = nearestTarget.y + Math.sin(flankAngle) * 250;
        }
        // CLOSE COMBAT - strafe around target
        else if (minDist < 250) {
          const strafeAngle = Phaser.Math.Angle.Between(bot.x, bot.y, nearestTarget.x, nearestTarget.y);
          const strafeDirection = Math.sin(time * 0.002) > 0 ? 1 : -1;
          targetX = bot.x + Math.cos(strafeAngle + Math.PI / 2 * strafeDirection) * 100;
          targetY = bot.y + Math.sin(strafeAngle + Math.PI / 2 * strafeDirection) * 100;
        }

        // 5. APPLY CLUSTER AVOIDANCE
        if (clusterAvoidanceX !== 0 || clusterAvoidanceY !== 0) {
          targetX += clusterAvoidanceX * 0.5;
          targetY += clusterAvoidanceY * 0.5;
        }

        // 6. MOVEMENT
        const moveAngle = Phaser.Math.Angle.Between(bot.x, bot.y, targetX, targetY);
        this.physics.velocityFromRotation(moveAngle, moveSpeed, bot.body.velocity);

        // 7. AIMING (always aim at target, not movement direction)
        const aimAngle = Phaser.Math.Angle.Between(bot.x, bot.y, nearestTarget.x, nearestTarget.y);
        bot.rotation = aimAngle;

        // 8. INTELLIGENT SHOOTING
        const delay = Math.max(0.8, 2.5 / this.difficultyModifier);
        if (time > bot.getData('lastShot') + wConfig.fireRate * delay) {
          // Check if we have line of sight to target
          const hasLOS = this.hasLineOfSight(bot.x, bot.y, nearestTarget.x, nearestTarget.y);

          // Track target changes and reaction time
          const currentTarget = bot.getData('currentTarget');
          const targetId = nearestTarget.getData ? nearestTarget.getData('id') : 'player';

          if (currentTarget !== targetId) {
            // New target acquired - set reaction delay
            bot.setData('currentTarget', targetId);
            bot.setData('targetAcquiredTime', time);
          }

          const timeSinceAcquired = time - bot.getData('targetAcquiredTime');
          const reactionDelay = bot.getData('reactionDelay');

          // Only shoot if:
          // 1. Target is in range
          // 2. Bot has line of sight
          // 3. Bot is not retreating (health > 20%)
          // 4. Reaction delay has passed
          // 5. Target is not in safe zone (first 5 seconds of battle)
          const targetInSafeZone = this.safeZoneTimer > 0 && targetId === 'player';

          if (minDist < 700 &&
            healthPercent > 0.2 &&
            hasLOS &&
            timeSinceAcquired > reactionDelay &&
            !targetInSafeZone) {

            // Calculate aim error based on distance and difficulty
            // Closer targets = more accurate, higher difficulty = more accurate
            const baseAimError = (minDist / 700) * 0.4; // 0 to 0.4 radians based on distance
            const difficultyFactor = 1 - (this.difficultyModifier - 1) * 0.3; // Reduce error on higher difficulty
            const aimError = baseAimError * difficultyFactor;

            // Apply aim error to each bullet
            for (let i = 0; i < wConfig.bullets; i++) {
              const spreadError = (Math.random() - 0.5) * wConfig.spread;
              const accuracyError = (Math.random() - 0.5) * aimError;
              const finalAngle = aimAngle + spreadError + accuracyError;
              this.spawnBullet(bot.x, bot.y, finalAngle, wConfig.key, 'bot', team);
            }
            bot.setData('lastShot', time);
            this.playSound(wConfig.category === 'pistol' ? 'sfx_pistol' : 'sfx_shotgun', 0.1);
          }
        }
      } else {
        // NO TARGET - patrol behavior
        if (!bot.getData('patrolTarget') || Math.random() < 0.01) {
          bot.setData('patrolTarget', {
            x: Phaser.Math.Between(200, 1800),
            y: Phaser.Math.Between(200, 1800)
          });
        }

        const patrol = bot.getData('patrolTarget');
        const patrolDist = Phaser.Math.Distance.Between(bot.x, bot.y, patrol.x, patrol.y);

        if (patrolDist > 50) {
          const patrolAngle = Phaser.Math.Angle.Between(bot.x, bot.y, patrol.x, patrol.y);
          this.physics.velocityFromRotation(patrolAngle, 100, bot.body.velocity);
          bot.rotation = patrolAngle;
        } else {
          bot.body.velocity.scale(0.95);
        }
      }

      // Update label position
      const label = this.botLabels.get(bot.getData('id'));
      if (label) label.setPosition(bot.x, bot.y - 50);
    });
  }

  private updateHardpoint(time: number) {
    if (this.isMissionOver) return;
    if (time % 1000 < 20) {
      let alphaIn = this.physics.overlap(this.hardpointZone, this.player) && this.playerTeam === 'alpha' ? 1 : 0;
      let bravoIn = this.physics.overlap(this.hardpointZone, this.player) && this.playerTeam === 'bravo' ? 1 : 0;
      this.otherPlayers.forEach(p => { if (this.physics.overlap(this.hardpointZone, p)) { if (p.getData('team') === 'alpha') alphaIn++; else bravoIn++; } });
      if (alphaIn > bravoIn) this.teamScores.alpha++; else if (bravoIn > alphaIn) this.teamScores.bravo++;
      this.connections.forEach(c => c.send({ type: 'score_update', scores: this.teamScores }));
    }
    if (time % 30000 < 20) {
      this.hardpointCenter = { x: Phaser.Math.Between(400, 1600), y: Phaser.Math.Between(400, 1600) };
      this.moveHardpoint(this.hardpointCenter.x, this.hardpointCenter.y);
      this.connections.forEach(c => c.send({ type: 'hp_move', x: this.hardpointCenter.x, y: this.hardpointCenter.y }));
    }
  }

  private moveHardpoint(x: number, y: number) {
    if (this.hardpointZone) { this.hardpointZone.setPosition(x, y); this.showFloatingText(x, y, "HARDPOINT_RELOCATED", "#ffffff"); }
  }

  private takeDamage(dmg: number) {
    if (this.invulnerabilityTimer > 0 || this.safeZoneTimer > 0 || this.isRespawning || this.isMissionOver) return;
    const scaledDmg = dmg * (0.7 + this.difficultyModifier * 0.3);
    if (this.shield > 0) {
      const remaining = Math.max(0, scaledDmg - this.shield);
      this.shield = Math.max(0, this.shield - scaledDmg);
      this.health -= remaining;
    } else this.health -= scaledDmg;
    this.invulnerabilityTimer = 400;
    this.playSound('sfx_hit_flesh', 0.8);
    if (this.health <= 0) {
      this.deaths++; if (this.mission) this.lives--;
      this.isRespawning = true;
      this.playSound('sfx_death_human', 0.9);
      this.player.body.stop();
      this.bloodEmitter.emitParticleAt(this.player.x, this.player.y, 25);
      this.explosionEmitter.emitParticleAt(this.player.x, this.player.y, 15);
      this.player.setVisible(false);
      this.time.delayedCall(1500, () => {
        if (this.isMissionOver) return;
        if (this.mission && this.lives <= 0) {
          this.isMissionOver = true;
          window.dispatchEvent(new CustomEvent('MISSION_COMPLETE', { detail: { failed: true, reason: 'OUT_OF_LIVES' } }));
          return;
        }
        this.health = this.maxHealth; this.shield = this.maxShield;
        this.player.setPosition(1000, 1000).setVisible(true).setAlpha(1);
        this.isRespawning = false; this.safeZoneTimer = 2000;
      });
    }
  }

  private applyDamage(target: any, dmg: number, sourceTeam: 'alpha' | 'bravo') {
    const hp = target.getData('hp') - dmg;
    target.setData('hp', hp);
    if (hp <= 0) {
      this.bloodEmitter.emitParticleAt(target.x, target.y, 20);
      this.explosionEmitter.emitParticleAt(target.x, target.y, 10);
      const id = target.getData('id');
      const label = this.botLabels.get(id);
      if (label) { label.destroy(); this.botLabels.delete(id); }
      if (this.isHost && this.roomId) this.connections.forEach(c => c.send({ type: 'destroy_object', id }));
      target.destroy();
      if (sourceTeam === this.playerTeam) { this.kills++; this.points += 100; }
      if (this.isHost && !this.isMissionOver) {
        if (this.mpConfig?.mode === 'TDM' || this.mpConfig?.mode === 'FFA') {
          this.teamScores[sourceTeam]++;
          this.connections.forEach(c => c.send({ type: 'score_update', scores: this.teamScores }));
        }
        this.time.delayedCall(3000, () => this.spawnAIBot(target.getData('team')));
      }
    }
  }

  private createArena() {
    this.walls = this.physics.add.staticGroup();
    const map = this.mpConfig?.map || 'URBAN_RUINS';
    for (let i = 0; i < 32; i++) {
      this.walls.create(i * 64, 0, 'wall_block'); this.walls.create(i * 64, 2000, 'wall_block');
      this.walls.create(0, i * 64, 'wall_block'); this.walls.create(2000, i * 64, 'wall_block');
    }
    if (map === 'URBAN_RUINS') { for (let i = 0; i < 15; i++) this.walls.create(this.seededRnd.between(400, 1600), this.seededRnd.between(400, 1600), 'wall_block').setScale(1.5).refreshBody(); }
    else if (map === 'THE_PIT') { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; this.walls.create(1000 + Math.cos(a) * 300, 1000 + Math.sin(a) * 300, 'wall_block'); } }
    else { for (let i = 0; i < 10; i++) { this.walls.create(500, i * 128, 'wall_block'); this.walls.create(1500, 2000 - i * 128, 'wall_block'); } }
  }

  private spawnLuckBox() {
    if (this.isMissionOver) return;
    const x = Phaser.Math.Between(300, 1700), y = Phaser.Math.Between(300, 1700), id = `luck_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.luckBoxes.create(x, y, 'luck_box').setData('id', id).setDepth(5);
    if (this.isHost && this.roomId) this.connections.forEach(c => c.send({ type: 'spawn_box', boxType: 'luck', id, x, y }));
  }

  private spawnWeaponBox() {
    if (this.isMissionOver) return;
    const x = Phaser.Math.Between(300, 1700), y = Phaser.Math.Between(300, 1700), id = `weapon_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const box = this.weaponBoxes.create(x, y, 'weapon_box').setData('id', id).setDepth(5);
    this.tweens.add({ targets: box, scale: 1.1, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (this.isHost && this.roomId) this.connections.forEach(c => c.send({ type: 'spawn_box', boxType: 'weapon', id, x, y }));
  }

  private createRemoteBox(data: any) {
    const group = data.boxType === 'luck' ? this.luckBoxes : this.weaponBoxes;
    if (group.getChildren().find((b: any) => b.getData('id') === data.id)) return;
    group.create(data.x, data.y, data.boxType === 'luck' ? 'luck_box' : 'weapon_box').setData('id', data.id).setDepth(5);
  }

  private createRemoteItem(data: any) {
    if (this.weaponItems.getChildren().find((i: any) => i.getData('id') === data.id)) return;
    const item = this.add.text(data.x, data.y, WEAPONS_CONFIG[data.weaponKey].icon, { fontSize: '32px' }).setOrigin(0.5);
    this.physics.add.existing(item); this.weaponItems.add(item);
    item.setData('weaponKey', data.weaponKey).setData('id', data.id);
  }

  private destroyRemoteObject(data: any) {
    const all = [...this.aiBots.getChildren(), ...this.luckBoxes.getChildren(), ...this.weaponBoxes.getChildren(), ...this.weaponItems.getChildren()];
    all.find((o: any) => o.getData('id') === data.id)?.destroy();
  }

  private collectLuckBox(box: any) {
    const id = box.getData('id'); this.explosionEmitter.emitParticleAt(box.x, box.y, 8);
    this.ammo = this.currentWeapon.maxAmmo; this.health = Math.min(this.health + 50, this.maxHealth);
    this.points += 25; this.playSound('sfx_powerup', 0.6);
    this.showFloatingText(box.x, box.y, "RESOURCES_RESTORED +25", "#f97316");
    if (this.roomId) this.connections.forEach(c => c.send({ type: 'destroy_object', id }));
    box.destroy();
  }

  private activateWeaponBox(box: any) {
    const id = box.getData('id'); this.explosionEmitter.emitParticleAt(box.x, box.y, 10);
    const keys = Object.keys(WEAPONS_CONFIG); const key = keys[Phaser.Math.Between(0, keys.length - 1)];
    const config = WEAPONS_CONFIG[key]; const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const item = this.add.text(box.x, box.y, config.icon, { fontSize: '32px' }).setOrigin(0.5);
    this.physics.add.existing(item); this.weaponItems.add(item);
    item.setData('weaponKey', key).setData('id', itemId);
    if (this.roomId) {
      if (this.isHost) this.connections.forEach(c => c.send({ type: 'spawn_item', id: itemId, weaponKey: key, x: box.x, y: box.y }));
      this.connections.forEach(c => c.send({ type: 'destroy_object', id }));
    }
    this.tweens.add({ targets: item, y: box.y - 15, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    box.destroy();
  }

  private collectWeaponItem(item: any) {
    this.swapWeapon(item.getData('weaponKey')); this.points += 50; this.playSound('sfx_powerup', 0.8);
    this.showFloatingText(item.x, item.y, "HARDWARE_SYNCHRONIZED +50", "#00ffff");
    if (this.roomId) this.connections.forEach(c => c.send({ type: 'destroy_object', id: item.getData('id') }));
    item.destroy();
  }

  private showFloatingText(x: number, y: number, text: string, color: string) {
    const t = this.add.text(x, y, text, { fontSize: '12px', fontStyle: '900', color, backgroundColor: '#000000', padding: { x: 5, y: 3 }, fontFamily: 'monospace' }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, y: y - 80, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
  }

  private updateAuras() {
    this.unitAuras.clear();
    const drawAura = (unit: any, team: string) => {
      if (!unit.active) return;
      const color = team === 'alpha' ? 0xf97316 : 0x22d3ee;
      this.unitAuras.lineStyle(2, color, 0.5); this.unitAuras.strokeCircle(unit.x, unit.y, 35);
      this.unitAuras.fillStyle(color, 0.1); this.unitAuras.fillCircle(unit.x, unit.y, 35);
    };
    drawAura(this.player, this.playerTeam);
    this.otherPlayers.forEach(p => drawAura(p, p.getData('team')));
    this.aiBots.getChildren().forEach((b: any) => drawAura(b, b.getData('team')));
  }

  private swapWeapon(key: string) {
    const config = WEAPONS_CONFIG[key];
    if (config) {
      this.currentWeapon = config; this.ammo = config.maxAmmo;
      this.tweens.add({ targets: this.player, scaleX: 1.25, scaleY: 1.25, duration: 80, yoyo: true, ease: 'Sine.easeInOut' });
      this.abilityEmitter.emitParticleAt(this.player.x, this.player.y, 1);
      this.showFloatingText(this.player.x, this.player.y - 40, `${config.icon} ${config.name} EQUIPPED`, teamColors[this.playerTeam]);
      this.weaponLabel.setText(config.name); this.player.setTexture(`hum_${this.characterClass.toLowerCase()}_${config.category}`);
    }
  }

  private drawHealthBar() {
    this.playerHpBar.clear();
    const hpPercent = this.health / this.maxHealth;
    this.playerHpBar.fillStyle(0x000000, 0.5).fillRect(this.player.x - 25, this.player.y - 45, 50, 6);
    this.playerHpBar.fillStyle(hpPercent > 0.3 ? 0x10b981 : 0xef4444).fillRect(this.player.x - 25, this.player.y - 45, hpPercent * 50, 6);
  }

  private updateHUD() {
    (window as any).gameStats = {
      hp: this.health, maxHp: this.maxHealth, shield: this.shield, maxShield: this.maxShield, ammo: this.ammo, maxAmmo: this.currentWeapon.maxAmmo,
      weaponKey: this.currentWeapon.key, weaponName: this.currentWeapon.name, isInfinite: this.currentWeapon.isInfinite,
      abilityCooldown: this.abilityCooldown, kills: this.kills, targetKills: this.mission?.targetKills || 0,
      points: this.points, lives: this.lives, maxLives: this.maxLives, teamScores: this.teamScores,
      mode: this.mpConfig?.mode || 'MISSION', isOver: this.isMissionOver,
      playerPos: { x: this.player.x, y: this.player.y, rotation: this.player.rotation },
      entities: [
        ...this.aiBots.getChildren().map((b: any) => ({ x: b.x, y: b.y, team: b.getData('team'), type: 'bot' })),
        ...Array.from(this.otherPlayers.values()).map((p: any) => ({ x: p.x, y: p.y, team: p.getData('team'), type: 'player' }))
      ]
    };
  }
}