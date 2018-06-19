import {Delegate, DelegateMonitor, DelegateStatus} from '../delegates/DelegateMonitor';
import {BlockchainManager} from '../blocks/BlockchainManager';
import {PeerManager} from '../peers/PeerManager';
import {DelegateDetails} from '../peers/LiskClient';
import {RocketChatAdapter} from './rocket/adapter';
import {TelegramAdapter} from './telegram/adapter';

const config = require('../config.json');

export class NotificationManager {
    private adapters: NotificationAdapter[] = [];

    constructor(readonly delegateMonitor: DelegateMonitor, blockchainManager: BlockchainManager, PeerManager: PeerManager) {

        delegateMonitor.on(DelegateMonitor.EVENT_DELEGATE_BLOCK_MISSED, (delegate) => this.adapters.forEach((adapter) => adapter.handleMissedBlock(delegate)));
        delegateMonitor.on(DelegateMonitor.EVENT_DELEGATE_STATUS_CHANGED, (delegate, oldStatus, newStatus) => this.adapters.forEach((adapter) => adapter.handleDelegateStatusChanged(delegate, oldStatus, newStatus)));
        delegateMonitor.on(DelegateMonitor.EVENT_DELEGATE_RANK_CHANGE, (delegate, delta) => this.adapters.forEach((adapter) => adapter.handleDelegateRankChanged(delegate, delta)));
        delegateMonitor.on(DelegateMonitor.EVENT_DELEGATE_DROPPED_TOP, (delegate) => this.adapters.forEach((adapter) => adapter.handleDelegateDroppedTop(delegate)));
        delegateMonitor.on(DelegateMonitor.EVENT_DELEGATE_NEW_TOP, (delegate) => this.adapters.forEach((adapter) => adapter.handleDelegateNewTop(delegate)));

        if (config.notifications.riot.active) {
            const riot = new RocketChatAdapter(config.notifications.riot.host, config.notifications.riot.username, config.notifications.riot.password, config.notifications.riot.defaultChannel, 'betanet');
            this.adapters.push(riot)
        }

        if (config.notifications.telegram.active) {
            const telegram = new TelegramAdapter(config.notifications.telegram.botToken);
            this.adapters.push(telegram)
        }
    }

}

export interface NotificationAdapter {
    handleMissedBlock(delegate: Delegate): void;

    handleDelegateStatusChanged(delegate: Delegate, oldStatus: DelegateStatus, newStatus: DelegateStatus): void;

    handleDelegateRankChanged(delegate: Delegate, delta: number): void;

    handleDelegateNewTop(delegate: DelegateDetails): void;

    handleDelegateDroppedTop(delegate: DelegateDetails): void;

}
