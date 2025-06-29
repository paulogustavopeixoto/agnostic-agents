const { BaseAppSpec } = require('./BaseAppSpec');

class AsanaSpec extends BaseAppSpec {
  transformArgs(actionKey, args) {
    return { ...args };
  }

  getAliases() {
    return {
      taskId: ['task', 'task_id'],
      projectId: ['project', 'project_id'],
      workspaceId: ['workspace', 'workspace_id'],
      assignee: ['user', 'userId', 'email'],
      name: ['title'],
      notes: ['description', 'body'],
    };
  }

  isValidValueForField(field, value) {
    if (field.toLowerCase().includes('email')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    return true;
  }

  getPromptForField(field) {
    return `I need "${field}" to proceed with this Asana action.`;
  }
}

module.exports = { AsanaSpec };