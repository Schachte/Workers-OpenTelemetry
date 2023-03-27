import { diag } from '@opentelemetry/api'
import {
  baggageUtils,
  ExportResult,
  ExportResultCode,
} from '@opentelemetry/core'
import {
  configureExporterTimeout,
  ExportServiceError,
  OTLPExporterConfigBase,
  OTLPExporterError,
  parseHeaders,
} from '@opentelemetry/otlp-exporter-base'

export abstract class BaseExporter<ExportItem, ServiceRequest> {
  private DEFAULT_HEADERS: Record<string, string> = {}

  protected readonly url: string
  protected _sendingPromises: Promise<unknown>[] = []
  protected headers: Record<string, string>

  constructor(url: string, headers: any) {
    this.url = url
    this.headers = Object.assign(this.DEFAULT_HEADERS, parseHeaders(headers))
  }

  export(
    items: ExportItem[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    this._export(items)
      .then(() => {
        resultCallback({ code: ExportResultCode.SUCCESS })
      })
      .catch((error: ExportServiceError) => {
        resultCallback({ code: ExportResultCode.FAILED, error })
      })
  }

  private _export(items: ExportItem[]): Promise<unknown> {
    diag.debug('items to be sent', items)
    return this.send(items)
  }

  send(items: ExportItem[]): Promise<void> {
    const serviceRequest = this.convert(items)
    let body: string | Uint8Array =
      serviceRequest instanceof Uint8Array
        ? serviceRequest
        : JSON.stringify(serviceRequest)

    const responseBuffer = new Response(body)

    const promise = fetch(this.url, {
      method: 'POST',
      headers: {
        'content-type': this.contentType,
        ...responseBuffer.headers,
        ...this.headers,
      },
      body: responseBuffer.body,
    })
      .then((res) => {
        if (!res.ok) {
          throw new OTLPExporterError(res.statusText, res.status)
        }
      })
      .catch((error) => {
        throw new OTLPExporterError(
          `There was an error sending spans:\n\t${error}\nDouble check that your exporter URL is correct and the endpoint is valid.`,
        )
      })

    this._sendingPromises.push(promise)
    return promise
  }

  shutdown(): Promise<void> {
    throw new Error('Shutdown is not supported by this exporter.')
  }

  abstract contentType: string
  abstract convert(objects: ExportItem[]): ServiceRequest
}
