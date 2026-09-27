import { world, system, ItemStack, EnchantmentType, CommandPermissionLevel, CustomCommandStatus, PlayerPermissionLevel, DisplaySlotId, ObjectiveSortOrder } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { ICON_MAP } from "./iconMap.js";

/* =========================================================
   KONFIGURATION – hier kannst du alles anpassen
   ========================================================= */
const CONFIG = {
  // Item, das (per Rechtsklick / "Benutzen") den Marktplatz öffnet.
  TRIGGER_ITEM: "minecraft:compass",

  // Name deines bestehenden Scoreboard-Objectives
  MONEY_OBJECTIVE: "money",

  // Eigenes, vom Skript verwaltetes Objective für das Sidebar-Dashboard (Geld + Clan + Job
  // pro Spieler, wie bei "Kittys Instant Scoreboard"). Getrennt vom echten money-Objective,
  // damit der Titel jederzeit gefahrlos neu gesetzt werden kann (reine Anzeige, keine echten
  // Spielerdaten).
  DASHBOARD_OBJECTIVE: "mkt_dashboard",
  DASHBOARD_DEFAULT_TITLE: "§6§lRealm Marktplatz",
  DASHBOARD_REFRESH_TICKS: 20 * 5, // alle 5 Sekunden neu aufbauen (Sicherheitsnetz)
  DASHBOARD_ROTATE_TICKS: 20 * 60 * 2.5, // alle 2,5 Minuten zur nächsten Ansicht wechseln

  // Maximal gleichzeitig aktive Angebote
  MAX_LISTINGS: 500,

  // Maximal gleichzeitig aktive Orders (Ordersystem)
  MAX_ORDERS: 500,

  // Wie viele Treffer die Item-Suche beim Erstellen einer Order maximal anzeigt
  ITEM_SEARCH_MAX_RESULTS: 25,

  // Ablaufzeit für Angebote (nur Auktionshaus, Orders bleiben unbegrenzt) in
  // Millisekunden. 3 Wochen = 3*7*24*60*60*1000
  // Auf 0 setzen, um das Ablaufen komplett zu deaktivieren.
  EXPIRY_MS: 3 * 7 * 24 * 60 * 60 * 1000,

  // Wie oft (in Ticks, 20 Ticks = 1 Sekunde) auf abgelaufene Angebote geprüft wird
  CHECK_INTERVAL_TICKS: 20 * 60 * 5, // alle 5 Minuten

  // Angebote pro Seite in der Durchsuchen-Liste
  LISTINGS_PER_PAGE: 20,

  // Wenn true: zeigt beim Kauf Debug-Infos im Chat (Guthaben vorher/nachher, Fehler).
  DEBUG: false,

  // Diese Items können NICHT verkauft werden: der Trank-/Pfeil-Effekt lässt sich
  // nur über die experimentellen Beta-APIs auslesen/wiederherstellen - die sind
  // auf Realms nicht nutzbar. Käufer würde sonst einen wirkungslosen Platzhalter
  // bekommen statt des tatsächlichen Effekts.
  BLOCKED_ITEMS: [
    "minecraft:potion", "minecraft:splash_potion", "minecraft:lingering_potion", "minecraft:tipped_arrow",
    // Weitere Items, deren Inhalt/Daten beim Wiederherstellen (nur per ID/Name/Menge/Verzauberung/Haltbarkeit) verloren gingen:
    "minecraft:written_book", "minecraft:writable_book", "minecraft:filled_map",
    "minecraft:firework_rocket", "minecraft:firework_star", "minecraft:goat_horn",
    "minecraft:suspicious_stew", "minecraft:ominous_bottle", "minecraft:decorated_pot",
    // Verzauberte Bücher: ob die gespeicherten Verzauberungen per Script les-/schreibbar sind, ist ungeprüft -> vorsorglich gesperrt.
    "minecraft:enchanted_book",
  ],

  // Zusätzliche Sperre per Item-ID-Muster (ohne "minecraft:"): Shulkerboxen (Inhalt), Bündel (Inhalt), Banner (Muster)
  BLOCKED_ID_PATTERNS: [/shulker_box$/, /(^|_)bundle$/, /(^|_)banner$/],

  // Gefärbte Items (z.B. Lederrüstung) sperren, weil die Farbe nicht mitgespeichert wird.
  // Falls das bei dir fälschlich ALLE Lederrüstungen sperrt, hier auf false setzen.
  BLOCK_DYED_ITEMS: true,

  // Wie viele Angebote / Orders ein einzelner Spieler gleichzeitig haben darf
  MAX_LISTINGS_PER_PLAYER: 25,
  MAX_ORDERS_PER_PLAYER: 25,

  // Höchstpreis (Angebotspreis bzw. Preis pro Stück bei Orders). Scoreboard-Werte sind 32-Bit (max. 2.147.483.647).
  MAX_PRICE: 1000000000,

  // Rüstungs-Verzierungen (Armor Trims): Per Script lassen sie sich weder erkennen noch speichern/wiederherstellen.
  // "off"   = Rüstung ist handelbar, eine vorhandene Verzierung geht dabei aber verloren (aktuelle Einstellung)
  // "block" = alle trimmbaren Rüstungsteile (Helm/Brustplatte/Hose/Schuhe) sind vom Verkauf und von Orders ausgeschlossen
  ARMOR_TRIM_MODE: "off",

  // Tag für die Admin-Geld-Diagnose im Hauptmenü. Vergabe im Spiel: /tag <Name> add mkt_admin
  ADMIN_TAG: "mkt_admin",

  // Anzahl der Home-Slots pro Spieler
  MAX_HOMES: 5,

  // Wie lange man stillstehen muss, um zu einem Home zu teleportieren (Ticks, 20 = 1 Sekunde)
  HOME_TELEPORT_DELAY_TICKS: 20 * 5, // 5 Sekunden

  // Wie oft während des Kanalisierens auf Bewegung geprüft wird (Ticks)
  HOME_CHECK_INTERVAL_TICKS: 4,

  // TPA: wie lange eine Anfrage gültig ist, bevor sie automatisch abgelehnt wird (Ticks)
  TPA_REQUEST_TIMEOUT_TICKS: 20 * 60, // 60 Sekunden

  // TPA: Countdown bis zur Teleportation nach Annahme (Ticks) - gilt für den, der tatsächlich reist
  TPA_TELEPORT_DELAY_TICKS: 20 * 5, // 5 Sekunden, wie bei Homes/RTP

  // TPA: wie oft während des Countdowns auf Bewegung/Combat-Lock geprüft wird (Ticks)
  TPA_CHECK_INTERVAL_TICKS: 4,

  // JOBS-SYSTEM
  JOB_XP_PER_LEVEL: 50, // XP nötig pro Level (linear)
  // Kein Max-Level: der Level steigt unbegrenzt mit der XP weiter.
  JOB_PAYOUT_PER_LEVEL_BONUS: 0.05, // +5% Auszahlung pro Level

  // LOTTO-SYSTEM
  LOTTO_TICKET_PRICE: 5000, // money pro Los
  LOTTO_DRAW_INTERVAL_MS: 60 * 60 * 1000, // 60 Minuten (Echtzeit, überlebt Neustarts)
  LOTTO_CHECK_INTERVAL_TICKS: 20, // wie oft (Ticks) geprüft wird, ob eine Ziehung fällig ist
  LOTTO_BASE_POT: 275000, // Grundpot: der Jackpot beträgt IMMER mindestens diesen Betrag (der Server stellt ihn); jedes Los erhöht ihn um den Ticketpreis
  LOTTO_MIN_PRIZE: 1000, // kleinster möglicher Gewinn
  LOTTO_PRIZE_STEP: 1000, // Der Gewinn wird zufällig in Schritten dieser Größe zwischen LOTTO_MIN_PRIZE und dem Jackpot gezogen (beide Enden möglich). 1 = jeder Betrag
  // Der Gewinn ist immer zufällig (auch wenn nur ein einziges Los verkauft wurde). Mehr Lose = höhere Chance, überhaupt zu gewinnen.
  // Kein Rollover: der Pot wird nach jeder Ziehung auf den Grundpot zurückgesetzt.

  // SERVER-EVENTS (automatische Sammel-Wettbewerbe, kein PvP)
  EVENT_INTERVAL_MS: 48 * 60 * 60 * 1000, // 48 Stunden zwischen zwei Events
  EVENT_START_HOURS_DE: [15, 16], // zufällige Startstunde in deutscher Zeit (Europe/Berlin, inkl. Sommerzeit-Berechnung)
  EVENT_DURATION_MS: 60 * 60 * 1000, // 60 Minuten Ablieferzeit
  EVENT_CHECK_INTERVAL_TICKS: 20 * 10, // alle 10s prüfen, ob Start/Ende fällig ist
  // Belohnungen sind Platzhalter - bitte an deine Wirtschaft anpassen:
  EVENT_MONEY_REWARD: 25000,
  EVENT_ITEM_REWARD_ID: "minecraft:diamond",
  EVENT_ITEM_REWARD_AMOUNT: 3,

  // Clan-Tag: minimale/maximale Länge (Zeichen)
  CLAN_TAG_MIN_LENGTH: 2,
  CLAN_TAG_MAX_LENGTH: 6,

  // Position des Clan-Tags relativ zum Spielernamen: "left" oder "right"
  CLAN_TAG_POSITION: "right",

  // RTP (Zufalls-Teleport): Ring um den Welt-Spawn, in dem das Ziel zufällig gewürfelt wird (Blöcke)
  RTP_MIN_RADIUS: 300,
  RTP_MAX_RADIUS: 50000,

  // Wie lange man stillstehen und kampffrei bleiben muss, bevor RTP ausgeführt wird (Ticks)
  RTP_TELEPORT_DELAY_TICKS: 20 * 5, // 5 Sekunden, wie bei Homes

  // Cooldown zwischen zwei RTPs (Ticks). 20*60*5 = 5 Minuten
  RTP_COOLDOWN_TICKS: 20 * 60 * 5,

  // Zielhöhe im Himmel (wird auf die Welt-Obergrenze begrenzt). Man fällt von dort mit Resistenz zu Boden.
  RTP_SKY_Y: 300,

  // Schutz nach dem Teleport: Effekt "Resistenz" mit dieser Stufe (Verstärker) und Dauer.
  // Stufe 255 macht (außer Void/Kill) praktisch unverwundbar, also auch keinen Fallschaden.
  RTP_RESISTANCE_AMPLIFIER: 255,
  RTP_RESISTANCE_TICKS: 20 * 20, // 20 Sekunden

  // Wie oft ein Teleport erneut versucht wird, falls er selbst fehlschlägt
  RTP_MAX_ATTEMPTS: 3,
};

// Auswahl an Farben, die ein Clan-Anführer für sein Tag wählen kann
const CLAN_COLORS = [
  { name: "Weiß", code: "§f" },
  { name: "Hellgrau", code: "§7" },
  { name: "Grau", code: "§8" },
  { name: "Schwarz", code: "§0" },
  { name: "Rot", code: "§c" },
  { name: "Dunkelrot", code: "§4" },
  { name: "Gold", code: "§6" },
  { name: "Gelb", code: "§e" },
  { name: "Grün", code: "§a" },
  { name: "Dunkelgrün", code: "§2" },
  { name: "Aqua", code: "§b" },
  { name: "Dunkelaqua", code: "§3" },
  { name: "Blau", code: "§9" },
  { name: "Dunkelblau", code: "§1" },
  { name: "Lila", code: "§d" },
  { name: "Dunkellila", code: "§5" },
];

/* =========================================================
   HILFSFUNKTIONEN – Datenspeicherung (Marktplatz-Angebote)
   ========================================================= */

function getIndex() {
  const raw = world.getDynamicProperty("mkt_index");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveIndex(arr) {
  world.setDynamicProperty("mkt_index", JSON.stringify(arr));
}

function getNextId() {
  let n = world.getDynamicProperty("mkt_next_id");
  if (typeof n !== "number") n = 0;
  world.setDynamicProperty("mkt_next_id", n + 1);
  return n + 1;
}

function getListing(id) {
  const raw = world.getDynamicProperty("mkt_" + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveListing(id, obj) {
  world.setDynamicProperty("mkt_" + id, JSON.stringify(obj));
}

function deleteListingData(id) {
  world.setDynamicProperty("mkt_" + id, undefined);
}

/* Postfach: falls ein Item nicht sofort übergeben werden kann. */

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

// Ein Property-String ist begrenzt (meines Wissens ca. 32.767 Zeichen). Große Postfächer werden deshalb auf
// mehrere Properties verteilt: postfach_<name>, postfach_<name>#1, postfach_<name>#2, ...
// ("#" kann durch sanitizeName nie im Namen vorkommen, dadurch keine Kollision mit anderen Spielern.)
const POSTFACH_CHUNK_MAX_CHARS = 20000;

function postfachChunkKey(playerName, i) {
  const base = "postfach_" + sanitizeName(playerName);
  return i === 0 ? base : `${base}#${i}`;
}

function getPostfach(playerName) {
  const all = [];
  for (let i = 0; i < 200; i++) {
    const raw = world.getDynamicProperty(postfachChunkKey(playerName, i));
    if (!raw) break;
    try {
      const part = JSON.parse(raw);
      if (Array.isArray(part)) all.push(...part);
    } catch {}
  }
  return all;
}

function savePostfach(playerName, arr) {
  const chunks = [];
  let cur = [];
  let curLen = 2;
  for (const entry of arr) {
    const len = JSON.stringify(entry).length + 1;
    if (cur.length > 0 && curLen + len > POSTFACH_CHUNK_MAX_CHARS) {
      chunks.push(cur);
      cur = [];
      curLen = 2;
    }
    cur.push(entry);
    curLen += len;
  }
  if (cur.length > 0) chunks.push(cur);

  for (let i = 0; i < chunks.length; i++) {
    world.setDynamicProperty(postfachChunkKey(playerName, i), JSON.stringify(chunks[i]));
  }
  // nicht mehr benötigte Chunks entfernen
  for (let i = chunks.length; i < 200; i++) {
    const key = postfachChunkKey(playerName, i);
    if (world.getDynamicProperty(key) === undefined) break;
    world.setDynamicProperty(key, undefined);
  }
}

function addToPostfach(playerName, entry) {
  const arr = getPostfach(playerName);
  arr.push(entry);
  savePostfach(playerName, arr);
}

/* =========================================================
   VERZAUBERUNGEN
   ========================================================= */

function getEnchantmentsData(itemStack) {
  try {
    const comp = itemStack.getComponent("minecraft:enchantable");
    if (!comp) return [];
    return comp.getEnchantments().map((e) => ({ id: e.type.id, level: e.level }));
  } catch (e) {
    console.warn("[Marktplatz] Fehler beim Auslesen der Verzauberungen: " + e);
    return [];
  }
}

function applyEnchantmentsData(itemStack, enchantData) {
  if (!enchantData || enchantData.length === 0) return;
  try {
    const comp = itemStack.getComponent("minecraft:enchantable");
    if (!comp) return;
    for (const e of enchantData) {
      comp.addEnchantment({ type: new EnchantmentType(e.id), level: e.level });
    }
  } catch (e) {
    console.warn("[Marktplatz] Fehler beim Anwenden der Verzauberungen: " + e);
  }
}

/* =========================================================
   HALTBARKEIT / ABNUTZUNG
   ========================================================= */

function getDamage(itemStack) {
  try {
    const comp = itemStack.getComponent("minecraft:durability");
    return comp ? comp.damage : null;
  } catch (e) {
    console.warn("[Marktplatz] Fehler beim Auslesen der Haltbarkeit: " + e);
    return null;
  }
}

function applyDamage(itemStack, damage) {
  if (damage === null || damage === undefined) return;
  try {
    const comp = itemStack.getComponent("minecraft:durability");
    if (comp) comp.damage = damage;
  } catch (e) {
    console.warn("[Marktplatz] Fehler beim Anwenden der Haltbarkeit: " + e);
  }
}

/* =========================================================
   GELD (Scoreboard "money")
   ========================================================= */

function getMoneyObjective() {
  const obj = world.scoreboard.getObjective(CONFIG.MONEY_OBJECTIVE);
  if (!obj) {
    console.warn(`[Marktplatz] Scoreboard-Objective "${CONFIG.MONEY_OBJECTIVE}" wurde nicht gefunden!`);
  }
  return obj;
}

// Zeigt ein mehrzeiliges Sidebar-Dashboard pro Online-Spieler an, wie bei "Kittys Instant
// Scoreboard" - mit rotierenden Ansichten (Geld/Kopfgeld/Job-Level/Clan, siehe
// DASHBOARD_VIEWS), die alle 2,5 Minuten automatisch wechseln. Getrennt vom echten
// "money"-Objective (das bleibt die echte Währung) - dieses Objective ist reine, sich selbst
// neu aufbauende Anzeige.
//
// Technischer Hinweis (Vermutung, aber gut abgesichert): Bedrocks Sidebar zeigt pro Zeile nur
// "Name: Zahl" an - eine Zahl lässt sich nicht offiziell verstecken. Deshalb wird je Ansicht
// bewusst eine dazu passende, sinnvolle Zahl gezeigt (Geld/Kopfgeld/Job-Level/Clan-Mitglieder,
// danach sortiert), zusätzliche Info steht als Text im Namen der Zeile. Das ist eine andere
// Optik als bei manchen Community-Addons, die die Zahl über eine eigene Resource-Pack-Schrift
// unsichtbar machen - das würde aber einen zusätzlichen Resource Pack voraussetzen und ist
// hier bewusst nicht gemacht.
function getDashboardTitle() {
  const t = world.getDynamicProperty("dashboard_title");
  return typeof t === "string" && t.length > 0 ? t : CONFIG.DASHBOARD_DEFAULT_TITLE;
}

function setDashboardTitle(title) {
  world.setDynamicProperty("dashboard_title", title);
}

// Rotierende Ansichten: alle 2,5 Minuten wechselt die Sidebar zur nächsten. Reihenfolge wie
// gewünscht: erst Geld, dann Kopfgeld, dann Job-Level, dann Clan - danach wieder von vorn.
const DASHBOARD_VIEWS = [
  { key: "money", label: "§aGeld" },
  { key: "bounty", label: "§cKopfgeld" },
  { key: "job", label: "§bJob-Level" },
  { key: "clan", label: "§dClan" },
];
let dashboardViewIndex = 0;

function currentDashboardView() {
  return DASHBOARD_VIEWS[dashboardViewIndex % DASHBOARD_VIEWS.length];
}

// Voller Titel = vom Admin gesetzter Basistext + aktuelle Ansicht. Ändert sich die Ansicht,
// ändert sich automatisch auch der volle Titel - das nutzt denselben Mechanismus in
// ensureDashboardObjective(), der bei Titeländerung ohnehin neu aufbaut.
function getFullDashboardTitle() {
  return `${getDashboardTitle()} §7- ${currentDashboardView().label}`;
}

// Legt das Dashboard-Objective an bzw. erneuert es, falls sich der (volle) Titel geändert hat
// (ScoreboardObjective erlaubt kein nachträgliches Umbenennen - deshalb bei Titeländerung
// entfernen + neu anlegen. Unproblematisch, da rein abgeleitete Anzeige ohne echte Daten).
function ensureDashboardObjective() {
  const title = getFullDashboardTitle();
  const lastApplied = world.getDynamicProperty("dashboard_last_applied_title");
  let obj = world.scoreboard.getObjective(CONFIG.DASHBOARD_OBJECTIVE);
  if (obj && lastApplied === title) return obj;

  if (obj) {
    try {
      world.scoreboard.removeObjective(obj);
    } catch (e) {
      console.warn("[Marktplatz] Konnte altes Dashboard-Objective nicht entfernen: " + e);
    }
  }
  obj = world.scoreboard.addObjective(CONFIG.DASHBOARD_OBJECTIVE, title);
  world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, {
    objective: obj,
    sortOrder: ObjectiveSortOrder.Descending,
  });
  world.setDynamicProperty("dashboard_last_applied_title", title);
  return obj;
}

// Baut Zeilentext + Sortier-Zahl für einen Spieler, abhängig von der aktuellen Ansicht.
// bountyTotals wird nur bei Bedarf einmal vor der Schleife berechnet (nicht pro Spieler).
function buildDashboardEntry(player, view, bountyTotals) {
  const clan = getPlayerClan(player.name);
  switch (view) {
    case "bounty": {
      const t = bountyTotals ? bountyTotals.get(player.name) : null;
      return { line: `§f${player.name}`, score: t ? t.total : 0 };
    }
    case "job": {
      const jd = getJobData(player.name);
      const jobText = jd.active
        ? `§b${JOB_DEFS[jd.active].label} §7Lvl.${getJobLevel(getJobXp(jd, jd.active))}`
        : "§7Kein Job";
      const level = jd.active ? getJobLevel(getJobXp(jd, jd.active)) : 0;
      return { line: `§f${player.name} §7- ${jobText}`, score: level };
    }
    case "clan": {
      const clanText = clan ? formatClanTag(clan) : "§7Kein Clan";
      const memberCount = clan && Array.isArray(clan.members) ? clan.members.length : 0;
      return { line: `${clanText} §f${player.name}`, score: memberCount };
    }
    case "money":
    default: {
      const clanPart = clan ? formatClanTag(clan) + " " : "";
      return { line: `${clanPart}§f${player.name}`, score: getMoney(player) };
    }
  }
}

function refreshDashboard() {
  try {
    const obj = ensureDashboardObjective();
    if (!obj) return;

    // Jede Aktualisierung baut die Zeilen komplett neu auf (reine Anzeige, keine Altlasten
    // möglich, da nichts davon dauerhaft gespeichert wird).
    let participants;
    try {
      participants = obj.getParticipants();
    } catch {
      participants = [];
    }
    for (const p of participants) {
      try {
        obj.removeParticipant(p);
      } catch {}
    }

    const view = currentDashboardView().key;
    const bountyTotals = view === "bounty" ? getBountyTotals() : null;

    for (const player of world.getPlayers()) {
      try {
        const { line, score } = buildDashboardEntry(player, view, bountyTotals);
        obj.setScore(line, score);
      } catch (e) {
        console.warn("[Marktplatz] Dashboard-Zeile für " + player.name + " fehlgeschlagen: " + e);
      }
    }
  } catch (e) {
    console.warn("[Marktplatz] Dashboard-Aktualisierung fehlgeschlagen: " + e);
  }
}

system.run(() => refreshDashboard());
system.runInterval(() => refreshDashboard(), CONFIG.DASHBOARD_REFRESH_TICKS);
system.runInterval(() => {
  dashboardViewIndex = (dashboardViewIndex + 1) % DASHBOARD_VIEWS.length;
  refreshDashboard();
}, CONFIG.DASHBOARD_ROTATE_TICKS);

// Bündelt mehrere Änderungen im selben Tick (z.B. mehrere Job-Auszahlungen bei einer
// Abbau-Serie) zu EINER Aktualisierung im nächsten Tick, statt bei jeder einzelnen
// Änderung sofort das komplette Dashboard neu aufzubauen. Bleibt praktisch "instant"
// (max. 1 Tick = 1/20 Sekunde Verzögerung), spart aber unnötige Mehrfach-Neuaufbauten.
let dashboardRefreshPending = false;
function requestDashboardRefresh() {
  if (dashboardRefreshPending) return;
  dashboardRefreshPending = true;
  system.run(() => {
    dashboardRefreshPending = false;
    refreshDashboard();
  });
}

function showDashboardTitleEditor(player) {
  new ModalFormData()
    .title("Dashboard-Titel")
    .textField("Titel (Formatcodes wie §6 erlaubt)", "z.B. §6§lRealm Marktplatz", {
      defaultValue: getDashboardTitle(),
    })
    .show(player)
    .then((res) => {
      if (res.canceled) {
        showMainMenu(player);
        return;
      }
      const [newTitle] = res.formValues;
      const trimmed = (newTitle ?? "").trim();
      if (trimmed.length === 0) {
        player.sendMessage("§cTitel darf nicht leer sein.");
        showMainMenu(player);
        return;
      }
      setDashboardTitle(trimmed);
      refreshDashboard(); // sofort anwenden, nicht erst beim nächsten Intervall
      player.sendMessage("§aDashboard-Titel aktualisiert.");
      showMainMenu(player);
    });
}

function getMoney(player) {
  try {
    const obj = getMoneyObjective();
    if (!obj) return 0;
    const score = obj.getScore(player);
    return typeof score === "number" ? score : 0;
  } catch (e) {
    console.warn("[Marktplatz] Fehler beim Auslesen des Guthabens: " + e);
    return 0;
  }
}

const INT32_MAX = 2147483647;

// Sucht die echte Scoreboard-Identität eines (auch offline) Spielers. Ein blanker Name-String an addScore()
// würde (vermutlich) einen separaten Fake-Player-Eintrag anlegen statt den echten Spieler-Score zu ändern.
function findPlayerIdentity(obj, name) {
  try {
    for (const p of obj.getParticipants()) {
      if (String(p.type) === "Player" && p.displayName === name) return p;
    }
  } catch (e) {
    console.warn("[Marktplatz] Fehler beim Suchen der Scoreboard-Identität: " + e);
  }
  return null;
}

// Vorgemerktes Guthaben für Spieler, deren Score nicht sicher offline änderbar ist.
// Wird beim nächsten Beitritt gutgeschrieben (claimPendingMoney).
function pendingMoneyKey(name) {
  return "pendmoney_" + sanitizeName(name);
}

function queuePendingMoney(name, amount) {
  if (!(amount > 0)) return false;
  try {
    const key = pendingMoneyKey(name);
    const cur = world.getDynamicProperty(key);
    world.setDynamicProperty(key, (typeof cur === "number" ? cur : 0) + amount);
    return true;
  } catch (e) {
    console.warn("[Marktplatz] Konnte Guthaben nicht vormerken: " + e);
    return false;
  }
}

function claimPendingMoney(player) {
  const key = pendingMoneyKey(player.name);
  const cur = world.getDynamicProperty(key);
  if (typeof cur !== "number" || cur <= 0) return;
  const amount = Math.min(Math.floor(cur), INT32_MAX);
  if (addMoneyTo(player, amount, undefined, true)) {
    world.setDynamicProperty(key, undefined);
    player.sendMessage(`§a[Marktplatz] Dir wurden ${amount} ${CONFIG.MONEY_OBJECTIVE} gutgeschrieben (Einnahmen, während du offline warst).`);
  }
}

// target: entweder das echte Player-Objekt (bevorzugt, für online Spieler)
// oder ein Namens-String (offline Spieler: echte Scoreboard-Identität, sonst wird das Guthaben vorgemerkt).
// Gibt true zurück, wenn das Guthaben angewendet ODER sicher vorgemerkt wurde.
// noQueue = true: nichts vormerken (für Abbuchungen und für claimPendingMoney).
function addMoneyTo(target, amount, reportTo, noQueue) {
  const obj = getMoneyObjective();
  const label = typeof target === "string" ? target : target.name;
  const delta0 = Math.floor(amount);
  if (!Number.isFinite(delta0)) return false;
  if (delta0 === 0) return true;
  const canQueue = !noQueue && delta0 > 0;

  if (!obj) {
    if (reportTo) reportTo.sendMessage(`§c[Marktplatz-Fehler] Scoreboard "${CONFIG.MONEY_OBJECTIVE}" nicht gefunden.`);
    return canQueue ? queuePendingMoney(label, delta0) : false;
  }

  // Ziel bestimmen: nie einen blanken Namen an addScore() geben
  let participant = target;
  if (typeof target === "string") {
    const online = world.getPlayers({ name: target })[0];
    if (online) {
      participant = online;
    } else {
      participant = findPlayerIdentity(obj, target);
      if (!participant) return canQueue ? queuePendingMoney(target, delta0) : false;
    }
  }

  // 32-Bit-Überlauf verhindern
  let delta = delta0;
  let current = null;
  try {
    current = obj.getScore(participant) ?? 0;
  } catch {}
  if (current !== null && delta > 0 && current + delta > INT32_MAX) {
    console.warn(`[Marktplatz] Guthaben von ${label} würde ${INT32_MAX} überschreiten - auf Maximum gekappt.`);
    delta = Math.max(0, INT32_MAX - current);
    if (delta === 0) return true;
  }

  let after;
  try {
    after = obj.addScore(participant, delta);
  } catch (e) {
    console.warn(`[Marktplatz] Fehler beim Ändern von ${delta} bei ${label}: ` + e);
    if (reportTo) reportTo.sendMessage(`§c[Marktplatz-Fehler] addScore(${label}, ${delta}) warf einen Fehler: ${e}`);
    return canQueue ? queuePendingMoney(label, delta) : false;
  }

  let verified = null;
  try {
    verified = obj.getScore(participant) ?? null;
  } catch {}

  if (reportTo) {
    const before = after - delta;
    const mismatchWarning = verified !== null && verified !== after ? ` §c(ACHTUNG: getScore() liest ${verified}!)` : "";
    if (CONFIG.DEBUG) {
      reportTo.sendMessage(`§7[Debug] Objective-ID "${obj.id}" · ${label}: ${before} -> ${after} (Δ${delta})${mismatchWarning}`);
    } else if (mismatchWarning) {
      reportTo.sendMessage(`§c[Marktplatz-Warnung] Unstimmigkeit beim Guthaben von ${label}.${mismatchWarning}`);
    }
  }
  requestDashboardRefresh(); // sofortige (gebündelte) Aktualisierung statt auf das Intervall zu warten
  return true;
}

// Gibt true zurück, wenn wirklich abgebucht wurde.
function removeMoneyFrom(target, amount, reportTo) {
  return addMoneyTo(target, -amount, reportTo, true);
}

/* =========================================================
   ITEM AUSGEBEN – mit Postfach-Fallback
   ========================================================= */

function buildItemStack(itemId, amount, nameTag, enchants, damage) {
  const stack = new ItemStack(itemId, amount);
  if (nameTag) stack.nameTag = nameTag;
  applyEnchantmentsData(stack, enchants);
  applyDamage(stack, damage);
  return stack;
}

function canBuildItem(itemId, amount) {
  try {
    new ItemStack(itemId, amount);
    return true;
  } catch {
    return false;
  }
}

// Gibt ein Item aus: Inventar -> Rest ins Postfach -> Notfall: vor die Füße legen.
// Rückgabe: "inventory" | "postfach" | "dropped" | "failed"
// "failed" bedeutet: NICHTS wurde ausgegeben (Aufrufer kann sauber zurückrollen).
function giveItemSafe(player, itemId, amount, nameTag, enchants, damage) {
  let stack;
  try {
    stack = buildItemStack(itemId, amount, nameTag, enchants, damage);
  } catch (e) {
    console.warn(`[Marktplatz] Item ${itemId} konnte nicht erstellt werden: ` + e);
    return "failed";
  }
  let leftover;
  try {
    leftover = player.getComponent("minecraft:inventory").container.addItem(stack);
  } catch {
    leftover = stack;
  }
  if (!leftover) return "inventory";

  try {
    addToPostfach(player.name, { itemId, amount: leftover.amount, nameTag: nameTag ?? undefined, enchants: enchants ?? [], damage: damage ?? null });
    return "postfach";
  } catch (e) {
    console.warn("[Marktplatz] Postfach nicht nutzbar, lege Item ab: " + e);
  }
  try {
    player.dimension.spawnItem(leftover, player.location);
    return "dropped";
  } catch (e) {
    console.warn("[Marktplatz] Item konnte weder ins Postfach noch abgelegt werden: " + e);
    // Wurde schon ein Teil ins Inventar gelegt, darf NICHT zurückgerollt werden (sonst Duplizierung).
    return leftover.amount < amount ? "dropped" : "failed";
  }
}

// Kurzer Hinweistext passend zum Ergebnis von giveItemSafe/giveItemToName
function deliveryNote(result) {
  if (result === "postfach") return " Dein Inventar war voll - der Rest liegt im Postfach.";
  if (result === "dropped") return " Dein Inventar war voll und das Postfach nicht nutzbar - das Item liegt vor deinen Füßen.";
  return "";
}

// Alte Signatur: true = direkt im Inventar gelandet
function tryGiveItem(player, itemId, amount, nameTag, enchants, damage) {
  return giveItemSafe(player, itemId, amount, nameTag, enchants, damage) === "inventory";
}

// Wie giveItemSafe, aber per Spielername (offline -> direkt ins Postfach)
function giveItemToName(playerName, itemId, amount, nameTag, enchants, damage) {
  const online = world.getPlayers({ name: playerName })[0];
  if (online) return giveItemSafe(online, itemId, amount, nameTag, enchants, damage);
  if (!canBuildItem(itemId, amount)) return "failed";
  try {
    addToPostfach(playerName, { itemId, amount, nameTag: nameTag ?? undefined, enchants: enchants ?? [], damage: damage ?? null });
    return "postfach";
  } catch (e) {
    console.warn("[Marktplatz] Postfach-Eintrag fehlgeschlagen: " + e);
    return "failed";
  }
}

/* ---- Sperren: was darf NICHT verkauft/geliefert werden ---- */

// Alle Rüstungsteile, auf die man Verzierungen (Trims) setzen kann (Muster-Treffer ist bewusst großzügig)
const TRIMMABLE_ARMOR_RE = /_(helmet|chestplate|leggings|boots)$/;

function isTrimmableArmorId(typeId) {
  return TRIMMABLE_ARMOR_RE.test(typeId.replace("minecraft:", ""));
}

function isBlockedTypeId(typeId) {
  if (CONFIG.BLOCKED_ITEMS.includes(typeId)) return true;
  const bare = typeId.replace("minecraft:", "");
  if (CONFIG.ARMOR_TRIM_MODE === "block" && TRIMMABLE_ARMOR_RE.test(bare)) return true;
  return CONFIG.BLOCKED_ID_PATTERNS.some((re) => re.test(bare));
}

// Gibt einen Grund-Text zurück, wenn der Stack nicht verlustfrei gespeichert werden kann, sonst null.
function getUnsellableReason(item) {
  if (CONFIG.ARMOR_TRIM_MODE === "block" && isTrimmableArmorId(item.typeId)) {
    return "Rüstung kann Verzierungen (Armor Trims) tragen, die sich per Script weder erkennen noch speichern lassen. Sie würden beim Verkauf verloren gehen.";
  }
  if (isBlockedTypeId(item.typeId)) {
    return "Inhalt bzw. Effekt (z.B. Tränke, Bücher, Karten, Shulkerboxen, Bündel, Banner, Feuerwerk) lässt sich technisch nicht zuverlässig speichern und wiederherstellen.";
  }
  try {
    const lore = item.getLore();
    if (lore && lore.length > 0) return "Items mit Lore (Zusatztext) können nicht verkauft werden, die Lore ginge verloren.";
  } catch {}
  if (CONFIG.BLOCK_DYED_ITEMS) {
    try {
      const dye = item.getComponent("minecraft:dyeable");
      const c = dye ? dye.color : undefined;
      const d = dye ? dye.defaultColor : undefined;
      // gefärbt = es gibt eine Farbe, die von der Standardfarbe abweicht (ohne Standardfarbe zählt jede Farbe als gefärbt)
      if (c && (!d || c.red !== d.red || c.green !== d.green || c.blue !== d.blue)) {
        return "Gefärbte Items können nicht verkauft werden, die Farbe ginge verloren.";
      }
    } catch {}
  }
  return null;
}

/* ---- Suche, Limits, Index-Helfer ---- */

// Suche: ignoriert "minecraft:", erlaubt Leerzeichen statt "_" ("iron ingot") und findet auch Custom-Namen
function matchesSearch(itemId, nameTag, search) {
  if (!search) return true;
  const raw = String(search).toLowerCase().trim();
  if (!raw) return true;
  const term = raw.replace(/^minecraft:/, "").replace(/\s+/g, "_");
  const bare = itemId.replace("minecraft:", "").toLowerCase();
  return bare.includes(term) || (!!nameTag && nameTag.toLowerCase().includes(raw));
}

function countListingsBy(name) {
  let n = 0;
  for (const id of getIndex()) {
    const rec = getListing(id);
    if (rec && rec.seller === name) n++;
  }
  return n;
}

function countOrdersBy(name) {
  let n = 0;
  for (const id of getOrderIndex()) {
    const rec = getOrder(id);
    if (rec && rec.buyer === name) n++;
  }
  return n;
}

function removeListingFromIndex(id) {
  saveIndex(getIndex().filter((x) => x !== id));
}

function restoreListing(id, rec) {
  try {
    saveListing(id, rec);
    const index = getIndex();
    if (!index.includes(id)) index.push(id);
    saveIndex(index);
  } catch (e) {
    console.warn("[Marktplatz] Angebot konnte nicht wiederhergestellt werden: " + e);
  }
}

function restoreOrder(id, rec) {
  try {
    saveOrder(id, rec);
    const index = getOrderIndex();
    if (!index.includes(id)) index.push(id);
    saveOrderIndex(index);
  } catch (e) {
    console.warn("[Marktplatz] Order konnte nicht wiederhergestellt werden: " + e);
  }
}

/* =========================================================
   ANZEIGE-HILFEN
   ========================================================= */

function displayName(itemId, nameTag) {
  if (nameTag) return nameTag;
  return itemId.replace("minecraft:", "").replace(/_/g, " ");
}

function guessIconPath(itemId) {
  const key = itemId.replace("minecraft:", "");
  if (ICON_MAP[key]) return ICON_MAP[key];

  const parts = key.split("_");
  if (parts.length === 2) {
    const reversed = `${parts[1]}_${parts[0]}`;
    if (ICON_MAP[reversed]) return ICON_MAP[reversed];
  }

  return "textures/items/" + key;
}

function formatEnchantName(id) {
  return id
    .replace("minecraft:", "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toRoman(n) {
  const numerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return numerals[n] ?? String(n);
}

function getMaxDurability(itemId) {
  try {
    const temp = new ItemStack(itemId, 1);
    const comp = temp.getComponent("minecraft:durability");
    return comp ? comp.maxDurability : null;
  } catch {
    return null;
  }
}

function buildDetailLine(itemId, enchants, damage) {
  const parts = [];
  if (enchants && enchants.length > 0) {
    parts.push(enchants.map((e) => `${formatEnchantName(e.id)} ${toRoman(e.level)}`).join(", "));
  }
  const maxDurability = getMaxDurability(itemId);
  if (maxDurability && typeof damage === "number") {
    const remaining = maxDurability - damage;
    const pct = Math.round((remaining / maxDurability) * 100);
    parts.push(`${pct}% Haltbarkeit`);
  }
  return parts.join(" · ");
}

/* =========================================================
   HAUPTMENÜ
   ========================================================= */

function showMainMenu(player) {
  const postfachCount = getPostfach(player.name).length;

  // Buttons als Liste mit direkt zugeordneter Aktion, statt fester Indexnummern im
  // Switch-Statement - so bricht nichts, wenn später weitere (Admin-)Buttons dazukommen.
  const items = [
    { label: "Angebote durchsuchen", action: () => showBrowseSearchPrompt(player) },
    { label: "Item verkaufen", action: () => showSellMenu(player) },
    { label: "Meine Angebote", action: () => showMyListings(player) },
    { label: `Postfach (${postfachCount})`, action: () => showPostfach(player) },
    { label: "🏠 Homes", action: () => showHomesMenu(player) },
    { label: "🧭 TPA", action: () => showTpaMenu(player) },
    { label: "🎯 Kopfgelder", action: () => showBountyMenu(player) },
    { label: "💼 Jobs", action: () => showJobsMenu(player) },
    { label: "📦 Orders", action: () => showOrderMenu(player) },
    { label: "🛡️ Clans", action: () => showClanMenu(player) },
    { label: "🎲 RTP (Zufalls-Teleport)", action: () => startRtp(player) },
    { label: "🎰 Lotto", action: () => showLottoMenu(player) },
    { label: "📅 Event", action: () => showEventMenu(player) },
    { label: "🏆 Bestenlisten", action: () => showLeaderboardMenu(player) },
  ];
  if (isMarktplatzAdmin(player)) {
    items.push({ label: "🔧 Admin: Geld-Diagnose", action: () => runMoneyDiagnostics(player) });
    items.push({ label: "🖥️ Admin: Dashboard-Titel", action: () => showDashboardTitleEditor(player) });
  }
  if (isMarktplatzOperator(player)) {
    items.push({ label: "🧹 Admin: Bestenliste aufräumen", action: () => showLeaderboardCleanupConfirm(player) });
  }

  const form = new ActionFormData()
    .title("Marktplatz")
    .body(
      `Guthaben: §e${getMoney(player)} ${CONFIG.MONEY_OBJECTIVE}§r\nAktive Angebote: ${getIndex().length}/${CONFIG.MAX_LISTINGS}\nOffene Orders: ${getOrderIndex().length}/${CONFIG.MAX_ORDERS}`
    );
  for (const item of items) form.button(item.label);

  form.show(player).then((res) => {
    if (res.canceled) return;
    const item = items[res.selection];
    if (item) item.action();
  });
}

/* =========================================================
   ADMIN: GELD-DIAGNOSE (testet addScore direkt im Spiel)
   Nur für Spieler mit dem Tag CONFIG.ADMIN_TAG.
   ========================================================= */

function isMarktplatzAdmin(player) {
  try {
    return player.hasTag(CONFIG.ADMIN_TAG);
  } catch {
    return false;
  }
}

// Echter Server-Operator (unabhängig vom mkt_admin-Tag). Stabile, nicht als
// "pre-release" markierte API: Player.playerPermissionLevel.
function isMarktplatzOperator(player) {
  try {
    return player.playerPermissionLevel === PlayerPermissionLevel.Operator;
  } catch {
    return false;
  }
}

function participantsNamed(obj, name, type) {
  const out = [];
  try {
    for (const p of obj.getParticipants()) {
      if (p.displayName === name && (!type || String(p.type) === type)) out.push(p);
    }
  } catch {}
  return out;
}

function showDiagnosticsResult(player, lines) {
  console.warn("[Marktplatz] Geld-Diagnose:\n" + lines.map((l) => l.replace(/§./g, "")).join("\n"));
  new MessageFormData()
    .title("Geld-Diagnose")
    .body(lines.join("\n"))
    .button1("OK")
    .button2("Zurück")
    .show(player)
    .then(() => showMainMenu(player));
}

function runMoneyDiagnostics(player) {
  const lines = [];
  const ok = (m) => lines.push(`§a✓§r ${m}`);
  const bad = (m) => lines.push(`§c✗§r ${m}`);
  const note = (m) => lines.push(`§7ℹ ${m}§r`);

  const obj = getMoneyObjective();
  if (!obj) {
    bad(`Scoreboard "${CONFIG.MONEY_OBJECTIVE}" nicht gefunden.`);
    showDiagnosticsResult(player, lines);
    return;
  }

  // A) Online-Spieler über das Player-Objekt (der Normalfall)
  try {
    const before = obj.getScore(player) ?? 0;
    const after = obj.addScore(player, 1);
    const read = obj.getScore(player);
    obj.addScore(player, -1);
    const restored = obj.getScore(player);
    if (after === before + 1 && read === after && restored === before) ok("A) addScore mit Player-Objekt (online): OK");
    else bad(`A) Unstimmig: vorher ${before}, nach +1 ${after}/${read}, nach -1 ${restored}`);
  } catch (e) {
    bad(`A) Fehler: ${e}`);
  }

  let participants = [];
  try {
    participants = obj.getParticipants();
  } catch (e) {
    bad(`getParticipants() Fehler: ${e}`);
  }
  const onlineNames = new Set(world.getPlayers().map((p) => p.name));
  const realList = participants.filter((p) => String(p.type) === "Player");
  const fakeList = participants.filter((p) => String(p.type) === "FakePlayer");
  note(`Teilnehmer im Scoreboard: ${realList.length} echte Spieler, ${fakeList.length} Fake-Player`);

  // D) Altlasten: Fake-Player mit dem Namen echter Spieler
  const realNames = new Set(realList.map((p) => p.displayName));
  const dups = fakeList.filter((p) => realNames.has(p.displayName));
  if (dups.length === 0) {
    ok("D) Keine Fake-Player mit Namen echter Spieler (keine Altlasten)");
  } else {
    bad(`D) ${dups.length} Fake-Player tragen den Namen echter Spieler (Altlast früherer Namens-Auszahlungen):`);
    for (const d of dups.slice(0, 8)) {
      let sc = "?";
      try {
        sc = obj.getScore(d);
      } catch {}
      note(`   ${d.displayName}: ${sc}`);
    }
  }

  // E) Vorgemerkte Gutschriften
  try {
    let cnt = 0;
    let sum = 0;
    for (const id of world.getDynamicPropertyIds()) {
      if (!id.startsWith("pendmoney_")) continue;
      const v = world.getDynamicProperty(id);
      if (typeof v === "number") {
        cnt++;
        sum += v;
      }
    }
    note(`Vorgemerkte Gutschriften (bei nächstem Beitritt): ${cnt} Spieler, gesamt ${sum}`);
  } catch {}

  // B/C) Offline-Spieler
  const target = realList.find((p) => !onlineNames.has(p.displayName));
  if (!target) {
    note("B/C übersprungen: kein Offline-Spieler mit Score gefunden. Zweitaccount: einmal Geld geben, ausloggen, Test wiederholen.");
  } else {
    const name = target.displayName;
    const fakesBefore = new Set(participantsNamed(obj, name, "FakePlayer").map((p) => p.id));

    // B) über die echte Identität (so zahlt der neue Code offline aus)
    try {
      const before = obj.getScore(target);
      const after = obj.addScore(target, 1);
      const read = obj.getScore(target);
      obj.addScore(target, -1);
      const restored = obj.getScore(target);
      if (before !== undefined && after === before + 1 && read === after && restored === before) {
        ok(`B) addScore mit Identität von Offline-Spieler "${name}": OK`);
      } else {
        bad(`B) Unstimmig bei "${name}": vorher ${before}, nach +1 ${after}/${read}, nach -1 ${restored} (Vormerk-Fallback greift nur bei Fehlern, nicht hierbei!)`);
      }
    } catch (e) {
      bad(`B) Fehler bei Offline-Identität "${name}": ${e} (der Vormerk-Fallback fängt das ab)`);
    }

    // C) über den blanken Namen (so zahlte der alte Code offline aus)
    if (fakesBefore.size > 0) {
      note(`C) übersprungen: es gibt bereits einen Fake-Player "${name}" (siehe D). Ein weiterer Namens-Test würde diesen verändern.`);
    } else try {
      const realBefore = obj.getScore(target);
      obj.addScore(name, 1);
      const realAfter = obj.getScore(target);
      const created = participantsNamed(obj, name, "FakePlayer").filter((p) => !fakesBefore.has(p.id));
      if (realAfter !== realBefore) {
        note(`C) Namens-String änderte den ECHTEN Score von "${name}" (Fake-Player-Sorge wäre unbegründet)`);
        obj.addScore(target, (realBefore ?? 0) - (realAfter ?? 0));
      } else if (created.length > 0) {
        note(`C) Namens-String legte einen separaten Fake-Player "${name}" an, der echte Score blieb unverändert: Der alte Code hätte Offline-Spieler nicht bezahlt.`);
      } else {
        note("C) Namens-String: kein eindeutiges Ergebnis");
      }
      for (const f of created) {
        try {
          obj.removeParticipant(f);
        } catch (e) {
          bad(`C) Aufräumen des Test-Fake-Players fehlgeschlagen: ${e}`);
        }
      }
    } catch (e) {
      note(`C) Namens-String warf einen Fehler: ${e}`);
    }
  }

  showDiagnosticsResult(player, lines);
}

/* =========================================================
   ADMIN: BESTENLISTE AUFRÄUMEN (nur für echte Operatoren)
   Entfernt FakePlayer-Altlasten aus dem money-Scoreboard, die die
   Bestenliste sonst mit Duplikaten/komischen Namen verfälschen.
   ========================================================= */

function showLeaderboardCleanupConfirm(player) {
  const obj = getMoneyObjective();
  if (!obj) {
    new MessageFormData()
      .title("Bestenliste aufräumen")
      .body("Kein money-Scoreboard gefunden.")
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showMainMenu(player));
    return;
  }

  let participants;
  try {
    participants = obj.getParticipants();
  } catch (e) {
    new MessageFormData()
      .title("Bestenliste aufräumen")
      .body("Fehler beim Lesen des Scoreboards: " + e)
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showMainMenu(player));
    return;
  }

  const fakeEntries = participants.filter((p) => String(p.type) === "FakePlayer");

  // Doppelte ECHTE Player-Identitäten mit demselben Namen (seltene Bedrock-Eigenheit):
  // die werden NICHT automatisch entfernt (Risiko, die falsche zu löschen), nur gemeldet.
  const byName = new Map();
  for (const p of participants) {
    if (String(p.type) !== "Player") continue;
    byName.set(p.displayName, (byName.get(p.displayName) ?? 0) + 1);
  }
  const duplicateRealNames = [...byName.entries()].filter(([, count]) => count > 1).map(([name]) => name);

  if (fakeEntries.length === 0 && duplicateRealNames.length === 0) {
    new MessageFormData()
      .title("Bestenliste aufräumen")
      .body("Keine Fake-Player-Altlasten gefunden. Nichts zu tun.")
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showMainMenu(player));
    return;
  }

  const lines = [];
  if (fakeEntries.length > 0) {
    lines.push(`§eGefundene Fake-Player-Altlasten: ${fakeEntries.length}`);
    for (const f of fakeEntries.slice(0, 20)) {
      let score;
      try {
        score = obj.getScore(f);
      } catch {
        score = "?";
      }
      lines.push(`  - "${f.displayName}" (Score: ${score})`);
    }
    if (fakeEntries.length > 20) lines.push(`  ... und ${fakeEntries.length - 20} weitere`);
  } else {
    lines.push("§aKeine Fake-Player-Altlasten gefunden.");
  }
  if (duplicateRealNames.length > 0) {
    lines.push("");
    lines.push("§cAchtung: doppelte ECHTE Spieler-Identitäten gefunden (werden NICHT automatisch entfernt):");
    for (const name of duplicateRealNames) lines.push(`  - "${name}"`);
    lines.push("Das ist ein seltener Bedrock-Fehler; bitte manuell im Spiel prüfen, welcher Eintrag stimmt.");
  }
  lines.push("");
  lines.push("Fake-Player-Altlasten wirklich entfernen? Das kann nicht rückgängig gemacht werden.");

  new MessageFormData()
    .title("Bestenliste aufräumen")
    .body(lines.join("\n"))
    .button1(fakeEntries.length > 0 ? "Ja, entfernen" : "OK")
    .button2("Abbrechen")
    .show(player)
    .then((res) => {
      if (res.canceled || res.selection !== 0 || fakeEntries.length === 0) {
        showMainMenu(player);
        return;
      }
      let removed = 0;
      let failed = 0;
      for (const f of fakeEntries) {
        try {
          obj.removeParticipant(f);
          removed++;
        } catch {
          failed++;
        }
      }
      new MessageFormData()
        .title("Bestenliste aufräumen")
        .body(`Entfernt: ${removed}${failed > 0 ? `\nFehlgeschlagen: ${failed}` : ""}`)
        .button1("OK")
        .button2("Zurück")
        .show(player)
        .then(() => showMainMenu(player));
    });
}

/* =========================================================
   VERKAUFEN
   ========================================================= */

function showSellMenu(player) {
  if (getIndex().length >= CONFIG.MAX_LISTINGS) {
    new MessageFormData()
      .title("Marktplatz")
      .body(`Der Marktplatz ist voll (${CONFIG.MAX_LISTINGS}/${CONFIG.MAX_LISTINGS}). Versuch es später erneut.`)
      .button1("OK")
      .button2("Zurück")
      .show(player);
    return;
  }
  if (countListingsBy(player.name) >= CONFIG.MAX_LISTINGS_PER_PLAYER) {
    new MessageFormData()
      .title("Marktplatz")
      .body(`Du hast bereits ${CONFIG.MAX_LISTINGS_PER_PLAYER} aktive Angebote (Maximum pro Spieler). Ziehe eines zurück, um ein neues zu erstellen.`)
      .button1("OK")
      .button2("Zurück")
      .show(player);
    return;
  }

  const inv = player.getComponent("minecraft:inventory");
  const container = inv.container;

  const entries = [];
  for (let i = 0; i < container.size; i++) {
    const it = container.getItem(i);
    if (!it) continue;
    if (it.typeId === CONFIG.TRIGGER_ITEM) continue;
    entries.push({ slot: i, item: it });
  }

  if (entries.length === 0) {
    new MessageFormData()
      .title("Marktplatz")
      .body("Du hast nichts Verkaufbares im Inventar.")
      .button1("OK")
      .button2("Zurück")
      .show(player);
    return;
  }

  const form = new ActionFormData()
    .title("Item auswählen")
    .body("Welches Item möchtest du verkaufen?");
  for (const e of entries) {
    if (getUnsellableReason(e.item)) {
      form.button(`🚫 ${e.item.amount}x ${displayName(e.item.typeId, e.item.nameTag)}\n§cNicht verkaufbar§r`, guessIconPath(e.item.typeId));
      continue;
    }
    const itemEnchants = getEnchantmentsData(e.item);
    const enchantMark = itemEnchants.length > 0 ? "✨ " : "";
    const itemDamage = getDamage(e.item);
    const detail = buildDetailLine(e.item.typeId, itemEnchants, itemDamage);
    const detailLine = detail ? `\n§7${detail}§r` : "";
    form.button(`${enchantMark}${e.item.amount}x ${displayName(e.item.typeId, e.item.nameTag)}${detailLine}`, guessIconPath(e.item.typeId));
  }
  form.button("Zurück zum Hauptmenü");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= entries.length) {
      showMainMenu(player);
      return;
    }
    const chosen = entries[res.selection];
    const reason = getUnsellableReason(chosen.item);
    if (reason) {
      new MessageFormData()
        .title("Nicht verkaufbar")
        .body(`${displayName(chosen.item.typeId, chosen.item.nameTag)} kann nicht über den Marktplatz verkauft werden.\n\nGrund: ${reason}`)
        .button1("Verstanden")
        .button2("Zurück")
        .show(player)
        .then(() => showSellMenu(player));
      return;
    }
    if (chosen.item.amount > 1) {
      showQuantityForm(player, chosen.slot, chosen.item);
    } else {
      showPriceOnlyForm(player, chosen.slot, 1, chosen.item.typeId);
    }
  });
}

function showQuantityForm(player, slot, item) {
  const typeId = item.typeId;
  new ModalFormData()
    .title(`Menge: ${displayName(item.typeId, item.nameTag)}`)
    .slider("Menge", 1, item.amount, { valueStep: 1, defaultValue: item.amount })
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      const amount = res.formValues[0];
      showPriceOnlyForm(player, slot, amount, typeId);
    })
    .catch((e) => {
      console.warn("[Marktplatz] Fehler im Mengen-Formular: " + e);
      player.sendMessage(`§c[Marktplatz-Fehler] ${e}`);
    });
}

// Robustes Parsen von Zahlen-Eingaben: entfernt alles außer Ziffern.
function parsePriceInput(raw) {
  if (typeof raw !== "string") return NaN;
  const cleaned = raw.replace(/[^0-9]/g, "");
  if (cleaned.length === 0) return NaN;
  return parseInt(cleaned, 10);
}

function showPriceOnlyForm(player, slot, amount, typeId) {
  const inv = player.getComponent("minecraft:inventory");
  const container = inv.container;
  const currentItem = container.getItem(slot);
  const label = currentItem ? displayName(currentItem.typeId, currentItem.nameTag) : "Item";

  new ModalFormData()
    .title(`Preis: ${label}`)
    .textField("Preis (gesamt, in " + CONFIG.MONEY_OBJECTIVE + ")", "z.B. 100", { defaultValue: "" })
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      const priceRaw = res.formValues[0];
      const price = parsePriceInput(priceRaw);

      if (!Number.isInteger(price) || price <= 0) {
        player.sendMessage("§cUngültiger Preis. Bitte gib eine ganze Zahl größer 0 ein (z.B. 100).");
        return;
      }
      if (price > CONFIG.MAX_PRICE) {
        player.sendMessage(`§cDer Preis ist zu hoch (Maximum: ${CONFIG.MAX_PRICE} ${CONFIG.MONEY_OBJECTIVE}).`);
        return;
      }

      finalizeSaleListing(player, slot, amount, price, typeId);
    })
    .catch((e) => {
      console.warn("[Marktplatz] Fehler im Preis-Formular: " + e);
      player.sendMessage(`§c[Marktplatz-Fehler] ${e}`);
    });
}

function finalizeSaleListing(player, slot, amount, price, typeId) {
  if (getIndex().length >= CONFIG.MAX_LISTINGS) {
    player.sendMessage("§cDer Marktplatz ist inzwischen voll. Angebot wurde nicht erstellt.");
    return;
  }
  if (countListingsBy(player.name) >= CONFIG.MAX_LISTINGS_PER_PLAYER) {
    player.sendMessage(`§cDu hast bereits ${CONFIG.MAX_LISTINGS_PER_PLAYER} aktive Angebote (Maximum pro Spieler).`);
    return;
  }
  if (!Number.isInteger(amount) || amount < 1 || !Number.isInteger(price) || price < 1 || price > CONFIG.MAX_PRICE) {
    player.sendMessage("§cUngültige Menge oder ungültiger Preis. Angebot wurde nicht erstellt.");
    return;
  }

  const inv = player.getComponent("minecraft:inventory");
  const container = inv.container;
  const freshItem = container.getItem(slot);
  if (!freshItem || freshItem.amount < amount || (typeId && freshItem.typeId !== typeId)) {
    player.sendMessage("§cDas Item in diesem Slot hat sich geändert. Bitte erneut versuchen.");
    return;
  }
  if (getUnsellableReason(freshItem)) {
    player.sendMessage("§cDieses Item kann nicht verkauft werden (Inhalt/Effekt/Zusatzdaten nicht speicherbar).");
    return;
  }

  const enchants = getEnchantmentsData(freshItem);
  const damage = getDamage(freshItem);
  const nameTag = freshItem.nameTag ?? null;
  const itemTypeId = freshItem.typeId;
  const originalStack = freshItem.clone();

  // Erst das Angebot sicher speichern, DANN das Item entnehmen - so geht bei einem Speicherfehler nichts verloren.
  const id = getNextId();
  const listing = {
    seller: player.name,
    itemId: itemTypeId,
    nameTag: nameTag,
    amount: amount,
    price: price,
    enchants: enchants,
    damage: damage,
    created: Date.now(),
  };
  try {
    saveListing(id, listing);
    const index = getIndex();
    index.push(id);
    saveIndex(index);
  } catch (e) {
    console.warn("[Marktplatz] Angebot konnte nicht gespeichert werden: " + e);
    try {
      deleteListingData(id);
      removeListingFromIndex(id);
    } catch {}
    player.sendMessage("§c[Marktplatz-Fehler] Angebot konnte nicht gespeichert werden. Dein Item wurde nicht entnommen.");
    return;
  }

  try {
    const remaining = freshItem.amount - amount;
    if (remaining <= 0) {
      container.setItem(slot, undefined);
    } else {
      freshItem.amount = remaining;
      container.setItem(slot, freshItem);
    }
  } catch (e) {
    console.warn("[Marktplatz] Item konnte nicht entnommen werden: " + e);
    try {
      container.setItem(slot, originalStack);
    } catch {}
    deleteListingData(id);
    removeListingFromIndex(id);
    player.sendMessage("§c[Marktplatz-Fehler] Das Item konnte nicht entnommen werden. Angebot wurde nicht erstellt.");
    return;
  }

  player.sendMessage(`§aAngebot erstellt: ${amount}x ${displayName(itemTypeId, nameTag)} für ${price} ${CONFIG.MONEY_OBJECTIVE}.`);
}

/* =========================================================
   DURCHSUCHEN / KAUFEN
   ========================================================= */

function showBrowseSearchPrompt(player) {
  const form = new ModalFormData()
    .title("Angebote durchsuchen")
    .textField("Suchbegriff (Item-Name, leer = alle anzeigen)", "z.B. diamond", { defaultValue: "" });

  form.show(player).then((res) => {
    if (res.canceled) return;
    const [search] = res.formValues;
    showBrowsePage(player, 0, (search || "").toLowerCase().trim());
  });
}

function showBrowsePage(player, page, search) {
  const index = getIndex();
  const sortedIds = [...index].sort((a, b) => b - a);

  let matches = sortedIds;
  if (search) {
    matches = sortedIds.filter((id) => {
      const rec = getListing(id);
      if (!rec) return false;
      return matchesSearch(rec.itemId, rec.nameTag, search);
    });
  }

  const totalPages = Math.max(1, Math.ceil(matches.length / CONFIG.LISTINGS_PER_PAGE));
  const clampedPage = Math.min(page, totalPages - 1);
  const start = clampedPage * CONFIG.LISTINGS_PER_PAGE;
  const pageIds = matches.slice(start, start + CONFIG.LISTINGS_PER_PAGE);

  const form = new ActionFormData()
    .title(`Angebote (Seite ${clampedPage + 1}/${totalPages})`)
    .body(matches.length === 0 ? "Keine Angebote gefunden." : "Wähle ein Angebot zum Kaufen aus:");

  const buttonIds = [];
  for (const id of pageIds) {
    const rec = getListing(id);
    if (!rec) continue;
    const enchantMark = rec.enchants && rec.enchants.length > 0 ? "✨ " : "";
    const detail = buildDetailLine(rec.itemId, rec.enchants, rec.damage);
    const detailLine = detail ? `\n§7${detail}§r` : "";
    form.button(
      `${enchantMark}${rec.amount}x ${displayName(rec.itemId, rec.nameTag)}${detailLine}\n${rec.price} ${CONFIG.MONEY_OBJECTIVE} · von ${rec.seller}`,
      guessIconPath(rec.itemId)
    );
    buttonIds.push(id);
  }

  const hasPrev = clampedPage > 0;
  const hasNext = clampedPage < totalPages - 1;
  if (hasPrev) form.button("< Vorherige Seite");
  if (hasNext) form.button("> Nächste Seite");
  form.button("Zurück zum Hauptmenü");

  form.show(player).then((res) => {
    if (res.canceled) return;
    let idx = res.selection;

    if (idx < buttonIds.length) {
      confirmPurchase(player, buttonIds[idx], page, search);
      return;
    }
    idx -= buttonIds.length;

    if (hasPrev) {
      if (idx === 0) {
        showBrowsePage(player, clampedPage - 1, search);
        return;
      }
      idx -= 1;
    }
    if (hasNext) {
      if (idx === 0) {
        showBrowsePage(player, clampedPage + 1, search);
        return;
      }
      idx -= 1;
    }
    showMainMenu(player);
  });
}

function confirmPurchase(player, id, page, search) {
  const rec = getListing(id);
  if (!rec) {
    player.sendMessage("§cDieses Angebot ist nicht mehr verfügbar.");
    showBrowsePage(player, page, search);
    return;
  }
  if (rec.seller === player.name) {
    new MessageFormData()
      .title("Marktplatz")
      .body("Du kannst dein eigenes Angebot nicht kaufen. Nutze 'Meine Angebote', um es zurückzuziehen.")
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showBrowsePage(player, page, search));
    return;
  }

  const lines = [
    `${rec.amount}x ${displayName(rec.itemId, rec.nameTag)}`,
    `Preis: ${rec.price} ${CONFIG.MONEY_OBJECTIVE}`,
    `Verkäufer: ${rec.seller}`,
  ];

  if (rec.enchants && rec.enchants.length > 0) {
    lines.push("", "✨ Verzauberungen:");
    for (const e of rec.enchants) {
      lines.push(`  ${formatEnchantName(e.id)} ${toRoman(e.level)}`);
    }
  }

  const maxDurability = getMaxDurability(rec.itemId);
  if (maxDurability && typeof rec.damage === "number") {
    const remaining = maxDurability - rec.damage;
    const pct = Math.round((remaining / maxDurability) * 100);
    lines.push("", `🔧 Haltbarkeit: ${remaining}/${maxDurability} (${pct}%)`);
  }

  new ActionFormData()
    .title("Kauf bestätigen")
    .body(lines.join("\n"))
    .button("Kaufen", guessIconPath(rec.itemId))
    .button("Abbrechen")
    .show(player)
    .then((res) => {
      if (res.canceled || res.selection === 1) {
        showBrowsePage(player, page, search);
        return;
      }
      executePurchase(player, id, page, search);
    })
    .catch((e) => {
      console.warn("[Marktplatz] Fehler beim Kauf-Bestätigungsformular: " + e);
      player.sendMessage(`§c[Marktplatz-Fehler] Formularfehler: ${e}`);
    });
}

function executePurchase(player, id, page, search) {
  try {
    if (CONFIG.DEBUG) {
      player.sendMessage(`§b[Marktplatz] Starte Kaufvorgang... (du: ${player.name}, id: ${player.id})`);
    }

    const rec = getListing(id);
    if (!rec) {
      player.sendMessage("§cDieses Angebot wurde inzwischen gekauft oder entfernt.");
      showBrowsePage(player, page, search);
      return;
    }
    if (rec.seller === player.name) {
      player.sendMessage("§cDu kannst dein eigenes Angebot nicht kaufen.");
      showBrowsePage(player, page, search);
      return;
    }

    const balance = getMoney(player);
    if (balance < rec.price) {
      player.sendMessage(`§cNicht genug Guthaben. Du hast ${balance}, benötigt werden ${rec.price} ${CONFIG.MONEY_OBJECTIVE}.`);
      showBrowsePage(player, page, search);
      return;
    }
    if (!canBuildItem(rec.itemId, rec.amount)) {
      player.sendMessage("§cDieses Angebot ist fehlerhaft (Item unbekannt) und kann nicht gekauft werden. Der Verkäufer kann es zurückziehen.");
      showBrowsePage(player, page, search);
      return;
    }

    // 1) Angebot sperren (kein Doppelkauf)
    removeListingFromIndex(id);
    deleteListingData(id);

    // 2) Käufer belasten
    if (!removeMoneyFrom(player, rec.price, player)) {
      restoreListing(id, rec);
      player.sendMessage("§c[Marktplatz-Fehler] Abbuchung fehlgeschlagen. Es wurde nichts gekauft.");
      showBrowsePage(player, page, search);
      return;
    }

    // 3) Item ausliefern - schlägt das komplett fehl, wird alles zurückgerollt
    const result = giveItemSafe(player, rec.itemId, rec.amount, rec.nameTag ?? undefined, rec.enchants, rec.damage);
    if (result === "failed") {
      addMoneyTo(player, rec.price, player);
      restoreListing(id, rec);
      player.sendMessage("§c[Marktplatz-Fehler] Das Item konnte nicht ausgeliefert werden. Dein Geld wurde zurückgebucht.");
      showBrowsePage(player, page, search);
      return;
    }

    // 4) Verkäufer bezahlen (offline: echte Identität oder Vormerkung bis zum nächsten Beitritt)
    const sellerOnline = world.getPlayers({ name: rec.seller })[0];
    const paid = addMoneyTo(sellerOnline ?? rec.seller, rec.price, sellerOnline ?? player);
    if (!paid) {
      console.warn(`[Marktplatz] Verkäufer ${rec.seller} konnte nicht bezahlt werden (${rec.price}).`);
    }

    if (result === "inventory") {
      player.sendMessage(`§aKauf erfolgreich: ${rec.amount}x ${displayName(rec.itemId, rec.nameTag)}.`);
    } else {
      player.sendMessage(`§aKauf erfolgreich.${deliveryNote(result)}`);
    }

    if (sellerOnline) {
      sellerOnline.sendMessage(`§a[Marktplatz] Dein Angebot "${displayName(rec.itemId, rec.nameTag)}" wurde für ${rec.price} ${CONFIG.MONEY_OBJECTIVE} verkauft.`);
    }

    showBrowsePage(player, page, search);
  } catch (e) {
    console.warn("[Marktplatz] Fehler in executePurchase: " + e);
    player.sendMessage(`§c[Marktplatz-Fehler] Unerwarteter Fehler beim Kauf: ${e}`);
  }
}

/* =========================================================
   MEINE ANGEBOTE
   ========================================================= */

function showMyListings(player) {
  const index = getIndex();
  const myIds = index.filter((id) => {
    const rec = getListing(id);
    return rec && rec.seller === player.name;
  });

  const form = new ActionFormData()
    .title("Meine Angebote")
    .body(myIds.length === 0 ? "Du hast keine aktiven Angebote." : "Auswählen, um zurückzuziehen:");

  for (const id of myIds) {
    const rec = getListing(id);
    const enchantMark = rec.enchants && rec.enchants.length > 0 ? "✨ " : "";
    const detail = buildDetailLine(rec.itemId, rec.enchants, rec.damage);
    const detailLine = detail ? `\n§7${detail}§r` : "";
    form.button(
      `${enchantMark}${rec.amount}x ${displayName(rec.itemId, rec.nameTag)}${detailLine}\n${rec.price} ${CONFIG.MONEY_OBJECTIVE}`,
      guessIconPath(rec.itemId)
    );
  }
  form.button("Zurück zum Hauptmenü");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= myIds.length) {
      showMainMenu(player);
      return;
    }
    const id = myIds[res.selection];
    withdrawListing(player, id);
  });
}

function withdrawListing(player, id) {
  const rec = getListing(id);
  if (!rec || rec.seller !== player.name) {
    player.sendMessage("§cAngebot nicht mehr gefunden.");
    showMyListings(player);
    return;
  }
  removeListingFromIndex(id);
  deleteListingData(id);

  const result = giveItemSafe(player, rec.itemId, rec.amount, rec.nameTag ?? undefined, rec.enchants, rec.damage);
  if (result === "failed") {
    restoreListing(id, rec);
    player.sendMessage("§c[Marktplatz-Fehler] Das Item konnte nicht zurückgegeben werden. Das Angebot bleibt bestehen.");
    showMyListings(player);
    return;
  }
  if (result === "inventory") {
    player.sendMessage(`§aAngebot zurückgezogen: ${rec.amount}x ${displayName(rec.itemId, rec.nameTag)} zurück im Inventar.`);
  } else {
    player.sendMessage(`§aAngebot zurückgezogen.${deliveryNote(result)}`);
  }
  showMyListings(player);
}

/* =========================================================
   POSTFACH
   ========================================================= */

function showPostfach(player) {
  const mail = getPostfach(player.name);
  if (mail.length === 0) {
    new MessageFormData()
      .title("Postfach")
      .body("Dein Postfach ist leer.")
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showMainMenu(player));
    return;
  }

  const container = player.getComponent("minecraft:inventory").container;
  const remaining = [];
  let deliveredItems = 0;
  for (const entry of mail) {
    let stack;
    try {
      stack = buildItemStack(entry.itemId, entry.amount, entry.nameTag ?? undefined, entry.enchants, entry.damage);
    } catch (e) {
      console.warn(`[Marktplatz] Postfach-Eintrag ${entry.itemId} nicht erstellbar: ` + e);
      remaining.push(entry);
      continue;
    }
    let leftover;
    try {
      leftover = container.addItem(stack);
    } catch {
      leftover = stack;
    }
    // Teilweise Ausgabe: nur den WIRKLICH übrig gebliebenen Rest behalten (sonst würde der Teil dupliziert)
    const given = entry.amount - (leftover ? leftover.amount : 0);
    deliveredItems += given;
    if (leftover) remaining.push({ ...entry, amount: leftover.amount });
  }
  try {
    savePostfach(player.name, remaining);
  } catch (e) {
    console.warn("[Marktplatz] Postfach konnte nicht gespeichert werden: " + e);
  }

  new MessageFormData()
    .title("Postfach")
    .body(`${deliveredItems} Gegenstände abgeholt.${remaining.length > 0 ? `\n${remaining.length} Einträge bleiben im Postfach (Inventar voll).` : ""}`)
    .button1("OK")
    .button2("Zurück")
    .show(player)
    .then(() => showMainMenu(player));
}

/* =========================================================
   ABLAUF-PRÜFUNG (Marktplatz-Angebote)
   ========================================================= */

function runExpiryCheck() {
  if (!CONFIG.EXPIRY_MS || CONFIG.EXPIRY_MS <= 0) return;
  const now = Date.now();
  const index = getIndex();
  const keep = [];

  for (const id of index) {
    // Fehler bei EINEM Angebot dürfen die Prüfung der übrigen nicht abbrechen
    try {
      const rec = getListing(id);
      if (!rec) continue;
      if (now - rec.created > CONFIG.EXPIRY_MS) {
        if (returnExpiredListing(rec)) {
          deleteListingData(id);
          continue;
        }
        // Rückgabe nicht möglich -> Angebot behalten, nächster Durchlauf versucht es erneut
      }
      keep.push(id);
    } catch (e) {
      console.warn(`[Marktplatz] Ablauf-Check für Angebot ${id} fehlgeschlagen: ` + e);
      keep.push(id);
    }
  }
  saveIndex(keep);
}

// Gibt true zurück, wenn das Item zurückgegeben (Inventar/Postfach) wurde
function returnExpiredListing(rec) {
  const result = giveItemToName(rec.seller, rec.itemId, rec.amount, rec.nameTag ?? undefined, rec.enchants, rec.damage);
  if (result === "failed") return false;
  const sellerOnline = world.getPlayers({ name: rec.seller })[0];
  if (sellerOnline) {
    sellerOnline.sendMessage(
      result === "inventory"
        ? `§e[Marktplatz] Dein Angebot "${displayName(rec.itemId, rec.nameTag)}" ist abgelaufen und wurde zurückgegeben.`
        : `§e[Marktplatz] Dein Angebot ist abgelaufen.${deliveryNote(result)}`
    );
  }
  return true;
}

system.runInterval(() => {
  try {
    runExpiryCheck();
  } catch (e) {
    console.warn("Marktplatz Ablauf-Check Fehler: " + e);
  }
}, CONFIG.CHECK_INTERVAL_TICKS);

/* =========================================================
   ORDERSYSTEM
   ========================================================= */

function getOrderIndex() {
  const raw = world.getDynamicProperty("ord_index");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveOrderIndex(arr) {
  world.setDynamicProperty("ord_index", JSON.stringify(arr));
}

function getNextOrderId() {
  let n = world.getDynamicProperty("ord_next_id");
  if (typeof n !== "number") n = 0;
  world.setDynamicProperty("ord_next_id", n + 1);
  return n + 1;
}

function getOrder(id) {
  const raw = world.getDynamicProperty("ord_" + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveOrder(id, obj) {
  world.setDynamicProperty("ord_" + id, JSON.stringify(obj));
}

function deleteOrderData(id) {
  world.setDynamicProperty("ord_" + id, undefined);
}

// Liefert ein Item an einen Spielernamen aus - online direkt ins Inventar (mit
// Postfach-Fallback bei vollem Inventar), offline direkt ins Postfach.
// Gibt true zurück, wenn es sofort im Inventar gelandet ist.
function deliverItemToPlayerName(playerName, itemId, amount, nameTag, enchants, damage) {
  return giveItemToName(playerName, itemId, amount, nameTag, enchants, damage) === "inventory";
}

// Durchsucht ICON_MAP nach Item-Kandidaten für eine Order. Validiert jeden
// Treffer über einen echten ItemStack-Konstruktor-Aufruf, damit keine reinen
// Textur-Einträge (Blockseiten, "_carried"-Varianten etc.) als Item auftauchen.
function searchPurchasableItemIds(rawTerm) {
  // "minecraft:" ignorieren, Leerzeichen wie "_" behandeln ("iron ingot" findet iron_ingot)
  const term = String(rawTerm).toLowerCase().trim().replace(/^minecraft:/, "").replace(/\s+/g, "_");
  const results = [];
  if (!term) return results;
  for (const key of Object.keys(ICON_MAP)) {
    if (!key.includes(term)) continue;
    const itemId = "minecraft:" + key;
    if (isBlockedTypeId(itemId)) continue;
    try {
      new ItemStack(itemId, 1);
    } catch {
      continue;
    }
    results.push(itemId);
    if (results.length >= CONFIG.ITEM_SEARCH_MAX_RESULTS) break;
  }
  return results;
}

function showOrderMenu(player) {
  new ActionFormData()
    .title("Orders")
    .body(`Offene Orders: ${getOrderIndex().length}/${CONFIG.MAX_ORDERS}`)
    .button("📋 Orders durchsuchen (zum Erfüllen)")
    .button("➕ Neue Order erstellen")
    .button("🗑️ Meine Orders")
    .button("Zurück zum Hauptmenü")
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      switch (res.selection) {
        case 0:
          showOrderBrowseSearchPrompt(player);
          break;
        case 1:
          showOrderItemSearchPrompt(player);
          break;
        case 2:
          showMyOrders(player);
          break;
        case 3:
          showMainMenu(player);
          break;
      }
    });
}

/* ---- Order erstellen ---- */

function showOrderItemSearchPrompt(player) {
  if (countOrdersBy(player.name) >= CONFIG.MAX_ORDERS_PER_PLAYER) {
    new MessageFormData()
      .title("Orders")
      .body(`Du hast bereits ${CONFIG.MAX_ORDERS_PER_PLAYER} aktive Orders (Maximum pro Spieler). Storniere eine, um eine neue zu erstellen.`)
      .button1("OK")
      .button2("Zurück")
      .show(player);
    return;
  }
  if (getOrderIndex().length >= CONFIG.MAX_ORDERS) {
    new MessageFormData()
      .title("Orders")
      .body(`Es sind bereits zu viele Orders aktiv (${CONFIG.MAX_ORDERS}/${CONFIG.MAX_ORDERS}). Versuch es später erneut.`)
      .button1("OK")
      .button2("Zurück")
      .show(player);
    return;
  }

  new ModalFormData()
    .title("Neue Order: Item suchen")
    .textField("Item-Name (z.B. diamond)", "z.B. diamond", { defaultValue: "" })
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      const term = (res.formValues[0] || "").toLowerCase().trim();
      if (!term) {
        player.sendMessage("§cBitte gib einen Suchbegriff ein.");
        return;
      }
      showOrderItemResults(player, term);
    })
    .catch((e) => {
      console.warn("[Marktplatz] Fehler im Order-Suchformular: " + e);
      player.sendMessage(`§c[Marktplatz-Fehler] ${e}`);
    });
}

function showOrderItemResults(player, term) {
  const matches = searchPurchasableItemIds(term);
  const form = new ActionFormData()
    .title("Item auswählen")
    .body(matches.length === 0 ? `Keine Items gefunden für "${term}".` : `Treffer für "${term}" (max. ${CONFIG.ITEM_SEARCH_MAX_RESULTS}):`);
  for (const id of matches) {
    form.button(displayName(id), guessIconPath(id));
  }
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= matches.length) {
      showOrderMenu(player);
      return;
    }
    showOrderAmountForm(player, matches[res.selection]);
  });
}

function showOrderAmountForm(player, itemId) {
  new ModalFormData()
    .title(`Order: ${displayName(itemId)}`)
    .textField("Menge", "z.B. 10", { defaultValue: "" })
    .textField("Preis pro Stück (in " + CONFIG.MONEY_OBJECTIVE + ")", "z.B. 50", { defaultValue: "" })
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      const amount = parsePriceInput(res.formValues[0]);
      const pricePerUnit = parsePriceInput(res.formValues[1]);

      if (!Number.isInteger(amount) || amount <= 0) {
        player.sendMessage("§cUngültige Menge. Bitte gib eine ganze Zahl größer 0 ein.");
        return;
      }
      if (!Number.isInteger(pricePerUnit) || pricePerUnit <= 0) {
        player.sendMessage("§cUngültiger Preis pro Stück. Bitte gib eine ganze Zahl größer 0 ein.");
        return;
      }

      finalizeOrder(player, itemId, amount, pricePerUnit);
    })
    .catch((e) => {
      console.warn("[Marktplatz] Fehler im Order-Mengen-/Preisformular: " + e);
      player.sendMessage(`§c[Marktplatz-Fehler] ${e}`);
    });
}

function finalizeOrder(player, itemId, amount, pricePerUnit) {
  if (getOrderIndex().length >= CONFIG.MAX_ORDERS) {
    player.sendMessage("§cEs sind inzwischen zu viele Orders aktiv. Order wurde nicht erstellt.");
    return;
  }
  if (countOrdersBy(player.name) >= CONFIG.MAX_ORDERS_PER_PLAYER) {
    player.sendMessage(`§cDu hast bereits ${CONFIG.MAX_ORDERS_PER_PLAYER} aktive Orders (Maximum pro Spieler).`);
    return;
  }
  if (isBlockedTypeId(itemId) || !canBuildItem(itemId, 1)) {
    player.sendMessage("§cDieses Item kann nicht per Order gehandelt werden.");
    return;
  }
  if (pricePerUnit > CONFIG.MAX_PRICE) {
    player.sendMessage(`§cDer Preis pro Stück ist zu hoch (Maximum: ${CONFIG.MAX_PRICE} ${CONFIG.MONEY_OBJECTIVE}).`);
    return;
  }

  const total = amount * pricePerUnit;
  if (!Number.isSafeInteger(total) || total > INT32_MAX) {
    player.sendMessage(`§cDer Gesamtbetrag ist zu hoch (Maximum: ${INT32_MAX} ${CONFIG.MONEY_OBJECTIVE}).`);
    return;
  }
  const balance = getMoney(player);
  if (balance < total) {
    player.sendMessage(`§cNicht genug Guthaben. Du hast ${balance}, benötigt werden ${total} ${CONFIG.MONEY_OBJECTIVE} (${amount}x ${pricePerUnit}).`);
    return;
  }

  // Gesamtbetrag wird sofort reserviert (vom Konto abgebucht), damit
  // Verkäufer beim Erfüllen garantiert bezahlt werden.
  if (!removeMoneyFrom(player, total, player)) {
    player.sendMessage("§c[Marktplatz-Fehler] Abbuchung fehlgeschlagen. Die Order wurde nicht erstellt.");
    return;
  }

  const id = getNextOrderId();
  const order = {
    buyer: player.name,
    itemId: itemId,
    pricePerUnit: pricePerUnit,
    totalAmount: amount,
    remaining: amount,
    created: Date.now(),
  };
  try {
    saveOrder(id, order);
    const index = getOrderIndex();
    index.push(id);
    saveOrderIndex(index);
  } catch (e) {
    console.warn("[Marktplatz] Order konnte nicht gespeichert werden: " + e);
    try {
      deleteOrderData(id);
      saveOrderIndex(getOrderIndex().filter((x) => x !== id));
    } catch {}
    addMoneyTo(player, total, player);
    player.sendMessage("§c[Marktplatz-Fehler] Order konnte nicht gespeichert werden. Dein Geld wurde zurückgebucht.");
    return;
  }

  player.sendMessage(
    `§aOrder erstellt: ${amount}x ${displayName(itemId)} für je ${pricePerUnit} ${CONFIG.MONEY_OBJECTIVE} (${total} ${CONFIG.MONEY_OBJECTIVE} reserviert).`
  );
}

/* ---- Orders durchsuchen / erfüllen ---- */

function showOrderBrowseSearchPrompt(player) {
  new ModalFormData()
    .title("Orders durchsuchen")
    .textField("Suchbegriff (Item-Name, leer = alle anzeigen)", "z.B. diamond", { defaultValue: "" })
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      const [search] = res.formValues;
      showOrderBrowsePage(player, 0, (search || "").toLowerCase().trim());
    });
}

function showOrderBrowsePage(player, page, search) {
  const index = getOrderIndex();
  const sortedIds = [...index].sort((a, b) => b - a);

  let matches = sortedIds;
  if (search) {
    matches = sortedIds.filter((id) => {
      const rec = getOrder(id);
      return rec && matchesSearch(rec.itemId, null, search);
    });
  }

  const totalPages = Math.max(1, Math.ceil(matches.length / CONFIG.LISTINGS_PER_PAGE));
  const clampedPage = Math.min(page, totalPages - 1);
  const start = clampedPage * CONFIG.LISTINGS_PER_PAGE;
  const pageIds = matches.slice(start, start + CONFIG.LISTINGS_PER_PAGE);

  const form = new ActionFormData()
    .title(`Orders (Seite ${clampedPage + 1}/${totalPages})`)
    .body(matches.length === 0 ? "Keine Orders gefunden." : "Wähle eine Order, um sie zu erfüllen:");

  const buttonIds = [];
  for (const id of pageIds) {
    const rec = getOrder(id);
    if (!rec) continue;
    form.button(
      `Order: ${rec.remaining}x ${displayName(rec.itemId)}\n${rec.pricePerUnit} ${CONFIG.MONEY_OBJECTIVE}/Stück · von ${rec.buyer}`,
      guessIconPath(rec.itemId)
    );
    buttonIds.push(id);
  }

  const hasPrev = clampedPage > 0;
  const hasNext = clampedPage < totalPages - 1;
  if (hasPrev) form.button("< Vorherige Seite");
  if (hasNext) form.button("> Nächste Seite");
  form.button("Zurück zum Hauptmenü");

  form.show(player).then((res) => {
    if (res.canceled) return;
    let idx = res.selection;

    if (idx < buttonIds.length) {
      showOrderFulfillItemSelect(player, buttonIds[idx], page, search);
      return;
    }
    idx -= buttonIds.length;

    if (hasPrev) {
      if (idx === 0) {
        showOrderBrowsePage(player, clampedPage - 1, search);
        return;
      }
      idx -= 1;
    }
    if (hasNext) {
      if (idx === 0) {
        showOrderBrowsePage(player, clampedPage + 1, search);
        return;
      }
      idx -= 1;
    }
    showMainMenu(player);
  });
}

function showOrderFulfillItemSelect(player, orderId, page, search) {
  const rec = getOrder(orderId);
  if (!rec) {
    player.sendMessage("§cDiese Order ist nicht mehr verfügbar.");
    showOrderBrowsePage(player, page, search);
    return;
  }
  if (rec.buyer === player.name) {
    new MessageFormData()
      .title("Orders")
      .body("Du kannst deine eigene Order nicht erfüllen. Nutze 'Meine Orders', um sie zu stornieren.")
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showOrderBrowsePage(player, page, search));
    return;
  }

  const inv = player.getComponent("minecraft:inventory");
  const container = inv.container;
  const entries = [];
  for (let i = 0; i < container.size; i++) {
    const it = container.getItem(i);
    if (!it) continue;
    if (it.typeId !== rec.itemId) continue;
    if (getUnsellableReason(it)) continue; // Lore/gefärbt/Inhalt gingen beim Liefern verloren
    entries.push({ slot: i, item: it });
  }

  if (entries.length === 0) {
    new MessageFormData()
      .title("Orders")
      .body(`Du hast kein(e) ${displayName(rec.itemId)} im Inventar.`)
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showOrderBrowsePage(player, page, search));
    return;
  }

  const form = new ActionFormData()
    .title("Item auswählen")
    .body(`Order: ${rec.remaining}x ${displayName(rec.itemId)} · ${rec.pricePerUnit} ${CONFIG.MONEY_OBJECTIVE}/Stück`);
  for (const e of entries) {
    const itemEnchants = getEnchantmentsData(e.item);
    const enchantMark = itemEnchants.length > 0 ? "✨ " : "";
    const itemDamage = getDamage(e.item);
    const detail = buildDetailLine(e.item.typeId, itemEnchants, itemDamage);
    const detailLine = detail ? `\n§7${detail}§r` : "";
    form.button(`${enchantMark}${e.item.amount}x ${displayName(e.item.typeId, e.item.nameTag)}${detailLine}`, guessIconPath(e.item.typeId));
  }
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= entries.length) {
      showOrderBrowsePage(player, page, search);
      return;
    }
    const chosen = entries[res.selection];
    const maxDeliverable = Math.min(chosen.item.amount, rec.remaining);
    if (maxDeliverable <= 1) {
      confirmFulfillOrder(player, orderId, chosen.slot, 1, page, search);
    } else {
      showOrderFulfillQuantityForm(player, orderId, chosen.slot, maxDeliverable, page, search);
    }
  });
}

function showOrderFulfillQuantityForm(player, orderId, slot, maxDeliverable, page, search) {
  new ModalFormData()
    .title("Menge liefern")
    .slider("Menge", 1, maxDeliverable, { valueStep: 1, defaultValue: maxDeliverable })
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      const amount = res.formValues[0];
      confirmFulfillOrder(player, orderId, slot, amount, page, search);
    })
    .catch((e) => {
      console.warn("[Marktplatz] Fehler im Liefer-Mengen-Formular: " + e);
      player.sendMessage(`§c[Marktplatz-Fehler] ${e}`);
    });
}

function confirmFulfillOrder(player, orderId, slot, amount, page, search) {
  const rec = getOrder(orderId);
  if (!rec) {
    player.sendMessage("§cDiese Order ist nicht mehr verfügbar.");
    showOrderBrowsePage(player, page, search);
    return;
  }
  const payout = amount * rec.pricePerUnit;

  new ActionFormData()
    .title("Lieferung bestätigen")
    .body(`${amount}x ${displayName(rec.itemId)}\nDu erhältst: ${payout} ${CONFIG.MONEY_OBJECTIVE}\nKäufer: ${rec.buyer}`)
    .button("Liefern", guessIconPath(rec.itemId))
    .button("Abbrechen")
    .show(player)
    .then((res) => {
      if (res.canceled || res.selection === 1) {
        showOrderBrowsePage(player, page, search);
        return;
      }
      executeFulfillOrder(player, orderId, slot, amount, page, search);
    })
    .catch((e) => {
      console.warn("[Marktplatz] Fehler im Liefer-Bestätigungsformular: " + e);
      player.sendMessage(`§c[Marktplatz-Fehler] Formularfehler: ${e}`);
    });
}

function executeFulfillOrder(player, orderId, slot, amount, page, search) {
  try {
    const rec = getOrder(orderId);
    if (!rec) {
      player.sendMessage("§cDiese Order wurde inzwischen erfüllt oder storniert.");
      showOrderBrowsePage(player, page, search);
      return;
    }
    if (rec.buyer === player.name) {
      player.sendMessage("§cDu kannst deine eigene Order nicht erfüllen.");
      showOrderBrowsePage(player, page, search);
      return;
    }
    if (!Number.isInteger(amount) || amount < 1) {
      player.sendMessage("§cUngültige Menge.");
      showOrderBrowsePage(player, page, search);
      return;
    }
    if (amount > rec.remaining) {
      player.sendMessage(`§cDie Order braucht nur noch ${rec.remaining}x. Bitte erneut versuchen.`);
      showOrderBrowsePage(player, page, search);
      return;
    }

    const inv = player.getComponent("minecraft:inventory");
    const container = inv.container;
    const freshItem = container.getItem(slot);
    if (!freshItem || freshItem.typeId !== rec.itemId || freshItem.amount < amount) {
      player.sendMessage("§cDas Item in diesem Slot hat sich geändert. Bitte erneut versuchen.");
      showOrderBrowsePage(player, page, search);
      return;
    }
    if (getUnsellableReason(freshItem)) {
      player.sendMessage("§cDieses Item kann nicht geliefert werden (Lore/Färbung/Inhalt ginge verloren).");
      showOrderBrowsePage(player, page, search);
      return;
    }
    if (!canBuildItem(rec.itemId, amount)) {
      player.sendMessage("§cDiese Order ist fehlerhaft (Item unbekannt).");
      showOrderBrowsePage(player, page, search);
      return;
    }

    const enchants = getEnchantmentsData(freshItem);
    const damage = getDamage(freshItem);
    const nameTag = freshItem.nameTag ?? null;
    const originalStack = freshItem.clone();

    // 1) Item aus dem Inventar des Lieferanten nehmen
    const remainingInSlot = freshItem.amount - amount;
    if (remainingInSlot <= 0) {
      container.setItem(slot, undefined);
    } else {
      freshItem.amount = remainingInSlot;
      container.setItem(slot, freshItem);
    }

    // 2) Käufer beliefern - klappt das gar nicht, bekommt der Lieferant sein Item zurück
    const result = giveItemToName(rec.buyer, rec.itemId, amount, nameTag, enchants, damage);
    if (result === "failed") {
      try {
        container.setItem(slot, originalStack);
      } catch (e) {
        console.warn("[Marktplatz] Rückgabe an Lieferant fehlgeschlagen: " + e);
      }
      player.sendMessage("§c[Marktplatz-Fehler] Die Lieferung konnte nicht zugestellt werden. Dein Item wurde zurückgegeben.");
      showOrderBrowsePage(player, page, search);
      return;
    }

    // 3) Lieferanten bezahlen (der Betrag ist bereits beim Käufer reserviert)
    const payout = amount * rec.pricePerUnit;
    if (!addMoneyTo(player, payout, player)) {
      console.warn(`[Marktplatz] Auszahlung ${payout} an ${player.name} fehlgeschlagen (Order ${orderId}).`);
    }

    // 4) Order aktualisieren
    rec.remaining -= amount;
    if (rec.remaining <= 0) {
      saveOrderIndex(getOrderIndex().filter((x) => x !== orderId));
      deleteOrderData(orderId);
    } else {
      saveOrder(orderId, rec);
    }

    player.sendMessage(`§aGeliefert: ${amount}x ${displayName(rec.itemId)}. Du hast ${payout} ${CONFIG.MONEY_OBJECTIVE} erhalten.`);

    const buyerOnline = world.getPlayers({ name: rec.buyer })[0];
    if (buyerOnline) {
      buyerOnline.sendMessage(
        rec.remaining > 0
          ? `§a[Marktplatz] ${player.name} hat ${amount}x ${displayName(rec.itemId)} für deine Order geliefert. Noch ${rec.remaining}x offen.`
          : `§a[Marktplatz] Deine Order für ${displayName(rec.itemId)} wurde vollständig erfüllt.`
      );
      if (result !== "inventory") {
        buyerOnline.sendMessage(`§e[Marktplatz]${deliveryNote(result)}`);
      }
    }

    showOrderBrowsePage(player, page, search);
  } catch (e) {
    console.warn("[Marktplatz] Fehler in executeFulfillOrder: " + e);
    player.sendMessage(`§c[Marktplatz-Fehler] Unerwarteter Fehler bei der Lieferung: ${e}`);
  }
}

/* ---- Meine Orders ---- */

function showMyOrders(player) {
  const index = getOrderIndex();
  const myIds = index.filter((id) => {
    const rec = getOrder(id);
    return rec && rec.buyer === player.name;
  });

  const form = new ActionFormData()
    .title("Meine Orders")
    .body(myIds.length === 0 ? "Du hast keine aktiven Orders." : "Auswählen, um zu stornieren (Restbetrag wird erstattet):");

  for (const id of myIds) {
    const rec = getOrder(id);
    form.button(
      `${rec.remaining}/${rec.totalAmount}x ${displayName(rec.itemId)}\n${rec.pricePerUnit} ${CONFIG.MONEY_OBJECTIVE}/Stück · ${
        rec.remaining * rec.pricePerUnit
      } ${CONFIG.MONEY_OBJECTIVE} reserviert`,
      guessIconPath(rec.itemId)
    );
  }
  form.button("Zurück zum Hauptmenü");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= myIds.length) {
      showMainMenu(player);
      return;
    }
    const id = myIds[res.selection];
    cancelOrder(player, id);
  });
}

function cancelOrder(player, id) {
  const rec = getOrder(id);
  if (!rec || rec.buyer !== player.name) {
    player.sendMessage("§cOrder nicht mehr gefunden.");
    showMyOrders(player);
    return;
  }
  const refund = rec.remaining * rec.pricePerUnit;
  saveOrderIndex(getOrderIndex().filter((x) => x !== id));
  deleteOrderData(id);

  if (!addMoneyTo(player, refund, player)) {
    restoreOrder(id, rec);
    player.sendMessage("§c[Marktplatz-Fehler] Erstattung fehlgeschlagen. Die Order bleibt bestehen.");
    showMyOrders(player);
    return;
  }
  player.sendMessage(`§aOrder storniert: ${refund} ${CONFIG.MONEY_OBJECTIVE} erstattet.`);
  showMyOrders(player);
}

/* =========================================================
   HOME-SYSTEM
   ========================================================= */

function getHomes(playerName) {
  const raw = world.getDynamicProperty("homes_" + sanitizeName(playerName));
  let arr = [];
  if (raw) {
    try {
      arr = JSON.parse(raw);
    } catch {
      arr = [];
    }
  }
  while (arr.length < CONFIG.MAX_HOMES) arr.push(null);
  return arr;
}

function saveHomes(playerName, homes) {
  world.setDynamicProperty("homes_" + sanitizeName(playerName), JSON.stringify(homes));
}

function dimensionLabel(dimensionId) {
  if (dimensionId.includes("nether")) return "Nether";
  if (dimensionId.includes("end")) return "End";
  return "Overworld";
}

function showHomesMenu(player) {
  const homes = getHomes(player.name);
  const form = new ActionFormData().title("Homes").body("Wähle einen Home-Slot:");

  for (let i = 0; i < CONFIG.MAX_HOMES; i++) {
    const h = homes[i];
    if (h) {
      form.button(
        `🏠 Home ${i + 1}\n§7${Math.round(h.x)}, ${Math.round(h.y)}, ${Math.round(h.z)} · ${dimensionLabel(h.dimension)}§r`,
        guessIconPath("minecraft:red_bed")
      );
    } else {
      form.button(`➕ Home ${i + 1}\n§7Leer - zum Setzen antippen§r`);
    }
  }
  form.button("Zurück zum Hauptmenü");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection === CONFIG.MAX_HOMES) {
      showMainMenu(player);
      return;
    }
    const idx = res.selection;
    if (homes[idx]) {
      showHomeActionMenu(player, idx, homes[idx]);
    } else {
      setHome(player, idx);
    }
  });
}

function showHomeActionMenu(player, idx, home) {
  new ActionFormData()
    .title(`Home ${idx + 1}`)
    .body(`Position: ${Math.round(home.x)}, ${Math.round(home.y)}, ${Math.round(home.z)}\nWelt: ${dimensionLabel(home.dimension)}`)
    .button("🚀 Teleportieren")
    .button("🔄 Hier neu setzen")
    .button("🗑️ Löschen")
    .button("Zurück")
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      switch (res.selection) {
        case 0:
          startHomeTeleport(player, idx, home);
          break;
        case 1:
          setHome(player, idx);
          break;
        case 2:
          deleteHome(player, idx);
          break;
        case 3:
          showHomesMenu(player);
          break;
      }
    });
}

function setHome(player, idx) {
  const homes = getHomes(player.name);
  const loc = player.location;
  homes[idx] = { x: loc.x, y: loc.y, z: loc.z, dimension: player.dimension.id };
  saveHomes(player.name, homes);
  player.sendMessage(`§aHome ${idx + 1} gesetzt an deiner aktuellen Position.`);
  showHomesMenu(player);
}

function deleteHome(player, idx) {
  const homes = getHomes(player.name);
  homes[idx] = null;
  saveHomes(player.name, homes);
  player.sendMessage(`§aHome ${idx + 1} gelöscht.`);
  showHomesMenu(player);
}

const activeHomeTeleports = new Map();

function startHomeTeleport(player, idx, home) {
  if (activeHomeTeleports.has(player.id)) {
    player.sendMessage("§cDu teleportierst bereits zu einem Home.");
    return;
  }
  const loc = player.location;
  const totalSeconds = Math.round(CONFIG.HOME_TELEPORT_DELAY_TICKS / 20);
  activeHomeTeleports.set(player.id, {
    player,
    home,
    lastLoc: { x: loc.x, y: loc.y, z: loc.z },
    elapsedTicks: 0,
  });
  player.sendMessage(`§eTeleportiere zu Home ${idx + 1} in ${totalSeconds} Sekunden. Nicht bewegen!`);
  try {
    player.onScreenDisplay.setActionBar(`§e🏠 Teleportiere in §f${totalSeconds}§e...`);
  } catch {}
}

function cancelHomeTeleport(id, reasonMessage) {
  const state = activeHomeTeleports.get(id);
  if (!state) return;
  activeHomeTeleports.delete(id);
  state.player.sendMessage(reasonMessage);
  try {
    state.player.onScreenDisplay.setActionBar("§cTeleport abgebrochen");
  } catch {}
}

system.runInterval(() => {
  for (const [id, state] of activeHomeTeleports) {
    const p = state.player;
    let loc;
    try {
      loc = p.location;
    } catch {
      activeHomeTeleports.delete(id);
      continue;
    }

    const dx = loc.x - state.lastLoc.x;
    const dy = loc.y - state.lastLoc.y;
    const dz = loc.z - state.lastLoc.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq > 0.0001) {
      cancelHomeTeleport(id, "§cTeleport abgebrochen - du hast dich bewegt.");
      continue;
    }

    state.elapsedTicks += CONFIG.HOME_CHECK_INTERVAL_TICKS;
    state.lastLoc = { x: loc.x, y: loc.y, z: loc.z };

    if (state.elapsedTicks >= CONFIG.HOME_TELEPORT_DELAY_TICKS) {
      activeHomeTeleports.delete(id);
      try {
        const dim = world.getDimension(state.home.dimension);
        p.teleport({ x: state.home.x, y: state.home.y, z: state.home.z }, { dimension: dim });
        p.sendMessage("§aTeleportiert!");
        try {
          p.onScreenDisplay.setActionBar("§a✔ Teleportiert!");
        } catch {}
      } catch (e) {
        console.warn("[Marktplatz] Home-Teleport fehlgeschlagen: " + e);
        p.sendMessage("§cTeleport fehlgeschlagen.");
      }
    } else {
      const remainingSeconds = Math.ceil((CONFIG.HOME_TELEPORT_DELAY_TICKS - state.elapsedTicks) / 20);
      try {
        p.onScreenDisplay.setActionBar(`§e🏠 Teleportiere in §f${remainingSeconds}§e...`);
      } catch {}
    }
  }
}, CONFIG.HOME_CHECK_INTERVAL_TICKS);

world.afterEvents.playerLeave.subscribe((event) => {
  activeHomeTeleports.delete(event.playerId);
});

world.afterEvents.entityHurt.subscribe((event) => {
  const hurtId = event.hurtEntity?.id;
  if (!hurtId) return;
  cancelHomeTeleport(hurtId, "§cTeleport abgebrochen - du hast Schaden erhalten.");
});

/* =========================================================
   TPA-SYSTEM (Teleport-Request an andere Spieler)
   Anfragen leben nur im Arbeitsspeicher (wie activeHomeTeleports/
   activeRtp) - das ist für kurzlebige Requests mit 60s-Timeout
   bewusst so gewählt, ein Skript-Neustart löscht offene Anfragen,
   was für dieses Feature unkritisch ist. Der TPA-"An/Aus"-Schalter
   pro Spieler wird dagegen dauerhaft als Dynamic Property gespeichert.
   Richtung wird vom Absender gewählt:
   - "sender_to_target": Absender teleportiert zum Empfänger (klassisches /tpa)
   - "target_to_sender": Empfänger teleportiert zum Absender (/tpahere)
   ========================================================= */

const tpaRequests = new Map(); // id -> { id, fromId, fromName, toId, toName, direction, timeoutRunId }
let tpaNextRequestId = 1;
const activeTpaTeleports = new Map(); // travelerId -> { player, destinationId, destinationName, lastLoc, elapsedTicks }

function isTpaEnabled(playerName) {
  return world.getDynamicProperty("tpa_off_" + sanitizeName(playerName)) !== true;
}

function setTpaEnabled(playerName, enabled) {
  const key = "tpa_off_" + sanitizeName(playerName);
  if (enabled) {
    world.setDynamicProperty(key, undefined);
  } else {
    world.setDynamicProperty(key, true);
  }
}

function getIncomingTpaRequests(playerId) {
  return [...tpaRequests.values()].filter((r) => r.toId === playerId);
}

function getOutgoingTpaRequests(playerId) {
  return [...tpaRequests.values()].filter((r) => r.fromId === playerId);
}

function clearTpaTimeout(request) {
  if (request.timeoutRunId !== undefined) {
    try {
      system.clearRun(request.timeoutRunId);
    } catch {}
  }
}

function tpaRequestDescriptionForRecipient(r) {
  return r.direction === "sender_to_target" ? `${r.fromName} möchte zu dir teleportieren.` : `Du würdest zu ${r.fromName} teleportieren.`;
}

function showTpaMenu(player) {
  const incoming = getIncomingTpaRequests(player.id);
  const outgoing = getOutgoingTpaRequests(player.id);
  const enabled = isTpaEnabled(player.name);

  new ActionFormData()
    .title("🧭 TPA")
    .body(`TPA-Anfragen empfangen: ${enabled ? "§aAn§r" : "§cAus§r"}`)
    .button("👥 Spieler auswählen")
    .button(`📨 Eingehende Anfragen (${incoming.length})`)
    .button(`📤 Ausgehende Anfragen (${outgoing.length})`)
    .button(enabled ? "🔕 TPA-Anfragen ausschalten" : "🔔 TPA-Anfragen einschalten")
    .button("Zurück zum Hauptmenü")
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      switch (res.selection) {
        case 0:
          showTpaPlayerList(player);
          break;
        case 1:
          showTpaIncomingList(player);
          break;
        case 2:
          showTpaOutgoingList(player);
          break;
        case 3:
          setTpaEnabled(player.name, !enabled);
          player.sendMessage(!enabled ? "§aTPA-Anfragen eingeschaltet." : "§cTPA-Anfragen ausgeschaltet.");
          showTpaMenu(player);
          break;
        case 4:
          showMainMenu(player);
          break;
      }
    });
}

function showTpaPlayerList(player) {
  const targets = world.getAllPlayers().filter((p) => p.id !== player.id && isTpaEnabled(p.name));
  if (targets.length === 0) {
    new MessageFormData()
      .title("👥 Spieler auswählen")
      .body("Kein anderer Spieler verfügbar (offline oder hat TPA deaktiviert).")
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showTpaMenu(player));
    return;
  }

  const form = new ActionFormData().title("👥 Spieler auswählen").body("Spieler mit deaktivierten TPA-Anfragen werden hier nicht angezeigt.");
  targets.forEach((p) => form.button(p.name));
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= targets.length) {
      showTpaMenu(player);
      return;
    }
    showTpaDirectionForm(player, targets[res.selection]);
  });
}

function showTpaDirectionForm(player, target) {
  new ActionFormData()
    .title(target.name)
    .body(`TPA-Anfrage an ${target.name} senden:`)
    .button(`🚀 Ich teleportiere zu ${target.name}`)
    .button(`📍 ${target.name} soll zu mir teleportieren`)
    .button("Zurück")
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      switch (res.selection) {
        case 0:
          sendTpaRequest(player, target, "sender_to_target");
          break;
        case 1:
          sendTpaRequest(player, target, "target_to_sender");
          break;
        case 2:
          showTpaPlayerList(player);
          break;
      }
    });
}

function sendTpaRequest(fromPlayer, targetRef, direction) {
  const toPlayer = world.getAllPlayers().find((p) => p.id === targetRef.id);
  if (!toPlayer) {
    fromPlayer.sendMessage("§cDieser Spieler ist nicht mehr online.");
    showTpaMenu(fromPlayer);
    return;
  }
  if (!isTpaEnabled(toPlayer.name)) {
    fromPlayer.sendMessage("§cDieser Spieler hat TPA-Anfragen deaktiviert.");
    showTpaMenu(fromPlayer);
    return;
  }

  // Vorhandene ausgehende Anfrage an denselben Spieler ersetzen statt zu duplizieren
  for (const [id, r] of tpaRequests) {
    if (r.fromId === fromPlayer.id && r.toId === toPlayer.id) {
      clearTpaTimeout(r);
      tpaRequests.delete(id);
    }
  }

  const id = tpaNextRequestId++;
  const timeoutRunId = system.runTimeout(() => expireTpaRequest(id), CONFIG.TPA_REQUEST_TIMEOUT_TICKS);
  tpaRequests.set(id, {
    id,
    fromId: fromPlayer.id,
    fromName: fromPlayer.name,
    toId: toPlayer.id,
    toName: toPlayer.name,
    direction,
    timeoutRunId,
  });

  fromPlayer.sendMessage(`§aTPA-Anfrage an ${toPlayer.name} gesendet.`);
  try {
    const desc = direction === "sender_to_target" ? `§e${fromPlayer.name} möchte zu dir teleportieren.` : `§e${fromPlayer.name} möchte, dass du zu ihm/ihr teleportierst.`;
    toPlayer.sendMessage(`${desc}\n§7Öffne den Kompass -> TPA -> Eingehende Anfragen, um zu antworten.`);
    toPlayer.onScreenDisplay.setActionBar("§e📨 Neue TPA-Anfrage!");
  } catch {}

  showTpaMenu(fromPlayer);
}

function expireTpaRequest(id) {
  const r = tpaRequests.get(id);
  if (!r) return;
  tpaRequests.delete(id);
  const fromP = world.getAllPlayers().find((p) => p.id === r.fromId);
  const toP = world.getAllPlayers().find((p) => p.id === r.toId);
  try {
    if (fromP) fromP.sendMessage(`§7Deine TPA-Anfrage an ${r.toName} ist abgelaufen.`);
  } catch {}
  try {
    if (toP) toP.sendMessage(`§7Die TPA-Anfrage von ${r.fromName} ist abgelaufen.`);
  } catch {}
}

function showTpaIncomingList(player) {
  const list = getIncomingTpaRequests(player.id);
  if (list.length === 0) {
    new MessageFormData()
      .title("📨 Eingehende Anfragen")
      .body("Keine eingehenden TPA-Anfragen.")
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showTpaMenu(player));
    return;
  }

  const form = new ActionFormData().title("📨 Eingehende Anfragen").body("Wähle eine Anfrage:");
  list.forEach((r) => {
    form.button(`${r.fromName}\n§7${tpaRequestDescriptionForRecipient(r)}§r`);
  });
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= list.length) {
      showTpaMenu(player);
      return;
    }
    showTpaRequestDecision(player, list[res.selection]);
  });
}

function showTpaRequestDecision(player, r) {
  new ActionFormData()
    .title(r.fromName)
    .body(tpaRequestDescriptionForRecipient(r))
    .button("✅ Annehmen")
    .button("❌ Ablehnen")
    .button("Zurück")
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      switch (res.selection) {
        case 0:
          acceptTpaRequest(player, r.id);
          break;
        case 1:
          declineTpaRequest(player, r.id);
          break;
        case 2:
          showTpaIncomingList(player);
          break;
      }
    });
}

function acceptTpaRequest(player, id) {
  const r = tpaRequests.get(id);
  if (!r || r.toId !== player.id) {
    player.sendMessage("§cDiese Anfrage ist nicht mehr gültig.");
    showTpaMenu(player);
    return;
  }
  clearTpaTimeout(r);
  tpaRequests.delete(id);

  const fromP = world.getAllPlayers().find((p) => p.id === r.fromId);
  if (!fromP) {
    player.sendMessage(`§c${r.fromName} ist nicht mehr online.`);
    showTpaMenu(player);
    return;
  }

  const traveler = r.direction === "sender_to_target" ? fromP : player;
  const destination = r.direction === "sender_to_target" ? player : fromP;

  if (activeHomeTeleports.has(traveler.id) || activeRtp.has(traveler.id) || activeTpaTeleports.has(traveler.id)) {
    try {
      traveler.sendMessage("§cTeleport nicht möglich - du teleportierst bereits (Home/RTP/TPA).");
    } catch {}
    try {
      destination.sendMessage(`§c${traveler.name} teleportiert gerade bereits, TPA konnte nicht gestartet werden.`);
    } catch {}
    showTpaMenu(player);
    return;
  }

  const loc = traveler.location;
  const totalSeconds = Math.round(CONFIG.TPA_TELEPORT_DELAY_TICKS / 20);
  activeTpaTeleports.set(traveler.id, {
    player: traveler,
    destinationId: destination.id,
    destinationName: destination.name,
    lastLoc: { x: loc.x, y: loc.y, z: loc.z },
    elapsedTicks: 0,
  });

  try {
    traveler.sendMessage(`§eTeleportiere zu ${destination.name} in ${totalSeconds} Sekunden. Nicht bewegen und nicht kämpfen!`);
    traveler.onScreenDisplay.setActionBar(`§e🧭 TPA in §f${totalSeconds}§e...`);
  } catch {}
  try {
    destination.sendMessage(`§a${traveler.name} hat die TPA-Anfrage angenommen und teleportiert gleich zu dir.`);
  } catch {}

  showTpaMenu(player);
}

function declineTpaRequest(player, id) {
  const r = tpaRequests.get(id);
  if (!r || r.toId !== player.id) {
    player.sendMessage("§cDiese Anfrage ist nicht mehr gültig.");
    showTpaMenu(player);
    return;
  }
  clearTpaTimeout(r);
  tpaRequests.delete(id);
  const fromP = world.getAllPlayers().find((p) => p.id === r.fromId);
  try {
    if (fromP) fromP.sendMessage(`§c${r.toName} hat deine TPA-Anfrage abgelehnt.`);
  } catch {}
  player.sendMessage(`§7Anfrage von ${r.fromName} abgelehnt.`);
  showTpaMenu(player);
}

function showTpaOutgoingList(player) {
  const list = getOutgoingTpaRequests(player.id);
  if (list.length === 0) {
    new MessageFormData()
      .title("📤 Ausgehende Anfragen")
      .body("Keine ausgehenden TPA-Anfragen.")
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showTpaMenu(player));
    return;
  }

  const form = new ActionFormData().title("📤 Ausgehende Anfragen").body("Wähle eine Anfrage zum Zurückziehen:");
  list.forEach((r) => {
    const desc = r.direction === "sender_to_target" ? `Du → ${r.toName}` : `${r.toName} → Du`;
    form.button(`${r.toName}\n§7${desc}§r`);
  });
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= list.length) {
      showTpaMenu(player);
      return;
    }
    const r = list[res.selection];
    new MessageFormData()
      .title(r.toName)
      .body(`Anfrage an ${r.toName} zurückziehen?`)
      .button1("Zurückziehen")
      .button2("Zurück")
      .show(player)
      .then((res2) => {
        if (res2.canceled) return;
        if (res2.selection === 0) {
          cancelOutgoingTpaRequest(player, r.id);
        } else {
          showTpaOutgoingList(player);
        }
      });
  });
}

function cancelOutgoingTpaRequest(player, id) {
  const r = tpaRequests.get(id);
  if (!r || r.fromId !== player.id) {
    player.sendMessage("§cDiese Anfrage ist nicht mehr gültig.");
    showTpaMenu(player);
    return;
  }
  clearTpaTimeout(r);
  tpaRequests.delete(id);
  const toP = world.getAllPlayers().find((p) => p.id === r.toId);
  try {
    if (toP) toP.sendMessage(`§7${r.fromName} hat die TPA-Anfrage zurückgezogen.`);
  } catch {}
  player.sendMessage(`§7Anfrage an ${r.toName} zurückgezogen.`);
  showTpaMenu(player);
}

function cancelTpaTeleport(id, reasonMessage) {
  const state = activeTpaTeleports.get(id);
  if (!state) return;
  activeTpaTeleports.delete(id);
  try {
    state.player.sendMessage(reasonMessage);
    state.player.onScreenDisplay.setActionBar("§cTPA abgebrochen");
  } catch {}
}

system.runInterval(() => {
  for (const [id, state] of activeTpaTeleports) {
    const p = state.player;
    let loc;
    try {
      loc = p.location;
    } catch {
      activeTpaTeleports.delete(id);
      continue;
    }

    const dx = loc.x - state.lastLoc.x;
    const dy = loc.y - state.lastLoc.y;
    const dz = loc.z - state.lastLoc.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq > 0.0001) {
      cancelTpaTeleport(id, "§cTPA abgebrochen - du hast dich bewegt.");
      continue;
    }

    state.elapsedTicks += CONFIG.TPA_CHECK_INTERVAL_TICKS;
    state.lastLoc = { x: loc.x, y: loc.y, z: loc.z };

    if (state.elapsedTicks >= CONFIG.TPA_TELEPORT_DELAY_TICKS) {
      activeTpaTeleports.delete(id);
      const dest = world.getAllPlayers().find((pp) => pp.id === state.destinationId);
      if (!dest) {
        try {
          p.sendMessage(`§cTeleport fehlgeschlagen - ${state.destinationName} ist nicht mehr online.`);
        } catch {}
        continue;
      }
      try {
        const destLoc = dest.location;
        p.teleport({ x: destLoc.x, y: destLoc.y, z: destLoc.z }, { dimension: dest.dimension });
        p.sendMessage(`§aTeleportiert zu ${dest.name}!`);
        try {
          p.onScreenDisplay.setActionBar("§a✔ Teleportiert!");
        } catch {}
      } catch (e) {
        console.warn("[Marktplatz] TPA-Teleport fehlgeschlagen: " + e);
        try {
          p.sendMessage("§cTeleport fehlgeschlagen.");
        } catch {}
      }
    } else {
      const remainingSeconds = Math.ceil((CONFIG.TPA_TELEPORT_DELAY_TICKS - state.elapsedTicks) / 20);
      try {
        p.onScreenDisplay.setActionBar(`§e🧭 TPA in §f${remainingSeconds}§e...`);
      } catch {}
    }
  }
}, CONFIG.TPA_CHECK_INTERVAL_TICKS);

world.afterEvents.playerLeave.subscribe((event) => {
  activeTpaTeleports.delete(event.playerId);
  for (const [id, r] of tpaRequests) {
    if (r.fromId === event.playerId || r.toId === event.playerId) {
      clearTpaTimeout(r);
      tpaRequests.delete(id);
      const otherId = r.fromId === event.playerId ? r.toId : r.fromId;
      const other = world.getAllPlayers().find((p) => p.id === otherId);
      try {
        if (other) other.sendMessage("§7Die TPA-Anfrage wurde storniert, da ein Spieler den Server verlassen hat.");
      } catch {}
    }
  }
});

world.afterEvents.entityHurt.subscribe((event) => {
  const hurtId = event.hurtEntity?.id;
  if (!hurtId) return;
  cancelTpaTeleport(hurtId, "§cTPA abgebrochen - du hast Schaden erhalten.");
});

/* =========================================================
   BOUNTY-SYSTEM (Kopfgelder)
   Kopfgelder werden - genau wie Marktplatz-Angebote - als
   einzelne Dynamic Properties mit einem gemeinsamen Index
   gespeichert. Mehrere Spieler können auf dasselbe Ziel
   Kopfgeld aussetzen (Beträge summieren sich in der Liste).
   Einlösen nur bei einem echten PvP-Kill (Täter = Spieler).
   Kein automatisches Ablaufen - nur manuelles Zurückziehen
   durch den, der das Kopfgeld ausgesetzt hat.
   ========================================================= */

function getBountyIndex() {
  const raw = world.getDynamicProperty("bounty_index");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveBountyIndex(arr) {
  world.setDynamicProperty("bounty_index", JSON.stringify(arr));
}

function getNextBountyId() {
  let n = world.getDynamicProperty("bounty_next_id");
  if (typeof n !== "number") n = 0;
  world.setDynamicProperty("bounty_next_id", n + 1);
  return n + 1;
}

function getBounty(id) {
  const raw = world.getDynamicProperty("bounty_" + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveBounty(id, obj) {
  world.setDynamicProperty("bounty_" + id, JSON.stringify(obj));
}

function deleteBountyData(id) {
  world.setDynamicProperty("bounty_" + id, undefined);
}

// Fasst alle Kopfgeld-Einträge nach Ziel zusammen: Map<targetName, {total, entries:[{id,placer,amount,created}]}>
function getBountyTotals() {
  const index = getBountyIndex();
  const totals = new Map();
  for (const id of index) {
    const b = getBounty(id);
    if (!b) continue;
    if (!totals.has(b.target)) totals.set(b.target, { total: 0, entries: [] });
    const t = totals.get(b.target);
    t.total += b.amount;
    t.entries.push({ id, placer: b.placer, amount: b.amount, created: b.created });
  }
  return totals;
}

function showBountyMenu(player) {
  new ActionFormData()
    .title("Kopfgelder")
    .body("Wähle eine Option:")
    .button("📋 Bounty-Liste (öffentlich)")
    .button("💰 Kopfgeld aussetzen")
    .button("🗑️ Meine ausgesetzten Kopfgelder")
    .button("Zurück zum Hauptmenü")
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      switch (res.selection) {
        case 0:
          showBountyList(player);
          break;
        case 1:
          showPlaceBountyTargetSelect(player);
          break;
        case 2:
          showMyBounties(player);
          break;
        case 3:
          showMainMenu(player);
          break;
      }
    });
}

function showBountyList(player) {
  const totals = getBountyTotals();
  const sorted = [...totals.entries()].sort((a, b) => b[1].total - a[1].total);

  const form = new ActionFormData()
    .title("Bounty-Liste")
    .body(sorted.length === 0 ? "Aktuell keine aktiven Kopfgelder." : "Aktive Kopfgelder (höchstes zuerst):");

  for (const [target] of sorted) {
    const data = totals.get(target);
    form.button(`🎯 ${target}\n§7${data.total} ${CONFIG.MONEY_OBJECTIVE} · ${data.entries.length} Kopfgeld(er)§r`);
  }
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= sorted.length) {
      showBountyMenu(player);
      return;
    }
    const [target, data] = sorted[res.selection];
    const breakdown = data.entries.map((e) => `${e.placer}: ${e.amount} ${CONFIG.MONEY_OBJECTIVE}`).join("\n");
    new MessageFormData()
      .title(target)
      .body(`Gesamt-Kopfgeld: ${data.total} ${CONFIG.MONEY_OBJECTIVE}\n\nAufgeteilt auf:\n${breakdown}\n\nEinlösbar nur durch PvP-Kill.`)
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showBountyList(player));
  });
}

function showPlaceBountyTargetSelect(player) {
  const online = world.getPlayers().filter((p) => p.name !== player.name);
  const form = new ActionFormData().title("Kopfgeld aussetzen").body("Ziel auswählen:");
  for (const p of online) {
    form.button(p.name);
  }
  form.button("✏️ Anderer Name (auch offline)");
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection < online.length) {
      showPlaceBountyAmountForm(player, online[res.selection].name);
      return;
    }
    const idx = res.selection - online.length;
    if (idx === 0) {
      new ModalFormData()
        .title("Spielername")
        .textField("Name des Ziels", "z.B. Steve", { defaultValue: "" })
        .show(player)
        .then((res2) => {
          if (res2.canceled) return;
          const name = (res2.formValues[0] || "").trim();
          if (!name) {
            player.sendMessage("§cKein Name eingegeben.");
            return;
          }
          if (name === player.name) {
            player.sendMessage("§cDu kannst kein Kopfgeld auf dich selbst aussetzen.");
            return;
          }
          showPlaceBountyAmountForm(player, name);
        })
        .catch((e) => {
          console.warn("[Marktplatz] Fehler im Namens-Formular: " + e);
          player.sendMessage(`§c[Marktplatz-Fehler] ${e}`);
        });
      return;
    }
    showBountyMenu(player);
  });
}

function showPlaceBountyAmountForm(player, targetName) {
  new ModalFormData()
    .title(`Kopfgeld auf ${targetName}`)
    .textField("Betrag (in " + CONFIG.MONEY_OBJECTIVE + ")", "z.B. 100", { defaultValue: "" })
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      const amount = parsePriceInput(res.formValues[0]);
      if (!Number.isInteger(amount) || amount <= 0) {
        player.sendMessage("§cUngültiger Betrag. Bitte gib eine ganze Zahl größer 0 ein.");
        return;
      }
      const balance = getMoney(player);
      if (balance < amount) {
        player.sendMessage(`§cNicht genug Guthaben. Du hast ${balance}, benötigt werden ${amount} ${CONFIG.MONEY_OBJECTIVE}.`);
        return;
      }

      removeMoneyFrom(player, amount);

      const id = getNextBountyId();
      saveBounty(id, { target: targetName, placer: player.name, amount, created: Date.now() });
      const idx = getBountyIndex();
      idx.push(id);
      saveBountyIndex(idx);

      player.sendMessage(`§aKopfgeld von ${amount} ${CONFIG.MONEY_OBJECTIVE} auf ${targetName} ausgesetzt.`);

      const targetOnline = world.getPlayers({ name: targetName })[0];
      if (targetOnline) {
        targetOnline.sendMessage(`§c⚠ Es wurde ein Kopfgeld von ${amount} ${CONFIG.MONEY_OBJECTIVE} auf dich ausgesetzt!`);
      }
    })
    .catch((e) => {
      console.warn("[Marktplatz] Fehler im Kopfgeld-Betrag-Formular: " + e);
      player.sendMessage(`§c[Marktplatz-Fehler] ${e}`);
    });
}

function showMyBounties(player) {
  const index = getBountyIndex();
  const mine = index.filter((id) => {
    const b = getBounty(id);
    return b && b.placer === player.name;
  });

  const form = new ActionFormData()
    .title("Meine Kopfgelder")
    .body(mine.length === 0 ? "Du hast keine aktiven Kopfgelder ausgesetzt." : "Auswählen, um zurückzuziehen (wird erstattet):");

  for (const id of mine) {
    const b = getBounty(id);
    form.button(`🎯 ${b.target}\n§7${b.amount} ${CONFIG.MONEY_OBJECTIVE}§r`);
  }
  form.button("Zurück zum Hauptmenü");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= mine.length) {
      showMainMenu(player);
      return;
    }
    const id = mine[res.selection];
    const b = getBounty(id);
    if (!b) {
      player.sendMessage("§cKopfgeld nicht mehr gefunden.");
      showMyBounties(player);
      return;
    }
    const newIndex = getBountyIndex().filter((x) => x !== id);
    saveBountyIndex(newIndex);
    deleteBountyData(id);
    addMoneyTo(player, b.amount);
    player.sendMessage(`§aKopfgeld auf ${b.target} zurückgezogen. ${b.amount} ${CONFIG.MONEY_OBJECTIVE} erstattet.`);
    showMyBounties(player);
  });
}

// Einlösen bei PvP-Kill: Täter muss ein Spieler sein.
world.afterEvents.entityDie.subscribe((event) => {
  const dead = event.deadEntity;
  if (!dead || dead.typeId !== "minecraft:player") return;
  const killer = event.damageSource?.damagingEntity;
  if (!killer || killer.typeId !== "minecraft:player") return;
  if (killer.id === dead.id) return;

  const targetName = dead.name;
  const index = getBountyIndex();
  const remaining = [];
  let total = 0;
  for (const id of index) {
    const b = getBounty(id);
    if (!b) continue;
    if (b.target === targetName) {
      total += b.amount;
      deleteBountyData(id);
    } else {
      remaining.push(id);
    }
  }
  if (total > 0) {
    saveBountyIndex(remaining);
    addMoneyTo(killer, total);
    killer.sendMessage(`§a🎯 Kopfgeld eingelöst! Du hast ${total} ${CONFIG.MONEY_OBJECTIVE} für das Töten von ${targetName} erhalten.`);
    try {
      dead.sendMessage(`§cDein Kopfgeld (${total} ${CONFIG.MONEY_OBJECTIVE}) wurde von ${killer.name} eingelöst.`);
    } catch {}
  }
});

/* =========================================================
   JOBS-SYSTEM
   Ein Spieler kann genau einen Job gleichzeitig aktiv haben,
   Level/XP pro Job bleiben aber dauerhaft erhalten, auch wenn
   gewechselt wird. Auszahlung nur für den aktuell aktiven Job.
   Anti-Farm: von Spielern selbst platzierte Blöcke zahlen beim
   Abbauen nichts (jobPlacedBlocks, nur im Arbeitsspeicher -
   setzt sich bei Skript-Neustart zurück, das ist unkritisch).
   ========================================================= */

const JOB_DEFS = {
  mining: {
    label: "⛏️ Bergbau",
    type: "block_break",
    blocks: {
      "minecraft:coal_ore": 4,
      "minecraft:deepslate_coal_ore": 4,
      "minecraft:iron_ore": 6,
      "minecraft:deepslate_iron_ore": 6,
      "minecraft:copper_ore": 5,
      "minecraft:deepslate_copper_ore": 5,
      "minecraft:gold_ore": 10,
      "minecraft:deepslate_gold_ore": 10,
      "minecraft:redstone_ore": 6,
      "minecraft:deepslate_redstone_ore": 6,
      "minecraft:lapis_ore": 6,
      "minecraft:deepslate_lapis_ore": 6,
      "minecraft:diamond_ore": 20,
      "minecraft:deepslate_diamond_ore": 20,
      "minecraft:emerald_ore": 20,
      "minecraft:deepslate_emerald_ore": 20,
      "minecraft:nether_gold_ore": 6,
      "minecraft:quartz_ore": 6,
      "minecraft:ancient_debris": 40,
      "minecraft:stone": 1,
      "minecraft:cobblestone": 1,
      "minecraft:deepslate": 1,
      "minecraft:cobbled_deepslate": 1,
    },
  },
  farming: {
    label: "🌾 Landwirtschaft",
    type: "block_break_mature",
    blocks: {
      "minecraft:wheat": 3,
      "minecraft:carrots": 3,
      "minecraft:potatoes": 3,
      "minecraft:beetroot": 3,
      "minecraft:nether_wart": 4,
      "minecraft:pumpkin": 8,
      "minecraft:melon_block": 8,
    },
    // Nur auszahlen, wenn der Block-State dem ausgewachsenen Zustand entspricht.
    // Kürbis/Melone haben keinen eigenen Wachstums-State (der sitzt am Stiel) -
    // die existieren als Block nur bereits fertig gewachsen, daher kein Eintrag hier.
    matureStates: {
      "minecraft:wheat": { name: "growth", value: 7 },
      "minecraft:carrots": { name: "growth", value: 7 },
      "minecraft:potatoes": { name: "growth", value: 7 },
      "minecraft:beetroot": { name: "growth", value: 3 },
      "minecraft:nether_wart": { name: "age", value: 3 },
    },
  },
  woodcutting: {
    label: "🪓 Holzfäller",
    type: "block_break_prefix",
    prefixes: ["_log", "_wood", "stem", "hyphae"],
    payout: 2,
  },
  hunting: {
    label: "⚔️ Jäger",
    type: "mob_kill",
    mobs: {
      "minecraft:zombie": 3,
      "minecraft:skeleton": 3,
      "minecraft:spider": 3,
      "minecraft:creeper": 4,
      "minecraft:enderman": 6,
      "minecraft:witch": 6,
      "minecraft:cow": 1,
      "minecraft:pig": 1,
      "minecraft:chicken": 1,
      "minecraft:sheep": 1,
      "minecraft:rabbit": 1,
      "minecraft:wolf": 2,
    },
    defaultPayout: 2,
  },
  killer: {
    label: "🗡️ Killer",
    type: "player_kill",
    payout: 25,
    xpGain: 5,
  },
};

const jobPlacedBlocks = new Set(); // "dimId|x|y|z" von Spielern selbst platzierter Blöcke

function jobBlockKey(dimensionId, loc) {
  return `${dimensionId}|${Math.floor(loc.x)}|${Math.floor(loc.y)}|${Math.floor(loc.z)}`;
}

function getJobData(playerName) {
  const raw = world.getDynamicProperty("job_" + sanitizeName(playerName));
  if (!raw) return { active: null, xp: {} };
  try {
    const d = JSON.parse(raw);
    if (!d.xp) d.xp = {};
    return d;
  } catch {
    return { active: null, xp: {} };
  }
}

function saveJobData(playerName, data) {
  world.setDynamicProperty("job_" + sanitizeName(playerName), JSON.stringify(data));
  requestDashboardRefresh(); // Job-Wechsel/Level-Up sofort sichtbar machen
}

function getJobXp(data, jobKey) {
  return data.xp[jobKey] || 0;
}

function getJobLevel(xp) {
  return Math.floor(xp / CONFIG.JOB_XP_PER_LEVEL);
}

function jobPayoutMultiplier(level) {
  return 1 + level * CONFIG.JOB_PAYOUT_PER_LEVEL_BONUS;
}

function awardJobProgress(player, jobKey, basePayout, xpGain) {
  const data = getJobData(player.name);
  if (data.active !== jobKey) return; // nur der aktive Job zahlt aus

  const beforeXp = getJobXp(data, jobKey);
  const beforeLevel = getJobLevel(beforeXp);
  const afterXp = beforeXp + xpGain;
  const afterLevel = getJobLevel(afterXp);
  data.xp[jobKey] = afterXp;
  saveJobData(player.name, data);

  const payout = Math.round(basePayout * jobPayoutMultiplier(beforeLevel));
  addMoneyTo(player, payout);

  try {
    if (afterLevel > beforeLevel) {
      player.sendMessage(`§a🎉 ${JOB_DEFS[jobKey].label} Level ${afterLevel} erreicht!`);
      player.onScreenDisplay.setActionBar(`§a+${payout} ${CONFIG.MONEY_OBJECTIVE} §7(Level ${afterLevel}!)`);
    } else {
      player.onScreenDisplay.setActionBar(`§a+${payout} ${CONFIG.MONEY_OBJECTIVE} §7(${JOB_DEFS[jobKey].label})`);
    }
  } catch {}
}

world.afterEvents.playerPlaceBlock.subscribe((event) => {
  jobPlacedBlocks.add(jobBlockKey(event.dimension.id, event.block.location));
});

world.afterEvents.playerBreakBlock.subscribe((event) => {
  const { player, brokenBlockPermutation, dimension, block } = event;
  const typeId = brokenBlockPermutation.type.id;
  const key = jobBlockKey(dimension.id, block.location);
  const wasPlaced = jobPlacedBlocks.has(key);
  jobPlacedBlocks.delete(key);
  if (wasPlaced) return; // kein Payout für selbst platzierte Blöcke

  const data = getJobData(player.name);
  const jobKey = data.active;
  if (!jobKey) return;
  const job = JOB_DEFS[jobKey];
  if (!job) return;

  if (job.type === "block_break" && job.blocks[typeId] !== undefined) {
    awardJobProgress(player, jobKey, job.blocks[typeId], 1);
  } else if (job.type === "block_break_mature" && job.blocks[typeId] !== undefined) {
    const matureReq = job.matureStates?.[typeId];
    if (matureReq) {
      let stateVal;
      try {
        stateVal = brokenBlockPermutation.getState(matureReq.name);
      } catch {
        stateVal = undefined;
      }
      if (stateVal !== matureReq.value) return; // noch nicht ausgewachsen
    }
    awardJobProgress(player, jobKey, job.blocks[typeId], 1);
  } else if (job.type === "block_break_prefix" && job.prefixes.some((p) => typeId.includes(p))) {
    awardJobProgress(player, jobKey, job.payout, 1);
  }
});

world.afterEvents.entityDie.subscribe((event) => {
  const dead = event.deadEntity;
  if (!dead) return;
  const killer = event.damageSource?.damagingEntity;
  if (!killer || killer.typeId !== "minecraft:player") return;

  if (dead.typeId === "minecraft:player") {
    if (killer.id === dead.id) return;
    const data = getJobData(killer.name);
    if (data.active === "killer") {
      awardJobProgress(killer, "killer", JOB_DEFS.killer.payout, JOB_DEFS.killer.xpGain);
    }
    return;
  }

  const data = getJobData(killer.name);
  if (data.active !== "hunting") return;
  const job = JOB_DEFS.hunting;
  const payout = job.mobs[dead.typeId] ?? job.defaultPayout;
  awardJobProgress(killer, "hunting", payout, 1);
});

function showJobsMenu(player) {
  const data = getJobData(player.name);
  const keys = Object.keys(JOB_DEFS);
  const form = new ActionFormData().title("💼 Jobs").body(`Aktiver Job: ${data.active ? JOB_DEFS[data.active].label : "§7Keiner§r"}`);
  keys.forEach((k) => {
    const job = JOB_DEFS[k];
    const xp = getJobXp(data, k);
    const level = getJobLevel(xp);
    const activeMarker = data.active === k ? " §a(aktiv)§r" : "";
    form.button(`${job.label}${activeMarker}\n§7Level ${level} · ${xp} XP§r`);
  });
  form.button("Zurück zum Hauptmenü");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection === keys.length) {
      showMainMenu(player);
      return;
    }
    showJobDetail(player, keys[res.selection]);
  });
}

function showJobDetail(player, jobKey) {
  const data = getJobData(player.name);
  const job = JOB_DEFS[jobKey];
  const xp = getJobXp(data, jobKey);
  const level = getJobLevel(xp);
  const isActive = data.active === jobKey;
  const xpForNext = `${(level + 1) * CONFIG.JOB_XP_PER_LEVEL - xp} XP bis Level ${level + 1}`;

  new MessageFormData()
    .title(job.label)
    .body(`Level ${level} (${xp} XP)\n${xpForNext}\nAuszahlungs-Bonus: +${Math.round(level * CONFIG.JOB_PAYOUT_PER_LEVEL_BONUS * 100)}%`)
    .button1(isActive ? "Job verlassen" : "Als aktiven Job wählen")
    .button2("Zurück")
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      if (res.selection === 0) {
        const d = getJobData(player.name);
        d.active = isActive ? null : jobKey;
        saveJobData(player.name, d);
        player.sendMessage(isActive ? `§7Du hast den Job ${job.label} verlassen.` : `§aDu bist jetzt ${job.label}.`);
        showJobsMenu(player);
      } else {
        showJobsMenu(player);
      }
    });
}

/* =========================================================
   LOTTO-SYSTEM
   Feste Ziehung alle LOTTO_DRAW_INTERVAL_MS (Echtzeit via Date.now(),
   überlebt Server-Neustarts, wie schon beim RTP-Cooldown im Code).
   Jackpot = LOTTO_BASE_POT (immer mindestens) + verkaufte Lose *
   Ticketpreis. Bei der Ziehung wird unter allen Losen ein Gewinner
   ausgelost (mehr Lose = höhere Chance). Die HÖHE des Gewinns ist immer
   zufällig zwischen LOTTO_MIN_PRIZE und dem Jackpot - auch wenn nur ein
   einziges Los verkauft wurde. Der Rest des Jackpots verfällt.
   Wurde kein Los verkauft, gibt es keine Ziehung.
   ========================================================= */

function getLottoState() {
  const raw = world.getDynamicProperty("lotto_state");
  if (!raw) return { nextDrawAt: 0, tickets: {} };
  try {
    const d = JSON.parse(raw);
    if (!d.tickets) d.tickets = {};
    if (!d.nextDrawAt) d.nextDrawAt = 0;
    return d;
  } catch {
    return { nextDrawAt: 0, tickets: {} };
  }
}

function saveLottoState(state) {
  world.setDynamicProperty("lotto_state", JSON.stringify(state));
}

function ensureLottoScheduled(state) {
  if (!state.nextDrawAt) {
    state.nextDrawAt = Date.now() + CONFIG.LOTTO_DRAW_INTERVAL_MS;
    saveLottoState(state);
  }
  return state;
}

function lottoTotalTickets(state) {
  return Object.values(state.tickets).reduce((sum, c) => sum + c, 0);
}

function lottoPot(state) {
  return CONFIG.LOTTO_BASE_POT + lottoTotalTickets(state) * CONFIG.LOTTO_TICKET_PRICE;
}

// Zufälliger Gewinn zwischen LOTTO_MIN_PRIZE und dem Jackpot (beide Enden möglich), in Schritten von LOTTO_PRIZE_STEP
function rollLottoPrize(pot) {
  const step = Math.max(1, Math.floor(CONFIG.LOTTO_PRIZE_STEP));
  const minPrize = Math.max(1, Math.floor(CONFIG.LOTTO_MIN_PRIZE));
  if (pot <= minPrize) return pot;
  const steps = Math.floor((pot - minPrize) / step);
  const hasRemainder = minPrize + steps * step < pot; // Jackpot selbst liegt nicht auf dem Raster -> zusätzlich als Option
  const options = steps + 1 + (hasRemainder ? 1 : 0);
  const i = Math.floor(Math.random() * options);
  return i <= steps ? minPrize + i * step : pot;
}

function formatLottoTimeLeft(ms) {
  if (ms <= 0) return "gleich";
  const totalMinutes = Math.ceil(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function showLottoMenu(player) {
  let state = getLottoState();
  state = ensureLottoScheduled(state);

  const pot = lottoPot(state);
  const totalTickets = lottoTotalTickets(state);
  const myTickets = state.tickets[player.name] || 0;
  const timeLeft = formatLottoTimeLeft(state.nextDrawAt - Date.now());

  new ActionFormData()
    .title("🎰 Lotto")
    .body(
      `Jackpot: §a${pot} ${CONFIG.MONEY_OBJECTIVE}§r §7(Grundpot ${CONFIG.LOTTO_BASE_POT} + ${totalTickets} Lose)§r\nGewinn: zufällig zwischen §e${CONFIG.LOTTO_MIN_PRIZE}§r und dem Jackpot\nDeine Lose: §e${myTickets}§r\nNächste Ziehung in: §e${timeLeft}§r\nLos-Preis: ${CONFIG.LOTTO_TICKET_PRICE} ${CONFIG.MONEY_OBJECTIVE}`
    )
    .button(`🎟️ 1 Los kaufen (${CONFIG.LOTTO_TICKET_PRICE})`)
    .button(`🎟️ 5 Lose kaufen (${CONFIG.LOTTO_TICKET_PRICE * 5})`)
    .button(`🎟️ 10 Lose kaufen (${CONFIG.LOTTO_TICKET_PRICE * 10})`)
    .button("Zurück zum Hauptmenü")
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      switch (res.selection) {
        case 0:
          buyLottoTickets(player, 1);
          break;
        case 1:
          buyLottoTickets(player, 5);
          break;
        case 2:
          buyLottoTickets(player, 10);
          break;
        case 3:
          showMainMenu(player);
          break;
      }
    });
}

function buyLottoTickets(player, count) {
  const cost = count * CONFIG.LOTTO_TICKET_PRICE;
  if (getMoney(player) < cost) {
    player.sendMessage(`§cDu hast nicht genug ${CONFIG.MONEY_OBJECTIVE} (benötigt: ${cost}).`);
    showLottoMenu(player);
    return;
  }

  if (!removeMoneyFrom(player, cost, player)) {
    player.sendMessage("§c[Marktplatz-Fehler] Abbuchung fehlgeschlagen. Es wurden keine Lose gekauft.");
    showLottoMenu(player);
    return;
  }
  let state = getLottoState();
  state = ensureLottoScheduled(state);
  state.tickets[player.name] = (state.tickets[player.name] || 0) + count;
  saveLottoState(state);

  player.sendMessage(`§aDu hast ${count} Lotto-Los${count > 1 ? "e" : ""} für ${cost} ${CONFIG.MONEY_OBJECTIVE} gekauft.`);
  showLottoMenu(player);
}

function runLottoDrawIfDue() {
  let state = getLottoState();
  state = ensureLottoScheduled(state);
  if (Date.now() < state.nextDrawAt) return;

  const entries = Object.entries(state.tickets);
  const totalTickets = entries.reduce((sum, [, c]) => sum + c, 0);

  if (totalTickets === 0) {
    try {
      world.sendMessage("§7🎰 Lotto-Ziehung: Niemand hat mitgespielt - keine Ziehung.");
    } catch {}
  } else {
    const pot = lottoPot(state);
    const prize = rollLottoPrize(pot);

    let r = Math.floor(Math.random() * totalTickets);
    let winnerName = entries[0][0];
    let winnerTickets = entries[0][1];
    for (const [name, count] of entries) {
      if (r < count) {
        winnerName = name;
        winnerTickets = count;
        break;
      }
      r -= count;
    }

    addMoneyTo(winnerName, prize);
    try {
      world.sendMessage(
        `§6🎰 Lotto-Ziehung! §e${winnerName}§r hat mit §e${winnerTickets}§r Los(en) von §e${totalTickets}§r §a${prize} ${CONFIG.MONEY_OBJECTIVE}§r gewonnen! §7(Jackpot: ${pot})§r`
      );
    } catch {}
  }

  state.tickets = {};
  state.nextDrawAt = Date.now() + CONFIG.LOTTO_DRAW_INTERVAL_MS;
  saveLottoState(state);
}

system.runInterval(() => {
  runLottoDrawIfDue();
}, CONFIG.LOTTO_CHECK_INTERVAL_TICKS);

/* =========================================================
   SERVER-EVENTS (automatische Sammel-Wettbewerbe, kein PvP)
   Alle 48h startet automatisch (kein Admin-Trigger) ein Event zu
   zufällig 15 oder 16 Uhr deutscher Zeit. Dauer: 60 Minuten. Sieger
   ist, wer bis zum Ende am meisten passende Items abgeliefert hat.
   Die deutsche Zeitzone wird manuell über die offizielle EU-DST-Regel
   berechnet (letzter Sonntag im März/Oktober, 01:00 UTC) statt über
   Intl.DateTimeFormat - dessen volle ICU-Zeitzonen-Unterstützung ist
   in der Bedrock-Skript-Umgebung nicht sichergestellt (Vermutung,
   aber sicherer Weg, der ganz ohne diese Abhängigkeit auskommt).
   ========================================================= */

const EVENT_TYPES = {
  MINING: {
    label: "⛏️ Bergbau-Event",
    verb: "abgebaute Erze/Rohstoffe",
    items: [
      "minecraft:coal",
      "minecraft:raw_iron",
      "minecraft:raw_gold",
      "minecraft:raw_copper",
      "minecraft:iron_ingot",
      "minecraft:gold_ingot",
      "minecraft:copper_ingot",
      "minecraft:redstone",
      "minecraft:lapis_lazuli",
      "minecraft:diamond",
      "minecraft:emerald",
      "minecraft:quartz",
      "minecraft:netherite_scrap",
    ],
  },
  FARMING: {
    label: "🌾 Landwirtschafts-Event",
    verb: "geerntete Feldfrüchte",
    items: [
      "minecraft:wheat",
      "minecraft:carrot",
      "minecraft:potato",
      "minecraft:beetroot",
      "minecraft:nether_wart",
      "minecraft:melon_slice",
      "minecraft:pumpkin",
      "minecraft:sweet_berries",
      "minecraft:cocoa_beans",
    ],
  },
  WOODCUTTING: {
    label: "🪓 Holzfäller-Event",
    verb: "gefällte Stämme",
    items: [
      "minecraft:oak_log",
      "minecraft:spruce_log",
      "minecraft:birch_log",
      "minecraft:jungle_log",
      "minecraft:acacia_log",
      "minecraft:dark_oak_log",
      "minecraft:mangrove_log",
      "minecraft:cherry_log",
      "minecraft:crimson_stem",
      "minecraft:warped_stem",
    ],
  },
  HUNTING: {
    label: "🏹 Jäger-Event (nur Mob-Beute, kein PvP)",
    verb: "Mob-Beute",
    items: [
      "minecraft:rotten_flesh",
      "minecraft:bone",
      "minecraft:string",
      "minecraft:gunpowder",
      "minecraft:spider_eye",
      "minecraft:ender_pearl",
      "minecraft:slime_ball",
    ],
  },
};

function getEventState() {
  const raw = world.getDynamicProperty("event_state");
  if (!raw) return { status: "idle", nextEventAt: 0, eventType: null, endsAt: 0, contributions: {} };
  try {
    const d = JSON.parse(raw);
    if (!d.contributions) d.contributions = {};
    if (!d.status) d.status = "idle";
    return d;
  } catch {
    return { status: "idle", nextEventAt: 0, eventType: null, endsAt: 0, contributions: {} };
  }
}

function saveEventState(state) {
  world.setDynamicProperty("event_state", JSON.stringify(state));
}

// Letzter Sonntag eines Monats, 00:00 UTC (monthIndex: 0 = Januar)
function getLastSundayUTC(year, monthIndex) {
  const d = new Date(Date.UTC(year, monthIndex + 1, 0));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

// EU-Sommerzeit: beginnt letzter Sonntag im März 01:00 UTC, endet letzter Sonntag im Oktober 01:00 UTC
function isEuDst(date) {
  const year = date.getUTCFullYear();
  const dstStart = getLastSundayUTC(year, 2);
  dstStart.setUTCHours(1, 0, 0, 0);
  const dstEnd = getLastSundayUTC(year, 9);
  dstEnd.setUTCHours(1, 0, 0, 0);
  return date.getTime() >= dstStart.getTime() && date.getTime() < dstEnd.getTime();
}

function computeNextEventTime(fromDate) {
  const target = new Date(fromDate.getTime() + CONFIG.EVENT_INTERVAL_MS);
  const offset = isEuDst(target) ? 2 : 1; // UTC+2 (Sommerzeit) oder UTC+1 (Winterzeit)
  const hourOptions = CONFIG.EVENT_START_HOURS_DE;
  const hourDe = hourOptions[Math.floor(Math.random() * hourOptions.length)];
  const utcHour = hourDe - offset;
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), utcHour, 0, 0, 0));
}

function pickRandomEventType() {
  const keys = Object.keys(EVENT_TYPES);
  return keys[Math.floor(Math.random() * keys.length)];
}

function formatEventDuration(ms) {
  if (ms <= 0) return "gleich";
  const totalMinutes = Math.ceil(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function startServerEvent(state) {
  const typeKey = pickRandomEventType();
  const def = EVENT_TYPES[typeKey];
  state.status = "active";
  state.eventType = typeKey;
  state.endsAt = Date.now() + CONFIG.EVENT_DURATION_MS;
  state.contributions = {};
  saveEventState(state);
  try {
    world.sendMessage(
      `§6🏆 Server-Event gestartet: ${def.label}!\n§eLiefere ${def.verb} über den Kompass -> 📅 Event ab. Wer in 60 Minuten am meisten abliefert, gewinnt!`
    );
  } catch {}
}

function endServerEvent(state) {
  const def = EVENT_TYPES[state.eventType];
  const entries = Object.entries(state.contributions);

  if (entries.length === 0) {
    try {
      world.sendMessage(`§7🏆 Server-Event (${def ? def.label : "Event"}) beendet - niemand hat etwas abgeliefert, kein Sieger.`);
    } catch {}
  } else {
    entries.sort((a, b) => b[1] - a[1]);
    const winnerName = entries[0][0];
    const winnerAmount = entries[0][1];

    addMoneyTo(winnerName, CONFIG.EVENT_MONEY_REWARD);
    deliverItemToPlayerName(winnerName, CONFIG.EVENT_ITEM_REWARD_ID, CONFIG.EVENT_ITEM_REWARD_AMOUNT);

    try {
      world.sendMessage(
        `§6🏆 Server-Event (${def ? def.label : "Event"}) beendet! §e${winnerName}§r gewinnt mit §e${winnerAmount}§r abgelieferten Items: ` +
          `§a${CONFIG.EVENT_MONEY_REWARD} ${CONFIG.MONEY_OBJECTIVE}§r + §a${CONFIG.EVENT_ITEM_REWARD_AMOUNT}x ${displayName(CONFIG.EVENT_ITEM_REWARD_ID)}§r!`
      );
    } catch {}
  }

  state.status = "idle";
  state.eventType = null;
  state.endsAt = 0;
  state.contributions = {};
  state.nextEventAt = computeNextEventTime(new Date()).getTime();
  saveEventState(state);
}

function checkServerEvent() {
  const state = getEventState();

  if (state.status === "idle") {
    if (!state.nextEventAt) {
      state.nextEventAt = computeNextEventTime(new Date()).getTime();
      saveEventState(state);
      return;
    }
    if (Date.now() >= state.nextEventAt) {
      startServerEvent(state);
    }
    return;
  }

  if (state.status === "active" && Date.now() >= state.endsAt) {
    endServerEvent(state);
  }
}

system.runInterval(() => {
  checkServerEvent();
}, CONFIG.EVENT_CHECK_INTERVAL_TICKS);

function showEventMenu(player) {
  const state = getEventState();

  if (state.status !== "active") {
    const next = state.nextEventAt ? formatEventDuration(state.nextEventAt - Date.now()) : "wird berechnet...";
    new MessageFormData()
      .title("📅 Server-Event")
      .body(`Aktuell läuft kein Event.\nNächstes Event in: §e${next}§r\n\n§7Events sind reine Sammel-Wettbewerbe (Bergbau/Landwirtschaft/Holzfäller/Mob-Beute) - kein PvP.§r`)
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showMainMenu(player));
    return;
  }

  const def = EVENT_TYPES[state.eventType];
  const timeLeft = formatEventDuration(state.endsAt - Date.now());
  const myContribution = state.contributions[player.name] || 0;
  const ranking = Object.entries(state.contributions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const rankingText = ranking.length > 0 ? ranking.map(([n, c], i) => `${i + 1}. ${n}: ${c}`).join("\n") : "Noch niemand hat abgeliefert.";

  new ActionFormData()
    .title(def.label)
    .body(`Gesucht: ${def.verb}\nZeit übrig: §e${timeLeft}§r\nDeine Ablieferungen: §e${myContribution}§r\n\n§7Bestenliste (Top 5):§r\n${rankingText}`)
    .button("📦 Items abliefern")
    .button("Zurück zum Hauptmenü")
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      if (res.selection === 0) {
        showEventDeliverMenu(player);
      } else {
        showMainMenu(player);
      }
    });
}

function showEventDeliverMenu(player) {
  const state = getEventState();
  if (state.status !== "active") {
    showEventMenu(player);
    return;
  }
  const def = EVENT_TYPES[state.eventType];

  const inv = player.getComponent("minecraft:inventory");
  const container = inv.container;

  const entries = [];
  for (let i = 0; i < container.size; i++) {
    const it = container.getItem(i);
    if (!it) continue;
    if (!def.items.includes(it.typeId)) continue;
    entries.push({ slot: i, item: it });
  }

  if (entries.length === 0) {
    new MessageFormData()
      .title(def.label)
      .body("Du hast gerade nichts Passendes im Inventar zum Abliefern.")
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showEventMenu(player));
    return;
  }

  const form = new ActionFormData().title(def.label).body("Was möchtest du abliefern?");
  for (const e of entries) {
    form.button(`${e.item.amount}x ${displayName(e.item.typeId, e.item.nameTag)}`, guessIconPath(e.item.typeId));
  }
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= entries.length) {
      showEventMenu(player);
      return;
    }
    const chosen = entries[res.selection];
    if (chosen.item.amount > 1) {
      showEventDeliverAmountForm(player, chosen.slot, chosen.item);
    } else {
      deliverEventItem(player, chosen.slot, 1);
    }
  });
}

function showEventDeliverAmountForm(player, slot, item) {
  new ModalFormData()
    .title(`Menge: ${displayName(item.typeId, item.nameTag)}`)
    .slider("Menge", 1, item.amount, { valueStep: 1, defaultValue: item.amount })
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      deliverEventItem(player, slot, res.formValues[0]);
    })
    .catch((e) => {
      console.warn("[Marktplatz] Fehler im Event-Mengen-Formular: " + e);
      player.sendMessage(`§c[Event-Fehler] ${e}`);
    });
}

function deliverEventItem(player, slot, amount) {
  const state = getEventState();
  if (state.status !== "active") {
    player.sendMessage("§cDas Event ist bereits vorbei.");
    showMainMenu(player);
    return;
  }
  const def = EVENT_TYPES[state.eventType];

  const inv = player.getComponent("minecraft:inventory");
  const container = inv.container;
  const freshItem = container.getItem(slot);
  if (!freshItem || !def.items.includes(freshItem.typeId)) {
    player.sendMessage("§cDieses Item ist nicht mehr da oder zählt nicht für dieses Event.");
    showEventMenu(player);
    return;
  }

  const actualAmount = Math.min(amount, freshItem.amount);
  if (actualAmount <= 0) {
    showEventMenu(player);
    return;
  }

  if (actualAmount >= freshItem.amount) {
    container.setItem(slot, undefined);
  } else {
    freshItem.amount -= actualAmount;
    container.setItem(slot, freshItem);
  }

  state.contributions[player.name] = (state.contributions[player.name] || 0) + actualAmount;
  saveEventState(state);

  player.sendMessage(`§aAbgeliefert: ${actualAmount}x ${displayName(freshItem.typeId, freshItem.nameTag)}. Deine Gesamtsumme: ${state.contributions[player.name]}`);
  showEventMenu(player);
}

/* =========================================================
   CLAN-SYSTEM
   ========================================================= */

function getClanIndex() {
  const raw = world.getDynamicProperty("clan_index");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveClanIndex(arr) {
  world.setDynamicProperty("clan_index", JSON.stringify(arr));
}

function getNextClanId() {
  let n = world.getDynamicProperty("clan_next_id");
  if (typeof n !== "number") n = 0;
  world.setDynamicProperty("clan_next_id", n + 1);
  return n + 1;
}

function getClan(id) {
  const raw = world.getDynamicProperty("clan_" + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveClan(id, obj) {
  world.setDynamicProperty("clan_" + id, JSON.stringify(obj));
  requestDashboardRefresh(); // Tag/Farbe kann sich geändert haben - sofort sichtbar machen
}

function deleteClanData(id) {
  world.setDynamicProperty("clan_" + id, undefined);
}

// Schnellzugriff: welchem Clan gehört ein Spieler an? (Name -> Clan-ID)
function getPlayerClanId(playerName) {
  const raw = world.getDynamicProperty("playerclan_" + sanitizeName(playerName));
  return typeof raw === "number" ? raw : null;
}

function setPlayerClanId(playerName, clanId) {
  const key = "playerclan_" + sanitizeName(playerName);
  if (clanId === null || clanId === undefined) {
    world.setDynamicProperty(key, undefined);
  } else {
    world.setDynamicProperty(key, clanId);
  }
  requestDashboardRefresh(); // Beitritt/Austritt/Kick sofort sichtbar machen
}

function getPlayerClan(playerName) {
  const id = getPlayerClanId(playerName);
  if (id === null) return null;
  const clan = getClan(id);
  if (!clan) return null;
  return clan;
}

function isClanTagTaken(tag, excludeId) {
  const index = getClanIndex();
  const norm = tag.toLowerCase();
  for (const id of index) {
    if (id === excludeId) continue;
    const c = getClan(id);
    if (c && c.tag.toLowerCase() === norm) return true;
  }
  return false;
}

function formatClanTag(clan) {
  if (!clan) return "";
  return `${clan.color}[${clan.tag}]§r`;
}

// Baut den anzuzeigenden Namen (Nametag über dem Kopf) aus echtem Namen + Clan-Tag zusammen.
function buildDisplayNameFor(player) {
  const clan = getPlayerClan(player.name);
  if (!clan) return player.name;
  const tagPart = formatClanTag(clan);
  return CONFIG.CLAN_TAG_POSITION === "left" ? `${tagPart} ${player.name}` : `${player.name} ${tagPart}`;
}

function refreshNameTag(player) {
  try {
    player.nameTag = buildDisplayNameFor(player);
  } catch (e) {
    console.warn("[Marktplatz] Fehler beim Setzen des Nametags: " + e);
  }
}

function refreshAllOnlineNameTags() {
  for (const p of world.getPlayers()) {
    refreshNameTag(p);
  }
}

function showClanMenu(player) {
  const clan = getPlayerClan(player.name);
  const form = new ActionFormData().title("Clans");

  if (!clan) {
    form
      .body("Du bist aktuell in keinem Clan.")
      .button("➕ Clan gründen")
      .button("📨 Beitrittsanfrage stellen")
      .button("📋 Clan-Liste")
      .button("Zurück zum Hauptmenü");

    form.show(player).then((res) => {
      if (res.canceled) return;
      switch (res.selection) {
        case 0:
          showCreateClanForm(player);
          break;
        case 1:
          showClanJoinTargetSelect(player);
          break;
        case 2:
          showClanListMenu(player);
          break;
        case 3:
          showMainMenu(player);
          break;
      }
    });
    return;
  }

  const isLeader = clan.leader === player.name;
  form.body(
    `Dein Clan: §f${clan.name} ${formatClanTag(clan)}§r\nAnführer: ${clan.leader}\nMitglieder: ${clan.members.length}` +
      (isLeader && clan.joinRequests.length > 0 ? `\n§e${clan.joinRequests.length} offene Beitrittsanfrage(n)` : "")
  );
  form.button("👥 Mitglieder");
  if (isLeader) {
    form.button(`📨 Beitrittsanfragen (${clan.joinRequests.length})`);
    form.button("🎨 Tag-Farbe ändern");
    form.button("🗑️ Clan auflösen");
  } else {
    form.button("🚪 Clan verlassen");
  }
  form.button("Zurück zum Hauptmenü");

  form.show(player).then((res) => {
    if (res.canceled) return;
    let idx = res.selection;
    if (idx === 0) {
      showClanMembers(player, clan.id);
      return;
    }
    idx--;
    if (isLeader) {
      if (idx === 0) {
        showClanJoinRequests(player, clan.id);
        return;
      }
      if (idx === 1) {
        showClanColorPicker(player, clan.id);
        return;
      }
      if (idx === 2) {
        confirmDisbandClan(player, clan.id);
        return;
      }
    } else {
      if (idx === 0) {
        leaveClan(player, clan.id);
        return;
      }
    }
    showMainMenu(player);
  });
}

function showCreateClanForm(player) {
  new ModalFormData()
    .title("Clan gründen")
    .textField("Clan-Name (voller Name)", "z.B. Die Nachtwache", { defaultValue: "" })
    .textField(`Clan-Tag/Kürzel (${CONFIG.CLAN_TAG_MIN_LENGTH}-${CONFIG.CLAN_TAG_MAX_LENGTH} Zeichen)`, "z.B. NACHT", { defaultValue: "" })
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      const name = (res.formValues[0] || "").trim();
      const tag = (res.formValues[1] || "").trim().toUpperCase();

      if (getPlayerClan(player.name)) {
        player.sendMessage("§cDu bist bereits in einem Clan.");
        return;
      }
      if (!name) {
        player.sendMessage("§cBitte gib einen Clan-Namen ein.");
        return;
      }
      if (tag.length < CONFIG.CLAN_TAG_MIN_LENGTH || tag.length > CONFIG.CLAN_TAG_MAX_LENGTH) {
        player.sendMessage(`§cDas Tag muss ${CONFIG.CLAN_TAG_MIN_LENGTH}-${CONFIG.CLAN_TAG_MAX_LENGTH} Zeichen lang sein.`);
        return;
      }
      if (!/^[A-Za-z0-9]+$/.test(tag)) {
        player.sendMessage("§cDas Tag darf nur Buchstaben und Zahlen enthalten.");
        return;
      }
      if (isClanTagTaken(tag)) {
        player.sendMessage("§cDieses Tag ist bereits vergeben.");
        return;
      }

      const id = getNextClanId();
      const clan = {
        id,
        name,
        tag,
        color: "§f",
        leader: player.name,
        members: [player.name],
        joinRequests: [],
        created: Date.now(),
      };
      saveClan(id, clan);
      const index = getClanIndex();
      index.push(id);
      saveClanIndex(index);
      setPlayerClanId(player.name, id);
      refreshNameTag(player);

      player.sendMessage(`§aClan "${name}" ${formatClanTag(clan)} gegründet!`);
      showClanMenu(player);
    })
    .catch((e) => {
      console.warn("[Marktplatz] Fehler beim Clan-Erstellen-Formular: " + e);
      player.sendMessage(`§c[Marktplatz-Fehler] ${e}`);
    });
}

function showClanListMenu(player) {
  const index = getClanIndex();
  const form = new ActionFormData().title("Clan-Liste").body(index.length === 0 ? "Es gibt noch keine Clans." : "Alle bestehenden Clans:");
  const clans = index.map(getClan).filter(Boolean);
  for (const c of clans) {
    form.button(`§f${c.name} ${formatClanTag(c)}§r\n§7Anführer: ${c.leader} · ${c.members.length} Mitglied(er)§r`);
  }
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= clans.length) {
      showClanMenu(player);
      return;
    }
    showClanMenu(player);
  });
}

function showClanJoinTargetSelect(player) {
  const index = getClanIndex();
  const clans = index.map(getClan).filter(Boolean);
  const form = new ActionFormData().title("Beitrittsanfrage").body("Wähle einen Clan, dem du beitreten möchtest:");
  for (const c of clans) {
    form.button(`§f${c.name} ${formatClanTag(c)}§r\n§7Anführer: ${c.leader} · ${c.members.length} Mitglied(er)§r`);
  }
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= clans.length) {
      showClanMenu(player);
      return;
    }
    const clan = clans[res.selection];
    if (getPlayerClan(player.name)) {
      player.sendMessage("§cDu bist bereits in einem Clan.");
      return;
    }
    if (clan.joinRequests.includes(player.name)) {
      player.sendMessage("§cDu hast bereits eine offene Beitrittsanfrage für diesen Clan.");
      return;
    }
    clan.joinRequests.push(player.name);
    saveClan(clan.id, clan);
    player.sendMessage(`§aBeitrittsanfrage an "${clan.name}" gesendet.`);
    const leaderOnline = world.getPlayers({ name: clan.leader })[0];
    if (leaderOnline) {
      leaderOnline.sendMessage(`§e[Clan] ${player.name} möchte deinem Clan "${clan.name}" beitreten.`);
    }
  });
}

function showClanJoinRequests(player, clanId) {
  const clan = getClan(clanId);
  if (!clan || clan.leader !== player.name) {
    showClanMenu(player);
    return;
  }
  const form = new ActionFormData()
    .title("Beitrittsanfragen")
    .body(clan.joinRequests.length === 0 ? "Keine offenen Anfragen." : "Auswählen zum Annehmen/Ablehnen:");
  for (const name of clan.joinRequests) {
    form.button(name);
  }
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= clan.joinRequests.length) {
      showClanMenu(player);
      return;
    }
    const applicant = clan.joinRequests[res.selection];
    new ActionFormData()
      .title(applicant)
      .body(`Beitrittsanfrage von ${applicant} zu "${clan.name}"`)
      .button("✅ Annehmen")
      .button("❌ Ablehnen")
      .button("Zurück")
      .show(player)
      .then((res2) => {
        if (res2.canceled) return;
        const fresh = getClan(clanId);
        if (!fresh) {
          showClanMenu(player);
          return;
        }
        fresh.joinRequests = fresh.joinRequests.filter((n) => n !== applicant);
        if (res2.selection === 0) {
          if (getPlayerClan(applicant)) {
            player.sendMessage(`§c${applicant} ist inzwischen bereits in einem anderen Clan.`);
          } else {
            fresh.members.push(applicant);
            setPlayerClanId(applicant, clanId);
            const applicantOnline = world.getPlayers({ name: applicant })[0];
            if (applicantOnline) {
              refreshNameTag(applicantOnline);
              applicantOnline.sendMessage(`§aDu wurdest in den Clan "${fresh.name}" aufgenommen!`);
            }
            player.sendMessage(`§a${applicant} wurde aufgenommen.`);
          }
        } else if (res2.selection === 1) {
          player.sendMessage(`§7Beitrittsanfrage von ${applicant} abgelehnt.`);
        }
        saveClan(clanId, fresh);
        showClanJoinRequests(player, clanId);
      });
  });
}

function showClanMembers(player, clanId) {
  const clan = getClan(clanId);
  if (!clan) {
    showClanMenu(player);
    return;
  }
  const isLeader = clan.leader === player.name;
  const form = new ActionFormData().title("Mitglieder").body(`Clan: ${clan.name} ${formatClanTag(clan)}`);
  for (const m of clan.members) {
    form.button(m === clan.leader ? `👑 ${m}` : m);
  }
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= clan.members.length) {
      showClanMenu(player);
      return;
    }
    const target = clan.members[res.selection];
    if (!isLeader || target === player.name) {
      showClanMembers(player, clanId);
      return;
    }
    new MessageFormData()
      .title(target)
      .body(`${target} aus dem Clan werfen?`)
      .button1("Ja, rauswerfen")
      .button2("Abbrechen")
      .show(player)
      .then((res2) => {
        if (res2.canceled || res2.selection !== 0) {
          showClanMembers(player, clanId);
          return;
        }
        kickClanMember(player, clanId, target);
      });
  });
}

function kickClanMember(player, clanId, targetName) {
  const clan = getClan(clanId);
  if (!clan || clan.leader !== player.name) {
    showClanMenu(player);
    return;
  }
  clan.members = clan.members.filter((m) => m !== targetName);
  saveClan(clanId, clan);
  setPlayerClanId(targetName, null);
  const targetOnline = world.getPlayers({ name: targetName })[0];
  if (targetOnline) {
    refreshNameTag(targetOnline);
    targetOnline.sendMessage(`§cDu wurdest aus dem Clan "${clan.name}" entfernt.`);
  }
  player.sendMessage(`§a${targetName} wurde aus dem Clan entfernt.`);
  showClanMembers(player, clanId);
}

function leaveClan(player, clanId) {
  const clan = getClan(clanId);
  if (!clan) {
    showClanMenu(player);
    return;
  }
  if (clan.leader === player.name) {
    player.sendMessage("§cAls Anführer kannst du den Clan nur auflösen, nicht verlassen.");
    showClanMenu(player);
    return;
  }
  clan.members = clan.members.filter((m) => m !== player.name);
  saveClan(clanId, clan);
  setPlayerClanId(player.name, null);
  refreshNameTag(player);
  player.sendMessage(`§7Du hast den Clan "${clan.name}" verlassen.`);
  showMainMenu(player);
}

function confirmDisbandClan(player, clanId) {
  const clan = getClan(clanId);
  if (!clan || clan.leader !== player.name) {
    showClanMenu(player);
    return;
  }
  new MessageFormData()
    .title("Clan auflösen")
    .body(`"${clan.name}" wirklich auflösen? Alle Mitglieder verlieren den Clan-Tag. Dies kann nicht rückgängig gemacht werden.`)
    .button1("Ja, auflösen")
    .button2("Abbrechen")
    .show(player)
    .then((res) => {
      if (res.canceled || res.selection !== 0) {
        showClanMenu(player);
        return;
      }
      disbandClan(player, clanId);
    });
}

function disbandClan(player, clanId) {
  const clan = getClan(clanId);
  if (!clan) {
    showMainMenu(player);
    return;
  }
  for (const m of clan.members) {
    setPlayerClanId(m, null);
    const online = world.getPlayers({ name: m })[0];
    if (online) {
      refreshNameTag(online);
      if (m !== player.name) online.sendMessage(`§cDer Clan "${clan.name}" wurde aufgelöst.`);
    }
  }
  const index = getClanIndex().filter((x) => x !== clanId);
  saveClanIndex(index);
  deleteClanData(clanId);
  player.sendMessage(`§7Clan "${clan.name}" aufgelöst.`);
  showMainMenu(player);
}

function showClanColorPicker(player, clanId) {
  const clan = getClan(clanId);
  if (!clan || clan.leader !== player.name) {
    showClanMenu(player);
    return;
  }
  const form = new ActionFormData().title("Tag-Farbe wählen").body("Wähle eine neue Farbe für dein Clan-Tag:");
  for (const c of CLAN_COLORS) {
    form.button(`${c.code}${c.name} [${clan.tag}]§r`);
  }
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= CLAN_COLORS.length) {
      showClanMenu(player);
      return;
    }
    const fresh = getClan(clanId);
    if (!fresh) {
      showMainMenu(player);
      return;
    }
    fresh.color = CLAN_COLORS[res.selection].code;
    saveClan(clanId, fresh);
    for (const m of fresh.members) {
      const online = world.getPlayers({ name: m })[0];
      if (online) refreshNameTag(online);
    }
    player.sendMessage(`§aTag-Farbe geändert zu ${CLAN_COLORS[res.selection].name}.`);
    showClanMenu(player);
  });
}

// Hinweis: Eine Chat-Präfix-Variante über world.beforeEvents.chatSend (oder die separaten
// Player.chatNamePrefix/chatMessagePrefix-Properties) wurde bewusst NICHT eingebaut - all diese
// APIs tragen in der offiziellen Doku selbst im "stable"-Bereich den Hinweis "still in pre-release"
// und verhalten sich faktisch wie Beta-APIs, was gegen die Vorgabe "keine Beta-APIs" verstößt.
// Der Clan-Tag wird daher AUSSCHLIESSLICH über das Nametag (player.nameTag, stabile API) angezeigt.
// Wichtig: player.nameTag ändert NUR die Anzeige über dem Kopf/in der Spielerliste, NICHT den
// Namen im Chat - im Chat-Fenster steht weiterhin der normale Spielername ohne Clan-Tag.

/* =========================================================
   RTP-SYSTEM (Zufalls-Teleport)
   Zufällige X/Z-Koordinaten im Ring um den Welt-Spawn, Ziel ist der
   HIMMEL (RTP_SKY_Y). Statt einen sicheren Landeplatz zu suchen, bekommt
   man für RTP_RESISTANCE_TICKS den Effekt Resistenz (Stufe
   RTP_RESISTANCE_AMPLIFIER) und fällt geschützt zu Boden.
   ========================================================= */

function sanitizeRtpKey(playerName) {
  return sanitizeName(playerName);
}

function getRtpCooldownUntil(playerName) {
  const until = world.getDynamicProperty("rtp_cd_" + sanitizeRtpKey(playerName));
  return typeof until === "number" ? until : 0;
}

function setRtpCooldownNow(playerName) {
  // 1 Tick = 50ms
  world.setDynamicProperty("rtp_cd_" + sanitizeRtpKey(playerName), Date.now() + CONFIG.RTP_COOLDOWN_TICKS * 50);
}

// Setzt den Resistenz-Schutz. Gibt false zurück, wenn er nicht gesetzt werden konnte
// (dann wird NICHT teleportiert, sonst gäbe es Fallschaden aus großer Höhe).
function applyRtpProtection(player) {
  try {
    player.addEffect("resistance", CONFIG.RTP_RESISTANCE_TICKS, { amplifier: CONFIG.RTP_RESISTANCE_AMPLIFIER, showParticles: false });
    return true;
  } catch (e) {
    console.warn("[Marktplatz] RTP: Resistenz mit Stufe " + CONFIG.RTP_RESISTANCE_AMPLIFIER + " nicht setzbar, versuche Stufe 4: " + e);
  }
  try {
    player.addEffect("resistance", CONFIG.RTP_RESISTANCE_TICKS, { amplifier: 4, showParticles: false });
    return true;
  } catch (e) {
    console.warn("[Marktplatz] RTP: Resistenz nicht setzbar: " + e);
    return false;
  }
}

function performRtp(player, attemptsLeft) {
  if (attemptsLeft === undefined) attemptsLeft = CONFIG.RTP_MAX_ATTEMPTS;
  if (attemptsLeft <= 0) {
    player.sendMessage("§cRTP fehlgeschlagen. Bitte versuche es später erneut.");
    try {
      player.onScreenDisplay.setActionBar("§cRTP fehlgeschlagen");
    } catch {}
    return;
  }

  let dimension;
  try {
    dimension = world.getDimension("overworld");
  } catch (e) {
    player.sendMessage("§cRTP fehlgeschlagen (Dimension nicht verfügbar).");
    return;
  }

  const spawn = world.getDefaultSpawnLocation();
  const angle = Math.random() * Math.PI * 2;
  const dist = CONFIG.RTP_MIN_RADIUS + Math.random() * (CONFIG.RTP_MAX_RADIUS - CONFIG.RTP_MIN_RADIUS);
  const x = Math.round(spawn.x + Math.cos(angle) * dist);
  const z = Math.round(spawn.z + Math.sin(angle) * dist);
  let maxY = 320;
  try {
    maxY = dimension.heightRange.max;
  } catch {}
  const y = Math.min(CONFIG.RTP_SKY_Y, maxY - 2);

  // 1) Schutz ZUERST setzen - klappt das nicht, wird gar nicht teleportiert
  if (!applyRtpProtection(player)) {
    player.sendMessage("§c[Marktplatz-Fehler] RTP abgebrochen: Der Schutz-Effekt konnte nicht gesetzt werden.");
    return;
  }

  // 2) In den Himmel teleportieren
  try {
    player.teleport({ x: x + 0.5, y, z: z + 0.5 }, { dimension });
  } catch (e) {
    console.warn("[Marktplatz] RTP-Teleport fehlgeschlagen: " + e);
    try {
      player.removeEffect("resistance");
    } catch {}
    performRtp(player, attemptsLeft - 1);
    return;
  }

  try {
    player.extinguishFire(true);
  } catch {}
  setRtpCooldownNow(player.name);
  const seconds = Math.round(CONFIG.RTP_RESISTANCE_TICKS / 20);
  player.sendMessage(`§aRTP! Du fällst bei ${x}, ${z} vom Himmel - Resistenz schützt dich ${seconds} Sekunden lang.`);
  try {
    player.onScreenDisplay.setActionBar("§a✔ RTP erfolgreich!");
  } catch {}
}

const activeRtp = new Map();

function startRtp(player) {
  if (activeHomeTeleports.has(player.id) || activeRtp.has(player.id)) {
    player.sendMessage("§cDu teleportierst bereits.");
    return;
  }
  const cooldownUntil = getRtpCooldownUntil(player.name);
  const remainingMs = cooldownUntil - Date.now();
  if (remainingMs > 0) {
    const remainingSec = Math.ceil(remainingMs / 1000);
    const min = Math.floor(remainingSec / 60);
    const sec = remainingSec % 60;
    player.sendMessage(`§cRTP ist noch ${min}m ${sec}s im Cooldown.`);
    return;
  }

  const loc = player.location;
  const totalSeconds = Math.round(CONFIG.RTP_TELEPORT_DELAY_TICKS / 20);
  activeRtp.set(player.id, {
    player,
    lastLoc: { x: loc.x, y: loc.y, z: loc.z },
    elapsedTicks: 0,
  });
  player.sendMessage(`§eZufalls-Teleport in ${totalSeconds} Sekunden. Nicht bewegen und nicht kämpfen!`);
  try {
    player.onScreenDisplay.setActionBar(`§e🎲 RTP in §f${totalSeconds}§e...`);
  } catch {}
}

function cancelRtp(id, reasonMessage) {
  const state = activeRtp.get(id);
  if (!state) return;
  activeRtp.delete(id);
  state.player.sendMessage(reasonMessage);
  try {
    state.player.onScreenDisplay.setActionBar("§cRTP abgebrochen");
  } catch {}
}

system.runInterval(() => {
  for (const [id, state] of activeRtp) {
    const p = state.player;
    let loc;
    try {
      loc = p.location;
    } catch {
      activeRtp.delete(id);
      continue;
    }

    const dx = loc.x - state.lastLoc.x;
    const dy = loc.y - state.lastLoc.y;
    const dz = loc.z - state.lastLoc.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq > 0.0001) {
      cancelRtp(id, "§cRTP abgebrochen - du hast dich bewegt.");
      continue;
    }

    state.elapsedTicks += CONFIG.HOME_CHECK_INTERVAL_TICKS;
    state.lastLoc = { x: loc.x, y: loc.y, z: loc.z };

    if (state.elapsedTicks >= CONFIG.RTP_TELEPORT_DELAY_TICKS) {
      activeRtp.delete(id);
      performRtp(p);
    } else {
      const remainingSeconds = Math.ceil((CONFIG.RTP_TELEPORT_DELAY_TICKS - state.elapsedTicks) / 20);
      try {
        p.onScreenDisplay.setActionBar(`§e🎲 RTP in §f${remainingSeconds}§e...`);
      } catch {}
    }
  }
}, CONFIG.HOME_CHECK_INTERVAL_TICKS);

world.afterEvents.playerLeave.subscribe((event) => {
  activeRtp.delete(event.playerId);
});

world.afterEvents.entityHurt.subscribe((event) => {
  const hurtId = event.hurtEntity?.id;
  if (!hurtId) return;
  cancelRtp(hurtId, "§cRTP abgebrochen - du hast Schaden erhalten.");
});

/* =========================================================
   BESTENLISTEN
   ========================================================= */

// Liefert ALLE echten Spieler (auch offline) mit ihrem money-Score, absteigend sortiert.
// FakePlayer-Einträge werden ausgeschlossen (Altlasten/Diagnose-Testeinträge, siehe oben).
//
// Zusätzlich: für ONLINE Spieler wird der Score bewusst direkt über das live Player-Objekt
// gelesen (exakt dieselbe Methode, die auch beim Kaufen/Verkaufen im AH/Order verwendet
// wird) statt über die Teilnehmerliste. Grund: vereinzelt legt Bedrock für denselben Account
// eine zweite, verwaiste "Player"-Scoreboard-Identität mit demselben angezeigten Namen an
// (z.B. nach Plattform-/Account-Eigenheiten) - die Teilnehmerliste kann dann fälschlich
// zuerst diese veraltete Identität statt der echten liefern, wodurch die Bestenliste einen
// völlig falschen, zusammenhanglosen Wert zeigt, obwohl AH/Order (die den echten Spieler
// direkt ansprechen) korrekt sind.
// Für OFFLINE Spieler mit einer solchen seltenen Namens-Dopplung gibt es keine zweifelsfrei
// "richtige" Identität mehr zu bestimmen - hier wird als Vermutung der höhere der beiden
// Werte übernommen, damit kein Guthaben scheinbar verschwindet.
function getMoneyLeaderboard() {
  const obj = getMoneyObjective();
  if (!obj) return [];
  let participants;
  try {
    participants = obj.getParticipants();
  } catch (e) {
    console.warn("[Marktplatz] Fehler beim Lesen der Scoreboard-Teilnehmer: " + e);
    return [];
  }

  const byName = new Map(); // displayName -> { name, score }

  // Zuerst: alle ONLINE Spieler direkt über ihr Player-Objekt (verlässlich, keine Ambiguität).
  for (const op of world.getPlayers()) {
    let score;
    try {
      score = obj.getScore(op);
    } catch {
      continue;
    }
    if (typeof score !== "number") continue;
    byName.set(op.name, { name: op.name, score });
  }

  // Dann: restliche (offline) echte Spieler-Identitäten aus der Teilnehmerliste.
  for (const p of participants) {
    if (String(p.type) !== "Player") continue;
    if (byName.has(p.displayName)) continue; // bereits über Online-Spieler abgedeckt
    let score;
    try {
      score = obj.getScore(p);
    } catch {
      continue;
    }
    if (typeof score !== "number") continue;
    const existing = byName.get(p.displayName);
    if (!existing || score > existing.score) {
      byName.set(p.displayName, { name: p.displayName, score });
    }
  }

  const rows = [...byName.values()];
  rows.sort((a, b) => b.score - a.score);
  return rows;
}

function showLeaderboardMenu(player) {
  new ActionFormData()
    .title("🏆 Bestenlisten")
    .body("Wähle eine Bestenliste:")
    .button("💰 Reichste Spieler")
    .button("🎯 Höchstes Kopfgeld")
    .button("Zurück zum Hauptmenü")
    .show(player)
    .then((res) => {
      if (res.canceled) return;
      switch (res.selection) {
        case 0:
          showMoneyLeaderboard(player);
          break;
        case 1:
          showBountyLeaderboard(player);
          break;
        case 2:
          showMainMenu(player);
          break;
      }
    });
}

function showMoneyLeaderboard(player) {
  const rows = getMoneyLeaderboard();
  const form = new ActionFormData().title("💰 Reichste Spieler").body(rows.length === 0 ? "Noch keine Einträge." : "Sortiert nach Guthaben (alle Spieler, auch offline):");
  rows.forEach((r, i) => {
    form.button(`#${i + 1} ${r.name}\n§7${r.score} ${CONFIG.MONEY_OBJECTIVE}§r`);
  });
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    showLeaderboardMenu(player);
  });
}

// Nutzt die bereits vorhandene getBountyTotals()-Logik aus dem Bounty-System
// (gleiche Zusammenfassung wie in der "Bounty-Liste (öffentlich)"-Ansicht dort).
function showBountyLeaderboard(player) {
  const totals = getBountyTotals();
  const sorted = [...totals.entries()].sort((a, b) => b[1].total - a[1].total);

  const form = new ActionFormData()
    .title("🎯 Höchstes Kopfgeld")
    .body(sorted.length === 0 ? "Aktuell keine aktiven Kopfgelder." : "Sortiert nach Gesamt-Kopfgeld pro Person (alle):");

  sorted.forEach(([target, data], i) => {
    form.button(`#${i + 1} ${target}\n§7${data.total} ${CONFIG.MONEY_OBJECTIVE} · ${data.entries.length} Kopfgeld(er)§r`);
  });
  form.button("Zurück");

  form.show(player).then((res) => {
    if (res.canceled) return;
    if (res.selection >= sorted.length) {
      showLeaderboardMenu(player);
      return;
    }
    const [target, data] = sorted[res.selection];
    const breakdown = data.entries.map((e) => `${e.placer}: ${e.amount} ${CONFIG.MONEY_OBJECTIVE}`).join("\n");
    new MessageFormData()
      .title(target)
      .body(`Gesamt-Kopfgeld: ${data.total} ${CONFIG.MONEY_OBJECTIVE}\n\nAufgeteilt auf:\n${breakdown}\n\nEinlösbar nur durch PvP-Kill.`)
      .button1("OK")
      .button2("Zurück")
      .show(player)
      .then(() => showBountyLeaderboard(player));
  });
}

/* =========================================================
   EVENTS
   ========================================================= */

// Slash-Befehl /marktplatz:menu als zweiter Weg zum Hauptmenü, zusätzlich zum Kompass.
// (Ein bloßes "!menu" im normalen Chat würde world.beforeEvents.chatSend voraussetzen - das trägt
// in der offiziellen Doku weiterhin den Hinweis "still in pre-release" und ist deshalb tabu.)
system.beforeEvents.startup.subscribe((init) => {
  init.customCommandRegistry.registerCommand(
    {
      name: "marktplatz:menu",
      description: "Öffnet das Marktplatz-Hauptmenü (wie der Kompass).",
      permissionLevel: CommandPermissionLevel.Any,
    },
    (origin) => {
      const player = origin.sourceEntity;
      if (!player || !("getComponent" in player) || player.typeId !== "minecraft:player") {
        return { status: CustomCommandStatus.Failure, message: "Nur von einem Spieler aus nutzbar." };
      }
      // Formulare (ActionFormData etc.) sind eine Gameplay-Aktion und dürfen im
      // restricted-execution-Kontext des Command-Callbacks nicht direkt aufgerufen werden.
      system.run(() => {
        try {
          showMainMenu(player);
        } catch (e) {
          console.warn("[Marktplatz] /marktplatz:menu fehlgeschlagen: " + e);
        }
      });
      return { status: CustomCommandStatus.Success };
    }
  );
});

world.afterEvents.itemUse.subscribe((event) => {
  const { source: player, itemStack } = event;
  if (itemStack.typeId !== CONFIG.TRIGGER_ITEM) return;
  showMainMenu(player);
});

world.afterEvents.playerLeave.subscribe(() => {
  // Spieler ist zu diesem Zeitpunkt schon aus world.getPlayers() draußen -> sofort entfernen.
  requestDashboardRefresh();
});

world.afterEvents.playerSpawn.subscribe((event) => {
  refreshNameTag(event.player);
  requestDashboardRefresh(); // neuer/respawnter Spieler sofort in der Sidebar sichtbar machen
  if (!event.initialSpawn) return;
  const player = event.player;
  system.runTimeout(() => {
    try {
      claimPendingMoney(player);
    } catch (e) {
      console.warn("[Marktplatz] Fehler beim Gutschreiben von vorgemerktem Guthaben: " + e);
    }
  }, 40);
  const mail = getPostfach(player.name);
  if (mail.length > 0) {
    system.runTimeout(() => {
      player.sendMessage(
        `§e[Marktplatz] Du hast ${mail.length} Gegenstände im Postfach! Benutze ${CONFIG.TRIGGER_ITEM} und öffne "Postfach", um sie abzuholen.`
      );
    }, 60);
  }
});
