import {Delegate, DelegateStatus} from '../../delegates/DelegateMonitor';
import {NotificationAdapter} from '../NotificationManager';
import {DelegateDetails} from '../../peers/LiskClient';

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync');
const Telegraf = require('telegraf');

export class TelegramAdapter implements NotificationAdapter {
    private bot;
    private db;

    constructor(readonly botToken) {
        this.bot = new Telegraf(botToken);

        const adapter = new FileSync('db.json');
        this.db = low(adapter);
        this.db.defaults({missedBlocks: [], delegates: []})
            .write();

        this.setupListeners();

        this.bot.startPolling()
    }

    setupListeners(): void {
        this.bot.start((ctx) => ctx.reply('Hello fellow Lisker 👋!\n' +
            'My name is A.R.G.U.S. and I am here to notify you about events on the Lisk network.\n' +
            'You can register for the following information:\n' +
            '/delegate <name> - Receive updates if something happens to this delegate (missed blocks, rank changes, forging status changes)\n' +
            '/missedBlocks - Receive a notification if any blocks are missed on the network'+
            'Please also consider supporting my development by donating to delegate slamper'
        ))
        ;

        this.bot.command('delegate', (ctx) => {
            if (ctx.message.text.split(' ').length != 2) {
                ctx.reply('Please use the command like this:\n /delegate followed by the delegate name')
            } else {
                const delegate = ctx.message.text.split(' ')[1];

                const dbEntry = this.db.get('delegates').find({id: ctx.chat.id}).value();
                if (dbEntry == null) {
                    this.db.get('delegates').push({id: ctx.chat.id, name: delegate}).write();
                    ctx.reply(':+1: You will now receive updates on the delegate \'' + delegate + '\'');
                } else {
                    this.db.get('delegates').remove({id: ctx.chat.id}).write();
                    ctx.reply(':+1: You will not receive updates on the delegate \'' + delegate + '\' anymore.');
                }
            }
        });
        this.bot.command('missedBlocks', (ctx) => {
            const dbEntry = this.db.get('missedBlocks').find({id: ctx.chat.id}).value();
            if (dbEntry == null) {
                this.db.get('missedBlocks').push({id: ctx.chat.id}).write();
                ctx.reply('You will now receive updates on missed blocks.')
            } else {
                this.db.get('missedBlocks').remove({id: ctx.chat.id}).write();
                ctx.reply('You will not receive updates on missed blocks anymore.')
            }
        })
    }

    handleMissedBlock(delegate: Delegate): void {
        const recipients = this.db.get('missedBlocks').value();

        //TODO
    }

    handleDelegateDroppedTop(delegate: DelegateDetails): void {

    }

    handleDelegateNewTop(delegate: DelegateDetails): void {
    }

    handleDelegateRankChanged(delegate: Delegate, delta: number): void {
    }

    handleDelegateStatusChanged(delegate: Delegate, oldStatus: DelegateStatus, newStatus: DelegateStatus): void {
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
