import { HeadersTextMapper } from './tracing/HeadersTextMapper';
// import { context } from '@opentelemetry/api'
// import { setSpan } from '@opentelemetry/api/build/src/trace/context-utils'
// import { CustomContext } from './tracing/CustomContext'
import { context, propagation } from '@opentelemetry/api'
import { TelemetrySdk } from './tracing/TelemetrySdk'
import { CustomContext } from './tracing/CustomContext';

export interface Env {}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const tracer = new TelemetrySdk(
		request,
      'http://localhost/v1/traces',
      'My Customer Tracer Service [NEWv2]',
    )

    const parent = tracer.startSpan('Parent Task', {
      attributes: {
        'parent-attribute': 'root',
      },
    })

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Child
    const childSpan = tracer.startSpan(
      'Child Task',
      {},
      parent,
    )

    await new Promise((resolve) => setTimeout(resolve, 500))

    childSpan.end()
    parent.end()

    ctx.waitUntil(tracer.flushTraces())
    return new Response(`Trace recorded to: ${tracer.getEndpoint()}`)
  },
}
