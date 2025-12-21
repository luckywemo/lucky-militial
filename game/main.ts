
import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { GameMode, CharacterClass, MissionConfig, MPConfig } from '../App';

export const createGame = (parent: HTMLElement, playerName: string, avatar: string | null, roomId: string | null, isHost: boolean, gameMode: GameMode, characterClass: CharacterClass, mission?: MissionConfig, mpConfig?: MPConfig, squad?: {name: string, team: 'alpha' | 'bravo'}[]) => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parent,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 }, 
        debug: false,
      },
    },
    scene: [MainScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    backgroundColor: '#0c0a09',
    transparent: false,
    antialias: true,
  };

  const game = new Phaser.Game(config);
  game.scene.start('MainScene', { playerName, avatar, roomId, isHost, gameMode, characterClass, mission, mpConfig, squad });
  return game;
};
