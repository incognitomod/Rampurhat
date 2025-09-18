// Theme & language toggles
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  const langToggle = document.getElementById('langToggle');
  const currentTheme = localStorage.getItem('theme') || 'light';
  const currentLang = localStorage.getItem('lang') || 'en';
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateToggles(currentTheme, currentLang);

  themeToggle?.addEventListener('click', () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    location.reload();
  });

  langToggle?.addEventListener('click', () => {
    const newLang = currentLang === 'en' ? 'bn' : 'en';
    localStorage.setItem('lang', newLang);
    location.reload();
  });
});

function updateToggles(theme, lang) {
  const themeBtn = document.getElementById('themeToggle');
  const langBtn = document.getElementById('langToggle');
  if (themeBtn) themeBtn.textContent = theme === 'light' ? '🌑' : '🌕';
  if (langBtn) langBtn.textContent = lang === 'en' ? 'বাংলা' : 'English';
}

// Firebase placeholders
// Initialize Firebase here with your config
