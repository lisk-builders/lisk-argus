import * as SocketCluster from 'socketcluster'
import {EventEmitter} from 'events';

/***
 * SocketServer is a server for incoming Lisk Core Websocket connections
 * It sets up a SocketCluster and updates the worker's nonce.
 */
export class SocketServer extends EventEmitter {

    /***
     * Instantiates a SocketServer
     * @param {number} port Port on which the SocketCluster will listen
     * @param {string} nonce Nonce of the Lisk Core node to emulate
     */
    constructor(readonly port: number, readonly nonce: string) {
        super();
        let socketCluster = SocketCluster.create({
            workers: 1, // Number of worker processes
            brokers: 1, // Number of broker processes
            port: port, // The port number on which your server should listen
            appName: 'lisk',
            wsEngine: 'ws',

            workerController: __dirname + '/worker.js',
            pingInterval: 5000,
            // How many milliseconds to wait without receiving a ping
            // before closing the socket
            pingTimeout: 60000,
            processTermTimeout: 10000,
            logLevel: 0,

            // Whether or not to reboot the worker in case it crashes (defaults to true)
            rebootWorkerOnCrash: true
        });


        socketCluster.on('workerMessage', (id, msg) => {
            if (msg.event === 'request_nonce') return socketCluster.sendToWorker(id, nonce);
            this.emit(msg.event, msg.data)
        });

        socketCluster.on('workerStart', (id, msg) => {
        });


        socketCluster.on('workerExit', (id, msg) => {
            console.log('worker died', id);
        })
    }
}
