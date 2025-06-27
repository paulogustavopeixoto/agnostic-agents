const { BaseAppSpec } = require('./BaseAppSpec');

class SlackSpec extends BaseAppSpec {
  /**
   * Transform arguments to match Slack API expectations.
   */
  transformArgs(actionKey, args) {
    const newArgs = { ...args };

    const threadRelevantActions = [
      'send_channel_message',
      'send_direct_message',
      'update_message',
      'request_action_message',
      'request_approval_message',
    ];

    if (threadRelevantActions.includes(actionKey)) {
      if (newArgs.thread) {
        newArgs.thread_ts = newArgs.thread;
        delete newArgs.thread;
      }
    }

    return newArgs;
  }

  /**
   * Aliases help the resolver map friendly names to API-required names.
   */
  getAliases() {
    return {
      channel: ['conversation_id', 'chatId', 'channelId'],
      message: ['text', 'body', 'content'],
      thread: ['thread_id', 'thread_ts', 'parentThread'],
      user: ['user_id', 'recipient', 'handle', 'username'],
      ts: ['timestamp', 'msg_ts'],
      file: ['file_id', 'filePath'],
    };
  }

  /**
   * Validates values for specific fields.
   */
  isValidValueForField(field, value) {
    const lower = field.toLowerCase();

    if (lower.includes('channel')) {
      return /^C[A-Z0-9]+$/i.test(value); // Slack channel ID pattern
    }

    if (lower.includes('user')) {
      return /^U[A-Z0-9]+$/i.test(value); // Slack user ID pattern
    }

    if (lower === 'ts' || lower.includes('timestamp')) {
      return /^\d+\.\d+$/.test(value); // Slack timestamp (e.g., "1718307682.227919")
    }

    return true; // Otherwise pass
  }

  /**
   * Generates dynamic prompts for missing fields.
   */
  getPromptForField(field) {
    const lower = field.toLowerCase();

    if (lower.includes('channel')) {
      return `Please provide the Slack **Channel ID** (e.g., C04XXXXXX). You can find this by clicking on the channel name and checking the URL or channel details.`;
    }

    if (lower.includes('user')) {
      return `Please provide the Slack **User ID** (e.g., U04XXXXXX). You can find this by clicking on the user's profile in Slack.`;
    }

    if (lower === 'ts' || lower.includes('timestamp')) {
      return `I need the **message timestamp (ts)**. Open the Slack message, click on the "More actions" or message options, and copy the timestamp (e.g., "1718307682.227919").`;
    }

    if (lower === 'file') {
      return `Please provide the **File ID** or path to the file you'd like to upload or interact with.`;
    }
    

    return `I need "${field}" to execute this Slack action. Please provide it.`;
  }
}

module.exports = { SlackSpec };