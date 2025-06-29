const { BaseAppSpec } = require('./BaseAppSpec');

class GitHubSpec extends BaseAppSpec {
  transformArgs(actionKey, args) {
    return { ...args };
  }

  getAliases() {
    return {
      repo: ['repository', 'repo_name'],
      owner: ['organization', 'username'],
      issueNumber: ['issue', 'issue_number', 'id'],
      prNumber: ['pullRequest', 'pr', 'pr_number'],
      title: ['name'],
      body: ['description', 'content'],
    };
  }

  isValidValueForField(field, value) {
    return true;
  }

  getPromptForField(field) {
    return `I need "${field}" to proceed with this GitHub action.`;
  }
}

module.exports = { GitHubSpec };