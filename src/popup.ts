import { applyTranslationsToDOM, getLanguage, setLanguage, t, Language } from './i18n';

let currentLang: Language = 'en';

document.addEventListener('DOMContentLoaded', async () => {
  currentLang = await getLanguage();
  applyTranslationsToDOM(currentLang);

  const langBtn = document.getElementById('langToggleBtn');
  if (langBtn) {
    langBtn.textContent = currentLang === 'en' ? 'عربي' : 'English';
    langBtn.addEventListener('click', async () => {
      currentLang = currentLang === 'en' ? 'ar' : 'en';
      await setLanguage(currentLang);
      applyTranslationsToDOM(currentLang);
      langBtn.textContent = currentLang === 'en' ? 'عربي' : 'English';
      updateDynamicTexts();
    });
  }

  document.getElementById('openPanelBtn')?.addEventListener('click', async () => {
    try {
      const window = await chrome.windows.getCurrent();
      if (window.id) {
        // @ts-ignore - sidePanel API might not be fully typed in older @types/chrome
        await chrome.sidePanel.open({ windowId: window.id });
        globalThis.window.close(); // Close the popup
      }
    } catch (e) {
      console.error("Context error", e);
      // Fallback: Inform user
      const btn = document.getElementById('openPanelBtn');
      if (btn) btn.textContent = t('openSidePanelFallback', currentLang);
    }
  });
});

function updateDynamicTexts() {
  const btn = document.getElementById('openPanelBtn');
  // If it was showing the fallback, update it to the translated fallback
  // Otherwise applyTranslationsToDOM handles the default state
  if (btn && btn.textContent !== t('openSidePanel', currentLang) && btn.hasAttribute('data-fallback')) {
    btn.textContent = t('openSidePanelFallback', currentLang);
  }
}