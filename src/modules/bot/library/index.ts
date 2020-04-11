// Godbless the guy who made this https://s.gus.host/flowchart.png

import c from 'centra';
import Websocket from 'ws';
import {EventEmitter} from 'events';
import os from 'os';

import Multipart from './utils/multipart';
import {
  ENDPOINTS,
  GATEWAY_VERSION,
  LIB_URL,
  LIB_VERSION,
} from './utils/constants';

interface APIReqOptsInterface {
  endpoint: string;
  headers?: {[i: string]: string};
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

interface ClientOptsInterface {
  token: string;
  intents: number[];
}

// Resources
export const Resources = {Multipart};

/**
 * Discord Client
 */
export default class Client extends EventEmitter {
  #internals: {
    options: {
      token: string;
      intents: number[];
    };
    wsUrl?: string;
    ws?: Websocket;
    lastSequenceNumber: number | null;
    heartbeat?: {
      loop?: NodeJS.Timeout;
      recievedAck?: boolean;
    };
  }

  /**
   * Create a new Discord Client
   * @param options - Client Options
   * @param token - Client token
   */
  constructor({
    token,
    intents,
  }: ClientOptsInterface) {
    super();

    if (typeof token !== 'string') throw new Error('Invalid Token');
    if (!(intents instanceof Array)) throw new Error('Invalid Intents');
    if (intents.some((intent) => typeof intent != 'number')) {
      throw new Error('Invalid Intents');
    }

    const options = {token, intents};
    this.#internals = {options, lastSequenceNumber: null};
  }

  /**
   * Make Discord API Request
   * @param options - API Request Options
   * @param endpoint - Endpoint
   * @param headers - Extra Headers
   * @param method - HTTP Method
   * @param body - Request Body
   */
  private async _apiRequest({
    endpoint, headers, method = 'GET', body,
  }: APIReqOptsInterface): Promise<unknown> {
    if (typeof endpoint !== 'string' || endpoint.length <= 0) {
      throw new Error('Invalid Endpoint');
    }

    // Default Request
    const request = c(`https://discordapp.com/api/v${GATEWAY_VERSION}`, method)
        .path(endpoint)
        .compress()
        .header({
          'Authorization': `Bot ${this.#internals.options.token}`,
          'User-Agent': `DiscordBot (${LIB_URL}, ${LIB_VERSION})`,
          ...headers,
        });

    // Multipart Body
    if (body instanceof Multipart) {
      const reqBody = body.parse();
      const boundary = body.boundary;
      request
          .body(reqBody)
          .header('Content-Type', `form-data/multipart; boundary=${boundary}`);
    // JSON Body
    } else if (typeof body === 'object') request.body(body, 'json');
    else {/* Invalid Body */}

    // Response
    const response = await request.send();
    return response.json();
  };

  /**
   * Connect to the gateway
   */
  async connect(): Promise<void> {
    const websocket = await this._connectToGateway();
    this._handleGatewayEvents(websocket);
  }

  /**
   * Connects to Gateway
   */
  private async _connectToGateway(): Promise<Websocket> {
    // Get gateway url
    const {url} = await this._apiRequest({
      endpoint: ENDPOINTS.getGatewayBot(),
    }) as {url: string; shards: number; session_start_limit: object};

    // I know this is long
    const tempUrl = new URL(url);
    tempUrl.searchParams.append('v', GATEWAY_VERSION);
    tempUrl.searchParams.append('encoding', 'json');

    const betterUrl = tempUrl.toString();

    // Set internal vaiables for maybe future reference
    this.#internals.wsUrl = betterUrl;
    const websocket = this.#internals.ws = new Websocket(betterUrl);

    return websocket;
  }

  /**
   * Handle Gateway Events
   * @param websocket - Websocket connection
   */
  private _handleGatewayEvents(websocket: Websocket): void {
    websocket.on('open', () => {
      websocket.on('message', (message) => {
        // Handle Gateway messages
        this._handleGatewayMessages(websocket, message)
            .catch((err) => this.emit('debug', err));
      });
    });
    websocket.on('error', (err) => this.emit('debug', err));
    websocket.on('close', (code) => {
      this.emit('debug', code);
    });
  }

  /**
   * Handle Gateway message
   * @param websocket - Websocket
   * @param message - Websocket message
   */
  private async _handleGatewayMessages(
      websocket: Websocket,
      message: Websocket.Data,
  ): Promise<void> {
    let payload: {
      op: number;
      d: Record<string, unknown>;
    } | {
      op: 0;
      d: Record<string, unknown>;
      s: number;
      t: string;
    };

    // Try parsing the message
    try {
      payload = JSON.parse(message.toString());
    } catch (err) {
      throw new Error('Invalid Message');
    }

    // For Debugging
    this.emit('debug', payload);

    // Based on OP Code handle recieved payloads or events
    switch (payload.op) {
      // DISPATCH
      case 0:
        break;

      // HEARTBEAT
      case 1:
        await this._sendHeartbeat(websocket);
        break;

      // RECONNECT
      case 7:
        break;

      // INVALID SESSION
      case 9:
        break;

      // HELLO
      case 10:
        // Initial Heartbeat
        await this._sendHeartbeat(websocket);
        // Send Identity Payload
        await this._sendIndentity(websocket);
        // Start heartbeat loop
        this._handleHeartBeatLoop(
          payload.d.heartbeat_interval as number, websocket,
        );
        break;

      // HEARTBEAT ACK
      case 11:
        this.#internals.heartbeat = {
          ...this.#internals.heartbeat,
          recievedAck: true,
        };
        break;
    }
  }

  /**
   * Initialise and handle heartbeat
   * @param interval - Time interval between consecutive heartbeat
   * @param websocket - Websocket
   */
  private _handleHeartBeatLoop(
      interval: number,
      websocket: Websocket,
  ): void {
    // Cancel Function
    const cancel = (err?: Error): void => {
      websocket.close();
      const loop = this.#internals.heartbeat?.loop;
      if (loop) clearInterval(loop);
      if (err) this.emit('debug', err);
    };

    // Start heartbeat loop
    this.#internals.heartbeat = {
      loop: setInterval(() => {
        // If didnt recieve ack it means a Zombied connection 🧟
        if (!this.#internals.heartbeat?.recievedAck) return cancel();
        this.#internals.heartbeat.recievedAck = false;
        this._sendHeartbeat(websocket).catch((e) => cancel(e));
      }, interval),
      recievedAck: false,
    };
  };

  /**
   * Send Heartbeat
   * @param websocket - Websocket
   */
  private _sendHeartbeat(websocket: Websocket): Promise<void> {
    return new Promise((resolve, reject) => {
      this.emit('debug', 'Sent Heartbeat');

      const payload = JSON.stringify({
        op: 1, d: this.#internals.lastSequenceNumber,
      });

      websocket.send(payload, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Send Identity Payload
   * @param websocket - Websocket
   */
  private _sendIndentity(websocket: Websocket): Promise<void> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        op: 2,
        d: {
          token: this.#internals.options.token,
          properties: {
            $os: os.platform(),
            $browser: 'Null',
            $device: 'Null',
          },
          intents: this.#internals.options.intents
              .reduce((a, c) => a + c, 0),
        },
      });

      websocket.send(payload, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// TODO: Use Custom Errors Everywhere
