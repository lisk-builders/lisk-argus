import * as events from 'events';
import {LiskClient, NodeStatus, PeerInfo} from './LiskClient';
import * as log from 'winston'
import * as _ from 'underscore'

export enum LiskPeerEvent {
    statusUpdated = "STATUS_UPDATED",
    peersUpdated = "PEERS_UPDATED",
    nodeStuck = "NODE_STUCK",
}

/***
 * LiskPeer is a wrapper for LiskClient that automatically updates the node status and keeps track of the connection
 * and checks whether the node is sane (not stuck)
 */
export class LiskPeer extends events.EventEmitter {
    public client: LiskClient;
    public peers: PeerInfo[];
    public knownBy: number = 0;
    private _lastHeightUpdate: number;
    private _stuck: boolean = false;

    constructor(readonly _options: PeerOptions, readonly ownNonce: string) {
        super();

        this.client = new LiskClient(_options.ip, _options.wsPort, _options.httpPort, {
            nonce: ownNonce,
            nethash: _options.nethash,
            version: '1.0.0',
            os: 'linux',
            height: 500,
            wsPort: _options.ownWSPort,
            httpPort: _options.ownHttpPort,
        });

        // Check whether client supports HTTP
        this.client.getStatusDetailedHTTP().then(() => this._httpActive = true).catch(() => {
        });

        // Connect via WebSocket
        this.client.connect(() => this.onClientConnect(), () => this.onClientDisconnect(), () => this.onClientError());

        // Schedule status updates
        setInterval(() => this.updateStatus(), 2000)
    }

    private _state: PeerState = PeerState.OFFLINE;

    get state(): PeerState {
        return this._state;
    }

    private _status: NodeStatus;

    get status(): NodeStatus {
        return this._status;
    }

    private _httpActive: boolean = false;

    get httpActive() {
        return this._httpActive;
    }

    private _wsServerConnected: boolean = false;

    get wsServerConnected(): boolean {
        return this._wsServerConnected;
    }

    get options(): PeerOptions {
        return this._options;
    }

    /***
     * Handles new NodeStatus received from the Peer
     * Updates sync status and triggers events in case the node is stuck
     * @param {NodeStatus} status
     */
    public handleStatusUpdate(status: NodeStatus) {
        if (!this.status || status.height > this._status.height) {
            this._lastHeightUpdate = Date.now();
            this._stuck = false;
        } else if (!this._stuck && Date.now() - this._lastHeightUpdate > 20000) {
            this._stuck = true;
            this.emit(LiskPeerEvent.nodeStuck);
        }

        // Apply new status
        if (!this._status) this._status = status;
        this._status = Object.assign(this._status, status);
        this._options.nonce = status.nonce;

        // Emit the status update
        this.emit(LiskPeerEvent.statusUpdated, status);
    }

    /***
     * Set the connection status of the websocket connection for this peer
     * @param {boolean} connected
     */
    public setWebsocketServerConnected(connected: boolean) {
        this._wsServerConnected = connected
    }

    /***
     * Destroy the peer and close/destroy the associated socket
     * This does not close the incoming socket connection
     */
    public destroy() {
        this.client.destroy();
    }

    public requestBlocks() {
        //if (this.httpActive) {
        //    this.client.getBlocksHTTP().then((blockData) => {
        //
        //    })
        //} else {
        this.client.getBlocks().then((blockData) => {
            let filteredBlocks = _
                .uniq(blockData.blocks, (entry) => entry.b_id);
        })
        //}
    }

    private onClientConnect() {
        log.debug(`connected to ${this._options.ip}:${this._options.wsPort}`);
        this._state = PeerState.ONLINE;
    }

    private onClientDisconnect() {
        log.debug(`disconnected from ${this._options.ip}:${this._options.wsPort}`);
        this._state = PeerState.OFFLINE;
    }

    private onClientError() {

    }

    /***
     * Trigger a status update
     * Updates the node status, connected peers
     */
    private updateStatus() {
        if (this._state != PeerState.ONLINE) return;

        this.client.getStatus()
            .then((status) => this.handleStatusUpdate(status))
            .then(() => this.client.getPeers())
            .then((res) => {
                this.peers = res.peers;
                this.emit(LiskPeerEvent.peersUpdated, res.peers);
            })
            .catch((err) => log.warn(`could not update status of ${this._options.ip}:${this._options.wsPort}: ${err}`));

    }
}

export enum PeerState {
    ONLINE, OFFLINE
}

export type PeerOptions = {
    ip: string,
    wsPort: number,
    httpPort: number,
    nonce: string,
    nethash: string,
    ownWSPort: number,
    ownHttpPort: number,
}

