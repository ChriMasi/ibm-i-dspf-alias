
[See the English version below](#english-version)

# DSPF Alias Definition Navigator

## Descrizione (Italiano)

Estensione per Visual Studio Code che riconosce alias e utilizzi nei display file IBM i (AS/400) con estensione `.dspf`, consentendo la navigazione tramite *Go to Definition* (Ctrl+Click).

### Funzionalità

- Registra un linguaggio dedicato `dds.dspf` per i file con estensione `.dspf`.
- Analizza i formati DDS rilevando i blocchi `A R` e limitando la ricerca al formato corrente.
- Collega alias dichiarati con `ALIAS(...)` e il relativo utilizzo tramite `DSPATR(&ALIAS)` all'interno dello stesso formato.
- Supporta sia il click sull'alias (es. `&AI_01`) sia sul nome o sul valore dell'alias nella dichiarazione (`AI_01`, `ALIAS(AI_F1_CDAZPR)`).

### Utilizzo

1. Apri un file `.dspf` nel workspace.
2. Usa Ctrl+Click (o F12) su:
   - Un alias utilizzato in `DSPATR(&ALIAS)` per saltare alla dichiarazione `ALIAS(...)` corrispondente.
   - Il nome campo o il valore dentro `ALIAS(...)` per tornare alle righe `DSPATR(&ALIAS)` che lo utilizzano.

La ricerca viene effettuata entro il formato DDS corrente, identificato dalle righe `A          R`. Le righe commentate (con `*` in colonna 7) vengono ignorate.

### Sviluppo

```powershell
npm install
npm run compile
```

Durante lo sviluppo puoi usare `npm run watch` per ricompilare automaticamente alla modifica dei sorgenti TypeScript.

Per testare l'estensione localmente:

1. Apri la cartella in VS Code.
2. Premi `F5` per avviare una nuova finestra di Extension Development Host.
3. Apri un file `.dspf` e prova la navigazione con Ctrl+Click.

---

## English version

# DSPF Alias Definition Navigator

## Description (English)

Extension for Visual Studio Code that recognizes aliases and their usages in IBM i (AS/400) display files with `.dspf` extension, enabling navigation via *Go to Definition* (Ctrl+Click).

### Features

- Registers a dedicated language `dds.dspf` for files with `.dspf` extension.
- Parses DDS formats, detecting `A R` blocks and limiting the search to the current format.
- Links aliases declared with `ALIAS(...)` and their usage via `DSPATR(&ALIAS)` within the same format.
- Supports clicking both on the alias usage (e.g. `&AI_01`) and on the alias name or value in the declaration (`AI_01`, `ALIAS(AI_F1_CDAZPR)`).

### Usage

1. Open a `.dspf` file in your workspace.
2. Use Ctrl+Click (or F12) on:
   - An alias used in `DSPATR(&ALIAS)` to jump to the corresponding `ALIAS(...)` declaration.
   - The field name or the value inside `ALIAS(...)` to jump back to the `DSPATR(&ALIAS)` lines that use it.

The search is performed within the current DDS format, identified by lines starting with `A          R`. Commented lines (with `*` in column 7) are ignored.

### Development

```powershell
npm install
npm run compile
```

During development you can use `npm run watch` to automatically recompile on TypeScript source changes.

To test the extension locally:

1. Open the folder in VS Code.
2. Press `F5` to launch a new Extension Development Host window.
3. Open a `.dspf` file and try navigation with Ctrl+Click.
