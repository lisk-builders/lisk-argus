import { DelegateDetails } from "libargus";

import { Delegate, DelegateMonitor, DelegateStatus } from "../delegates/DelegateMonitor";
import { RocketChatAdapter } from "./rocket/adapter";
import { TelegramAdapter } from "./telegram/adapter";

const config = require("../../src/config.json");

export class NotificationManager {
  private adapters: NotificationAdapter[] = [];

  constructor(delegateMonitor: DelegateMonitor) {
    delegateMonitor.on(DelegateMonitor.EVENT_DELEGATE_BLOCK_MISSED, delegate =>
      this.adapters.forEach(adapter => adapter.handleMissedBlock(delegate)),
    );
    delegateMonitor.on(
      DelegateMonitor.EVENT_DELEGATE_STATUS_CHANGED,
      (delegate, oldStatus, newStatus) =>
        this.adapters.forEach(adapter =>
          adapter.handleDelegateStatusChanged(delegate, oldStatus, newStatus),
        ),
    );
    delegateMonitor.on(DelegateMonitor.EVENT_DELEGATE_RANK_CHANGE, (delegate, delta) =>
      this.adapters.forEach(adapter => adapter.handleDelegateRankChanged(delegate, delta)),
    );
    delegateMonitor.on(DelegateMonitor.EVENT_DELEGATE_DROPPED_TOP, delegate =>
      this.adapters.forEach(adapter => adapter.handleDelegateDroppedTop(delegate)),
    );
    delegateMonitor.on(DelegateMonitor.EVENT_DELEGATE_NEW_TOP, delegate =>
      this.adapters.forEach(adapter => adapter.handleDelegateNewTop(delegate)),
    );

    if (config.notifications.riot.active) {
      const riot = new RocketChatAdapter(
        config.notifications.riot.host,
        config.notifications.riot.username,
        config.notifications.riot.password,
        config.notifications.riot.defaultChannel,
        config.notifications.riot.nameMappings,
        "betanet",
      );
      this.adapters.push(riot);
    }

    if (config.notifications.telegram.active) {
      const telegram = new TelegramAdapter(config.notifications.telegram.botToken, "betanet");
      this.adapters.push(telegram);
    }
  }
}

export interface NotificationAdapter {
  handleMissedBlock(delegate: Delegate): void;

  handleDelegateStatusChanged(
    delegate: Delegate,
    oldStatus: DelegateStatus,
    newStatus: DelegateStatus,
  ): void;

  handleDelegateRankChanged(delegate: DelegateDetails, delta: number): void;

  handleDelegateNewTop(delegate: DelegateDetails): void;

  handleDelegateDroppedTop(delegate: DelegateDetails): void;
}
