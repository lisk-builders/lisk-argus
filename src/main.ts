import {PeerManager} from './peers/PeerManager';
import {SocketServer} from './websockets/SocketServer';
import {DelegateMonitor} from './delegates/DelegateMonitor';
import {BlockchainManager} from './blocks/BlockchainManager';
import * as crypto from 'crypto';
import {NotificationManager} from './notifications/NotificationManager';

const config = require('./config.json');

const nonce = 'monitoring_' + crypto.randomBytes(10).toString('hex').slice(0, 5);

const socketServer = new SocketServer(parseInt(process.argv[2]), nonce);
const peerManager = new PeerManager(socketServer, 5000, parseInt(process.argv[2]), nonce);

//TODO give the peers time connect
setTimeout(() => {
    let blockManager;
    if (config.blockMonitor) {
        blockManager = new BlockchainManager(peerManager);
        blockManager.initalizeCache();
    }

    const delegateMonitor = new DelegateMonitor(peerManager);

    delegateMonitor.start().then(() => {
        const notifications = new NotificationManager(delegateMonitor, blockManager, peerManager);
    });
}, 5000);

