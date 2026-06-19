const KEY = "kokpar.matchHistory.v1";
const MAX = 50;

export const matchHistoryStore = {
  read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      return [];
    }
  },
  push(entry) {
    const history = this.read();
    history.unshift(entry);
    if (history.length > MAX) history.length = MAX;
    try {
      localStorage.setItem(KEY, JSON.stringify(history));
    } catch {}
    return history;
  }
};
