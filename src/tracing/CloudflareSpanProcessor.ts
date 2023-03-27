import { Context } from "@opentelemetry/api";
import { ExportResultCode } from "@opentelemetry/core";
import {
	ReadableSpan,
	Span,
	SpanExporter,
	SpanProcessor
} from "@opentelemetry/sdk-trace-base";

/**
 * CloudflareSpanProcessor is a custom SpanProcessor that exports spans to the
 * configured HTTP endpoint. This endpoint would be something like OTEL collector 
 * endpoint over HTTP or grpc. This can also leverage the collector endpoint 
 * from Jaeger all-in-one image with OTEL collector enabled.
 */
export class CloudflareSpanProcessor implements SpanProcessor {
    private spans = new Set<ReadableSpan>();
	constructor(private exporter: SpanExporter) {}

	forceFlush(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.exporter.export(Array.from(this.spans), result => {
				if (result.code === ExportResultCode.SUCCESS) {
					this.spans.clear();
					resolve();
				} else {
					reject(result.error);
				}
			});
		});
	}

	onStart(_: Span, __: Context): void {}

	onEnd(span: ReadableSpan): void {
		this.spans.add(span);
	}

	shutdown(): Promise<void> {
		throw new Error("Method not implemented.");
	}
}