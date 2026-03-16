const fs = require('fs');
const os = require('os');
const path = require('path');

const { OpenAPILoader } = require('../index');

function buildSpec() {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Weather API',
      version: '1.0.0',
    },
    servers: [{ url: 'https://api.example.com' }],
    paths: {
      '/forecast': {
        get: {
          summary: 'Get forecast',
          parameters: [
            {
              name: 'city',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Forecast result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      forecast: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agnostic-openapi-'));
  const specPath = path.join(directory, 'weather.json');
  fs.writeFileSync(specPath, JSON.stringify(buildSpec(), null, 2), 'utf8');

  const { tools } = OpenAPILoader.load(specPath, {
    serviceName: 'weather',
    authToken: 'example-token',
  });

  console.dir(
    tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
    { depth: null }
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
