import { runEscalations } from "../services/escalation.service.js";

export function startEscalationJob() {
  const tick = async () => {
    try {
      await runEscalations();
    } catch (err) {
      console.error("escalation job", err.message);
    }
  };
  tick();
  return setInterval(tick, 60 * 1000);
}
