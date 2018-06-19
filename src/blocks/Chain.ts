import * as crypto from 'crypto';
import {Block, NodeStatus} from '../peers/LiskClient';
import * as _ from 'underscore'

/***
 * Chain represents a chain on the Lisk network
 */
export class Chain {
    /***
     * Creates a new chain
     * @param {BlockStamp} blocks optional blockStamps to initialize the chain with
     */
    constructor(...blocks: BlockStamp[]) {
        this._id = Math.floor(Math.random() * 1000);

        if (blocks) {
            for (let block of blocks) {
                this._blocks.set(block.height, block)
            }
        }
    }

    private _blocks: Map<number, BlockStamp> = new Map<number, BlockStamp>();

    get blocks(): BlockStamp[] {
        return Array.from(this._blocks.values())
    }

    private _id: number;

    get id(): number {
        return this._id;
    }

    /***
     * Update the chain from blocks received by the Lisk HTTP Api
     * Calculates progressive broadhash and stores it
     * @param {Array<Block>} blocks
     * @returns {boolean}
     */
    public updateBlocks(blocks: Array<Block>): boolean {
        for (let i = 0; i < blocks.length - 5; i++) {
            let block = blocks[i];
            let blockstamp: BlockStamp = {
                id: block.id,
                height: block.height,
                broadhash: ''
            };

            const seed = blocks.slice(i, i + 5).map(row => row.id).join('');
            blockstamp.broadhash = crypto
                .createHash('sha256')
                .update(seed, 'utf8')
                .digest()
                .toString('hex');

            // Compare broadhash instead of ID because ID is not always known
            if (this._blocks.has(block.height) && this._blocks.get(block.height).broadhash != blockstamp.broadhash) {
                return false;
            } else {
                this._blocks.set(block.height, blockstamp);
            }
        }
        return true
    }

    /***
     * Checks whether the node with the give status is on this chain and updates the chain if the node has
     * a new block.
     * @param {NodeStatus} status
     * @param force
     * @returns {boolean}
     */
    public checkOnChainAndUpdate(status: NodeStatus, force?: boolean): boolean {
        if (!this._blocks.has(status.height)) {
            // Node is probably stuck or on another chain
            if (!force && Math.abs(this.getBestHeight() - status.height) > 50) return false;

            let block = {
                id: '',
                height: status.height,
                broadhash: status.broadhash,
            };
            this._blocks.set(status.height, block);
        }

        return this._blocks.get(status.height).broadhash === status.broadhash;
    }

    /***
     * Get the height of the best block on the chain
     * @returns {number}
     */
    public getBestHeight(): number {
        return _.max(Array.from(this._blocks.keys()))
    }
}

/***
 * A BlockStamp marks the blockID (optional) and broadhash at a given height
 */
export interface BlockStamp {
    id: string,
    height: number,
    broadhash: string
}
