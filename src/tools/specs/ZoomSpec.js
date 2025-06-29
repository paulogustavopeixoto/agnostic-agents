const { BaseAppSpec } = require('./BaseAppSpec');

class ZoomSpec extends BaseAppSpec {
  transformArgs(actionKey, args) {
    return { ...args };
  }

  getAliases() {
    return {
      meetingId: ['meeting', 'meeting_id'],
      userId: ['user', 'user_id', 'email'],
      topic: ['title', 'name'],
      agenda: ['description', 'details'],
    };
  }

  isValidValueForField(field, value) {
    if (field.toLowerCase().includes('email')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    return true;
  }

  getPromptForField(field) {
    return `I need "${field}" to proceed with this Zoom action.`;
  }
}

module.exports = { ZoomSpec };