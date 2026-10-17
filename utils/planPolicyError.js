class PlanPolicyError extends Error {
  constructor(code, message) {
    super(message);

    this.name = "PlanPolicyError";
    this.code = code;
  }
}

module.exports = PlanPolicyError;
