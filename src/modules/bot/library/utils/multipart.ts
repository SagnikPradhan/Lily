// Types and Interfaces
type ValidValues = boolean | number | string | ValidValues[];
type MultipartValidObjType =
  Record<string, ValidValues | Record<string, ValidValues>> ;

interface FileInterface {
  file: Buffer;
  fileName: string;
}

/**
 * Multipart Data
 */
export default class Multipart {
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
