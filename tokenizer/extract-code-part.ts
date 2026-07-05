export function extractCodePart(lineText: string) {
  // Find comment start, ignoring inside string literals and http/https URLs
  let commentStart = -1;
  let inStr = false;
  for (let i = 0; i < lineText.length; i++) {
    if (lineText[i] === '"') {
      inStr = !inStr;
    } else if (!inStr && lineText[i] === '/' && lineText[i + 1] === '/') {
      const before = lineText.slice(0, i);
      if (/(http|https):$/i.test(before)) {
        continue;
      }
      commentStart = i;
      break;
    }
  }

  const codePart = commentStart !== -1 ? lineText.slice(0, commentStart) : lineText;

  // Skip completely empty or comment-only lines for indentation and processing
  if (/^\s*$/.test(codePart)) {
    return '';
  }
  
  return codePart;
}
