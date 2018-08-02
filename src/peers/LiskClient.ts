import * as socketCluster from "socketcluster-client";

import { WAMPClient } from "../websockets/wamp/WAMPClient";
import { HttpApi } from "../lib/HttpApi";

/***
 * LiskClient is a client for the Lisk Core Websocket and HTTP protocol.
 * It maintains a Websocket connection and can call various HTTP endpoints.
 */
export class LiskClient {
  socket: any;
  public peers;
  public readonly http: HttpApi;

  public options = {
    hostname: "betanet.lisk.io",
    port: 5001,
    httpPort: 5000,
    query: {},
    connectTimeout: 2000,
    ackTimeout: 2000,
    pingTimeout: 2000,
    autoConnect: true,
    autoReconnect: true,
    autoReconnectOptions: {
      multiplier: 1,
      initialDelay: 5000,
    },
  };

  constructor(hostname, wsPort, httpPort, query) {
    this.options.hostname = hostname || "betanet.lisk.io";
    this.options.port = wsPort || 5001;
    this.options.httpPort = httpPort || 5000;
    this.options.query = query;
    this.http = new HttpApi(this.options.hostname, this.options.httpPort);
  }

  public connect(
    connectHandler: () => void,
    closeHandler: () => void,
    errorHandler: (error: any) => void,
  ) {
    // Initiate the connection to the server
    this.socket = socketCluster.create(this.options);
    WAMPClient.registerWAMP(this.socket);

    this.socket.on("connect", connectHandler);
    this.socket.on("close", closeHandler);
    this.socket.on("error", errorHandler);
  }

  public destroy() {
    this.socket.destroy();
  }

  public getStatus(): Promise<NodeStatus> {
    return this.socket.call("status");
  }

  public getPeers(): Promise<WSPeerResponse> {
    return this.socket.call("list");
  }

  public getBlocks(lasBlockID?: string): Promise<WSBlockResponse> {
    return this.socket.call("blocks", { lastId: lasBlockID || "" });
  }
}

export type NodeStatus = {
  success: boolean;
  height: number;
  broadhash: string;
  nonce: string;
  httpPort: number;
  version: string;
  os: string;
};

export interface WSBlock {
  b_id: string;
  b_version: number;
  b_timestamp: number;
  b_height: number;
  b_previousBlock: string;
  b_numberOfTransactions: number;
  b_totalAmount: string;
  b_totalFee: string;
  b_reward: string;
  b_payloadLength: number;
  b_payloadHash: string;
  b_generatorPublicKey: string;
  b_blockSignature: string;
  t_id: string;
  t_rowId?: number;
  t_type?: number;
  t_timestamp?: number;
  t_senderPublicKey: string;
  t_senderId: string;
  t_recipientId: string;
  t_amount: string;
  t_fee: string;
  t_signature: string;
  t_signSignature?: any;
  s_publicKey?: any;
  d_username: string;
  v_votes: string;
  m_min?: any;
  m_lifetime?: any;
  m_keysgroup?: any;
  dapp_name?: any;
  dapp_description?: any;
  dapp_tags?: any;
  dapp_type?: any;
  dapp_link?: any;
  dapp_category?: any;
  dapp_icon?: any;
  in_dappId?: any;
  ot_dappId?: any;
  ot_outTransactionId?: any;
  t_requesterPublicKey?: any;
  tf_data?: any;
  t_signatures?: any;
}

export interface WSBlockResponse {
  blocks: WSBlock[];
}

export interface WSPeerResponse {
  success: boolean;
  peers: PeerInfo[];
}

export interface PeerInfo {
  ip: string;
  httpPort: number;
  wsPort: number;
  nonce: string;
  version: string;
  state?: number;
  os?: string;
  broadhash?: string;
  height?: number;
  updated?: any;
}
