/**
 * A light implementation for a WAMP server over SocketCluster
 */
export class WAMPServer {
  /***
   * Upgrades the socket to a WAMP capable socket
   * @param socket
   */
  public static registerWAMP(socket: any): void {
    socket.on("rpc-request", (req: any, res: any) => {
      this.processWampRequest(socket, req, res);
    });
    socket.endpoints = { rpc: {} };
  }

  private static processWampRequest(socket: any, req: any, res: any): void {
    if (socket.endpoints.rpc[req.procedure]) {
      socket.endpoints.rpc[req.procedure](req.data, (err: any, data: any) => {
        res(err, {
          type: "/RPCResponse",
          data: data,
        });
      });
    } else {
      return res(
        `Procedure ${req.procedure} not registered on WAMPServer. Available commands: ${
          socket.endpoints.rpc
        }`,
      );
    }
  }

  /***
   * Registers RPC endpoints on the given socket
   * registerWAMP must be called on the socket in advance
   * @param socket
   * @param endpoints
   */
  public static registerRPCEndpoints(socket: any, endpoints: any): void {
    socket.endpoints.rpc = Object.assign(socket.endpoints.rpc, endpoints);
  }
}
