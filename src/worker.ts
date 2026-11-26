// Entrada do Worker: o site Astro (fetch) e as tarefas agendadas do EmDash (cron),
// como no site do CPPS.
import handler, { createScheduledHandler, PluginBridge } from '@emdash-cms/cloudflare/worker';

export { PluginBridge };

export default {
  ...handler,
  // Roda a cada disparo de `triggers.crons` (no wrangler.jsonc, a cada minuto).
  scheduled: createScheduledHandler(),
};
