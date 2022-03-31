import { isNumeric } from './NumericHelpers';

/** Split a text field with multiple lines in separate strings, without terminating \r\n */
export function splitLines(a: string): string[] {
    // https://stackoverflow.com/a/12927469
    return a.split(/\r*\n/); 
}

/** Split a multiline CSV string in a nested array, outer array corresponds
 * with one line, inner array is split per field.
 * */
export function splitCsv(textString: string): string[][] {
    const listSplitLines = splitLines(textString).map(x => x.split(","));
    // while last line has 1 element (no comma in the last line), and this element is empty -> remove the last line
    while (listSplitLines.length > 0 && listSplitLines[listSplitLines.length -1 ].length == 1 && !listSplitLines[listSplitLines.length -1][0].trim())
        listSplitLines.pop();
    return listSplitLines;
}

/** Check if all fields in a splitList are numbers. Optionally check if every list has the correct no of fields. */
export function checkCsvNumbers(splitList: string[][], noFields = 0): [boolean, string] {
    let success = true;
    let message = "OK";

    for (let i = 0; i < splitList.length; i++) {
        const thisRow = splitList[i];
        if (noFields > 0 && thisRow.length != noFields) {
            success = false;
            message = "error, line " + (i+1) + " has " + thisRow.length + " values, expecting " + noFields + " values !";
            break;
        }
        if (!thisRow.every(isNumeric)) {
            success = false;
            message = "error, line " + (i+1) + " has non-numeric values !";
        }
    }
    return [success, message];
}
