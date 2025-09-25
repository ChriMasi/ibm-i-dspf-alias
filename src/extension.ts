import * as vscode from 'vscode';

type AliasName = string;

interface AliasUsage {
  readonly name: AliasName;
  readonly range: vscode.Range;
  readonly rangeWithAmpersand: vscode.Range;
  readonly location: vscode.Location;
}

interface AliasDeclaration {
  readonly name: AliasName;
  readonly nameRange: vscode.Range;
  readonly valueRange?: vscode.Range;
  readonly location: vscode.Location;
}

interface ParsedFormat {
  readonly name: string;
  readonly startLine: number;
  endLine: number;
  readonly aliasDeclarations: Map<AliasName, AliasDeclaration>;
  readonly aliasUsages: Map<AliasName, AliasUsage[]>;
}

export function activate(context: vscode.ExtensionContext): void {
  const selector: vscode.DocumentSelector = {
    scheme: 'file',
    language: 'dds.dspf'
  };

  const provider = new DspfAliasDefinitionProvider();
  context.subscriptions.push(vscode.languages.registerDefinitionProvider(selector, provider));
}

export function deactivate(): void {
  // Nothing to dispose
}

class DspfAliasDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition> {
    const formats = parseDocument(document);
    const format = formats.find(section => position.line >= section.startLine && position.line <= section.endLine);

    if (!format) {
      return null;
    }

    const usageHit = findUsageAtPosition(format, document, position);
    if (usageHit) {
      const declaration = format.aliasDeclarations.get(usageHit.name);
      if (declaration) {
        return declaration.location;
      }
      return null;
    }

    const declarationHit = findDeclarationAtPosition(format, position);
    if (declarationHit) {
      const usages = format.aliasUsages.get(declarationHit.name) ?? [];
      if (usages.length === 0) {
        return null;
      }
      return usages.map(item => item.location);
    }

    return null;
  }
}

function parseDocument(document: vscode.TextDocument): ParsedFormat[] {
  const formats: ParsedFormat[] = [];
  const lineCount = document.lineCount;
  let currentFormat: ParsedFormat | undefined;

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
    const rawLine = document.lineAt(lineIndex).text;
    const sanitized = sanitizeLine(rawLine);

    if (isFormatHeader(sanitized)) {
      if (currentFormat) {
        currentFormat.endLine = lineIndex - 1;
      }

      currentFormat = {
        name: extractFormatName(sanitized),
        startLine: lineIndex,
        endLine: lineCount - 1,
        aliasDeclarations: new Map(),
        aliasUsages: new Map()
      };

      formats.push(currentFormat);
    }

    if (!currentFormat) {
      continue;
    }

    if (!isLogicalSpecificationLine(sanitized)) {
      continue;
    }

    collectAliasUsages(document, currentFormat, lineIndex, rawLine);
    collectAliasDeclaration(document, currentFormat, lineIndex, rawLine, sanitized);
  }

  return formats;
}

function collectAliasUsages(document: vscode.TextDocument, format: ParsedFormat, lineIndex: number, rawLine: string): void {
  const usageRegex = /DSPATR\(&([A-Z0-9_]+)\)/gi;
  let match: RegExpExecArray | null;

  while ((match = usageRegex.exec(rawLine)) !== null) {
    const aliasName = match[1].toUpperCase();
    const ampersandStart = match.index + 'DSPATR('.length;
    const aliasStart = ampersandStart + 1;
    const aliasEnd = aliasStart + aliasName.length;

    const aliasRange = new vscode.Range(lineIndex, aliasStart, lineIndex, aliasEnd);
    const aliasRangeWithAmp = new vscode.Range(lineIndex, ampersandStart, lineIndex, aliasEnd);

    const usage: AliasUsage = {
      name: aliasName,
      range: aliasRange,
      rangeWithAmpersand: aliasRangeWithAmp,
      location: new vscode.Location(document.uri, aliasRangeWithAmp)
    };

    const list = format.aliasUsages.get(aliasName) ?? [];
    list.push(usage);
    format.aliasUsages.set(aliasName, list);
  }
}

function collectAliasDeclaration(
  document: vscode.TextDocument,
  format: ParsedFormat,
  lineIndex: number,
  rawLine: string,
  sanitizedLine: string
): void {
  if (!/ALIAS\(/i.test(sanitizedLine)) {
    return;
  }

  const declarationRegex = /^\s*A\s+([A-Z0-9_#@]+)\b.*?ALIAS\(([^)]+)\)/i;
  const match = declarationRegex.exec(sanitizedLine);
  if (!match) {
    return;
  }

  const aliasIdentifier = match[1];
  const aliasValue = match[2];
  const aliasName = aliasIdentifier.toUpperCase();

  const nameStart = rawLine.indexOf(aliasIdentifier);
  if (nameStart < 0) {
    return;
  }

  const nameRange = new vscode.Range(lineIndex, nameStart, lineIndex, nameStart + aliasIdentifier.length);

  let valueRange: vscode.Range | undefined;
  const valueStart = rawLine.indexOf(aliasValue, nameStart + aliasIdentifier.length);
  if (valueStart >= 0) {
    valueRange = new vscode.Range(lineIndex, valueStart, lineIndex, valueStart + aliasValue.length);
  }

  const declaration: AliasDeclaration = {
    name: aliasName,
    nameRange,
    valueRange,
    location: new vscode.Location(document.uri, nameRange)
  };

  format.aliasDeclarations.set(aliasName, declaration);
}

function findUsageAtPosition(format: ParsedFormat, document: vscode.TextDocument, position: vscode.Position): AliasUsage | undefined {
  for (const usageList of format.aliasUsages.values()) {
    for (const usage of usageList) {
      if (usage.rangeWithAmpersand.contains(position) || usage.range.contains(position)) {
        return usage;
      }
    }
  }

  return undefined;
}

function findDeclarationAtPosition(format: ParsedFormat, position: vscode.Position): AliasDeclaration | undefined {
  for (const declaration of format.aliasDeclarations.values()) {
    if (declaration.nameRange.contains(position)) {
      return declaration;
    }
    if (declaration.valueRange && declaration.valueRange.contains(position)) {
      return declaration;
    }
  }

  return undefined;
}

function sanitizeLine(line: string): string {
  return line
    .replace(/§\|§/g, '   ')
    .replace(/£\|£/g, '   ');
}

function isLogicalSpecificationLine(line: string): boolean {
  if (line.length < 7) {
    return false;
  }

  return line[5] === 'A' && line[6] !== '*';
}

function isFormatHeader(line: string): boolean {
  if (!isLogicalSpecificationLine(line)) {
    return false;
  }

  if (line.length <= 16) {
    return false;
  }

  return line[16] === 'R';
}

function extractFormatName(line: string): string {
  if (!isFormatHeader(line)) {
    return '';
  }

  const remainder = line.substring(17).trim();
  const parts = remainder.split(/\s+/);
  return parts[0] ?? '';
}
