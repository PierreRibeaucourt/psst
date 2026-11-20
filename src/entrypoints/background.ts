import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { handleMessage, syncNow } from '../lib/engine';
import type { Message } from '../lib/types';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
    handleMessage(msg as Message).then(sendResponse);
    return true; // réponse asynchrone
  });

  // Filet de sécurité : les pages Amazon déclenchent déjà une synchro à chaque visite.
  browser.alarms.create('sync', { periodInMinutes: 15 });
  browser.alarms.onAlarm.addListener((a) => {
    if (a.name === 'sync') void syncNow();
  });
  browser.runtime.onStartup.addListener(() => void syncNow());
});
