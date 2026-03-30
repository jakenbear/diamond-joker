/**
 * Pure display conversion: internal 1-10 stats → baseball-style AVG/HR/SB.
 * Per-player jitter seeded from player name for consistent, unique values.
 */
const StatDisplay = {
  /** Deterministic hash of player name → float in [0, 1) */
  _nameHash(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return ((hash & 0x7fffffff) % 10000) / 10000;
  },

  /** Internal contact (1-10) → batting average (~.135–.415) */
  toAVG(contact, name) {
    const base = 0.150 + (contact - 1) * 0.028;
    const jitter = (this._nameHash(name + 'avg') - 0.5) * 0.030;
    return Math.max(0.100, Math.min(0.450, base + jitter));
  },

  /** Internal power (1-10) → home runs (~0–63) */
  toHR(power, name) {
    const base = (power - 1) * 6.7;
    const jitter = (this._nameHash(name + 'hr') - 0.5) * 6;
    return Math.max(0, Math.round(base + jitter));
  },

  /** Internal speed (1-10) → stolen bases (~0–84) */
  toSB(speed, name) {
    const base = (speed - 1) * 8.9;
    const jitter = (this._nameHash(name + 'sb') - 0.5) * 8;
    return Math.max(0, Math.round(base + jitter));
  },

  /** Formatted AVG string: ".273" */
  fmtAVG(contact, name) {
    return this.toAVG(contact, name).toFixed(3).slice(1);
  },

  /** Formatted HR string: "27" */
  fmtHR(power, name) {
    return String(this.toHR(power, name));
  },

  /** Formatted SB string: "36" */
  fmtSB(speed, name) {
    return String(this.toSB(speed, name));
  },

  /** Full stat line: "AVG:.273 HR:27 SB:36" */
  statLine(player) {
    const n = player.name;
    return `AVG:${this.fmtAVG(player.contact, n)} HR:${this.fmtHR(player.power, n)} SB:${this.fmtSB(player.speed, n)}`;
  },
};

export default StatDisplay;
