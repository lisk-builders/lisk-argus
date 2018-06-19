## lisk_argus

Lisk Argus is a monitoring software that keeps track of the Lisk network.

It utilizes the websocket inter-node communication protocol to query data from all nodes on the network.

Data collected includes:

* Individual node status
    * Height
    * Version
    * Fork Status
    * Block propagation speed (soon)
* Delegate status
    * Rank changes
    * Missed blocks
    * Delegate Status changes
        * Stop forging
        * Resume forging
* Blockchain Status
    * Fork Detection
    * Fork Monitoring - tracking forked chains

### How to run

Clone the repository

``git clone https://github.com/lisk-builders/lisk_argus``

Install all the dependencies

``npm install`` or ``yarn``

Update the config file ```config.json```. The default config file is configured to run on the current version of the Lisk betanet.

Run the monitor

``npm start``

### Implement own notification adapters

To implement new notification adapters create a class that implements the ``NotificationAdapter`` and register it in the ``NotificationManager``

The events are self-explanatory
