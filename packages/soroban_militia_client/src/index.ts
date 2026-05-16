import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CA4MF3V4P2TRGZ2G4FOARKQTBOA6KFS455U32M2UZMZUJJWFPJTQB7IZ",
  }
} as const


export interface PlayerStats {
  games_played: u32;
  kills: u32;
  last_combat_time: u64;
  username: string;
  wins: u32;
}

export interface Client {
  /**
   * Construct and simulate a get_stats transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_stats: ({player}: {player: string}, options?: MethodOptions) => Promise<AssembledTransaction<PlayerStats>>

  /**
   * Construct and simulate a record_win transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  record_win: ({player}: {player: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a record_kill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  record_kill: ({player}: {player: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a set_username transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_username: ({player, username}: {player: string, username: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAJZ2V0X3N0YXRzAAAAAAAAAQAAAAAAAAAGcGxheWVyAAAAAAATAAAAAQAAB9AAAAALUGxheWVyU3RhdHMA",
        "AAAAAAAAAAAAAAAKcmVjb3JkX3dpbgAAAAAAAQAAAAAAAAAGcGxheWVyAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAALcmVjb3JkX2tpbGwAAAAAAQAAAAAAAAAGcGxheWVyAAAAAAATAAAAAA==",
        "AAAAAAAAAAAAAAAMc2V0X3VzZXJuYW1lAAAAAgAAAAAAAAAGcGxheWVyAAAAAAATAAAAAAAAAAh1c2VybmFtZQAAABAAAAAA",
        "AAAAAQAAAAAAAAAAAAAAC1BsYXllclN0YXRzAAAAAAUAAAAAAAAADGdhbWVzX3BsYXllZAAAAAQAAAAAAAAABWtpbGxzAAAAAAAABAAAAAAAAAAQbGFzdF9jb21iYXRfdGltZQAAAAYAAAAAAAAACHVzZXJuYW1lAAAAEAAAAAAAAAAEd2lucwAAAAQ=" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_stats: this.txFromJSON<PlayerStats>,
        record_win: this.txFromJSON<null>,
        record_kill: this.txFromJSON<null>,
        set_username: this.txFromJSON<null>
  }
}