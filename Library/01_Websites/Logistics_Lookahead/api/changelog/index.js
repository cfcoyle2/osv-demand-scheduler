const { appendChangeLog } = require('../shared/graph');

module.exports = async function (context, req) {
  try {
    const summary = req.body?.summary;
    if (!summary || typeof summary !== 'object') {
      context.res = {
        status: 400,
        body: { error: 'Request body must include summary object.' }
      };
      return;
    }

    const result = await appendChangeLog(summary);
    context.res = {
      status: 200,
      body: result
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: { error: err.message || String(err) }
    };
  }
};