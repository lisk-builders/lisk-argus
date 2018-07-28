import * as request from "request-promise-native";

// Lisk HTTP API
// https://app.swaggerhub.com/apis/LiskHQ/Lisk
export class HttpApi {
  constructor(
    protected readonly hostname: string,
    protected readonly port: number,
    protected readonly secure: boolean = false,
  ) {}

  public getNodeStatus(): Promise<ResponseObject<NodeStatusExtended>> {
    return request(`${this.baseUrl()}/node/status`, { json: true });
  }

  public getBlocks(): Promise<ResponseList<Block>> {
    return request(`${this.baseUrl()}/blocks?limit=100`, { json: true });
  }

  public getForgers(): Promise<ForgerResponse> {
    return request(`${this.baseUrl()}/delegates/forgers?limit=100`, { json: true });
  }

  public getDelegates(): Promise<ResponseList<DelegateDetails>> {
    return request(`${this.baseUrl()}/delegates?limit=101&sort=rank:asc`, { json: true });
  }

  public getLastBlockByDelegate(generatorKey: string): Promise<Block> {
    return request(`${this.baseUrl()}/blocks?limit=1&generatorPublicKey=${generatorKey}`, {
      json: true,
    }).then(data => data.data[0]);
  }

  public getBlockByHeight(height: number): Promise<Block> {
    return request(`${this.baseUrl()}/blocks?limit=1&height=${height}`).then(data => data.data[0]);
  }

  // method is proteced to allow adding endpoints by subclassing
  protected baseUrl(): string {
    const protocol = this.secure ? "https" : "http";
    return `${protocol}://${this.hostname}:${this.port}/api`;
  }
}

export interface Block {
  readonly id: string;
  readonly version: number;
  readonly timestamp: number;
  readonly height: number;
  readonly numberOfTransactions: number;
  readonly totalAmount: string;
  readonly totalFee: string;
  readonly reward: string;
  readonly payloadLength: number;
  readonly payloadHash: string;
  readonly generatorPublicKey: string;
  readonly blockSignature: string;
  readonly confirmations: number;
  readonly totalForged: string;
  readonly generatorAddress: string;
  readonly previousBlockId: string;
}

export interface TransactionsStats {
  readonly confirmed: number;
  readonly unconfirmed: number;
  readonly unprocessed: number;
  readonly unsigned: number;
  readonly total: number;
}

export interface NodeStatusExtended {
  readonly broadhash: string;
  readonly consensus: number;
  readonly height: number;
  readonly loaded: boolean;
  readonly networkHeight: number;
  readonly syncing: boolean;
  readonly transactions: TransactionsStats;
}

export interface ForgerMeta {
  readonly lastBlock: number;
  readonly lastBlockSlot: number;
  readonly currentSlot: number;
  readonly limit: number;
  readonly offset: number;
}

export interface ForgerDetail {
  readonly publicKey: string;
  readonly username: string;
  readonly address: string;
  readonly nextSlot: number;
}

export interface ForgerResponse {
  readonly meta: ForgerMeta;
  readonly data: ForgerDetail[];
}

export interface Account {
  readonly address: string;
  readonly publicKey: string;
  readonly secondPublicKey: string;
}

export type DelegateDetails = {
  readonly rewards: string;
  readonly vote: string;
  readonly producedBlocks: number;
  readonly missedBlocks: number;
  readonly username: string;
  readonly rank: number;
  readonly approval: number;
  readonly productivity: number;
  readonly account: Account;
};

export interface ResponseObject<T> {
  readonly meta: any;
  readonly data: T;
}

export interface ResponseList<T> {
  readonly meta: any;
  readonly data: T[];
}
