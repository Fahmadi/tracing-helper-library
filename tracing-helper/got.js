/* eslint-disable no-param-reassign */
const { TraceFlags } = require("@opentelemetry/api");
const { createSpan, endSpan } = require("./tracer");

const getTraceParentHeaderValue = parentSpan => {
  const VERSION = "00";
  const { spanContext } = parentSpan;

  const traceParent = `${VERSION}-${spanContext.traceId}-${
    spanContext.spanId
  }-0${Number(spanContext.traceFlags || TraceFlags.UNSAMPLED).toString(16)}`;

  return traceParent;
};

const instrumentGot = got => {
  const instrumentedGot = got.extend({
    hooks: {
      beforeRequest: [
        options => {
          const span = createSpan(`got: ${options.url.href}`);
          options.span = span;
          options.headers.traceparent = getTraceParentHeaderValue(span);
        }
      ],
      afterResponse: [
        response => {
          const { span } = response.request.options;
          endSpan(span);

          return response;
        }
      ]
    }
  });
  return instrumentedGot;
};

module.exports = {
  instrumentGot
};
