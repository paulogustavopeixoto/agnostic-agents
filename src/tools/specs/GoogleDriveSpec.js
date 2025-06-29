const { BaseAppSpec } = require('./BaseAppSpec');

class GoogleDriveSpec extends BaseAppSpec {
  transformArgs(actionKey, args) {
    return { ...args };
  }

  getAliases() {
    return {
      fileId: ['file', 'file_id', 'documentId'],
      folderId: ['folder', 'folder_id'],
      name: ['title', 'filename'],
    };
  }

  isValidValueForField(field, value) {
    return true;
  }

  getPromptForField(field) {
    return `Please provide the **${field}** (file ID, folder ID, or name) to proceed with this Google Drive action.`;
  }
}

module.exports = { GoogleDriveSpec };