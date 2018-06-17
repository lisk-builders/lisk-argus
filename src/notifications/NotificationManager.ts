import {Delegate, DelegateMonitor, DelegateStatus} from '../delegates/DelegateMonitor';
import {BlockchainManager} from '../blocks/BlockchainManager';
import {PeerManager} from '../peers/PeerManager';
import * as request from 'request-promise-native'
import {getTimeFromBlockchainEpoch} from '../utils/generic';

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
            const riot = new LiskChatAdapter(config.notifications.riot.host, config.notifications.riot.username, config.notifications.riot.password, '@slamper', 'betanet');
            this.adapters.push(riot)
        }
    }

}

export interface NotificationAdapter {
    handleMissedBlock(delegate: Delegate): void;

    handleDelegateStatusChanged(delegate: Delegate, oldStatus: DelegateStatus, newStatus: DelegateStatus): void;

    handleDelegateRankChanged(delegate: Delegate, delta: number): void;

    handleDelegateNewTop(delegate: Delegate): void;

    handleDelegateDroppedTop(delegate: Delegate): void;

}

export class LiskChatAdapter implements NotificationAdapter {
    private authSession;

    constructor(readonly host, readonly username, readonly password, readonly defaultChannel, readonly network) {
        this.authenticate()
    }

    authenticate(): Promise<void> {
        const options = {
            method: 'POST',
            url: `${this.host}/api/v1/login`,
            headers: {'content-type': 'application/json'},
            body: {user: this.username, password: this.password},
            json: true,
        };

        return request(options).then((resp) => {
            this.authSession = resp.data;
        });
    }

    sendMessage(channel: string, message: string): Promise<void> {
        const options = {
            method: 'POST',
            url: `${this.host}/api/v1/chat.postMessage`,
            headers:
                {
                    'content-type': 'application/json',
                    'x-user-id': this.authSession.userId,
                    'x-auth-token': this.authSession.authToken
                },
            body:
                {
                    channel: channel,
                    text: message
                },
            json: true,
        };

        return request(options).then(() => {
        });
    }

    handleMissedBlock(delegate: Delegate): void {
        this.sendMessage(this.defaultChannel,
            ':rotating_light: *Missed Block* :rotating_light: \n' +
            'Delegate: `' + delegate.details.username + '`\n' +
            'Number of missed blocks: `' + (delegate.details.missedBlocks + 1) + '`\n' +
            'Last block: `' + (delegate.lastBlock ? LiskChatAdapter.timeSince(getTimeFromBlockchainEpoch(delegate.lastBlock.timestamp)) + ' ago' : 'never') + '`\n' +
            'Network: `' + this.network + '`')
    }

    handleDelegateDroppedTop(delegate: Delegate): void {
    }

    handleDelegateNewTop(delegate: Delegate): void {
    }

    handleDelegateRankChanged(delegate: Delegate, delta: number): void {
    }

    handleDelegateStatusChanged(delegate: Delegate, oldStatus: DelegateStatus, newStatus: DelegateStatus): void {

    }

    static timeSince(date: number): string {

        let seconds = Math.floor((new Date().getUTCMilliseconds() - date) / 1000);
        let interval = Math.floor(seconds / 31536000);

        if (interval > 1) {
            return interval + ' years';
        }
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) {
            return interval + ' months';
        }
        interval = Math.floor(seconds / 86400);
        if (interval > 1) {
            return interval + ' days';
        }
        interval = Math.floor(seconds / 3600);
        if (interval > 1) {
            return interval + ' hours';
        }
        interval = Math.floor(seconds / 60);
        if (interval > 1) {
            return interval + ' minutes';
        }
        return Math.floor(seconds) + ' seconds';
    }
}
