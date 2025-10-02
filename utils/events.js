// utils/events.js
class EventBus {
    constructor() { this.events = {}; }
    on(name, cb) {
      if (!this.events[name]) this.events[name] = [];
      this.events[name].push(cb);
    }
    emit(name, data) {
      if (this.events[name]) this.events[name].forEach(fn => fn(data));
    }
    off(name, cb) {
      if (!this.events[name]) return;
      if (!cb) { delete this.events[name]; return; }
      this.events[name] = this.events[name].filter(fn => fn !== cb);
    }
  }
  
  module.exports = new EventBus();
  