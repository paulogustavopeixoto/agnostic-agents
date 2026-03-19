const { Tool } = require('../tools/adapters/Tool');

class ToolSchemaArtifact {
  static get FORMAT() {
    return 'agnostic-agents-tool-schema';
  }

  static get SCHEMA_VERSION() {
    return '1.0';
  }

  constructor({ tool = null, metadata = {} } = {}) {
    if (tool instanceof Tool) {
      this.tool = tool;
      this.schema = tool.toUnifiedSchema();
    } else if (tool && typeof tool === 'object') {
      this.tool = null;
      this.schema = JSON.parse(JSON.stringify(tool));
    } else {
      this.tool = null;
      this.schema = null;
    }

    this.metadata = { ...metadata };
  }

  toJSON() {
    return {
      format: ToolSchemaArtifact.FORMAT,
      schemaVersion: ToolSchemaArtifact.SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      metadata: { ...this.metadata },
      tool: this.schema ? JSON.parse(JSON.stringify(this.schema)) : null,
    };
  }

  toTool({ implementation } = {}) {
    if (typeof implementation !== 'function') {
      throw new Error('ToolSchemaArtifact.toTool requires an implementation function.');
    }

    if (!this.schema || typeof this.schema !== 'object') {
      throw new Error('Tool schema is required to rebuild a Tool instance.');
    }

    return new Tool({
      name: this.schema.name,
      description: this.schema.description || '',
      parameters: this.schema.parameters || { type: 'object', properties: {} },
      outputSchema: this.schema.outputSchema || null,
      strict: 'strict' in this.schema ? this.schema.strict : true,
      metadata: this.schema.metadata || {},
      implementation,
    });
  }

  static fromJSON(payload = {}) {
    return new ToolSchemaArtifact({
      tool: payload.tool || null,
      metadata: payload.metadata || {},
    });
  }
}

module.exports = { ToolSchemaArtifact };
