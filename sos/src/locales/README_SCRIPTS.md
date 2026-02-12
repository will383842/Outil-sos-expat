# Translation Scripts Documentation

This directory contains utility scripts for managing translations across all 9 languages.

## Available Scripts

### 1. `find-missing.cjs`
**Purpose**: Identify missing translation keys across all languages

```bash
node find-missing.cjs
```

**Output**:
- Compares all languages against reference languages (pt-pt for influencer, ru-ru for blogger)
- Lists missing keys per language
- Creates `missing-keys.json` with detailed breakdown

---

### 2. `smart-translate.cjs`
**Purpose**: Intelligently translate missing keys using pattern matching

```bash
node smart-translate.cjs
```

**Features**:
- Portuguese → Spanish translation with 150+ linguistic patterns
- Pattern matching for other languages from existing translations
- Marks uncertain translations with `[NEEDS REVIEW]` for manual verification

---

### 3. `fix-review-markers.cjs`
**Purpose**: Replace `[NEEDS REVIEW]` placeholders with high-quality professional translations

```bash
node fix-review-markers.cjs
```

**Output**:
- Replaces all auto-generated placeholders
- Saves updated files with alphabetical sorting
- Verifies zero markers remain

---

### 4. `quality-check.cjs`
**Purpose**: Sample check translation quality and view statistics

```bash
node quality-check.cjs
```

**Output**:
- Sample translations for key entries
- Statistics (total keys, influencer, blogger, groupadmin counts)
- Quick verification of completion status

---

## Workflow for Adding New Translations

1. **Add reference translations** to `pt-pt` (influencer) or `ru-ru` (blogger)

2. **Identify missing keys**:
   ```bash
   node find-missing.cjs
   ```

3. **Auto-translate** (creates initial versions):
   ```bash
   node smart-translate.cjs
   ```

4. **Review and fix** auto-generated translations:
   ```bash
   node fix-review-markers.cjs
   ```

5. **Quality check**:
   ```bash
   node quality-check.cjs
   ```

6. **Commit changes**:
   ```bash
   git add */common.json
   git commit -m "feat(i18n): add translations for [section] in [languages]"
   ```

---

## File Structure

```
locales/
├── fr-fr/common.json    (French)
├── en/common.json       (English)
├── es-es/common.json    (Spanish)
├── de-de/common.json    (German)
├── pt-pt/common.json    (Portuguese - Influencer reference)
├── ru-ru/common.json    (Russian - Blogger reference)
├── zh-cn/common.json    (Chinese)
├── hi-in/common.json    (Hindi)
├── ar-sa/common.json    (Arabic)
└── [scripts and docs]
```

---

## Key Sections

- **influencer**: 227 keys - Landing pages for influencers
- **blogger**: 316 keys - Landing and dashboard for bloggers
- **groupadmin**: 55 keys - Group admin features

---

## Best Practices

1. **Always use reference languages**:
   - Influencer: `pt-pt` (most complete)
   - Blogger: `ru-ru` (most complete)

2. **Alphabetical sorting**: All scripts maintain alphabetical key order

3. **UTF-8 encoding**: All files use UTF-8 with proper BOM handling

4. **Context awareness**: Translations consider target audience and industry terminology

5. **No empty values**: All keys must have values (no `""` or `null`)

---

## Troubleshooting

### Missing keys after translation
Run `find-missing.cjs` to identify which keys are still missing.

### Placeholder markers in production
Run `fix-review-markers.cjs` to replace all `[NEEDS REVIEW]` markers.

### Inconsistent key counts
Check that all languages have the same keys using `quality-check.cjs`.

---

*Last updated: 2026-02-12*
