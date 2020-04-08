// Godbless the guy who made this https://s.gus.host/flowchart.png

import c from 'centra';
import Websocket from 'ws';

// Constants
const LIB_VERSION = 0;
const LIB_URL = 'no-url';
const GATEWAY_VERSION = '6';
const ENDPOINTS = {
  getGatewayBot: () => '/gateway/bot',
} as const;

// Types and Interfaces
type CustomObjType<T> = {[key: string]: T};
type ValidValues = boolean | number | string | ValidValues[];
type MultipartValidObjType =
  CustomObjType<ValidValues | CustomObjType<ValidValues>> ;

interface FileInterface {
  file: Buffer;
  fileName: string;
}

interface APIReqOptsInterface {
  endpoint: string;
  headers?: {[i: string]: string};
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

interface ClientOptsInterface {
  token: string;
}

/**
 * Multipart Data
 */
class Multipart {
  public readonly boundary = '966853828642832635284737392';
  #data: [string, MultipartValidObjType | FileInterface][];

  /**
   * Create Multipart Form Data
   * @param data - Object to be sent as Multipart
   */
  constructor(data = {}) {
    this.#data = Object.entries(data);
  }

  /**
   * Add data or property
   * @param name - Name of the data or property
   * @param data - Data to be appended
   */
  append(name: string, data: MultipartValidObjType | FileInterface): void {
    this.#data.push([name, data]);
  }

  /**
   * Parse the Multipart into string
   */
  parse(): string {
    const lines: string[] = [];
    const data = this.#data;
    const length = this.#data.length;
    const boundary = this.boundary;

    // Body
    for (let index = 0; index < length; index++) {
      const [name, value] = data[index];
      const isFile = name === 'file';

      // New segment start
      lines.push(`--${boundary}`);

      // For files
      if (isFile) {
        if (!(value.file instanceof Buffer)) throw new Error('Invalid File');
        // If file is Buffer
        else {
          const file = value.file;
          const fileName = value.fileName || 'unknown';

          lines.push(
              `Content-Disposition: file; name="file"; filename="${fileName}"`,
          );
          lines.push('Content-Type: application/octet-stream');
          lines.push('');
          lines.push(file.toString());
        }
      // For Payloads
      } else {
        if (typeof value !== 'object') throw new Error('Invalid Payload');

        lines.push(`Content-Disposition: form-data; name="${name}"`);
        lines.push('Content-Type: application/json');
        lines.push('');

        // Try parsing the object
        try {
          lines.push(JSON.stringify(value));
        } catch (err) {
          throw new Error('Invalid Payload');
        }
      }
    }

    // End
    lines.push(`--${boundary}--`);
    return lines.join('\r\n');
  }
}

// Resources
export const Resources = {Multipart};

/**
 * Discord Client
 */
export default class Client {
  #internals: {
    token: string;
    wsUrl?: string;
    ws?: Websocket;
  }

  /**
   * Create a new Discord Client
   * @param options - Client Options
   * @param token - Client token
   */
  constructor({
    token,
  }: ClientOptsInterface) {
    if (typeof token !== 'string') throw new Error('Invalid Token');

    this.#internals = {token};
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
          'Authorization': `Bot ${this.#internals.token}`,
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
  private _handleGatewayEvents(websocket: Websocket): Promise<void> {
    return new Promise((resolve, reject) => {
      websocket.on('message', (message) => {
        // Handle Gateway messages
        this._handleGatewayMessages(message)
            .catch((err) => reject(err));
      });

      websocket.on('open', () => resolve());
      websocket.on('error', (err) => reject(err));
    });
  }

  /**
   * Handle Gateway message
   * @param message - Websocket message
   */
  private async _handleGatewayMessages(message: Websocket.Data): Promise<void> {
    let payload: {
      op: number;
      d: CustomObjType<unknown>;
    } | {
      op: 0;
      d: CustomObjType<unknown>;
      s: number;
      t: string;
    };

    // Try parsing the message
    try {
      payload = JSON.parse(message.toString());
    } catch (err) {
      throw new Error('Invalid Message');
    }

    console.log(payload);

    // Based on OP Code handle recieved payloads or events
    switch (payload.op) {
      // DISPATCH
      case 0:
        break;

      // HEARTBEAT
      case 1:
        break;

      // RECONNECT
      case 7:
        break;

      // INVALID SESSION
      case 9:
        break;

      // HELLO
      case 10:
        break;

      // HEARTBEAT ACK
      case 11:
        break;
    }
  }
}

// TODO: Use Custom Errors Everywhere
