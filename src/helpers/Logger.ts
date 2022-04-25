import { reactive, readonly } from 'vue';

const messages = reactive<string[]>([]);
const noMessages = 10;

export function addLog(message: string) {
    const now = new Date();
    const timeString = ("0" + now.getHours()).slice(-2)
        + ":" + ("0" + now.getMinutes()).slice(-2)
        + ":" + ("0" + now.getSeconds()).slice(-2)
        + "." + ("00" + now.getMilliseconds()).slice(-3);
    messages.unshift(`${timeString} ${message}`);
    messages.splice(noMessages);
}

export function clearLog() { messages.length = 0; }
export const logMessages = readonly(messages);