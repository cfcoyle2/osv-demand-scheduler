const { getCurrentState, upsertCurrentState } = require('../shared/graph');

module.exports = async function (context, req) {
  try {
    const method = String(req.method || 'GET').toUpperCase();

    if (method === 'GET') {
      const item = await getCurrentState();
      context.res = {
        status: 200,
        body: { item }
      };
      return;
    }

    if (method === 'POST') {
      const envelope = req.body?.envelope;
      if (!envelope || typeof envelope !== 'object') {
        context.res = {
          status: 400,
          body: { error: 'Request body must include envelope object.' }
        };
        return;
      }

      const result = await upsertCurrentState(envelope);
      context.res = {
        status: 200,
        body: result
      };
      return;
    }

    context.res = { status: 405, body: { error: 'Method not allowed' } };
  } catch (err) {
    context.res = {
      status: 500,
      body: { error: err.message || String(err) }
    };
  }
};