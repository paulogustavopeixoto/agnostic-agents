const { BaseAppSpec } = require('./BaseAppSpec');

class ClickUpSpec extends BaseAppSpec {
  transformArgs(actionKey, args) {
    return { ...args };
  }

  getAliases() {
    return {
      taskId: ['task', 'task_id'],
      listId: ['list', 'list_id'],
      folderId: ['folder', 'folder_id'],
      spaceId: ['space', 'space_id'],
      name: ['title'],
      description: ['body', 'notes'],
      assignee: ['user', 'userId'],
    };
  }

  isValidValueForField(field, value) {
    return true;
  }

  getPromptForField(field) {
    return `I need "${field}" to proceed with this ClickUp action.`;
  }
}

module.exports = { ClickUpSpec };