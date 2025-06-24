// src/tools/N8nTool.js
const { Tool } = require('../agent/Tool');
const { Workflow } = require('n8n-workflow');
const { NodeExecuteFunctions } = require('n8n-core');

class N8nTool extends Tool {
  /**
   * @param {object} config
   * @param {string} config.name - Tool name
   * @param {string} config.description - Tool description
   * @param {object} config.parameters - JSON Schema for tool input
   * @param {object} config.workflow - n8n workflow JSON object or configuration
   * @param {object} [config.credentials] - Optional credentials for n8n nodes
   */
  constructor({ name, description, parameters, workflow, credentials = {} } = {}) {
    super({ name, description, parameters });
    this.workflowConfig = workflow;
    this.credentials = credentials;
  }

  /**
   * Execute the n8n workflow with the provided input.
   * @param {object} input - Input parameters for the workflow
   * @returns {Promise<any>} - Workflow execution result
   */
  async call(input) {
    try {
      // Initialize n8n workflow
      const workflow = new Workflow({
        id: `tool-${this.name}`,
        name: this.name,
        nodes: this.workflowConfig.nodes,
        connections: this.workflowConfig.connections || {},
        active: true,
        settings: this.workflowConfig.settings || {},
        versionId: '1',
      });

      // Set up execution context with credentials
      const executionContext = {
        credentials: this.credentials,
        getNodeParameter: NodeExecuteFunctions.getNodeParameter,
        helpers: NodeExecuteFunctions.helpers,
      };

      // Execute workflow with input data
      const runData = await workflow.run({
        input: [{ json: input }],
        nodeExecutionContext: executionContext,
      });

      // Extract output from the last node
      const output = runData.data.resultData.runData;
      const lastNode = Object.keys(output).pop();
      return output[lastNode]?.[0]?.data?.main?.[0]?.json || {};
    } catch (error) {
      throw new Error(`n8n tool ${this.name} failed: ${error.message}`);
    }
  }
}

module.exports = { N8nTool };