import {LiskPeer, PeerState} from './Peer';
import * as log from 'winston';
import * as _ from 'underscore';
import * as semver from 'semver'
import {SocketServer} from '../websockets/SocketServer';
import {PeerInfo} from './LiskClient';

const config = require('../config.json');

/***
 * PeerManager keeps track of connected peers.
 * It automatically discovers new peers and connects to them.
 */
export class PeerManager {
    private bestHeight: number = 0;
    private bestBroadhash: string = '';

    constructor(private socketServer: SocketServer, private httpPort: number, private wsPort: number, readonly nonce: string) {
        this.addPeer({
            ip: config.seedNode.host,
            wsPort: config.seedNode.wsPort,
            httpPort: config.seedNode.httpPort,
            version: config.seedNode.version,
            nonce: ''
        });
        setInterval(() => this.updatePeers(), 1000);

        socketServer.on('status', (data) => {
            this.handleStatusUpdate(data);
        });

        socketServer.on('connect', (data) => this.wsServerConnectionChanged(data, true));
        socketServer.on('disconnect', (data) => this.wsServerConnectionChanged(data, false));
    }

    private _peers: Map<string, LiskPeer> = new Map<string, LiskPeer>();

    get peers(): LiskPeer[] {
        return Array.from(this._peers.values());
    }

    /***
     * Adds a peer and connects to it
     * @param {PeerInfo} peer
     */
    public addPeer(peer: PeerInfo) {
        if (peer.nonce && (peer.nonce === this.nonce || peer.nonce.indexOf('monitoring') != -1)) return;
        if (this._peers.has(peer.nonce)) return log.debug('peer not added: already connected to peer');
        if (!semver.satisfies(peer.version, config.minVersion)) return log.debug('peer not added: does not satisfy minVersion', {
            version: peer.version,
            ip: peer.ip,
            port: peer.wsPort
        });

        this._peers.set(peer.nonce, new LiskPeer({
            ip: peer.ip,
            wsPort: peer.wsPort,
            httpPort: peer.httpPort,
            nethash: config.nethash,
            nonce: peer.nonce,
            ownHttpPort: this.httpPort,
            ownWSPort: this.wsPort
        }, this.nonce))
    }

    /***
     * Update the status of all peers, handle new peers and update data
     */
    updatePeers() {
        // Flatten all peer stats
        let peerList = _.without(_.flatten(_.map(Array.from(this._peers.values()), (peer) => {
            return peer.peers
        })), undefined);

        // Get the connection count of each peer
        let peerStats = _.countBy(peerList, (peer) => {
            return peer.nonce
        });

        // Update the knownBy of the peers and remove dead peers
        for (let peer of this._peers.values()) {
            peer.knownBy = peerStats[peer.options.nonce.toString()] || 0;

            if (peer.status && peer.status.height > this.bestHeight /*&& peer.status.version == '1.0.0-beta.6'*/) {
                this.bestHeight = peer.status.height;
                this.bestBroadhash = peer.status.broadhash;
            }

            // // Remove dead peers
            // if (peer.knownBy == 0 && peer.state == PeerState.OFFLINE) {
            //     console.log(`removed dead peer ${peer.options.hostname}`);
            //     peer.destroy();
            //     delete this.peers[nonce.toString()]
            // }
        }

        // Discover new peers
        let newPeers: PeerInfo[] = [];
        for (let peer of peerList) {
            if (_.find(Array.from(this._peers.values()), (item) => {
                return item.options.nonce === peer.nonce
            })) continue;

            if (_.find(newPeers, (item) => {
                return item.nonce === peer.nonce || peer.nonce === this.nonce
            })) continue;

            newPeers.push(peer);
        }

        // Connect to new peers
        for (let peer of newPeers) {
            this.addPeer(peer)
        }

        log.debug(`connected to ${_.countBy(Array.from(this._peers.values()).map((peer) => peer.state), (state) => PeerState[state])['ONLINE']} peers`);
        log.debug(`State of the network: ${JSON.stringify(_.countBy(Array.from(this._peers.values()).map((peer) => peer.status != null && peer.state == PeerState.ONLINE ? peer.status.height : 0), (height) => height))} peers`);
        log.debug(`disconnected from ${_.countBy(Array.from(this._peers.values()).map((peer) => peer.state), (state) => PeerState[state])['OFFLINE']} peers`);
    }

    /***
     * Get a peer with the best height and activated HTTP API
     * @returns {LiskPeer}
     */
    public getBestHTTPPeer(): LiskPeer {
        let bestPeer;
        let bestHeight = 0;

        // Shuffle peers to guarantee that we use different ones every time
        let shuffledPeers = Array.from(this._peers.values());
        shuffledPeers = _.shuffle(shuffledPeers);

        for (let peer of shuffledPeers) {
            if (!peer.httpActive) continue;

            if ((peer.status ? peer.status.height : 0) >= bestHeight) {
                bestPeer = peer;
                bestHeight = peer.status ? peer.status.height : 0;
            }
        }

        return bestPeer;
    }

    /***
     * Get the best blockchain height of all peers
     * @returns {number}
     */
    public getBestHeight(): number {
        return this.bestHeight;
    }

    /***
     * Updates the peer from a status update
     * This is invoked when an updateMyself message is sent by a Lisk node
     * @param update
     */
    public handleStatusUpdate(update) {
        if (!update.nonce) return;

        const peer = this._peers.get(update.nonce);
        if (!peer) return;
        peer.handleStatusUpdate(update);
    }

    /***
     * Handles connection changes of the incoming WebSocket
     * @param {String} nonce
     * @param {Boolean} connected
     */
    private wsServerConnectionChanged(nonce: string, connected: boolean) {
        if (!this._peers.has(nonce)) return;

        const peer = this._peers.get(nonce);
        if (!peer) return;
        peer.setWebsocketServerConnected(connected);
    }

}
