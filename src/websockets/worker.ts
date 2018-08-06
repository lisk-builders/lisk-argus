import * as url from "url";
import { WAMPServer } from "./wamp/WAMPServer";

const SCWorker = require("socketcluster/scworker");

/***
 * Worker is a SocketCluster Worker that emulates basic Lisk Core behaviour and forwards status updates
 */
class Worker extends SCWorker {
  private nonce: string = "";

  rpcEndpoints = {
    updateMyself: (data: any, cb: any) => {
      this.sendToMaster({ event: "status", data: data });
      cb(null, {
        success: true,
      });
    },
    status: (data: any, cb: any) => {
      cb(null, {
        success: true,
        height: 0,
        broadhash: "fdc5dd3f40f8df693d1a3522ae408f5d2bbe03ba37cb9aa659e1c7d13ff036b1",
        nonce: this.nonce,
        httpPort: 5000,
        version: "1.0.0",
        os: "linux4.4.0-121-generic",
      });
    },
  };

  run() {
    this.scServer.on("connection", (socket: any) => {
      WAMPServer.registerWAMP(socket);
      WAMPServer.registerRPCEndpoints(socket, this.rpcEndpoints);

      const nonce = url.parse(socket.request.url, true).query.nonce;
      this.sendToMaster({ event: "connect", data: nonce });

      socket.on("close", () => {
        this.sendToMaster({ event: "disconnect", data: nonce });
      });
    });

    this.on("masterMessage", (data: any) => {
      this.nonce = data;
    });

    this.sendToMaster({ event: "request_nonce" });
  }
}

module.exports = new Worker();
