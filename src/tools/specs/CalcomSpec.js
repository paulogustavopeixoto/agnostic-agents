const { BaseAppSpec } = require('./BaseAppSpec');

class CalcomSpec extends BaseAppSpec {
  transformArgs(actionKey, args) {
    return { ...args };
  }

  getAliases() {
    return {
      eventTypeId: ['event_id', 'meeting_type'],
      start: ['start_time'],
      end: ['end_time'],
      attendee: ['guest', 'participant'],
      endpoint: ['url', 'path', 'resource'],
      method: ['http_method', 'verb'],
      headers: ['http_headers'],
      query: ['queryParams', 'params'],
      body: ['data', 'payload'],
    };
  }

  isValidValueForField(field, value) {
    if (field.toLowerCase().includes('eventtypeid')) {
      return typeof value === 'string' && value.length > 3;
    }
    return true;
  }

  getPromptForField(field) {
    if (field === 'eventTypeId') {
      return 'Please provide the **Event Type ID** (e.g., for a 30-minute meeting).';
    }
    if (field === 'start' || field === 'end') {
      return 'Please provide the **start/end time in ISO format**, like "2025-06-30T14:00:00Z".';
    }
    return `I need "${field}" to schedule this event.`;
  }

  getCustomApiCallSpec() {
    return {
      name: 'calcomCustomApiCall',
      description: 'Make a raw API call to Cal.com',
      parameters: {
        type: 'object',
        properties: {
          endpoint: {
            type: 'string',
            description: 'API endpoint path (e.g., `/v1/availability`).',
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PATCH', 'DELETE'],
            description: 'HTTP method to use.',
          },
          headers: {
            type: 'object',
            description: 'HTTP headers, e.g., Authorization.',
            default: {},
          },
          body: {
            type: 'object',
            description: 'Request body (for POST, PATCH)',
            default: {},
          },
          query: {
            type: 'object',
            description: 'Query parameters to append to URL.',
            default: {},
          },
        },
        required: ['endpoint', 'method'],
      },
      implementation: async ({ endpoint, method, body = {}, query = {}, headers = {} }, context) => {
        if (!endpoint) throw new Error('Missing "endpoint" parameter');
        if (!method) throw new Error('Missing "method" parameter');

        const url = `https://api.cal.com${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

        const finalQuery = {
            apiKey: query.apiKey || context.authToken,
            ...query,
        };

        const queryString = Object.keys(finalQuery).length
            ? '?' + new URLSearchParams(finalQuery).toString()
            : '';

        const finalHeaders = {
            'Content-Type': 'application/json',
            ...headers,
        };

        const response = await fetch(url + queryString, {
            method: method.toUpperCase(),
            headers: finalHeaders,
            body: ['POST', 'PATCH'].includes(method.toUpperCase()) ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Cal.com API error: ${response.status} ${JSON.stringify(data)}`);
        }

        return { status: response.status, data };
      },
    };
  }
}

module.exports = { CalcomSpec };