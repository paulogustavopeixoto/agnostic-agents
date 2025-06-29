const { BaseAppSpec } = require('./BaseAppSpec');

class GoogleCalendarSpec extends BaseAppSpec {
  transformArgs(actionKey, args) {
    return { ...args };
  }

  getAliases() {
    return {
      calendarId: ['calendar', 'calendar_id'],
      eventId: ['event', 'event_id'],
      title: ['summary', 'name'],
      description: ['details', 'body'],
      startTime: ['start', 'start_time'],
      endTime: ['end', 'end_time'],
    };
  }

  isValidValueForField(field, value) {
    return true;
  }

  getPromptForField(field) {
    return `I need "${field}" to proceed with this Google Calendar action.`;
  }
}

module.exports = { GoogleCalendarSpec };