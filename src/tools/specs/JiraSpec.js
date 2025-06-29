const { BaseAppSpec } = require('./BaseAppSpec');

class JiraSpec extends BaseAppSpec {
  transformArgs(actionKey, args) {
    return { ...args };
  }

  getAliases() {
    return {
      issueId: ['issue', 'issue_id'],
      projectId: ['project', 'project_id', 'key'],
      summary: ['title', 'name'],
      description: ['body', 'details'],
      assigneeId: ['assignee', 'user', 'userId'],
    };
  }

  isValidValueForField(field, value) {
    return true;
  }

  getPromptForField(field) {
    return `I need "${field}" to proceed with this Jira action.`;
  }
}

module.exports = { JiraSpec };