export function isIndentMultipleByUnit(indentStr: string, indentUnit: number): { isMultiple: boolean, spaceRun: number } {
  // Validate indentation is multiple of indentUnit
  let spaceRun = 0;
  for (let i = 0; i < indentStr.length; i++) {
    if (indentStr[i] === ' ') {
      let run = 0;
      while (i < indentStr.length && indentStr[i] === ' ') {
        run++;
        i++;
      }
      i--;
      if (run % indentUnit !== 0) {
        spaceRun = run;
        return { isMultiple: false, spaceRun };
      }
    }
  }
  return { isMultiple: true, spaceRun: -1 };
}
