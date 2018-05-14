import {PeerManager} from './peers/PeerManager';
import {SocketServer} from './websockets/SocketServer';
import {DelegateMonitor} from './delegates/DelegateMonitor';
import {BlockchainManager} from './blocks/BlockchainManager';
import * as crypto from 'crypto';

let nonce = 'monitoring_' + crypto.randomBytes(10).toString('hex').slice(0, 5);

let socketServer = new SocketServer(parseInt(process.argv[2]), nonce);
let peerManager = new PeerManager(socketServer, 5000, parseInt(process.argv[2]), nonce);

let delegateMonitor = new DelegateMonitor(peerManager);

setTimeout(() => {
    let blockManager = new BlockchainManager(peerManager);
    blockManager.initalizeCache();
}, 3000);

