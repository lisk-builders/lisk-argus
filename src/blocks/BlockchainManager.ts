import {PeerManager} from '../peers/PeerManager';
import {LiskPeer} from '../peers/Peer';
import {Chain} from './Chain';
import * as _ from 'underscore'
import {EventEmitter} from 'events';

/***
 * BlockchainManager keeps tracks of all chains and the associated peers on the Lisk network
 * It detects potential forks and emits events related to the peer chain association on the network.
 */
export class BlockchainManager extends EventEmitter {
    _sync = false;
    _chains: Chain[] = [];
    _peerChainMap: Map<string, number> = new Map<string, number>();
    _mainchain: string = '';

    /***
     * Instantiates a BlockchainManager
     * @param {PeerManager} peerManager The peerManager from which peer data should be pulled
     */
    constructor(readonly peerManager: PeerManager) {
        super();

        setInterval(() => this.update(), 5000)
    }

    /***
     * Runs a full update cycle
     * 1. Processes updates of peers - detect forks etc.
     * 2. Determines the new mainchain
     */
    update() {
        this.processPeers(this.peerManager.peers);
        this.determineMainchain()
        // TODO Step 3 - update chains
        // TODO Step 4 - remove stale forks
    }

    /***
     * Initializes the block cache of the assumed mainchain
     * @returns {Promise<void>}
     */
    initalizeCache(): Promise<void> {
        let peer = this.peerManager.getBestHTTPPeer();

        let chain = new Chain();

        return new Promise((resolve, reject) => {
            peer.client.getBlocksHTTP()
                .then((blocks) => chain.updateBlocks(blocks))
                .then((onChain) => {
                    this._chains.push(chain);
                    resolve()
                })
                .catch((err) => {
                    reject(err)
                })
        });
    }

    /***
     * Processes peers and their broadhash data to detect forks and associate the peer with a chain
     * @param {Array<LiskPeer>} peers
     */
    processPeers(peers: Array<LiskPeer>): void {
        // STEP 0 - remove stale peers
        for (let peer of this._peerChainMap.keys()) {
            if (!_.contains(peers.map((peer) => peer.status ? peer.status.nonce : ''), peer)) {
                this._peerChainMap.delete(peer);
            }
        }

        // STEP 1 - Process peers - update chains
        // Fork if needed
        for (let peer of peers) {
            if (peer.status == null) continue;

            let peerChain;
            for (let chain of this._chains) {
                if (chain.checkOnChainAndUpdate(peer.status)) {
                    peerChain = chain
                }
            }

            if (peerChain == null) {
                if (this._peerChainMap.has(peer.status.nonce)) {
                    // Forked from an existing chain
                    let oldChain = _.find(this._chains, (chain) => {
                        return chain.id == this._peerChainMap.get(peer.status.nonce);
                    });

                    let newChain = new Chain(...oldChain.blocks.slice(0, oldChain.blocks.length - 1));
                    // Push the new block to the chain
                    newChain.checkOnChainAndUpdate(peer.status);

                    // Add new chain to list
                    this._chains.push(newChain);
                    // Join new chain
                    this._peerChainMap.set(peer.status.nonce, newChain.id);

                    console.log('FORK', peer.status.nonce, peer.status.height, peer.status.broadhash);
                    this.emit('FORK', peer.status.nonce, newChain.id)
                } else {
                    // Forked with unknown parent chain using initial block
                    let newChain = new Chain({broadhash: peer.status.broadhash, height: peer.status.height, id: ''});

                    // Add new chain to list
                    this._chains.push(newChain);
                    // Join new chain
                    this._peerChainMap.set(peer.status.nonce, newChain.id);

                    this.emit('FORK_UNKNOWN_CHAIN', peer.status.nonce, newChain.id);
                    console.log('FORK_UNKNOWN_CHAIN', peer.status.nonce);
                }
            } else if (!this._peerChainMap.has(peer.status.nonce)) {
                // Client joined chain for the first time
                this._peerChainMap.set(peer.status.nonce, peerChain.id);
                this.emit('CHAIN_JOINED', peer);
                console.log('CHAIN_JOINED', peer.status.nonce);
            } else if (this._peerChainMap.get(peer.status.nonce) != peerChain.id) {
                // Moved to another chain
                this._peerChainMap.set(peer.status.nonce, peerChain.id);
                this.emit('CHAIN_CHANGED', peer);
                console.log('CHAIN_CHANGED', peer.status.nonce);
            } else {
                // Healthy and on the same chain
                //console.log('HEALTHY', peer.status.nonce);
            }
        }
    }

    /***
     * Determine which of the managed chains is the mainchain
     */
    private determineMainchain(): void {
        const chainStats = _.countBy(Array.from(this._peerChainMap.values()), (chainID) => chainID);
        let bestPeerNumber = 0;
        let bestChain;

        for (let chainID in chainStats) {
            const peerNumber = chainStats[chainID];
            if (peerNumber > bestPeerNumber) {
                bestChain = chainID;
                bestPeerNumber = peerNumber;
            }
        }

        this._mainchain = bestChain;
    }
}
