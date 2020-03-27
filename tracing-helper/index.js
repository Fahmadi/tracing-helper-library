const {
  initializeTracer,
  getTracerMiddleware,
  createSpan,
  endSpan
} = require("./tracer");
const { instrumentGot } = require("./got");

module.exports = {
  initializeTracer,
  getTracerMiddleware,
  createSpan,
  endSpan,
  instrumentGot
};
