declare module '@nestjs/platform-express';

declare module 'socket.io' {
  export class Server {
    to(room: string): Socket;
    emit(event: string, ...args: any[]): void;
    readonly sockets: any;
  }
  export class Socket {
    id: string;
    handshake: any;
    data: any;
    join(room: string): void;
    leave(room: string): void;
    emit(event: string, ...args: any[]): void;
    disconnect(): void;
  }
  export interface ServerOptions {
    cors?: any;
    transports?: string[];
  }
}
