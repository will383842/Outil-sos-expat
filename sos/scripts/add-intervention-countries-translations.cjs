/**
 * Script to add interventionCountries translations to all language files
 */

const fs = require('fs');
const path = require('path');

const translations = {
  en: {
    "common.optional": "Optional",
    "common.refresh": "Refresh",
    "form.countriesSelected": "countries selected",
    "form.interventionCountries": "Target countries",
    "form.interventionCountries.hint": "Select the countries where you can promote our services (helps target your audience)",
    "form.interventionCountries.placeholder": "Select countries...",
  },
  fr: {
    "common.optional": "Optionnel",
    "common.refresh": "Actualiser",
    "form.countriesSelected": "pays sélectionnés",
    "form.interventionCountries": "Pays cibles",
    "form.interventionCountries.hint": "Sélectionnez les pays où vous pouvez promouvoir nos services (aide à cibler votre audience)",
    "form.interventionCountries.placeholder": "Sélectionnez des pays...",
  },
  es: {
    "common.optional": "Opcional",
    "common.refresh": "Actualizar",
    "form.countriesSelected": "países seleccionados",
    "form.interventionCountries": "Países objetivo",
    "form.interventionCountries.hint": "Seleccione los países donde puede promocionar nuestros servicios (ayuda a dirigirse a su audiencia)",
    "form.interventionCountries.placeholder": "Seleccione países...",
  },
  de: {
    "common.optional": "Optional",
    "common.refresh": "Aktualisieren",
    "form.countriesSelected": "Länder ausgewählt",
    "form.interventionCountries": "Zielländer",
    "form.interventionCountries.hint": "Wählen Sie die Länder aus, in denen Sie unsere Dienste bewerben können (hilft, Ihr Publikum gezielt anzusprechen)",
    "form.interventionCountries.placeholder": "Länder auswählen...",
  },
  pt: {
    "common.optional": "Opcional",
    "common.refresh": "Atualizar",
    "form.countriesSelected": "países selecionados",
    "form.interventionCountries": "Países alvo",
    "form.interventionCountries.hint": "Selecione os países onde você pode promover nossos serviços (ajuda a direcionar seu público)",
    "form.interventionCountries.placeholder": "Selecione países...",
  },
  ru: {
    "common.optional": "Необязательно",
    "common.refresh": "Обновить",
    "form.countriesSelected": "выбранные страны",
    "form.interventionCountries": "Целевые страны",
    "form.interventionCountries.hint": "Выберите страны, где вы можете продвигать наши услуги (помогает нацелить вашу аудиторию)",
    "form.interventionCountries.placeholder": "Выберите страны...",
  },
  ar: {
    "common.optional": "اختياري",
    "common.refresh": "تحديث",
    "form.countriesSelected": "البلدان المختارة",
    "form.interventionCountries": "البلدان المستهدفة",
    "form.interventionCountries.hint": "حدد البلدان التي يمكنك الترويج لخدماتنا فيها (يساعد في استهداف جمهورك)",
    "form.interventionCountries.placeholder": "حدد البلدان...",
  },
  hi: {
    "common.optional": "वैकल्पिक",
    "common.refresh": "ताज़ा करें",
    "form.countriesSelected": "देश चुने गए",
    "form.interventionCountries": "लक्षित देश",
    "form.interventionCountries.hint": "उन देशों का चयन करें जहाँ आप हमारी सेवाओं को बढ़ावा दे सकते हैं (आपके दर्शकों को लक्षित करने में मदद करता है)",
    "form.interventionCountries.placeholder": "देश चुनें...",
  },
  ch: {
    "common.optional": "可选",
    "common.refresh": "刷新",
    "form.countriesSelected": "已选国家",
    "form.interventionCountries": "目标国家",
    "form.interventionCountries.hint": "选择您可以推广我们服务的国家（有助于定位您的受众）",
    "form.interventionCountries.placeholder": "选择国家...",
  },
};

const helperDir = path.join(__dirname, '..', 'src', 'helper');

// Process each language file
Object.keys(translations).forEach(lang => {
  const filePath = path.join(helperDir, `${lang}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${lang}.json`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);

    let added = 0;
    Object.entries(translations[lang]).forEach(([key, value]) => {
      if (!json[key]) {
        json[key] = value;
        added++;
      }
    });

    if (added > 0) {
      // Sort keys alphabetically
      const sorted = Object.keys(json).sort().reduce((obj, key) => {
        obj[key] = json[key];
        return obj;
      }, {});

      fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
      console.log(`✅ ${lang}.json: Added ${added} translations`);
    } else {
      console.log(`ℹ️  ${lang}.json: Already up to date`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${lang}.json:`, error.message);
  }
});

console.log('\n✨ Translation update complete!');
