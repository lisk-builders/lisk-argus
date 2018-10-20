import { PeerManager } from "./peers/PeerManager";
import { SocketServer } from "./websockets/SocketServer";
import { DelegateMonitor } from "./delegates/DelegateMonitor";
import { BlockchainManager } from "./blocks/BlockchainManager";
import * as crypto from "crypto";
import { NotificationManager } from "./notifications/NotificationManager";

const config = require("../src/config.json");

const nonce =
  "monitoring_" +
  crypto
    .randomBytes(10)
    .toString("hex")
    .slice(0, 5);
const version = "1.1.0";

const socketServer = new SocketServer(parseInt(process.argv[2]), nonce);
const peerManager = new PeerManager(socketServer, 5000, parseInt(process.argv[2]), nonce, version);

let blockManager: BlockchainManager | undefined;
let delegateMonitor: DelegateMonitor | undefined;
let notificationsManager: NotificationManager | undefined;

//TODO give the peers time connect
setTimeout(async () => {
  if (config.blockMonitor) {
    blockManager = new BlockchainManager(peerManager);
    blockManager.initalizeCache();
  }

  delegateMonitor = new DelegateMonitor(peerManager);
  await delegateMonitor.start();

  notificationsManager = new NotificationManager(delegateMonitor);
}, 5000);
