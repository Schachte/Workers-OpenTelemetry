# OpenTelemetry Tracing on Cloudflare Workers

OpenTelemetry is a great project that defines the standard and future of distributed tracing/telemetry. Unfortunately, some of the libraries that implement the spec don't fully work in Cloudflare Workers. This is due to a scattered mix of XHRrequests and window references in the codebase that don't run in v8 isolates. 

Luckily, the OTEL abstractions provide enough of a base layer for us to implement our own with little effort. Heavily inspired [by RichiCoder1](https://github.com/RichiCoder1/opentelemetry-sdk-workers), but simplified without support for logging, etc.

## Terminology

## Example Usage

```
const sdk = new TelemetrySdk(
    'http://my-otel-endpoint.com/v1/traces',
    'my-service-name',
)

// Parent
const customCtx = new CustomContext()
const parent = sdk.getTracer('worker-tracer').startSpan('do some initial work', {
    attributes: {
        "parent-attribute": "yay parent attributes",
    }
}, customCtx)

// Simulate some work
await new Promise((resolve) => setTimeout(resolve, 1000))

// Child
const spanCtx = setSpan(customCtx, parent);
const childSpan = sdk.getTracer('worker-tracer-2').startSpan('child doing some work',{
    attributes: {
        "child-attribute": "yay child attributes",
    }
}, spanCtx)
    
// Simulate some work
await new Promise((resolve) => setTimeout(resolve, 500))
childSpan.end()
parent.end()
ctx.waitUntil(sdk.getTraceProvider().forceFlush())
return new Response(`Trace recorded to: ${sdk.getEndpoint()}`)
```