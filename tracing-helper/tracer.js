const opentelemetry = require("@opentelemetry/api");
const { LogLevel, isValid } = require("@opentelemetry/core");
const { NodeTracerProvider } = require("@opentelemetry/node");
const { SimpleSpanProcessor } = require("@opentelemetry/tracing");
const { ZipkinExporter } = require("@opentelemetry/exporter-zipkin");
const httpContext = require("express-http-context");
const { REQUEST_SPAN } = require("./config");

let tracerInstance;

const initializeTracer = (serviceName, zipkinUrl) => {
  if (tracerInstance) {
    return;
  }

  const exporter = new ZipkinExporter({
    serviceName,
    url: zipkinUrl
  });
  const provider = new NodeTracerProvider({
    plugins: {},
    logLevel: LogLevel.ERROR
  });
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

  opentelemetry.trace.initGlobalTracerProvider(provider);
  tracerInstance = opentelemetry.trace.getTracer("default");
};

const getTracer = () => {
  if (tracerInstance == null) {
    throw new Error("Tracer is not initialized");
  }

  return tracerInstance;
};

/**
 * Express middleware
 *
 * @callback ExpressMiddleware
 * @function
 * @param {Request} req
 * @param {Response} res
 * @param {Next} nextFunction
 * @return {*}
 */
const getTracerMiddleware = () => (req, res, next) => {
  const tracer = getTracer();
  const propagation = tracer.getHttpTextFormat();
  const { headers } = req;
  const spanOptions = {};
  const spanContext = propagation.extract("HttpTraceContext", headers);
  if (spanContext && isValid(spanContext)) {
    spanOptions.parent = spanContext;
  }

  const requestSpan = tracer.startSpan(`${req.method} ${req.url}`, spanOptions);

  requestSpan.setAttribute("http.method", req.method);
  requestSpan.setAttribute("http.user_agent", req.get("User-Agent"));

  const previousRequestSpan = httpContext.get(REQUEST_SPAN) || [];

  httpContext.set(REQUEST_SPAN, [...previousRequestSpan, requestSpan]);
  res.once("finish", () => {
    requestSpan.setAttribute("http.status_code", res.statusCode);
    requestSpan.end();
  });

  next();
};

const createSpan = name => {
  const previousSpans = httpContext.get(REQUEST_SPAN) || [];
  const parent = previousSpans.slice(-1)[0];
  const span = getTracer().startSpan(name, {
    parent
  });
  httpContext.set(REQUEST_SPAN, [...previousSpans, span]);
  return span;
};

const endSpan = span => {
  const previousSpans = httpContext.get(REQUEST_SPAN) || [];
  httpContext.set(
    REQUEST_SPAN,
    previousSpans.filter(currentSpan => currentSpan !== span)
  );
  span.end();
};

module.exports = {
  initializeTracer,
  getTracerMiddleware,
  createSpan,
  endSpan
};
