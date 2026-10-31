const DOLLAR_TAG = /^\$[A-Za-z_]*\$/;

const COMMENT_ONLY = /^(--[^\n]*\s*)+$/;

const closingIndex = (text: string, start: number, terminator: string) => {
  const end = text.indexOf(terminator, start);

  return end === -1 ? text.length : end + terminator.length;
};

const skipQuoted = (text: string, start: number, quote: string) => {
  let index = start + 1;

  while (index < text.length) {
    if (text[index] === quote && text[index + 1] === quote) {
      index += 2;
    } else if (text[index] === quote) {
      return index + 1;
    } else {
      index += 1;
    }
  }

  return text.length;
};

const skipToken = (text: string, index: number) => {
  const rest = text.slice(index);

  if (rest.startsWith("--")) {
    return closingIndex(text, index, "\n");
  }

  if (rest.startsWith("/*")) {
    return closingIndex(text, index + 2, "*/");
  }

  if (rest.startsWith("'") || rest.startsWith('"')) {
    return skipQuoted(text, index, rest.charAt(0));
  }

  const dollarTag = DOLLAR_TAG.exec(rest)?.[0];

  return dollarTag === undefined
    ? index + 1
    : closingIndex(text, index + dollarTag.length, dollarTag);
};

export const splitSqlStatements = (text: string): ReadonlyArray<string> => {
  const statements: Array<string> = [];
  let start = 0;
  let index = 0;

  while (index < text.length) {
    if (text[index] === ";") {
      statements.push(text.slice(start, index));
      start = index + 1;
      index += 1;
    } else {
      index = skipToken(text, index);
    }
  }

  statements.push(text.slice(start));

  return statements.flatMap((statement) => {
    const trimmed = statement.trim();

    return trimmed === "" || COMMENT_ONLY.test(trimmed) ? [] : [trimmed];
  });
};
