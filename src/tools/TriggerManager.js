class TriggerManager {
  constructor({ webhookServer }) {
    this.webhookServer = webhookServer;
    this.activeTriggers = {};
  }

  enableTrigger({ name, trigger, handler }) {
    const path = `/webhooks/${name}`;
    this.webhookServer.registerRoute(path, handler);

    if (trigger.onEnable) {
      trigger.onEnable({ webhookUrl: `http://your-domain.com${path}` });
    }

    this.activeTriggers[name] = { trigger, handler };
    console.log(`✅ Enabled trigger: ${name}`);
  }

  disableTrigger(name) {
    const active = this.activeTriggers[name];
    if (active && active.trigger.onDisable) {
      active.trigger.onDisable();
    }

    delete this.activeTriggers[name];
    console.log(`🛑 Disabled trigger: ${name}`);
  }
}

module.exports = { TriggerManager };