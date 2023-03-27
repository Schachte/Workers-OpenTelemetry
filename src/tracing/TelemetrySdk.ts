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
  context,
  Context,
  ROOT_CONTEXT,
  Span,
  SpanOptions,
  Tracer,
} from '@opentelemetry/api'
import {
  SemanticResourceAttributes,
  SemanticAttributes,
} from '@opentelemetry/semantic-conventions'
import {
  getActiveSpan,
  setSpan,
  setSpanContext,
} from '@opentelemetry/api/build/src/trace/context-utils'

export const TRACER_VERSION = '0.1.0'

/**
 * TelemetrySdk is a wrapper around the OpenTelemetry SDK that provides an easy way to
 * send traces and other OTEL telemetry data to an OTEL collector endpoint.
 */
export class TelemetrySdk {
  private propagator: CompositePropagator
  private traceProvider: BasicTracerProvider
  private readonly traceExporter: SpanExporter
  private readonly tracerIdentifier: string
  private contextMap = new Map<Context, Span>()
  private lastActiveSpan: Span | undefined

  constructor(
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
  }

  // startSpan allows you to start a new span and either auto correlate it to
  // the parent or start a fresh new span.
  public startSpan(
    name: string,
    options?: SpanOptions,
    customCtx?: Context,
  ): Span {
    const provider = this.traceProvider.getTracer(
      this.tracerIdentifier,
      TRACER_VERSION,
    )
    return provider.startSpan(name, options, customCtx || ROOT_CONTEXT)
  }

  // startChildSpan allows you to start a new span and correlate it to the parent
  // by just passing the parent span into the function
  public startChildSpan(name: string, parentSpan: Span, options?: SpanOptions,): Span {
    const provider = this.traceProvider.getTracer(
      this.tracerIdentifier,
      TRACER_VERSION,
    )
    const parentCtx = setSpan(context.active(), parentSpan);
    return provider.startSpan(name, options, parentCtx);
  }

  public getTraceProvider(): BasicTracerProvider {
    return this.traceProvider
  }

  public getEndpoint(): string {
    return this.endpoint
  }
}
