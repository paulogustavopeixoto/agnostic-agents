const { BaseAppSpec } = require('./BaseAppSpec');

class GmailSpec extends BaseAppSpec {
  transformArgs(actionKey, args) {
    return { ...args };
  }

  getAliases() {
    return {
      to: ['recipient', 'email', 'email_to'],
      subject: ['title', 'topic'],
      message: ['body', 'content', 'text'],
      threadId: ['conversation_id', 'thread'],
    };
  }

  isValidValueForField(field, value) {
    if (field.toLowerCase().includes('email') || field === 'to') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    return true;
  }

  getPromptForField(field) {
    if (field === 'to') {
      return `Who should I send this email to? Please provide the **email address**.`;
    }
    return `I need "${field}" to proceed with the Gmail action.`;
  }
}

module.exports = { GmailSpec };