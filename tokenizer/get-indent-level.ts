export function getIndentLevel(indentStr: string, indentUnit: number): number {
  let level = 0;
  for (let i = 0; i < indentStr.length; i++) {
    if (indentStr[i] === '\t') {
      level += 1;
    } else if (indentStr[i] === ' ') {
      let spaceRun = 0;
      while (i < indentStr.length && indentStr[i] === ' ') {
        spaceRun++;
        i++;
      }
      i--;
      level += Math.floor(spaceRun / indentUnit);
    }
  }
  return level;
}
