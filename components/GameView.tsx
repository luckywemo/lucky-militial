
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createGame } from '../game/main';
import { GameMode, CharacterClass } from '../App';

interface Props {
  playerName: string;
  customAvatar: string | null;
  roomId: string | null;
  isHost: boolean;
  gameMode: GameMode;
  characterClass: CharacterClass;
}

const GameView: React.FC<Props> = ({ playerName, customAvatar, roomId, isHost, gameMode, characterClass }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      // Fix: Added the missing 7th argument 'characterClass' to createGame call
      gameRef.current = createGame(containerRef.current, playerName, customAvatar, roomId, isHost, gameMode, characterClass);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [playerName, customAvatar, roomId, isHost, gameMode, characterClass]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full border-slate-800 border-8 rounded-lg overflow-hidden bg-black"
    />
  );
};

export default GameView;
