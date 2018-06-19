import {Delegate, DelegateStatus} from '../../delegates/DelegateMonitor';
import {convertEpochToSeconds} from '../../utils/generic';
import {NotificationAdapter} from '../NotificationManager';
import * as request from 'request-promise-native'
import {DelegateDetails} from '../../peers/LiskClient';

export class RocketChatAdapter implements NotificationAdapter {
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
    }

    handleDelegateDroppedTop(delegate: DelegateDetails): void {
        this.sendMessage(this.defaultChannel,
            ':wave_tone2: *Bye Bye* :wave_tone2: \n' +
            'Delegate `' + delegate.username + '` just lost his forging position || ' +
            'Rank: `' + delegate.rank + '`\n' +
            'Network: `' + this.network + '`')
    }

    handleDelegateNewTop(delegate: DelegateDetails): void {
        this.sendMessage(this.defaultChannel,
            ':confetti_ball: *Congratulations* :confetti_ball:  \n' +
            'Delegate `' + delegate.username + '` was elevated into a forging position || ' +
            'Rank: `' + delegate.rank + '`\n' +
            'Network: `' + this.network + '`')
    }

    handleDelegateRankChanged(delegate: Delegate, delta: number): void {
    }

    handleDelegateStatusChanged(delegate: Delegate, oldStatus: DelegateStatus, newStatus: DelegateStatus): void {
        if (newStatus === DelegateStatus.FORGED_THIS_ROUND && oldStatus === DelegateStatus.AWAITING_MISSED_MORE) {
            this.sendMessage(this.defaultChannel,
                ':green_heart: *Forging resumed* :green_heart: \n' +
                'Delegate `' + delegate.details.username + '` is now forging again \n' +
                'Network: `' + this.network + '`')
        }
        else if (newStatus === DelegateStatus.MISSED_MORE && oldStatus === DelegateStatus.AWAITING_MISSED_LAST) {
            this.sendMessage(this.defaultChannel,
                ':red_circle: *Forging stopped* :red_circle: \n' +
                'Delegate `' + delegate.details.username + '` has missed more than 1 block and is :red_circle: now \n' +
                'Network: `' + this.network + '`')
        } else if (newStatus === DelegateStatus.MISSED_THIS_BLOCK && oldStatus === DelegateStatus.AWAITING_FORGED_LAST) {
            this.sendMessage(this.defaultChannel,
                ':rotating_light: *Missed Block* :rotating_light: \n' +
                'Delegate: `' + delegate.details.username + '` || ' +
                'Number of missed blocks: `' + (delegate.details.missedBlocks + 1) + '` || ' +
                'Last block: `' + (delegate.lastBlock ? RocketChatAdapter.timeSince(convertEpochToSeconds(delegate.lastBlock.timestamp)) + ' ago' : 'never') + '`\n' +
                'Network: `' + this.network + '`')
        }
    }

    static timeSince(date: number): string {

        let seconds = Math.floor((new Date().getTime() / 1000 - date));
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
