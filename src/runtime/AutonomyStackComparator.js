const { AutonomyStackConfig } = require('./AutonomyStackConfig');

class AutonomyStackComparator {
  compare(leftConfig = null, rightConfig = null) {
    const left =
      leftConfig instanceof AutonomyStackConfig ? leftConfig.toJSON() : new AutonomyStackConfig(leftConfig || {}).toJSON();
    const right =
      rightConfig instanceof AutonomyStackConfig ? rightConfig.toJSON() : new AutonomyStackConfig(rightConfig || {}).toJSON();

    const sections = ['routing', 'policy', 'memory', 'autonomy', 'fleet', 'operator'];
    const changes = [];

    for (const section of sections) {
      const leftSection = left[section] || {};
      const rightSection = right[section] || {};
      const keys = new Set([...Object.keys(leftSection), ...Object.keys(rightSection)]);

      for (const key of keys) {
        const before = leftSection[key];
        const after = rightSection[key];
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          changes.push({
            section,
            key,
            before,
            after,
          });
        }
      }
    }

    return {
      left: {
        id: left.id || null,
        environment: left.environment || null,
        tenant: left.tenant || null,
      },
      right: {
        id: right.id || null,
        environment: right.environment || null,
        tenant: right.tenant || null,
      },
      changes,
      summary: {
        totalChanges: changes.length,
        sectionsChanged: [...new Set(changes.map(change => change.section))],
      },
    };
  }
}

module.exports = { AutonomyStackComparator };
