/** Languages and texts. English is the base: any key missing in another language falls back to English. */

export const LANGS = [
  { id: "en", label: "English", speech: "en-US", ai: "English" },
  { id: "es", label: "Español", speech: "es-ES", ai: "Spanish" },
  { id: "fr", label: "Français", speech: "fr-FR", ai: "French" },
  { id: "de", label: "Deutsch", speech: "de-DE", ai: "German" },
  { id: "pt", label: "Português", speech: "pt-BR", ai: "Brazilian Portuguese" },
  { id: "ja", label: "日本語", speech: "ja-JP", ai: "Japanese" },
  { id: "zh", label: "中文", speech: "zh-CN", ai: "Simplified Chinese" },
] as const;

export type Lang = (typeof LANGS)[number]["id"];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "lang";

export function isLang(value: unknown): value is Lang {
  return LANGS.some((item) => item.id === value);
}

const en = {
  "lang.label": "Language",
  "nav.play": "Play",
  "nav.puzzles": "Puzzles",
  "nav.lessons": "Lessons",
  "nav.online": "Online",
  "nav.analyse": "Analyse",
  "nav.players": "Players",
  "nav.owner": "Owner panel",
  "nav.profile": "Profile",
  "nav.logout": "Log out",
  "nav.login": "Log in",
  "nav.signup": "Sign up",
  "land.badge": "AI chess tutor",
  "land.title": "Learn chess with a talking tutor.",
  "land.sub": "Lessons, puzzles and a tutor that talks.",
  "land.create": "Create free account",
  "land.playNow": "Play now",
  "feat.play": "Play the computer or a friend.",
  "feat.puzzles": "Solve tactics with hints.",
  "feat.lessons": "Learn step by step.",
  "feat.analyse": "Find your mistakes.",
  "hub.play": "Play",
  "hub.playSub": "A bot or a person",
  "hub.bot": "Play a bot",
  "hub.botSub": "Pick how strong it is.",
  "hub.online": "Play online",
  "hub.onlineSub": "Other players on Checkm8.",
  "hub.same": "Same screen",
  "hub.sameSub": "Two players, one device.",
  "hub.level": "Bot level",
  "hub.youPlay": "You play",
  "hub.start": "Start game",
  "hub.continue": "Continue learning",
  "hub.puzzlesSub": "Solve tactics.",
  "hub.lessonsSub": "Learn step by step.",
  "hub.analyseSub": "Review a game.",
  "hub.profileSub": "Themes and settings.",
  "level.0": "Beginner",
  "level.1": "Casual",
  "level.2": "Club",
  "level.3": "Strong",
  "level.4": "Maximum",
  "color.w": "White",
  "color.b": "Black",
  "dash.welcome": "Welcome, {name}",
  "dash.ask": "What do you want to do?",
  "stat.games": "Games played",
  "stat.wins": "Wins",
  "stat.losses": "Losses",
  "stat.draws": "Draws",
  "stat.puzzles": "Puzzles solved",
  "stat.lessons": "Lessons completed",
  "game.moves": "Moves",
  "game.pieces": "Pieces",
  "game.setup": "Setup",
  "game.flip": "Flip",
  "game.best": "Best move",
  "game.hide": "Hide hint",
  "game.resign": "Resign",
  "game.new": "New game",
  "game.voiceOn": "Voice on",
  "game.voiceOff": "Voice off",
  "game.noMoves": "No moves yet.",
  "game.computer": "Computer",
  "game.pvp": "Two players",
} as const;

export type MessageKey = keyof typeof en;
type Dict = Record<MessageKey, string>;

const es: Dict = {
  "lang.label": "Idioma",
  "nav.play": "Jugar", "nav.puzzles": "Problemas", "nav.lessons": "Lecciones", "nav.online": "En línea", "nav.analyse": "Analizar", "nav.players": "Jugadores", "nav.owner": "Panel del dueño", "nav.profile": "Perfil", "nav.logout": "Cerrar sesión", "nav.login": "Iniciar sesión", "nav.signup": "Registrarse",
  "land.badge": "Tutor de ajedrez con IA", "land.title": "Aprende ajedrez con un tutor que habla.", "land.sub": "Lecciones, problemas y un tutor que habla.", "land.create": "Crear cuenta gratis", "land.playNow": "Jugar ahora",
  "feat.play": "Juega contra la computadora o un amigo.", "feat.puzzles": "Resuelve tácticas con pistas.", "feat.lessons": "Aprende paso a paso.", "feat.analyse": "Encuentra tus errores.",
  "hub.play": "Jugar", "hub.playSub": "Un bot o una persona", "hub.bot": "Jugar contra un bot", "hub.botSub": "Elige su nivel.", "hub.online": "Jugar en línea", "hub.onlineSub": "Otros jugadores de Checkm8.", "hub.same": "Misma pantalla", "hub.sameSub": "Dos jugadores, un dispositivo.", "hub.level": "Nivel del bot", "hub.youPlay": "Juegas con", "hub.start": "Empezar partida", "hub.continue": "Seguir aprendiendo", "hub.puzzlesSub": "Resuelve tácticas.", "hub.lessonsSub": "Aprende paso a paso.", "hub.analyseSub": "Revisa una partida.", "hub.profileSub": "Temas y ajustes.",
  "level.0": "Principiante", "level.1": "Casual", "level.2": "Club", "level.3": "Fuerte", "level.4": "Máximo", "color.w": "Blancas", "color.b": "Negras",
  "dash.welcome": "Bienvenido, {name}", "dash.ask": "¿Qué quieres hacer?",
  "stat.games": "Partidas jugadas", "stat.wins": "Victorias", "stat.losses": "Derrotas", "stat.draws": "Tablas", "stat.puzzles": "Problemas resueltos", "stat.lessons": "Lecciones completadas",
  "game.moves": "Jugadas", "game.pieces": "Piezas", "game.setup": "Ajustes", "game.flip": "Girar", "game.best": "Mejor jugada", "game.hide": "Ocultar pista", "game.resign": "Rendirse", "game.new": "Nueva partida", "game.voiceOn": "Voz activada", "game.voiceOff": "Voz desactivada", "game.noMoves": "Aún no hay jugadas.", "game.computer": "Computadora", "game.pvp": "Dos jugadores",
};

const fr: Dict = {
  "lang.label": "Langue",
  "nav.play": "Jouer", "nav.puzzles": "Problèmes", "nav.lessons": "Leçons", "nav.online": "En ligne", "nav.analyse": "Analyser", "nav.players": "Joueurs", "nav.owner": "Panneau du propriétaire", "nav.profile": "Profil", "nav.logout": "Se déconnecter", "nav.login": "Se connecter", "nav.signup": "S'inscrire",
  "land.badge": "Tuteur d'échecs IA", "land.title": "Apprenez les échecs avec un tuteur qui parle.", "land.sub": "Leçons, problèmes et un tuteur qui parle.", "land.create": "Créer un compte gratuit", "land.playNow": "Jouer maintenant",
  "feat.play": "Jouez contre l'ordinateur ou un ami.", "feat.puzzles": "Résolvez des tactiques avec des indices.", "feat.lessons": "Apprenez pas à pas.", "feat.analyse": "Trouvez vos erreurs.",
  "hub.play": "Jouer", "hub.playSub": "Un bot ou une personne", "hub.bot": "Jouer contre un bot", "hub.botSub": "Choisissez sa force.", "hub.online": "Jouer en ligne", "hub.onlineSub": "Autres joueurs de Checkm8.", "hub.same": "Même écran", "hub.sameSub": "Deux joueurs, un appareil.", "hub.level": "Niveau du bot", "hub.youPlay": "Vous jouez", "hub.start": "Commencer la partie", "hub.continue": "Continuer à apprendre", "hub.puzzlesSub": "Résolvez des tactiques.", "hub.lessonsSub": "Apprenez pas à pas.", "hub.analyseSub": "Revoyez une partie.", "hub.profileSub": "Thèmes et réglages.",
  "level.0": "Débutant", "level.1": "Décontracté", "level.2": "Club", "level.3": "Fort", "level.4": "Maximum", "color.w": "Blancs", "color.b": "Noirs",
  "dash.welcome": "Bienvenue, {name}", "dash.ask": "Que voulez-vous faire ?",
  "stat.games": "Parties jouées", "stat.wins": "Victoires", "stat.losses": "Défaites", "stat.draws": "Nulles", "stat.puzzles": "Problèmes résolus", "stat.lessons": "Leçons terminées",
  "game.moves": "Coups", "game.pieces": "Pièces", "game.setup": "Réglages", "game.flip": "Tourner", "game.best": "Meilleur coup", "game.hide": "Masquer l'indice", "game.resign": "Abandonner", "game.new": "Nouvelle partie", "game.voiceOn": "Voix activée", "game.voiceOff": "Voix désactivée", "game.noMoves": "Aucun coup pour l'instant.", "game.computer": "Ordinateur", "game.pvp": "Deux joueurs",
};

const de: Dict = {
  "lang.label": "Sprache",
  "nav.play": "Spielen", "nav.puzzles": "Aufgaben", "nav.lessons": "Lektionen", "nav.online": "Online", "nav.analyse": "Analyse", "nav.players": "Spieler", "nav.owner": "Besitzer-Bereich", "nav.profile": "Profil", "nav.logout": "Abmelden", "nav.login": "Anmelden", "nav.signup": "Registrieren",
  "land.badge": "KI-Schachtrainer", "land.title": "Lerne Schach mit einem sprechenden Trainer.", "land.sub": "Lektionen, Aufgaben und ein Trainer, der spricht.", "land.create": "Kostenloses Konto erstellen", "land.playNow": "Jetzt spielen",
  "feat.play": "Spiele gegen den Computer oder einen Freund.", "feat.puzzles": "Löse Taktiken mit Hinweisen.", "feat.lessons": "Lerne Schritt für Schritt.", "feat.analyse": "Finde deine Fehler.",
  "hub.play": "Spielen", "hub.playSub": "Ein Bot oder eine Person", "hub.bot": "Gegen einen Bot spielen", "hub.botSub": "Wähle die Stärke.", "hub.online": "Online spielen", "hub.onlineSub": "Andere Spieler auf Checkm8.", "hub.same": "Gleicher Bildschirm", "hub.sameSub": "Zwei Spieler, ein Gerät.", "hub.level": "Bot-Stufe", "hub.youPlay": "Du spielst", "hub.start": "Partie starten", "hub.continue": "Weiterlernen", "hub.puzzlesSub": "Löse Taktiken.", "hub.lessonsSub": "Lerne Schritt für Schritt.", "hub.analyseSub": "Eine Partie auswerten.", "hub.profileSub": "Designs und Einstellungen.",
  "level.0": "Anfänger", "level.1": "Gelegenheitsspieler", "level.2": "Verein", "level.3": "Stark", "level.4": "Maximum", "color.w": "Weiß", "color.b": "Schwarz",
  "dash.welcome": "Willkommen, {name}", "dash.ask": "Was möchtest du tun?",
  "stat.games": "Gespielte Partien", "stat.wins": "Siege", "stat.losses": "Niederlagen", "stat.draws": "Remis", "stat.puzzles": "Gelöste Aufgaben", "stat.lessons": "Abgeschlossene Lektionen",
  "game.moves": "Züge", "game.pieces": "Figuren", "game.setup": "Einstellungen", "game.flip": "Drehen", "game.best": "Bester Zug", "game.hide": "Hinweis ausblenden", "game.resign": "Aufgeben", "game.new": "Neue Partie", "game.voiceOn": "Stimme an", "game.voiceOff": "Stimme aus", "game.noMoves": "Noch keine Züge.", "game.computer": "Computer", "game.pvp": "Zwei Spieler",
};

const pt: Dict = {
  "lang.label": "Idioma",
  "nav.play": "Jogar", "nav.puzzles": "Problemas", "nav.lessons": "Aulas", "nav.online": "Online", "nav.analyse": "Analisar", "nav.players": "Jogadores", "nav.owner": "Painel do dono", "nav.profile": "Perfil", "nav.logout": "Sair", "nav.login": "Entrar", "nav.signup": "Cadastrar",
  "land.badge": "Tutor de xadrez com IA", "land.title": "Aprenda xadrez com um tutor que fala.", "land.sub": "Aulas, problemas e um tutor que fala.", "land.create": "Criar conta grátis", "land.playNow": "Jogar agora",
  "feat.play": "Jogue contra o computador ou um amigo.", "feat.puzzles": "Resolva táticas com dicas.", "feat.lessons": "Aprenda passo a passo.", "feat.analyse": "Encontre seus erros.",
  "hub.play": "Jogar", "hub.playSub": "Um bot ou uma pessoa", "hub.bot": "Jogar contra um bot", "hub.botSub": "Escolha a força dele.", "hub.online": "Jogar online", "hub.onlineSub": "Outros jogadores do Checkm8.", "hub.same": "Mesma tela", "hub.sameSub": "Dois jogadores, um aparelho.", "hub.level": "Nível do bot", "hub.youPlay": "Você joga de", "hub.start": "Começar partida", "hub.continue": "Continuar aprendendo", "hub.puzzlesSub": "Resolva táticas.", "hub.lessonsSub": "Aprenda passo a passo.", "hub.analyseSub": "Revise uma partida.", "hub.profileSub": "Temas e ajustes.",
  "level.0": "Iniciante", "level.1": "Casual", "level.2": "Clube", "level.3": "Forte", "level.4": "Máximo", "color.w": "Brancas", "color.b": "Pretas",
  "dash.welcome": "Bem-vindo, {name}", "dash.ask": "O que você quer fazer?",
  "stat.games": "Partidas jogadas", "stat.wins": "Vitórias", "stat.losses": "Derrotas", "stat.draws": "Empates", "stat.puzzles": "Problemas resolvidos", "stat.lessons": "Aulas concluídas",
  "game.moves": "Lances", "game.pieces": "Peças", "game.setup": "Ajustes", "game.flip": "Girar", "game.best": "Melhor lance", "game.hide": "Ocultar dica", "game.resign": "Desistir", "game.new": "Nova partida", "game.voiceOn": "Voz ligada", "game.voiceOff": "Voz desligada", "game.noMoves": "Ainda sem lances.", "game.computer": "Computador", "game.pvp": "Dois jogadores",
};

const ja: Dict = {
  "lang.label": "言語",
  "nav.play": "対局", "nav.puzzles": "パズル", "nav.lessons": "レッスン", "nav.online": "オンライン", "nav.analyse": "分析", "nav.players": "プレイヤー", "nav.owner": "オーナーパネル", "nav.profile": "プロフィール", "nav.logout": "ログアウト", "nav.login": "ログイン", "nav.signup": "新規登録",
  "land.badge": "AIチェスチューター", "land.title": "話すチューターとチェスを学ぼう。", "land.sub": "レッスン、パズル、そして話すチューター。", "land.create": "無料アカウントを作成", "land.playNow": "今すぐ対局",
  "feat.play": "コンピューターや友達と対局。", "feat.puzzles": "ヒント付きで戦術を解こう。", "feat.lessons": "一歩ずつ学ぼう。", "feat.analyse": "ミスを見つけよう。",
  "hub.play": "対局", "hub.playSub": "ボットまたは人と", "hub.bot": "ボットと対局", "hub.botSub": "強さを選んでください。", "hub.online": "オンライン対局", "hub.onlineSub": "Checkm8の他のプレイヤーと。", "hub.same": "同じ画面", "hub.sameSub": "2人で1台の端末。", "hub.level": "ボットの強さ", "hub.youPlay": "あなたの色", "hub.start": "対局開始", "hub.continue": "学習を続ける", "hub.puzzlesSub": "戦術を解く。", "hub.lessonsSub": "一歩ずつ学ぶ。", "hub.analyseSub": "対局を振り返る。", "hub.profileSub": "テーマと設定。",
  "level.0": "初心者", "level.1": "カジュアル", "level.2": "クラブ", "level.3": "強い", "level.4": "最強", "color.w": "白", "color.b": "黒",
  "dash.welcome": "ようこそ、{name}さん", "dash.ask": "何をしますか？",
  "stat.games": "対局数", "stat.wins": "勝ち", "stat.losses": "負け", "stat.draws": "引き分け", "stat.puzzles": "解いたパズル", "stat.lessons": "完了したレッスン",
  "game.moves": "棋譜", "game.pieces": "駒", "game.setup": "設定", "game.flip": "盤を回す", "game.best": "最善手", "game.hide": "ヒントを隠す", "game.resign": "投了", "game.new": "新しい対局", "game.voiceOn": "音声オン", "game.voiceOff": "音声オフ", "game.noMoves": "まだ手がありません。", "game.computer": "コンピューター", "game.pvp": "2人対戦",
};

const zh: Dict = {
  "lang.label": "语言",
  "nav.play": "对弈", "nav.puzzles": "谜题", "nav.lessons": "课程", "nav.online": "在线", "nav.analyse": "分析", "nav.players": "玩家", "nav.owner": "站长面板", "nav.profile": "个人资料", "nav.logout": "退出登录", "nav.login": "登录", "nav.signup": "注册",
  "land.badge": "AI 国际象棋导师", "land.title": "和会说话的导师一起学国际象棋。", "land.sub": "课程、谜题，还有会说话的导师。", "land.create": "免费创建账号", "land.playNow": "立即对弈",
  "feat.play": "与电脑或朋友对弈。", "feat.puzzles": "在提示下解战术题。", "feat.lessons": "一步一步学习。", "feat.analyse": "找出你的失误。",
  "hub.play": "对弈", "hub.playSub": "机器人或真人", "hub.bot": "对战机器人", "hub.botSub": "选择它的强度。", "hub.online": "在线对弈", "hub.onlineSub": "Checkm8 上的其他玩家。", "hub.same": "同一屏幕", "hub.sameSub": "两人，一台设备。", "hub.level": "机器人等级", "hub.youPlay": "你执", "hub.start": "开始对局", "hub.continue": "继续学习", "hub.puzzlesSub": "解战术题。", "hub.lessonsSub": "一步一步学习。", "hub.analyseSub": "复盘一局棋。", "hub.profileSub": "主题和设置。",
  "level.0": "新手", "level.1": "休闲", "level.2": "俱乐部", "level.3": "强", "level.4": "最强", "color.w": "白方", "color.b": "黑方",
  "dash.welcome": "欢迎，{name}", "dash.ask": "你想做什么？",
  "stat.games": "对局数", "stat.wins": "胜", "stat.losses": "负", "stat.draws": "和棋", "stat.puzzles": "已解谜题", "stat.lessons": "已完成课程",
  "game.moves": "着法", "game.pieces": "棋子", "game.setup": "设置", "game.flip": "翻转", "game.best": "最佳着法", "game.hide": "隐藏提示", "game.resign": "认输", "game.new": "新对局", "game.voiceOn": "语音开", "game.voiceOff": "语音关", "game.noMoves": "还没有着法。", "game.computer": "电脑", "game.pvp": "双人",
};

export const MESSAGES: Record<Lang, Dict> = { en, es, fr, de, pt, ja, zh };

export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  let text: string = MESSAGES[lang][key] ?? en[key];
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.replace(`{${name}}`, String(value));
  return text;
}
