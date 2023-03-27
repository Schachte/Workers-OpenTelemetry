import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import {
	createExportTraceServiceRequest,
	IExportTraceServiceRequest
} from "@opentelemetry/otlp-transformer";
import {
	BaseExporter,
} from "./BaseExporter";

// CloudflareHttpExporter is a generic exporter that can run within a Cloudflare Worker. Leveraging
// this as the default exporter will avoid running into errors for missing functions like XHR, issues
// with performance API, various calls to window, etc.
export class CloudflareHttpExporter extends BaseExporter<ReadableSpan, IExportTraceServiceRequest> {
	contentType = "application/json";

	convert(spans: ReadableSpan[]): IExportTraceServiceRequest {
		return createExportTraceServiceRequest(spans, true);
	}

	getUrl(): string {
        if (this.url !== undefined && this.url !== "") {
            return this.url;
        }
		throw new Error("Please ensure you provide a valid endpoint/collector URL to send your traces to.");
	}
}