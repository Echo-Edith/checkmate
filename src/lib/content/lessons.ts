import type { Difficulty } from "./puzzles";

export interface Practice {
  prompt: string;
  fen: string;
  /** Accepted solution lines in UCI (player, reply, player...). */
  lines: string[][];
  mateAny?: boolean;
  explanation: string;
}

export interface Lesson {
  id: string;
  level: Difficulty;
  title: string;
  summary: string;
  body: string[];
  practice?: Practice;
}

export const LESSONS: readonly Lesson[] = [
  // ---------------------------------------------------------------- Beginner
  {
    id: "board-basics",
    level: "beginner",
    title: "The chessboard",
    summary: "Ranks, files, squares and how the pieces start.",
    body: [
      "The board has 64 squares in an 8×8 grid. Columns are called files and are labelled a to h. Rows are called ranks and are numbered 1 to 8. Every square has a name made from its file and rank, such as e4.",
      "Each player starts with 16 pieces: one king, one queen, two rooks, two bishops, two knights and eight pawns. White always moves first. The bottom-right square from each player's view is a light square.",
      "A good way to remember the queen's place: the queen goes on her own colour. The white queen starts on a light square (d1) and the black queen on a dark square (d8).",
    ],
    practice: {
      prompt: "Make your first move: play the knight from g1 to f3.",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      lines: [["g1f3"]],
      explanation: "Knights are the only pieces that can jump over others, so they can move on the first turn.",
    },
  },
  {
    id: "piece-movements",
    level: "beginner",
    title: "How the pieces move",
    summary: "Learn the moves and captures of every piece.",
    body: [
      "The rook moves any number of squares in a straight line (up, down, left or right). The bishop moves diagonally. The queen combines both: she moves like a rook and a bishop.",
      "The knight moves in an L-shape: two squares in one direction and then one square sideways. It can jump over other pieces. The king moves one square in any direction.",
      "Pawns move forward one square (or two squares from their starting position), but they capture diagonally. Pieces capture by moving onto the square of an enemy piece.",
    ],
    practice: {
      prompt: "Capture the undefended rook with your bishop.",
      fen: "4k3/8/8/8/8/2r5/1B6/4K3 w - - 0 1",
      lines: [["b2c3"]],
      explanation: "The bishop captures diagonally. Before you capture, always check if the piece is protected.",
    },
  },
  {
    id: "check-and-checkmate",
    level: "beginner",
    title: "Check and checkmate",
    summary: "How a game of chess is won.",
    body: [
      "When a king is attacked, it is in check. You must get out of check on your move. You can move the king, block the attack, or capture the attacking piece.",
      "If a king is in check and there is no way to escape, it is checkmate and the game is over. The player who gives checkmate wins.",
      "If a player has no legal move but is not in check, the game is a draw called stalemate. Be careful not to stalemate your opponent when you are winning.",
    ],
    practice: {
      prompt: "Deliver checkmate in one move.",
      fen: "6k1/8/6K1/8/8/8/8/R7 w - - 0 1",
      lines: [["a1a8"]],
      mateAny: true,
      explanation: "Your king covers the squares in front of the black king, and the rook checks along the back rank.",
    },
  },
  {
    id: "basic-tactics",
    level: "beginner",
    title: "Basic tactics",
    summary: "Spot free pieces and protect your own.",
    body: [
      "A tactic is a short sequence of moves that wins material or gives checkmate. The simplest tactic is capturing a piece that is not protected. Before every move, ask: what is attacked, and what is protected?",
      "A piece is hanging if it can be captured for free. Check your opponent's last move: it often attacks something, or leaves a piece hanging.",
      "Before you capture, also ask: if I take, can I be taken back? A good capture wins material. A bad capture loses it.",
    ],
    practice: {
      prompt: "Black left the queen undefended. Take it!",
      fen: "4k3/8/8/8/3q4/8/8/3RK3 w - - 0 1",
      lines: [["d1d4"]],
      explanation: "The rook attacks the queen along the d-file and nothing protects it.",
    },
  },
  {
    id: "opening-principles",
    level: "beginner",
    title: "Opening principles",
    summary: "Control the centre, develop your pieces, castle.",
    body: [
      "Control the centre. The squares e4, d4, e5 and d5 are the most important. Pieces in the centre control more squares. Pawns on e4 or d4 are a good start.",
      "Develop your pieces. Move knights and bishops off the back rank early. Try not to move the same piece twice in the opening, and avoid early queen moves.",
      "Castle early to make your king safe and to bring a rook into the game. Then connect your rooks and fight for the centre.",
    ],
    practice: {
      prompt: "Open the game by taking the centre with a pawn (e4 or d4).",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      lines: [["e2e4"], ["d2d4"]],
      explanation: "A central pawn controls important squares and opens lines for your bishop and queen.",
    },
  },

  // ------------------------------------------------------------ Intermediate
  {
    id: "pins",
    level: "intermediate",
    title: "Pins",
    summary: "Freeze a piece because something more valuable is behind it.",
    body: [
      "A pin is when a piece cannot (or should not) move because it would expose a more valuable piece behind it. If the piece behind is the king, it is an absolute pin and the pinned piece cannot legally move.",
      "Bishops, rooks and queens create pins because they attack along lines. Once a piece is pinned, you can attack it again, because it cannot run away.",
    ],
    practice: {
      prompt: "Pin the knight to the black king with your bishop.",
      fen: "4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1",
      lines: [["f1b5"]],
      explanation: "The bishop on b5 attacks the knight on c6, and behind it on the same diagonal stands the king.",
    },
  },
  {
    id: "forks",
    level: "intermediate",
    title: "Forks",
    summary: "Attack two pieces at the same time.",
    body: [
      "A fork is a move that attacks two or more enemy pieces at once. The opponent can usually save only one, so you win the other.",
      "Knights are great forkers because they attack in a pattern that is hard to see. Pawns, queens and other pieces can fork too. Best of all is a fork that includes the king, because the king must move.",
    ],
    practice: {
      prompt: "Fork the black king and queen with your knight.",
      fen: "2q3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1",
      lines: [["d5e7", "g8h8", "e7c8"]],
      explanation: "Ne7+ gives check and attacks the queen on c8. After the king moves, the knight takes the queen.",
    },
  },
  {
    id: "skewers",
    level: "intermediate",
    title: "Skewers",
    summary: "Attack a valuable piece so that it must move and expose another.",
    body: [
      "A skewer is the opposite of a pin. You attack a valuable piece, and when it moves away, you capture the less valuable (or equal) piece behind it.",
      "Skewers are done by long-range pieces: rooks, bishops and queens. They often start with a check against the king.",
    ],
    practice: {
      prompt: "Skewer the king and queen with your rook.",
      fen: "8/8/8/q2k4/8/8/8/6KR w - - 0 1",
      lines: [["h1h5", "d5d6", "h5a5"]],
      explanation: "Rh5+ checks the king. When it steps aside, the rook captures the queen that was behind it.",
    },
  },
  {
    id: "discovered-attacks",
    level: "intermediate",
    title: "Discovered attacks",
    summary: "Move one piece to unleash another.",
    body: [
      "In a discovered attack, you move a piece that is blocking one of your long-range pieces. This reveals an attack from the piece behind, and the moving piece can do something at the same time.",
      "If the revealed attack is a check, it is a discovered check. The opponent must answer the check, so your moving piece can capture something big for free.",
    ],
    practice: {
      prompt: "Win the queen with a discovered check.",
      fen: "4k3/6q1/8/4B3/8/8/8/4R2K w - - 0 1",
      lines: [["e5g7"]],
      explanation: "When the bishop captures the queen, the rook on e1 gives check along the open e-file.",
    },
  },
  {
    id: "positional-understanding",
    level: "intermediate",
    title: "Positional understanding",
    summary: "Think about piece activity, structure and king safety.",
    body: [
      "Positional play is about the long-term features of a position. Good questions: Which of my pieces is worst placed? Which squares are weak? Where is each king safe?",
      "Pawn structure matters because pawns cannot move backwards. Doubled, isolated and backward pawns are weaknesses. Open files are good for rooks. Outposts (squares that cannot be attacked by enemy pawns) are good for knights.",
      "Improve your worst piece, keep your pieces coordinated, and do not rush an attack when your position is not ready.",
    ],
    practice: {
      prompt: "Develop a knight toward the centre.",
      fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
      lines: [["g1f3"], ["b1c3"]],
      explanation: "Knights belong near the centre where they control more squares.",
    },
  },
  {
    id: "opening-development",
    level: "intermediate",
    title: "Developing in the opening",
    summary: "Put your bishops on active diagonals.",
    body: [
      "After you develop a knight, bring out your bishops to active squares. In open games, the bishop often goes to c4 or b5 to put pressure on the black position.",
      "Then castle. A common plan for White: e4, Nf3, a bishop move, castle, and then d3 or d4. Learn the ideas behind these moves, not just the order.",
    ],
    practice: {
      prompt: "Develop your light-squared bishop to an active square (c4 or b5).",
      fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
      lines: [["f1c4"], ["f1b5"]],
      explanation: "From c4 the bishop eyes f7, and from b5 it pins the knight against the king's defenders.",
    },
  },

  // ---------------------------------------------------------------- Advanced
  {
    id: "calculation",
    level: "advanced",
    title: "Calculation",
    summary: "See forcing moves and count variations accurately.",
    body: [
      "Calculation means looking ahead at concrete moves. Start with forcing moves: checks, captures and threats, because your opponent has fewer replies.",
      "Look at each candidate move, then each reply, and stop when the position is calm. Always check your opponent's best reply, not only the one you hope for.",
      "A useful habit: before you play, ask what the opponent's last move threatens, and whether your move leaves a piece hanging.",
    ],
    practice: {
      prompt: "Find the mate in two.",
      fen: "7k/8/8/8/8/8/R7/1R4K1 w - - 0 1",
      lines: [
        ["b1b7", "h8g8", "a2a8"],
        ["a2a7", "h8g8", "b1b8"],
      ],
      explanation: "The first rook cuts off the 7th rank, which forces the king to the back rank. The second rook then gives mate.",
    },
  },
  {
    id: "strategic-planning",
    level: "advanced",
    title: "Strategic planning",
    summary: "Make a plan based on the features of the position.",
    body: [
      "A plan connects the features of a position to a goal. For example: a weak pawn suggests attacking it, an open file suggests doubling rooks, and a king that is not castled suggests opening the centre.",
      "Make a plan in three steps. First, find the imbalances (pawn structure, piece activity, king safety, space). Second, decide what you want to achieve. Third, choose moves that improve your position toward that goal, while checking your opponent's threats.",
      "When you do not see a plan, improve your worst piece. If you are worse, look for ways to trade your opponent's best pieces.",
    ],
  },
  {
    id: "endgames",
    level: "advanced",
    title: "Endgames",
    summary: "Basic checkmates and king activity.",
    body: [
      "In the endgame the king becomes an active fighting piece. Bring it to the centre and use it with your pieces and pawns.",
      "You must know the basic checkmates. With a king and queen against a king, drive the enemy king to the edge, bring your king close, and finish with a queen move next to the king while it is protected. Watch out for stalemate.",
      "Other key ideas: rooks belong behind passed pawns, and the opposition (kings facing each other with one square between) decides many pawn endgames.",
    ],
    practice: {
      prompt: "Checkmate the black king with your queen.",
      fen: "7k/8/5K2/8/8/8/8/6Q1 w - - 0 1",
      lines: [["g1g7"]],
      mateAny: true,
      explanation: "The queen on g7 is protected by the king and covers every escape square.",
    },
  },
  {
    id: "positional-sacrifices",
    level: "advanced",
    title: "Positional sacrifices",
    summary: "Give up material for lasting compensation.",
    body: [
      "A positional sacrifice gives up material (often a pawn or the exchange) without a forced win. You get long-term compensation instead: an attack, better piece activity, a safer king or a damaged pawn structure for your opponent.",
      "Before you sacrifice, ask what you get in return and whether the compensation lasts. If the opponent can return the material and keep the advantage, the sacrifice is not sound.",
      "Typical examples: sacrificing the exchange (a rook for a minor piece) to remove a strong defender, or giving a pawn to open lines against the enemy king.",
    ],
  },
  {
    id: "advanced-tactics",
    level: "advanced",
    title: "Advanced tactics",
    summary: "Smothered mate, deflection and removing the defender.",
    body: [
      "Deflection pulls a defending piece away from an important square. Removing the defender captures the piece that protects something. Both ideas often decide a game.",
      "Smothered mate is a checkmate by a knight when the enemy king is surrounded by its own pieces. The knight cannot be blocked and the king has no squares.",
    ],
    practice: {
      prompt: "Deliver the smothered mate.",
      fen: "6rk/6pp/8/4N3/8/8/8/6K1 w - - 0 1",
      lines: [["e5f7"]],
      mateAny: true,
      explanation: "Nf7 checks the king on h8. The rook and pawns block every flight square.",
    },
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}
