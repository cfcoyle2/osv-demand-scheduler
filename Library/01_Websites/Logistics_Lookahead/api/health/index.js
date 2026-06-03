const { config, getSiteId, getListColumns } = require('../shared/graph');

module.exports = async function (context) {
  try {
    const cfg = config();
    const siteId = await getSiteId();
    const stateCols = await getListColumns(cfg.stateListName);
    const logCols = await getListColumns(cfg.changeLogListName);

    context.res = {
      status: 200,
      body: {
        status: 'ok',
        mode: 'azure-api',
        siteId,
        stateList: cfg.stateListName,
        changeLogList: cfg.changeLogListName,
        hasStateJson: stateCols.includes('StateJson'),
        hasSummaryJson: logCols.includes('SummaryJson')
      }
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: { error: err.message || String(err) }
    };
  }
};