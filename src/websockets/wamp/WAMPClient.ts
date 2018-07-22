/**
 * A light implementation for a WAMP client over SocketCluster
 */
export class WAMPClient {
    /***
     * Upgrades the socket to a WAMP capable socket
     * @param socket
     */
    public static registerWAMP(socket): void {
        socket.call = (procedure, data) => new Promise((resolve, reject) => {
            socket.emit('rpc-request', {type: '/RPCRequest', procedure, data}, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    if (result) {
                        resolve(result.data);
                    } else  {
                        resolve();
                    }
                }
            });
        })
    }

}
