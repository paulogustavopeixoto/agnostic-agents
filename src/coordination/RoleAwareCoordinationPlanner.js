const { TrustRegistry } = require('./TrustRegistry');
const { DecompositionAdvisor } = require('./DecompositionAdvisor');
const { CoordinationRoleContract } = require('./CoordinationRoleContract');
const { CoordinationTrace } = require('./CoordinationTrace');

class RoleAwareCoordinationPlanner {
  constructor({
    trustRegistry = null,
    decompositionAdvisor = null,
    roleContracts = [],
    capabilityRouter = null,
  } = {}) {
    this.trustRegistry =
      trustRegistry instanceof TrustRegistry ? trustRegistry : new TrustRegistry(trustRegistry || {});
    this.decompositionAdvisor =
      decompositionAdvisor instanceof DecompositionAdvisor
        ? decompositionAdvisor
        : new DecompositionAdvisor(decompositionAdvisor || {});
    this.roleContracts = (Array.isArray(roleContracts) ? roleContracts : []).map(contract =>
      contract instanceof CoordinationRoleContract ? contract : new CoordinationRoleContract(contract)
    );
    this.capabilityRouter = capabilityRouter;
  }

  plan(task = {}, { actors = [], context = {} } = {}) {
    const availableActors = Array.isArray(actors) ? actors : [];
    const decomposition = this.decompositionAdvisor.recommend(task, {
      availableDelegates: availableActors,
    });
    const requiredRoles = this._determineRequiredRoles(task, decomposition);
    const assignments = requiredRoles.map(role =>
      this._assignRole(role, task, availableActors, context)
    );
    const gaps = assignments.filter(item => !item.actor).map(item => item.role);
    const strategy = this._determineStrategy(task, decomposition, gaps);
    const routeRecommendations = this._buildRouteRecommendations(task, assignments, context);
    const summary = {
      taskId: task.id || null,
      requiredRoles,
      assignedRoles: assignments.filter(item => item.actor).map(item => item.role),
      unassignedRoles: [...gaps],
      decompositionAction: decomposition.action || null,
      primaryExecutor: assignments.find(item => item.role === 'executor')?.actor?.id || null,
      primaryVerifier: assignments.find(item => item.role === 'verifier')?.actor?.id || null,
      routeTargets: Object.fromEntries(
        Object.entries(routeRecommendations).map(([key, value]) => [
          key,
          value?.candidate?.id || value?.candidate?.candidate?.id || null,
        ])
      ),
    };

    const plan = {
      strategy,
      roleContracts: requiredRoles.map(role => this.getRoleContract(role, task)),
      assignments,
      decomposition,
      routeRecommendations,
      gaps,
      summary,
    };

    return {
      ...plan,
      trace: CoordinationTrace.fromPlan(plan, { task, context }),
    };
  }

  getRoleContract(role, task = {}) {
    const existing = this.roleContracts.find(contract => contract.role === role);
    if (existing) {
      return existing.toJSON();
    }

    return new CoordinationRoleContract({
      role,
      capabilities: this._defaultCapabilitiesForRole(role),
      responsibilities: this._defaultResponsibilitiesForRole(role),
      trustDomain: task.taskType || task.domain || 'general',
      reviewMode: role === 'verifier' || role === 'critic' ? 'review' : 'execution',
    }).toJSON();
  }

  _determineRequiredRoles(task, decomposition) {
    const roles = ['planner', 'executor'];
    const risk = typeof task.risk === 'number' ? task.risk : 0;
    const complexity = typeof task.complexity === 'number' ? task.complexity : 0;

    if (risk >= 0.5 || complexity >= 0.7) {
      roles.push('verifier');
    }
    if (risk >= 0.75) {
      roles.push('critic');
    }
    if (decomposition.action === 'split_and_delegate') {
      roles.push('aggregator');
    }

    return [...new Set(roles)];
  }

  _assignRole(role, task, actors, context) {
    const domain = context.domain || task.taskType || task.domain || 'general';
    const contract = this.getRoleContract(role, task);
    const scored = actors
      .filter(actor => this._actorSupportsRole(actor, role, contract))
      .map(actor => {
        const registryScore = this.trustRegistry.getScore(actor.id, { domain });
        const fallbackTrust = typeof actor.trustScore === 'number' ? actor.trustScore : 0.5;
        const roleAffinity = this._roleAffinity(actor, role);
        const score = Number(((registryScore === 0.5 ? fallbackTrust : registryScore) * 0.8 + roleAffinity * 0.2).toFixed(3));
        return {
          actor,
          trustScore: score,
          domain,
          reasons: this._buildReasons(actor, role, contract, registryScore, fallbackTrust, roleAffinity),
        };
      })
      .sort((left, right) => right.trustScore - left.trustScore);

    if (!scored.length) {
      return {
        role,
        actor: null,
        trustScore: null,
        domain,
        reasons: [`No available actor satisfied the ${role} role contract.`],
      };
    }

    return {
      role,
      actor: scored[0].actor,
      trustScore: scored[0].trustScore,
      domain,
      reasons: scored[0].reasons,
    };
  }

  _determineStrategy(task, decomposition, gaps) {
    if (gaps.length) {
      return 'escalate_missing_roles';
    }
    if (decomposition.action === 'split_and_delegate') {
      return 'role_routed_split_execution';
    }
    if ((task.risk || 0) >= 0.75) {
      return 'role_routed_high_risk_review';
    }
    return 'role_routed_direct_execution';
  }

  _actorSupportsRole(actor = {}, role, contract = {}) {
    const actorRoles = Array.isArray(actor.roles) ? actor.roles : [];
    const capabilities = Array.isArray(actor.capabilities) ? actor.capabilities : [];
    const requiredCapabilities = Array.isArray(contract.capabilities) ? contract.capabilities : [];

    if (actorRoles.includes(role)) {
      return true;
    }

    return requiredCapabilities.every(capability => capabilities.includes(capability));
  }

  _roleAffinity(actor = {}, role) {
    const actorRoles = Array.isArray(actor.roles) ? actor.roles : [];
    const specializations = Array.isArray(actor.specializations) ? actor.specializations : [];

    if (actorRoles.includes(role)) {
      return 1;
    }
    if (role === 'executor' && specializations.length) {
      return 0.8;
    }
    if ((role === 'verifier' || role === 'critic') && specializations.includes('review')) {
      return 0.9;
    }
    if (role === 'aggregator' && specializations.includes('synthesis')) {
      return 0.9;
    }
    return 0.5;
  }

  _buildReasons(actor, role, contract, registryScore, fallbackTrust, roleAffinity) {
    const reasons = [];
    if (Array.isArray(actor.roles) && actor.roles.includes(role)) {
      reasons.push(`${actor.id} explicitly supports the ${role} role.`);
    }
    if (registryScore !== 0.5) {
      reasons.push(`Historical trust for ${contract.trustDomain || 'general'} is ${registryScore}.`);
    } else {
      reasons.push(`Using fallback trust score ${fallbackTrust}.`);
    }
    reasons.push(`Role affinity for ${role} is ${roleAffinity}.`);
    return reasons;
  }

  _defaultCapabilitiesForRole(role) {
    const defaults = {
      planner: ['planning'],
      executor: ['execution'],
      verifier: ['verification'],
      critic: ['critique'],
      aggregator: ['synthesis'],
    };
    return defaults[role] ? [...defaults[role]] : [];
  }

  _defaultResponsibilitiesForRole(role) {
    const defaults = {
      planner: ['shape task decomposition and handoff'],
      executor: ['perform the primary task work'],
      verifier: ['check correctness before acceptance'],
      critic: ['challenge assumptions and identify failure modes'],
      aggregator: ['combine delegated outputs into one decision'],
    };
    return defaults[role] ? [...defaults[role]] : [];
  }

  _buildRouteRecommendations(task, assignments, context = {}) {
    if (!this.capabilityRouter?.select) {
      return {};
    }

    const candidates = this._buildRouteCandidates(assignments, context);
    const risk = typeof task.risk === 'number' ? task.risk : 0;

    return {
      execution: this.capabilityRouter.select(
        {
          taskType: task.taskType || task.domain || null,
          requiredCapabilities: ['execution'],
          preferredCapabilities: Array.isArray(task.requiredCapabilities) ? task.requiredCapabilities : [],
          preferredKinds: ['agent', 'model'],
          trustZone: context.trustZone || null,
          metadata: { source: 'role_aware_execution' },
        },
        candidates
      ),
      verification: this.capabilityRouter.select(
        {
          taskType: task.taskType || task.domain || null,
          requiredCapabilities: ['verification'],
          preferredKinds: risk >= 0.75 ? ['simulator', 'human', 'agent'] : ['agent', 'model'],
          trustZone: context.trustZone || null,
          requiresSimulation: risk >= 0.75,
          metadata: { source: 'role_aware_verification' },
        },
        candidates
      ),
    };
  }

  _buildRouteCandidates(assignments = [], context = {}) {
    const actorCandidates = assignments
      .filter(item => item.actor)
      .map(item => ({
        id: item.actor.id,
        kind: item.actor.kind || 'agent',
        capabilities: Array.isArray(item.actor.capabilities) ? item.actor.capabilities : [],
        profile: {
          taskTypes: Array.isArray(item.actor.specializations) ? item.actor.specializations : [],
          trustZones: [...(context.trustZone ? [context.trustZone] : [])],
          certificationLevel: item.role === 'verifier' || item.role === 'critic' ? 'trusted' : 'supported',
          reputationScore: typeof item.trustScore === 'number' ? item.trustScore : 0.5,
          supportsSimulation: item.role === 'verifier' || item.role === 'critic',
        },
      }));

    return [...actorCandidates, ...(Array.isArray(context.routeCandidates) ? context.routeCandidates : [])];
  }
}

module.exports = { RoleAwareCoordinationPlanner };
