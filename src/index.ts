import { context } from '@opentelemetry/api'
import { setSpan } from '@opentelemetry/api/build/src/trace/context-utils'
import { CustomContext } from './tracing/CustomContext'
import './tracing/Performance'
import { TelemetrySdk } from './tracing/TelemetrySdk'
export interface Env {}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const sdk = new TelemetrySdk(
      // Note: You cannot use non-standard ports from Worker unless domains are in the same zone!
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
