import { Buffer } from "buffer";
import { Client as ContractClient, Spec as ContractSpec, } from "@stellar/stellar-sdk/contract";
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
};
export class Client extends ContractClient {
    options;
    static async deploy(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options) {
        return ContractClient.deploy(null, options);
    }
    constructor(options) {
        super(new ContractSpec(["AAAAAAAAAAAAAAAJZ2V0X3N0YXRzAAAAAAAAAQAAAAAAAAAGcGxheWVyAAAAAAATAAAAAQAAB9AAAAALUGxheWVyU3RhdHMA",
            "AAAAAAAAAAAAAAAKcmVjb3JkX3dpbgAAAAAAAQAAAAAAAAAGcGxheWVyAAAAAAATAAAAAA==",
            "AAAAAAAAAAAAAAALcmVjb3JkX2tpbGwAAAAAAQAAAAAAAAAGcGxheWVyAAAAAAATAAAAAA==",
            "AAAAAAAAAAAAAAAMc2V0X3VzZXJuYW1lAAAAAgAAAAAAAAAGcGxheWVyAAAAAAATAAAAAAAAAAh1c2VybmFtZQAAABAAAAAA",
            "AAAAAQAAAAAAAAAAAAAAC1BsYXllclN0YXRzAAAAAAUAAAAAAAAADGdhbWVzX3BsYXllZAAAAAQAAAAAAAAABWtpbGxzAAAAAAAABAAAAAAAAAAQbGFzdF9jb21iYXRfdGltZQAAAAYAAAAAAAAACHVzZXJuYW1lAAAAEAAAAAAAAAAEd2lucwAAAAQ="]), options);
        this.options = options;
    }
    fromJSON = {
        get_stats: (this.txFromJSON),
        record_win: (this.txFromJSON),
        record_kill: (this.txFromJSON),
        set_username: (this.txFromJSON)
    };
}
