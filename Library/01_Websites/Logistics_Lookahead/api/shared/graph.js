const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

function required(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function config() {
  const sitePathRaw = process.env.SP_SITE_PATH || '/sites/UGPTDWGOMSupplyChain';
  const sitePath = sitePathRaw.startsWith('/') ? sitePathRaw : `/${sitePathRaw}`;
  return {
    tenantId: required('SP_TENANT_ID'),
    clientId: required('SP_CLIENT_ID'),
    clientSecret: required('SP_CLIENT_SECRET'),
    siteHostname: process.env.SP_SITE_HOSTNAME || 'eu001-sp.shell.com',
    sitePath,
    stateListName: process.env.SP_STATE_LIST_NAME || 'LogisticsState',
    changeLogListName: process.env.SP_CHANGELOG_LIST_NAME || 'LogisticsChangeLog',
    stateItemTitle: process.env.SP_STATE_ITEM_TITLE || 'Current'
  };
}

let cachedToken = { value: '', expiresAt: 0 };
let cachedSiteId = '';
let cachedListIds = {};

async function getAccessToken() {
  if (cachedToken.value && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.value;
  }

  const cfg = config();
  const url = `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Token request failed (${res.status}): ${txt}`);
  }

  const json = await res.json();
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (Number(json.expires_in || 3600) * 1000)
  };
  return cachedToken.value;
}

async function graph(path, { method = 'GET', body } = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Graph ${method} ${path} failed (${res.status}): ${txt}`);
  }

  if (res.status === 204) return null;
  return await res.json();
}

async function getSiteId() {
  if (cachedSiteId) return cachedSiteId;
  const cfg = config();
  const site = await graph(`/sites/${cfg.siteHostname}:${cfg.sitePath}?$select=id`);
  if (!site || !site.id) throw new Error('Unable to resolve SharePoint site id from Graph');
  cachedSiteId = site.id;
  return cachedSiteId;
}

async function getListIdByName(displayName) {
  if (cachedListIds[displayName]) return cachedListIds[displayName];
  const siteId = await getSiteId();
  const safeName = String(displayName).replace(/'/g, "''");
  const data = await graph(`/sites/${siteId}/lists?$filter=displayName eq '${safeName}'&$select=id,displayName`);
  const list = Array.isArray(data?.value) ? data.value[0] : null;
  if (!list?.id) throw new Error(`SharePoint list not found: ${displayName}`);
  cachedListIds[displayName] = list.id;
  return list.id;
}

async function getListColumns(listName) {
  const siteId = await getSiteId();
  const listId = await getListIdByName(listName);
  const data = await graph(`/sites/${siteId}/lists/${listId}/columns?$select=name`);
  return Array.isArray(data?.value) ? data.value.map(x => x.name) : [];
}

async function getCurrentState() {
  const cfg = config();
  const siteId = await getSiteId();
  const listId = await getListIdByName(cfg.stateListName);
  const title = encodeURIComponent(cfg.stateItemTitle);
  const data = await graph(`/sites/${siteId}/lists/${listId}/items?$expand=fields($select=Title,StateJson)&$filter=fields/Title eq '${title}'&$top=1`);
  const item = Array.isArray(data?.value) ? data.value[0] : null;
  if (!item) return null;
  return {
    Id: item.id,
    Title: item.fields?.Title || cfg.stateItemTitle,
    StateJson: item.fields?.StateJson || ''
  };
}

async function upsertCurrentState(envelope) {
  const cfg = config();
  const siteId = await getSiteId();
  const listId = await getListIdByName(cfg.stateListName);
  const current = await getCurrentState();
  const fields = {
    Title: cfg.stateItemTitle,
    StateJson: JSON.stringify(envelope)
  };

  if (!current) {
    const created = await graph(`/sites/${siteId}/lists/${listId}/items`, {
      method: 'POST',
      body: { fields }
    });
    return {
      itemId: created?.id || '',
      updatedAt: envelope.updatedAt
    };
  }

  await graph(`/sites/${siteId}/lists/${listId}/items/${current.Id}/fields`, {
    method: 'PATCH',
    body: fields
  });

  return {
    itemId: current.Id,
    updatedAt: envelope.updatedAt
  };
}

async function appendChangeLog(summary) {
  const cfg = config();
  const siteId = await getSiteId();
  const listId = await getListIdByName(cfg.changeLogListName);
  const fields = {
    Title: `${summary.reason || 'update'} @ ${new Date().toISOString()}`,
    SummaryJson: JSON.stringify(summary)
  };

  const created = await graph(`/sites/${siteId}/lists/${listId}/items`, {
    method: 'POST',
    body: { fields }
  });

  return { itemId: created?.id || '' };
}

module.exports = {
  config,
  getSiteId,
  getListColumns,
  getCurrentState,
  upsertCurrentState,
  appendChangeLog
};