#!/usr/bin/env node
/** Marguerite: the official RGAA for coding agents, and for you. */
import { readFileSync } from 'node:fs';
import { callTool, startServer } from '../src/server.mjs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const HELP = `Marguerite · le RGAA 4.1.2 officiel, pour les agents de code et pour vous

Usage :
  marguerite critere <numéro>     un critère (11.1) ou un test (11.1.2), avec sa méthodologie
  marguerite chercher <mots>      les critères qui parlent d'un sujet
  marguerite theme [numéro]       les critères d'un thème, ou la liste des 13 thèmes
  marguerite definition <terme>   un terme du glossaire officiel
  marguerite serveur              lance le serveur MCP (pour un agent de code)

Source : DINUM, https://accessibilite.numerique.gouv.fr (Licence Ouverte 2.0).`;

/** Command → [MCP tool, argument name]. */
const COMMAND_TOOLS = {
  critere: ['rgaa_critere', 'numero'],
  chercher: ['rgaa_chercher', 'texte'],
  theme: ['rgaa_theme', 'numero'],
  definition: ['rgaa_definition', 'terme'],
};

const [command, ...rest] = process.argv.slice(2);
const argument = rest.join(' ');
const commandKey = command && command.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

if (commandKey === 'serveur') startServer(version);
else if (COMMAND_TOOLS[commandKey]) {
  const [toolName, argumentName] = COMMAND_TOOLS[commandKey];
  const result = callTool(toolName, argument ? { [argumentName]: argument } : {});
  console.log(result.content[0].text);
  if (result.isError) process.exit(1);
} else if (!command || ['aide', '--aide', '-h', '--help'].includes(commandKey)) console.log(HELP);
else {
  console.error(`marguerite : commande inconnue « ${command} ». Tapez « marguerite aide ».`);
  process.exit(1);
}
