
import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { GameMode, CharacterClass, MissionConfig } from '../App';

// Added MissionConfig import and mission optional parameter to createGame to match usage in GameContainer.tsx
export const createGame = (parent: HTMLElement, playerName: string, avatar: string | null, roomId: string | null, isHost: boolean, gameMode: GameMode, characterClass: CharacterClass, mission?: MissionConfig) => {
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
    render: {
      powerPreference: 'high-performance'
    }
  };

  const game = new Phaser.Game(config);
  // Pass mission to MainScene init data
  game.scene.start('MainScene', { playerName, avatar, roomId, isHost, gameMode, characterClass, mission });
  return game;
};
