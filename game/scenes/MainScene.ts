
import Phaser from 'phaser';
import { GameMode, CharacterClass, MissionConfig } from '../../App';

interface WeaponConfig {
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

const WEAPONS: Record<string, WeaponConfig> = {
  pistol: { name: 'P-20 SIDEARM', fireRate: 250, damage: 15, recoil: 150, bullets: 1, spread: 0, projectileScale: 1, projectileTint: 0xffffff, maxAmmo: 999, isInfinite: true, key: 'pistol', icon: '🔫', type: 'kinetic', category: 'pistol', speed: 1800 },
  smg: { name: 'R-99 RAZOR', fireRate: 80, damage: 8, recoil: 60, bullets: 1, spread: 0.1, projectileScale: 0.7, projectileTint: 0xfde047, maxAmmo: 60, key: 'smg', icon: '⚔️', type: 'kinetic', category: 'rifle', speed: 1800 },
  shotgun: { name: 'B-10 BREACHER', fireRate: 850, damage: 18, recoil: 1800, bullets: 10, spread: 0.8, projectileScale: 1.1, projectileTint: 0xef4444, maxAmmo: 10, key: 'shotgun', icon: '🔥', type: 'kinetic', category: 'heavy', speed: 1600 },
  launcher: { name: 'M-55 HELLFIRE', fireRate: 1200, damage: 75, recoil: 900, bullets: 1, spread: 0, projectileScale: 2.2, projectileTint: 0xf97316, maxAmmo: 5, key: 'launcher', icon: '🚀', type: 'explosive', category: 'heavy', speed: 1200 },
  railgun: { name: 'VOLT RAILGUN', fireRate: 1500, damage: 120, recoil: 1200, bullets: 1, spread: 0, projectileScale: 3.5, projectileTint: 0x06b6d4, maxAmmo: 4, key: 'railgun', icon: '⚡', type: 'energy', category: 'heavy', speed: 3000 },
  plasma: { name: 'X-1 REPEATER', fireRate: 180, damage: 25, recoil: 150, bullets: 1, spread: 0.04, projectileScale: 1.5, projectileTint: 0xd946ef, maxAmmo: 25, key: 'plasma', icon: '🔮', type: 'energy', category: 'rifle', speed: 1400 },
  stinger: { name: 'M-90 STINGER', fireRate: 1500, damage: 60, recoil: 500, bullets: 1, spread: 0, projectileScale: 2.0, projectileTint: 0xff0000, maxAmmo: 8, key: 'stinger', icon: '🎯', type: 'explosive', category: 'heavy', homing: true, speed: 800 },
  neutron: { name: 'X-ION PULSE', fireRate: 400, damage: 45, recoil: 300, bullets: 1, spread: 0.02, projectileScale: 2.2, projectileTint: 0x00ff00, maxAmmo: 20, key: 'neutron', icon: '💠', type: 'energy', category: 'rifle', speed: 1200 }
};

export class MainScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private playerShadow!: Phaser.GameObjects.Sprite;
  private playerLabel!: Phaser.GameObjects.Text;
  private weaponLabel!: Phaser.GameObjects.Text;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private hitMarker!: Phaser.GameObjects.Image;
  
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private bullets!: Phaser.Physics.Arcade.Group;
  private luckBoxes!: Phaser.Physics.Arcade.Group;
  private aiBots!: Phaser.Physics.Arcade.Group;
  private environmentDecor!: Phaser.GameObjects.Group;
  
  private playerName = 'Guest';
  private characterClass: CharacterClass = 'STRIKER';
  private currentWeapon: WeaponConfig = WEAPONS.pistol;
  private health = 100;
  private maxHealth = 100;
  private shield = 100;
  private ammo = 0;
  private lastFired = 0;
  private kills = 0;
  private isRespawning = false;
  private abilityCooldown = 0;
  private mission?: MissionConfig;

  public virtualInput = { moveX: 0, moveY: 0, aimAngle: null as number | null, isFiring: false, isAbility: false };
  
  private muzzleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private abilityEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private tracerEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private globalTick = 0;

  constructor() {
    super('MainScene');
  }

  init(data: any) {
    this.playerName = data.playerName;
    this.characterClass = data.characterClass || 'STRIKER';
    this.mission = data.mission;
    this.maxHealth = this.characterClass === 'TITAN' ? 200 : this.characterClass === 'GHOST' ? 80 : 120;
    this.health = this.maxHealth;
    this.ammo = this.currentWeapon.maxAmmo;
  }

  create() {
    this.setupTextures();
    this.add.grid(1000, 1000, 2000, 2000, 256, 256, 0x0a0a0a, 1, 0x1a1a1a, 0.5).setDepth(-10);
    this.createArena();
    
    this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 250 }) as any;
    this.aiBots = this.physics.add.group();
    this.luckBoxes = this.physics.add.group();
    this.environmentDecor = this.add.group();

    this.createAtmosphere();

    const initialTex = `hum_${this.characterClass.toLowerCase()}_${this.currentWeapon.category}`;
    this.playerShadow = this.add.sprite(1000, 1000, 'shadow').setAlpha(0.3);
    this.player = this.physics.add.sprite(1000, 1000, initialTex);
    this.player.setCollideWorldBounds(true).setDrag(4500).setCircle(16, 24, 24).setDepth(10);
    
    const speedMult = this.characterClass === 'GHOST' ? 1.4 : this.characterClass === 'TITAN' ? 0.8 : 1.1;
    this.player.setMaxVelocity(750 * speedMult);

    this.playerLabel = this.add.text(1000, 960, this.playerName, { fontSize: '11px', fontStyle: '800', color: '#f97316', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(20);
    this.weaponLabel = this.add.text(1000, 975, this.currentWeapon.name, { fontSize: '9px', fontStyle: 'bold', color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(20);
    this.playerHpBar = this.add.graphics().setDepth(20);
    this.hitMarker = this.add.image(0, 0, 'hit_marker').setAlpha(0).setScrollFactor(0).setDepth(200).setScale(0.6);

    this.setupEmitters();
    this.setupPhysics();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1); 
    this.cameras.main.setBounds(0, 0, 2000, 2000);

    // Reduced initial bot count for better pacing
    const botCount = 8 + (this.mission?.difficulty || 0) * 3;
    for(let i=0; i<botCount; i++) this.spawnAIBot(Phaser.Math.Between(200, 1800), Phaser.Math.Between(200, 1800));
    
    // Slower respawn interval
    this.time.addEvent({ delay: 8000, callback: () => {
      if (this.aiBots.getLength() < botCount) this.spawnAIBot(Phaser.Math.Between(200, 1800), Phaser.Math.Between(200, 1800));
    }, loop: true });

    window.addEventListener('weapon_swap', ((e: CustomEvent) => this.swapWeapon(e.detail.key)) as any);
  }

  private setupTextures() {
    const g = this.make.graphics({ x: 0, y: 0 });
    
    const drawHumanoid = (key: string, bodyColor: number, visorColor: number, category: string) => {
      g.clear();
      g.fillStyle(0x000000, 0.4).fillCircle(40, 40, 22);
      g.fillStyle(0x0a0a0a).fillRoundedRect(24, 24, 32, 32, 10);
      g.fillStyle(bodyColor).fillRoundedRect(28, 28, 24, 24, 6);
      g.fillStyle(0x1a1a1a).fillCircle(40, 40, 12);
      g.fillStyle(visorColor).fillRect(44, 36, 10, 5); 
      g.fillStyle(0xffffff, 0.6).fillRect(44, 36, 4, 1);
      g.fillStyle(bodyColor).fillRect(40, 20, 18, 8);
      g.fillStyle(bodyColor).fillRect(40, 52, 18, 8);
      g.fillStyle(0x000000);
      if (category === 'pistol') {
        g.fillRect(52, 36, 14, 8);
      } else if (category === 'rifle') {
        g.fillRect(50, 32, 30, 12);
        g.fillStyle(visorColor, 0.4).fillRect(58, 34, 6, 2);
      } else {
        g.fillStyle(0x1a1a1a).fillRect(46, 28, 36, 24);
        g.fillStyle(0xef4444).fillRect(62, 36, 12, 4);
      }
      g.generateTexture(key, 80, 80);
    };

    const classes: CharacterClass[] = ['STRIKER', 'GHOST', 'TITAN'];
    const colors = { STRIKER: 0x44403c, GHOST: 0x1c1917, TITAN: 0x292524 };
    const visors = { STRIKER: 0xf97316, GHOST: 0x06b6d4, TITAN: 0xef4444 };
    const cats = ['pistol', 'rifle', 'heavy'];

    classes.forEach(c => {
      cats.forEach(cat => {
        drawHumanoid(`hum_${c.toLowerCase()}_${cat}`, colors[c], visors[c], cat);
      });
    });

    g.clear().fillStyle(0x1a1a1a).fillRect(0, 0, 128, 128).lineStyle(2, 0x2a2a2a).strokeRect(0, 0, 128, 128).generateTexture('wall_block', 128, 128);
    g.clear().fillStyle(0x1a1a1a).fillRect(0, 0, 32, 32).lineStyle(2, 0xf97316).strokeRect(2, 2, 28, 28).generateTexture('luck_box', 32, 32);
    g.clear().fillStyle(0x000000, 0.4).fillCircle(32, 32, 24).generateTexture('shadow', 64, 64);
    g.clear().fillStyle(0xffffff).fillCircle(3, 3, 3).generateTexture('bullet', 6, 6);
    g.clear().fillStyle(0xffffff).fillRect(0, 0, 4, 4).generateTexture('spark', 4, 4);
    g.clear().fillStyle(0xffffff).lineStyle(3, 0xffffff).lineBetween(0, 12, 24, 12).lineBetween(12, 0, 12, 24).generateTexture('hit_marker', 24, 24);
    g.clear().lineStyle(3, 0xffffff, 0.5).strokeCircle(32, 32, 30).generateTexture('sync_wave', 64, 64);
  }

  private createAtmosphere() {
    this.dustEmitter = this.add.particles(0, 0, 'spark', {
      x: { min: 0, max: 2000 }, y: { min: 0, max: 2000 }, lifespan: 6000,
      speedX: { min: -15, max: 15 }, speedY: { min: -15, max: 15 },
      scale: { start: 0.6, end: 0 }, alpha: { start: 0.1, end: 0 }, quantity: 1, frequency: 40, blendMode: 'ADD'
    });
  }

  private setupEmitters() {
    this.muzzleEmitter = this.add.particles(0, 0, 'spark', { speed: 350, scale: { start: 1.2, end: 0 }, lifespan: 120, emitting: false, blendMode: 'ADD' });
    this.explosionEmitter = this.add.particles(0, 0, 'spark', { speed: { min: 300, max: 600 }, scale: { start: 2.5, end: 0 }, lifespan: 500, emitting: false, blendMode: 'ADD' });
    this.abilityEmitter = this.add.particles(0, 0, 'sync_wave', { scale: { start: 0.1, end: 6 }, alpha: { start: 0.8, end: 0 }, lifespan: 600, emitting: false, blendMode: 'ADD' });
    this.tracerEmitter = this.add.particles(0, 0, 'spark', { scale: { start: 0.8, end: 0 }, alpha: { start: 0.6, end: 0 }, lifespan: 200, emitting: false, blendMode: 'ADD' });
  }

  update(time: number, delta: number) {
    this.globalTick++;
    if (!this.isRespawning) {
      this.handleVirtualInput();
      this.handleCombat(time);
      this.handleProjectiles();
      if (this.abilityCooldown > 0) this.abilityCooldown -= delta;
    }
    this.playerShadow.setPosition(this.player.x + 6, this.player.y + 6);
    this.updateAIBots(time, delta);
    if (this.globalTick % 6 === 0) this.updateHUD();
    
    this.playerLabel.setPosition(this.player.x, this.player.y - 50);
    this.weaponLabel.setPosition(this.player.x, this.player.y - 62);
    this.drawEntityHealthBar(this.playerHpBar, this.player.x, this.player.y, this.health/this.maxHealth);
    if (this.shield < 100) this.shield += 0.08;
  }

  private handleProjectiles() {
    this.bullets.getChildren().forEach((b: any) => {
      if (b.active && b.getData('isHoming')) {
        const owner = b.getData('owner');
        let target = null;
        let minDist = 400; // Reduced homing acquisition range

        if (owner === 'player') {
          this.aiBots.getChildren().forEach((bot: any) => {
            if (bot.active) {
              const d = Phaser.Math.Distance.Between(b.x, b.y, bot.x, bot.y);
              if (d < minDist) { minDist = d; target = bot; }
            }
          });
        } else {
          const d = Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y);
          if (d < minDist) target = this.player;
        }

        if (target) {
          const targetAngle = Phaser.Math.Angle.Between(b.x, b.y, target.x, target.y);
          const currentAngle = b.rotation;
          const newAngle = Phaser.Math.Angle.RotateTo(currentAngle, targetAngle, 0.08); // Slower homing rotation
          b.setRotation(newAngle);
          this.physics.velocityFromRotation(newAngle, b.getData('speed'), b.body.velocity);
          
          if (this.globalTick % 4 === 0) {
            this.tracerEmitter.emitParticleAt(b.x, b.y, 1);
          }
        }
      }
    });
  }

  private handleVirtualInput() {
    const speed = 420;
    const { moveX, moveY } = this.virtualInput;
    if (moveX === 0 && moveY === 0) {
      this.player.setVelocity(0, 0);
    } else {
      this.player.setVelocity(moveX * speed, moveY * speed);
      this.player.setRotation(Math.atan2(moveY, moveX));
    }
    if (this.virtualInput.aimAngle !== null) this.player.setRotation(this.virtualInput.aimAngle);
    if (this.virtualInput.isAbility && this.abilityCooldown <= 0) this.triggerAbility();
  }

  private triggerAbility() {
    this.abilityCooldown = 7000;
    this.abilityEmitter.emitParticleAt(this.player.x, this.player.y, 1);
    this.cameras.main.shake(400, 0.015);
    const angle = this.player.rotation;
    this.player.body.velocity.x += Math.cos(angle) * 1800;
    this.player.body.velocity.y += Math.sin(angle) * 1800;
  }

  private handleCombat(time: number) {
    if (this.virtualInput.isFiring && time > this.lastFired) {
      if (this.ammo <= 0 && !this.currentWeapon.isInfinite) return;
      const angle = this.virtualInput.aimAngle !== null ? this.virtualInput.aimAngle : this.player.rotation;
      this.muzzleEmitter.emitParticleAt(this.player.x + Math.cos(angle) * 45, this.player.y + Math.sin(angle) * 45, 8);
      this.cameras.main.shake(100, 0.003); 
      
      for(let i=0; i<this.currentWeapon.bullets; i++) {
        const spread = (Math.random() - 0.5) * this.currentWeapon.spread;
        this.spawnBullet(this.player.x, this.player.y, angle + spread, this.currentWeapon.key, 'player');
      }
      this.lastFired = time + this.currentWeapon.fireRate;
      if (!this.currentWeapon.isInfinite) this.ammo--;
    }
  }

  private spawnBullet(x: number, y: number, angle: number, weaponKey: string, owner: string) {
    const config = WEAPONS[weaponKey] || WEAPONS.pistol;
    const b = this.bullets.get(x, y);
    if (b) {
      b.enableBody(true, x, y, true, true);
      b.setTint(config.projectileTint).setScale(config.projectileScale).setDepth(5);
      b.setData('owner', owner).setData('damage', config.damage).setData('isHoming', config.homing).setData('speed', config.speed);
      this.physics.velocityFromRotation(angle, config.speed || 1800, b.body.velocity);
      b.setRotation(angle);
      this.tracerEmitter.emitParticleAt(x, y, 1);
    }
  }

  private setupPhysics() {
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.aiBots, this.walls);
    this.physics.add.collider(this.bullets, this.walls, (b: any) => { 
      this.explosionEmitter.emitParticleAt(b.x, b.y, 3);
      b.disableBody(true, true); 
    });
    this.physics.add.overlap(this.aiBots, this.bullets, (bot: any, b: any) => {
      if (b.getData('owner') === 'player') { 
        this.applyDamage(bot, b.getData('damage')); 
        b.disableBody(true, true); 
        this.triggerHitMarker(); 
      }
    });
    this.physics.add.overlap(this.player, this.bullets, (p, b: any) => {
      if (b.getData('owner') !== 'player') { 
        this.takeDamage(b.getData('damage')); 
        b.disableBody(true, true); 
      }
    });
  }

  private triggerHitMarker() {
    this.hitMarker.setAlpha(1).setScale(1.4);
    this.tweens.add({ targets: this.hitMarker, alpha: 0, scale: 0.8, duration: 250 });
  }

  private updateHUD() {
    (window as any).gameStats = { 
      hp: this.health, maxHp: this.maxHealth, shield: this.shield, ammo: this.ammo, maxAmmo: this.currentWeapon.maxAmmo, weaponKey: this.currentWeapon.key, weaponName: this.currentWeapon.name, isInfinite: this.currentWeapon.isInfinite, abilityCooldown: this.abilityCooldown, kills: this.kills
    };
    (window as any).radarData = {
      enemies: this.aiBots.getChildren().map((b: any) => ({ x: b.x, y: b.y })),
      pickups: this.luckBoxes.getChildren().map((p: any) => ({ x: p.x, y: p.y }))
    };
  }

  private drawEntityHealthBar(g: Phaser.GameObjects.Graphics, x: number, y: number, h: number) {
    g.clear().fillStyle(0x0a0a0a, 0.8).fillRect(x - 24, y - 42, 48, 5).fillStyle(0xf97316).fillRect(x - 24, y - 42, 48 * h, 5);
  }

  private createArena() {
    this.walls = this.physics.add.staticGroup();
    for(let i=0; i<18; i++) {
      const w = Phaser.Math.Between(160, 600);
      const h = Phaser.Math.Between(160, 300);
      const wall = this.add.tileSprite(Phaser.Math.Between(400, 1600), Phaser.Math.Between(400, 1600), w, h, 'wall_block');
      this.physics.add.existing(wall, true); this.walls.add(wall as any);
    }
  }

  private spawnAIBot(x: number, y: number) {
    const isElite = (this.mission?.difficulty || 1) >= 3 && Math.random() > 0.7;
    const cat = isElite ? 'heavy' : 'pistol';
    const tex = `hum_striker_${cat}`;
    const bot = this.aiBots.create(x, y, tex) as Phaser.Physics.Arcade.Sprite;
    bot.setTint(0xff5555).setCollideWorldBounds(true).setDepth(10)
       .setData('health', isElite ? 130 : 70).setData('lastShot', 0).setData('shadow', this.add.sprite(x, y, 'shadow').setAlpha(0.3))
       .setData('nextAITick', Phaser.Math.Between(0, 40)).setData('isElite', isElite);
    bot.body.setCircle(20, 20, 20);
  }

  private updateAIBots(time: number, delta: number) {
    this.aiBots.getChildren().forEach((bot: any) => {
      bot.getData('shadow').setPosition(bot.x + 6, bot.y + 6);
      if (this.globalTick >= bot.getData('nextAITick')) {
        const dist = Phaser.Math.Distance.Between(bot.x, bot.y, this.player.x, this.player.y);
        if (dist < 380) { // Reduced tracking distance
          const angle = Phaser.Math.Angle.Between(bot.x, bot.y, this.player.x, this.player.y);
          bot.setRotation(angle);
          if (time > bot.getData('lastShot') + (bot.getData('isElite') ? 1800 : 3500)) { // Slower bot fire rate
            const weapon = (bot.getData('isElite') && Math.random() > 0.85) ? 'stinger' : 'pistol';
            this.spawnBullet(bot.x, bot.y, angle, weapon, 'bot');
            bot.setData('lastShot', time);
          }
          this.physics.velocityFromRotation(angle, 110, bot.body.velocity); // Slower bot movement
        }
        bot.setData('nextAITick', this.globalTick + Phaser.Math.Between(25, 50));
      }
    });
  }

  private takeDamage(amount: number) {
    if (this.isRespawning) return;
    this.health -= amount;
    this.cameras.main.shake(200, 0.008);
    if (this.health <= 0) {
      this.isRespawning = true;
      this.explosionEmitter.emitParticleAt(this.player.x, this.player.y, 30);
      this.player.setVisible(false);
      this.time.delayedCall(2000, () => {
        this.health = this.maxHealth;
        this.player.setPosition(1000, 1000).setVisible(true);
        this.isRespawning = false;
      });
    }
  }

  private applyDamage(target: any, damage: number) {
    const hp = target.getData('health') - damage;
    target.setData('health', hp);
    if (hp <= 0) {
      this.explosionEmitter.emitParticleAt(target.x, target.y, 12);
      if (target.getData('shadow')) target.getData('shadow').destroy();
      target.destroy();
      this.kills++;
    }
  }

  private swapWeapon(key: string) {
    if (WEAPONS[key]) {
      this.currentWeapon = WEAPONS[key];
      this.ammo = this.currentWeapon.maxAmmo;
      this.weaponLabel.setText(this.currentWeapon.name);
      const newTex = `hum_${this.characterClass.toLowerCase()}_${this.currentWeapon.category}`;
      this.player.setTexture(newTex);
    }
  }
}
