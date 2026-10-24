/**
 * Intelligent Speech-to-Text De-Smudger & Normalizer
 *
 * Resolves phonetic smudges, homophones, and browser Web Speech API misrecognitions
 * (such as turning "What's up" into "WhatsApp", "sing a song" into "single song",
 * "say a poem" into "say a home", "Hey Rex" into "he lyrics", etc.) in real time.
 */

export interface NormalizeSpeechOptions {
  /**
   * When true, the user is still mid-utterance (live streaming preview).
   * Avoids appending terminal punctuation (. or ?) until the utterance settles.
   */
  isInterim?: boolean;
  /**
   * Optional explicit toggle for adding terminal punctuation.
   */
  finalizePunctuation?: boolean;
}

/**
 * Checks whether "WhatsApp" in the transcript is genuinely referring to the
 * messaging application (e.g., "build a WhatsApp clone", "integrate WhatsApp API")
 * rather than a phonetic smudge of "What's up".
 */
function isGenuineWhatsAppAppReference(text: string): boolean {
  return /\b(build|create|make|code|develop|clone|like|similar\s+to|integrate|connect|send\s+(a\s+)?message\s+on|share\s+on|open|install|download)\s+(a\s+|an\s+|the\s+|my\s+)?whatsapp\b/i.test(
    text
  ) ||
    /\bwhatsapp\s+(clone|app|application|api|bot|webhook|integration|messenger|chat|business|group|number|contact|notification)s?\b/i.test(
      text
    );
}

/**
 * Cleans and normalizes spoken transcripts so smudged words become clear,
 * accurate, and naturally punctuated as they are typed.
 */
export function normalizeSpokenTranscript(
  raw: string,
  options: NormalizeSpeechOptions = {}
): string {
  if (!raw) return "";
  let text = raw.trim();
  if (!text) return "";

  const isInterim = Boolean(options.isInterim);

  // 1. Disambiguate "WhatsApp" / "what's app" / "watch up" / "watts up" -> "what's up"
  if (!isGenuineWhatsAppAppReference(text)) {
    text = text
      // Opening or standalone "WhatsApp" / "What's app"
      .replace(
        /^(hey|hi|hello|yo|ok|okay|sup|well)?\s*(rex\s+)?(whatsapp|what'?s\s+app|whats\s+app|watch\s+up|watts\s+up|what\s+sup|watsup|wassup)\b/gi,
        (_match, greeting, rexWord) => {
          const parts: string[] = [];
          if (greeting) parts.push(greeting.trim());
          if (rexWord) parts.push("Rex");
          const prefix = parts.length > 0 ? `${parts.join(" ")}, ` : "";
          return `${prefix}what's up`;
        }
      )
      // Any remaining "WhatsApp" / "what's app" / "watch up" in conversational context
      .replace(/\b(whatsapp|what'?s\s+app|whats\s+app|watch\s+up|watts\s+up|what\s+sup|watsup)\b/gi, "what's up");
  }

  // 2. Wake-word & "Rex" name smudges
  text = text
    .replace(/^(lyrics|lex|wrecks|rax|racks|rick'?s|riks|regs)\b/i, "Rex")
    .replace(
      /\b(hey|hi|hello|yo|ok|okay|dear)\s+(lyrics|lex|wrecks|rax|racks|rick'?s|riks|regs|next|text)\b/gi,
      "$1 Rex"
    )
    .replace(
      /\b(what'?s\s+up|whats\s+up|sup|wassup|how\s+are\s+you|how'?s\s+it\s+going)\s+(lyrics|lex|wrecks|rax|racks|rick'?s|riks|regs|next)\b/gi,
      "$1, Rex"
    )
    .replace(
      /\b(lyrics|lex|wrecks|rax|racks)\s+(i\s+know|how\s+are|what|tell\s+me|show|build|can\s+you|could\s+you|please|sing|say)\b/gi,
      "Rex, $2"
    );

  // 3. Opening greeting smudges ("he" -> "Hey", "high" -> "Hi", "hay" -> "Hey")
  text = text
    .replace(
      /^he\s+(rex|there|bro|man|friend|buddy|sangs|whatever|can\s+you|could\s+you|what|how|show|run|build|tell|i\s+want|sing|say|let'?s)/i,
      "Hey, $1"
    )
    .replace(/^he\s+how\s+are\s+you/i, "Hey, how are you")
    .replace(/^he\s+what'?s\s+up/i, "Hey, what's up")
    .replace(/^he$/i, "Hey")
    .replace(/^hay\b/i, "Hey")
    .replace(/^high\s+(rex|there|how\s+are\s+you|what'?s\s+up)/i, "Hi, $1")
    .replace(/^high$/i, "Hi")
    .replace(/\bwood\s+(morning|afternoon|evening|night)\b/gi, "good $1");

  // 4. Conversational & Creative Smudges (Songs, Poems, Jokes, Stories, Pleasantries)
  text = text
    // Songs
    .replace(/\b(single|sink\s+a|singer|finger)\s+song\b/gi, "sing a song")
    .replace(/\b(single|sink)\s+me\s+a\s+song\b/gi, "sing me a song")
    // Poems
    .replace(
      /\b(say|tell|read|write|recite|share)\s+(me\s+)?(a\s+|an\s+)?(home|form|phone|palm|pom|porn|pawn)\b/gi,
      (_m, verb, mePart, artPart) => `${verb} ${mePart || ""}${artPart || "a "}poem`
    )
    // Stories
    .replace(
      /\b(tell|say|read|share)\s+(me\s+)?(a\s+|an\s+)?store\b/gi,
      (_m, verb, mePart, artPart) => `${verb} ${mePart || ""}${artPart || "a "}story`
    )
    // Jokes
    .replace(
      /\b(tell|say|crack|share)\s+(me\s+)?(a\s+|an\s+)?(choke|yolk|poke)\b/gi,
      (_m, verb, mePart, artPart) => `${verb} ${mePart || ""}${artPart || "a "}joke`
    )
    // Pleasantries
    .replace(/\bhow\s+r\s+u\b/gi, "how are you")
    .replace(/\bhow\s+are\s+u\b/gi, "how are you")
    .replace(/\bwhat\s+r\s+u\s+doing\b/gi, "what are you doing")
    .replace(/\bwhat\s+you\s+doing\b/gi, "what are you doing")
    .replace(/\bwanna\b/gi, "want to")
    .replace(/\bgonna\b/gi, "going to");

  // 5. Technical & Project Domain Smudges
  text = text
    .replace(/\bbed\s+for\b/gi, "built for")
    .replace(/\bbill\s+for\b/gi, "built for")
    .replace(/\bbed\s+it\b/gi, "built it")
    .replace(/\b(bill|built|billed|bil|belt|bulb)\s+(a|an|the|that|this|my|our|me|new)\b/gi, "build $2")
    .replace(
      /\b(bill|bil)\s+(finance|financial|calc|calculator|caculator|project|app|application|software|todo|to-do|website|store)\b/gi,
      "build $2"
    )
    .replace(/\b(cacu|cacula|caculator|calcualtor|calculater|calcultor|calcutor)\b/gi, "calculator")
    .replace(/\bor\s+a\s+mart\b/gi, "AuraMart")
    .replace(/\baura\s*mart\b/gi, "AuraMart")
    .replace(/\bor\s+a\s+beauty\b/gi, "AuraBeauty")
    .replace(/\baura\s*beauty\b/gi, "AuraBeauty")
    .replace(/\bapex\s*wealth\b/gi, "ApexWealth")
    .replace(/\broom\s*canvas\b/gi, "RoomCanvas")
    .replace(/\bsky\s*wings\b/gi, "SkyWings")
    .replace(/\bto\s*do\s*list\b/gi, "todo list")
    .replace(/\btwo\s*do\s*list\b/gi, "todo list")
    .replace(/\b(we\s+as\s+code|vs\s+cold|v\s*s\s*code|visual\s+studio\s+cold)\b/gi, "VS Code")
    .replace(/\b(get\s+hub|git\s+up)\b/gi, "GitHub")
    .replace(/\btype\s*script\b/gi, "TypeScript")
    .replace(/\bjava\s*script\b/gi, "JavaScript")
    .replace(/\bnext\s*j\s*s\b/gi, "Next.js")
    .replace(/\bnext\s*js\b/gi, "Next.js")
    .replace(/\breact\s*j\s*s\b/gi, "React")
    .replace(/\breact\s*js\b/gi, "React")
    .replace(/\btail\s*wind\b/gi, "Tailwind");

  // 6. Contractions & Pronoun Capitalization
  text = text
    .replace(/\bi\b/g, "I")
    .replace(/\bim\b/gi, "I'm")
    .replace(/\bi'm\b/gi, "I'm")
    .replace(/\bive\b/gi, "I've")
    .replace(/\bi've\b/gi, "I've")
    .replace(/\bi'll\b/gi, "I'll")
    .replace(/\bi'd\b/gi, "I'd")
    .replace(/\bcant\b/gi, "can't")
    .replace(/\bdont\b/gi, "don't")
    .replace(/\bwont\b/gi, "won't")
    .replace(/\bdidnt\b/gi, "didn't")
    .replace(/\bcouldnt\b/gi, "couldn't")
    .replace(/\bwouldnt\b/gi, "wouldn't")
    .replace(/\bshouldnt\b/gi, "shouldn't")
    .replace(/\bthats\b/gi, "that's")
    .replace(/\bwhats\b/gi, "what's")
    .replace(/\bwhat\s+s\b/gi, "what's")
    .replace(/\bhows\b/gi, "how's")
    .replace(/\bhow\s+s\b/gi, "how's")
    .replace(/\btheres\b/gi, "there's")
    .replace(/\bheres\b/gi, "here's")
    .replace(/\blets\b/gi, "let's")
    .replace(/\byoure\b/gi, "you're")
    .replace(/\bweve\b/gi, "we've")
    .replace(/\btheyre\b/gi, "they're")
    .replace(/\bisnt\b/gi, "isn't")
    .replace(/\barent\b/gi, "aren't")
    .replace(/\bwasnt\b/gi, "wasn't");

  // 7. Clean up spacing and duplicate commas
  text = text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/,{2,}/g, ",")
    .trim();

  // Capitalize first letter
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  // 8. Add natural terminal punctuation on final transcripts
  const shouldFinalize =
    options.finalizePunctuation !== undefined
      ? options.finalizePunctuation
      : !isInterim;
  if (shouldFinalize && text.length > 1 && !/[.!?]$/.test(text)) {
    const lower = text.toLowerCase();
    const isQuestion =
      /^(what|what's|how|how's|why|where|when|who|which|can|could|would|will|should|is|are|was|were|do|does|did|have|has|may|might)\b/i.test(
        lower
      ) ||
      /\b(what's\s+up|how\s+are\s+you|how's\s+it\s+going|what\s+are\s+you\s+doing|what\s+do\s+you\s+think|can\s+you|could\s+you|would\s+you|will\s+you|right|isn't\s+it|aren't\s+you)\s*(rex)?$/i.test(
        lower
      );

    if (isQuestion) {
      text += "?";
    }
  }

  return text;
}
