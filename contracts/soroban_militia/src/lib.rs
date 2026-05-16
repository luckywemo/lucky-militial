#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone)]
pub struct PlayerStats {
    pub username: String,
    pub kills: u32,
    pub wins: u32,
    pub games_played: u32,
    pub last_combat_time: u64,
}

#[contract]
pub struct LuckyMilitiaContract;

#[contractimpl]
impl LuckyMilitiaContract {
    pub fn set_username(env: Env, player: Address, username: String) {
        player.require_auth();
        let mut stats = Self::get_stats(env.clone(), player.clone());
        stats.username = username;
        env.storage().persistent().set(&player, &stats);
    }

    pub fn record_kill(env: Env, player: Address) {
        player.require_auth();

        let mut stats = Self::get_stats(env.clone(), player.clone());
        stats.kills += 1;
        stats.last_combat_time = env.ledger().timestamp();
        
        env.storage().persistent().set(&player, &stats);
    }

    pub fn record_win(env: Env, player: Address) {
        player.require_auth();

        let mut stats = Self::get_stats(env.clone(), player.clone());
        stats.wins += 1;
        stats.games_played += 1;
        stats.last_combat_time = env.ledger().timestamp();
        
        env.storage().persistent().set(&player, &stats);
    }

    pub fn get_stats(env: Env, player: Address) -> PlayerStats {
        env.storage().persistent().get(&player).unwrap_or_else(|| PlayerStats {
            username: String::from_str(&env, "OPERATOR"),
            kills: 0,
            wins: 0,
            games_played: 0,
            last_combat_time: 0,
        })
    }
}

