const { BaseAppSpec } = require('./BaseAppSpec');

class NotionSpec extends BaseAppSpec {
  transformArgs(actionKey, args) {
    if (actionKey === 'createPage') {
      const { pageId, ...rest } = args;
      return {
        parent: { page_id: pageId },
        ...rest,
      };
    }
    if (actionKey === 'create_database_item') {
      const { databaseId, ...rest } = args;
      return {
        parent: { database_id: databaseId },
        ...rest,
      };
    }
    return args;
  }

  getAliases() {
    return {
      pageId: ['parent', 'parentId'],
      databaseId: ['dbId', 'database_id'],
      title: ['name'],
      content: ['body', 'text'],
    };
  }

  requiresUuid(field) {
    return field.toLowerCase().includes('pageid') ||
           field.toLowerCase().includes('databaseid');
  }

  isValidValueForField(field, value) {
    if (this.requiresUuid(field)) {
      return NotionSpec.isValidUuid(value);
    }
    return true;
  }

  getPromptForField(field) {
    if (this.requiresUuid(field)) {
        return `Please provide the Notion **UUID** for "${field}". You can find it in the Notion URL, like:\n` +
        `https://www.notion.so/Workspace/Page-Name-**UUID**\n→ Paste only the UUID part.`;
    }
    return `I need "${field}" to execute "${this.name}". Please provide it.`;
  }

  static isValidUuid(value) {
    return /^[0-9a-fA-F]{32}$|^[0-9a-fA-F-]{36}$/.test(value);
  }
}

module.exports = { NotionSpec };