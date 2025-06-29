const { BaseAppSpec } = require('./BaseAppSpec');

class TrelloSpec extends BaseAppSpec {
  transformArgs(actionKey, args) {
    return { ...args };
  }

  getAliases() {
    return {
      cardId: ['card', 'card_id'],
      listId: ['list', 'list_id'],
      boardId: ['board', 'board_id'],
      name: ['title'],
      desc: ['description', 'body'],
      idMember: ['user', 'member', 'assignee'],
    };
  }

  isValidValueForField(field, value) {
    return true;
  }

  getPromptForField(field) {
    return `I need "${field}" to proceed with this Trello action.`;
  }
}

module.exports = { TrelloSpec };