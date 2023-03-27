import './Performance'
import { CustomContext } from './CustomContext'
import { CloudflareHttpExporter } from './CloudflareHttpExporter'
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core'
import { Resource } from '@opentelemetry/resources'
import {
  AlwaysOnSampler,
  BasicTracerProvider,
  SpanExporter,
} from '@opentelemetry/sdk-trace-base'
import { CloudflareSpanProcessor } from './CloudflareSpanProcessor'
import {
  Context,
  Span,
  SpanOptions,
} from '@opentelemetry/api'
import {
  SemanticResourceAttributes,
} from '@opentelemetry/semantic-conventions'
import {
  setSpan,
} from '@opentelemetry/api/build/src/trace/context-utils'
import { HeadersTextMapper } from './HeadersTextMapper'

export const TRACER_VERSION = '0.1.0'
const headersTextMapper = new HeadersTextMapper()

/**
 * TelemetrySdk is a wrapper around the OpenTelemetry SDK that provides an easy way to
 * send traces and other OTEL telemetry data to an OTEL collector endpoint.
 */
export class TelemetrySdk {
  private propagator: CompositePropagator
  private traceProvider: BasicTracerProvider
  private readonly traceExporter: SpanExporter
  private readonly tracerIdentifier: string
  private activeContext: Context = new CustomContext()

  constructor(
    private request: Request,
    private readonly endpoint: string,
    private readonly serviceName: string,
  ) {
    this.traceProvider = new BasicTracerProvider({
      // TODO: Configure this
      sampler: new AlwaysOnSampler(),
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.CLOUD_PROVIDER]: 'cloudflare',
        [SemanticResourceAttributes.CLOUD_PLATFORM]: 'workers',
        [SemanticResourceAttributes.PROCESS_RUNTIME_NAME]: 'Cloudflare-Workers',
      }),
    })

    this.tracerIdentifier = serviceName
    this.traceProvider.register()
    this.traceExporter = new CloudflareHttpExporter(this.endpoint, {})
    const spanProcessor = new CloudflareSpanProcessor(this.traceExporter)
    this.traceProvider.addSpanProcessor(spanProcessor)
    this.propagator = new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
      ],
    })

    // extract all headers from the request
    this.activeContext = this.propagator.extract(this.activeContext, request.headers, headersTextMapper)
  }

  public startSpan(
    name: string,
    options?: SpanOptions,
    parentSpan?: Span,
  ): Span {
    const tracer = this.traceProvider.getTracer(
      this.tracerIdentifier,
      TRACER_VERSION,
    )

    if (!parentSpan) {
      return tracer.startSpan(name, options, this.activeContext)
    }

    const parentCtx = setSpan(this.activeContext, parentSpan)
    return tracer.startSpan(name, options, parentCtx)
  }

  public flushTraces(): Promise<void> {
    return this.traceProvider.forceFlush()
  }

  public getTraceProvider(): BasicTracerProvider {
    return this.traceProvider
  }

  public getPropagator(): CompositePropagator {
    return this.propagator
  }

  public getEndpoint(): string {
    return this.endpoint
  }

  public getActiveContext(): Context {
    return this.activeContext
  }

  public cloneRequest(request: Request) {
    const url = new URL(request.url);
    return new Request(url.toString(), new Request(request, {}));
  }
}
