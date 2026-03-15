type Listener = (event: any) => void;

class EventEmitter {
  private listeners: { [key: string]: Listener[] } = {};

  on(eventName: string, listener: Listener) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(listener);
  }

  off(eventName: string, listener: Listener) {
    if (!this.listeners[eventName]) return;

    this.listeners[eventName] = this.listeners[eventName].filter(
      (l) => l !== listener
    );
  }

  emit(eventName: string, data: any) {
    if (!this.listeners[eventName]) return;

    this.listeners[eventName].forEach((listener) => listener(data));
  }
}

export const errorEmitter = new EventEmitter();
