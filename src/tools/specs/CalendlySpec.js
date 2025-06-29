const { BaseAppSpec } = require('./BaseAppSpec');

class CalendlySpec extends BaseAppSpec {
  transformArgs(actionKey, args) {
    return args;
  }

  getAliases() {
    return {
      eventId: ['id', 'event_id'],
      userId: ['user_id', 'user'],
      inviteeId: ['invitee_id'],
      email: ['recipient', 'email_address'],
      organization: ['org', 'organization_id'],
      endpoint: ['url', 'path', 'type', 'resource'],
      method: ['http_method', 'verb'],
      query: ['queryParams', 'params'],
      body: ['data', 'payload'],
      headers: ['http_headers'],
    };
  }

  isValidValueForField(field, value) {
    if (field.toLowerCase().includes('email')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    return true;
  }

  getPromptForField(field) {
    const lower = field.toLowerCase();

    if (lower === 'endpoint') {
      return 'Which Calendly API endpoint do you want to call? For example `/scheduled_events`.';
    }
    if (lower === 'method') {
      return 'What HTTP method should I use? (GET, POST, PATCH, DELETE)';
    }
    if (lower.includes('email')) {
      return `Please provide a valid email (e.g., john@example.com).`;
    }
    return `I need "${field}" to execute this Calendly action. Please provide it.`;
  }

  getCustomApiCallSpec() {
    return {
      name: 'calendlyCustomApiCall',
      description: 'Make a raw API call to the Calendly API.',
      parameters: {
        type: 'object',
        properties: {
          endpoint: {
            type: 'string',
            description: 'API endpoint (e.g., `/scheduled_events`).',
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PATCH', 'DELETE'],
            description: 'HTTP method.',
          },
          headers: {
            type: 'object',
            description: 'Optional HTTP headers.',
            default: {},
          },
          body: {
            type: 'object',
            description: 'Request body (for POST, PATCH).',
            default: {},
          },
          query: {
            type: 'object',
            description: 'Query parameters.',
            default: {},
          },
        },
        required: ['endpoint', 'method', 'headers'],
      },
      implementation: async ({ endpoint, method, body = {}, query = {}, headers = {} }, context) => {
        if (!endpoint) throw new Error('Missing "endpoint" parameter');
        if (!method) throw new Error('Missing "method" parameter');

        const httpMethod = method.toUpperCase();
        const finalEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `https://api.calendly.com${finalEndpoint}`;

        const finalHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${context.authToken}`,
          ...headers,
        };

        const queryString = Object.keys(query).length
          ? '?' + new URLSearchParams(query).toString()
          : '';

        const response = await fetch(url + queryString, {
          method: httpMethod,
          headers: finalHeaders,
          body: ['POST', 'PATCH', 'PUT'].includes(httpMethod) ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(`Calendly API error: ${response.status} ${JSON.stringify(data)}`);
        }

        return {
          status: response.status,
          data,
        };
      },
    };
  }
}

module.exports = { CalendlySpec };