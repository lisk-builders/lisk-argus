import { Delegate, DelegateStatus } from "../../delegates/DelegateMonitor";
import { NotificationAdapter } from "../NotificationManager";
import { DelegateDetails } from "../../peers/LiskClient";
import { RocketChatAdapter } from "../rocket/adapter";
import { convertEpochToSeconds } from "../../utils/generic";

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const Telegraf = require("telegraf");

export class TelegramAdapter implements NotificationAdapter {
  private bot;
  private db;

  constructor(readonly botToken, readonly network) {
    this.bot = new Telegraf(botToken);

    const adapter = new FileSync("db.json");
    this.db = low(adapter);
    this.db.defaults({ missedBlocks: [], delegates: [] }).write();

    this.setupListeners();

    this.bot.startPolling();
  }

  setupListeners(): void {
    this.bot.start(ctx =>
      ctx.replyWithMarkdown(
        "Hello fellow Lisker 👋!\n" +
          "My name is A.R.G.U.S. and I am here to notify you about events on the Lisk network.\n" +
          "You can register for the following information:\n\n" +
          "/delegate `<name>` - Receive updates if something happens to this delegate (missed blocks, rank changes, forging status changes)\n" +
          "/missedBlocks - Receive a notification if any blocks are missed on the network\n\n" +
          "Please also consider supporting my development by donating to delegate `slamper` `16863632246347444618L`",
      ),
    );

    this.bot.command("delegate", ctx => {
      if (ctx.message.text.split(" ").length != 2) {
        ctx.reply("Please use the command like this:\n /delegate followed by the delegate name");
      } else {
        const delegate = ctx.message.text.split(" ")[1];

        const dbEntry = this.db
          .get("delegates")
          .find({ id: ctx.chat.id, name: delegate })
          .value();
        if (dbEntry == null) {
          this.db
            .get("delegates")
            .push({ id: ctx.chat.id, name: delegate })
            .write();
          ctx.reply("👍🏼 You will now receive updates on the delegate `" + delegate + "`");
        } else {
          this.db
            .get("delegates")
            .remove({ id: ctx.chat.id })
            .write();
          ctx.reply("👍🏼 You will not receive updates on the delegate `" + delegate + "` anymore.");
        }
      }
    });
    this.bot.command("missedBlocks", ctx => {
      const dbEntry = this.db
        .get("missedBlocks")
        .find({ id: ctx.chat.id })
        .value();
      if (dbEntry == null) {
        this.db
          .get("missedBlocks")
          .push({ id: ctx.chat.id })
          .write();
        ctx.reply("You will now receive updates on missed blocks.");
      } else {
        this.db
          .get("missedBlocks")
          .remove({ id: ctx.chat.id })
          .write();
        ctx.reply("You will not receive updates on missed blocks anymore.");
      }
    });
  }

  handleMissedBlock(delegate: Delegate): void {
    const recipients = this.db.get("missedBlocks").value();
    if (!recipients) return;

    recipients.forEach(recipient => {
      if (!delegate.details) return;
      this.bot.telegram.sendMessage(
        recipient.id,
        "🚨 *Missed Block* 🚨 \n" +
          "Delegate: `" +
          delegate.details.username +
          "` \n" +
          "Number of missed blocks: `" +
          (delegate.details.missedBlocks + 1) +
          "` \n" +
          "Last block: `" +
          (delegate.lastBlock
            ? RocketChatAdapter.timeSince(convertEpochToSeconds(delegate.lastBlock.timestamp)) +
              " ago"
            : "never") +
          "`\n" +
          "Network: `" +
          this.network +
          "`",
        { parse_mode: "markdown" },
      );
    });
  }

  handleDelegateDroppedTop(delegate: DelegateDetails): void {
    const recipients = this.db
      .get("delegates")
      .filter({ name: delegate.username })
      .value();
    if (!recipients) return;

    recipients.forEach(recipient => {
      this.bot.telegram.sendMessage(
        recipient.id,
        "👋 *Bye Bye* 👋 \n" +
          "Delegate `" +
          delegate.username +
          "` just lost his forging position || " +
          "Rank: `" +
          delegate.rank +
          "`\n" +
          "Network: `" +
          this.network +
          "`",
        { parse_mode: "markdown" },
      );
    });
  }

  handleDelegateNewTop(delegate: DelegateDetails): void {
    const recipients = this.db
      .get("delegates")
      .filter({ name: delegate.username })
      .value();
    if (!recipients) return;

    recipients.forEach(recipient => {
      this.bot.telegram.sendMessage(
        recipient.id,
        "🎊 *Congratulations* 🎊 \n" +
          "Delegate `" +
          delegate.username +
          "` was elevated into a forging position \n" +
          "Rank: `" +
          delegate.rank +
          "`\n" +
          "Network: `" +
          this.network +
          "`",
        { parse_mode: "markdown" },
      );
    });
  }

  handleDelegateRankChanged(delegate: DelegateDetails, delta: number): void {
    const recipients = this.db
      .get("delegates")
      .filter({ name: delegate.username })
      .value();
    if (!recipients) return;

    recipients.forEach(recipient => {
      this.bot.telegram.sendMessage(
        recipient.id,
        "*Rank change* \n" +
          "Delegate `" +
          delegate.username +
          "` \n" +
          "Rank: `" +
          delegate.rank +
          " (" +
          (delta > 0 ? "+" : "-") +
          Math.abs(delta) +
          ")`\n" +
          "Network: `" +
          this.network +
          "`",
        { parse_mode: "markdown" },
      );
    });
  }

  handleDelegateStatusChanged(
    delegate: Delegate,
    oldStatus: DelegateStatus,
    newStatus: DelegateStatus,
  ): void {
    if (!delegate.details) return;
    const recipients = this.db
      .get("delegates")
      .filter({ name: delegate.details.username })
      .value();
    if (!recipients) return;

    if (
      newStatus === DelegateStatus.FORGED_THIS_ROUND &&
      oldStatus === DelegateStatus.AWAITING_MISSED_MORE
    ) {
      recipients.forEach(recipient => {
        if (!delegate.details) return;
        this.bot.telegram.sendMessage(
          recipient.id,
          "💚 *Forging resumed* 💚 \n" +
            "Delegate `" +
            delegate.details.username +
            "` is now forging again \n" +
            "Network: `" +
            this.network +
            "`",
          { parse_mode: "markdown" },
        );
      });
    } else if (
      newStatus === DelegateStatus.MISSED_MORE &&
      oldStatus === DelegateStatus.AWAITING_MISSED_LAST
    ) {
      recipients.forEach(recipient => {
        if (!delegate.details) return;
        this.bot.telegram.sendMessage(
          recipient.id,
          "🔴 *Forging stopped* 🔴 \n" +
            "Delegate `" +
            delegate.details.username +
            "` has missed more than 1 block and is :red_circle: now \n" +
            "Network: `" +
            this.network +
            "`",
          { parse_mode: "markdown" },
        );
      });
    }
  }

  static timeSince(date: number): string {
    let seconds = Math.floor(new Date().getTime() / 1000 - date);
    let interval = Math.floor(seconds / 31536000);

    if (interval > 1) {
      return interval + " years";
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
      return interval + " months";
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
      return interval + " days";
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
      return interval + " hours";
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
      return interval + " minutes";
    }
    return Math.floor(seconds) + " seconds";
  }
}
