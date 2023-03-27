# OpenTelemetry Tracing on Cloudflare Workers

OpenTelemetry is a great project that defines the standard and future of distributed tracing/telemetry. Unfortunately, some of the libraries that implement the spec don't fully work in Cloudflare Workers. This is due to a scattered mix of XHRrequests and window references in the codebase that don't run in v8 isolates. 

Luckily, the OTEL abstractions provide enough of a base layer for us to implement our own with little effort. Heavily inspired [by RichiCoder1](https://github.com/RichiCoder1/opentelemetry-sdk-workers), but simplified without support for logging, etc.

## Terminology

## Example Usage

```typescript
// import this first to ensure no error on lacking provider API in Worker environment
import './tracing/Performance'

import { context } from '@opentelemetry/api'
import { setSpan } from '@opentelemetry/api/build/src/trace/context-utils'
import { CustomContext } from './tracing/CustomContext'
import { TelemetrySdk } from './tracing/TelemetrySdk'
export interface Env {}

export default {
    // initialize the SDK
    const sdk = new TelemetrySdk(
      // Note: You cannot use non-standard ports from Worker unless domains are in the same zone!
      // FYI: The Jaeger all-in-one docker image has an OTEL collector endpoint for HTTP/gRPC
      'http//localhost/v1/trace',
      'My Customer Tracer Service',
    )

    // Parent
    const customCtx = new CustomContext()
    const parent = sdk.startSpan(
      'do some initial work',
      {
        attributes: {
          'parent-attribute': 'yay parent attributes',
        },
      },
      customCtx,
    )

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Child
    const childSpan = sdk.startChildSpan('child doing some work', parent, {
      attributes: {
        'child-attribute': 'yay child attributes',
      },
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
    childSpan.end()

    parent.end()
    ctx.waitUntil(sdk.getTraceProvider().forceFlush())
    return new Response(`Trace recorded to: ${sdk.getEndpoint()}`)
  },
}

```