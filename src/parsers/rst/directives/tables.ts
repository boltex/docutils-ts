import * as directivesConversions from '../directiveConversions.js';
import Directive from '../directive.js';
import * as nodes from '../../../nodes.js';
import { NodeInterface, OptionSpec, Systemmessage } from '../../../types.js';
import { SystemMessagePropagation } from '../../../exceptions.js';
import Papa, { ParseConfig, ParseResult } from 'papaparse';
import { DocutilsDialect, HeaderDialect, CSVDialect } from '../../../dialects.js';
import { RowData, TableData, TableEntryData } from '../types.js';
import { fileSystem } from '../../../fileSystem.js';
import StringList from '../../../stringList.js';

function align(argument: string) {
    return directivesConversions.choice(argument, ['left', 'center', 'right']);
}

/**
 * Generic table base class.
 */
export class Table extends Directive {

    public static optionalArguments: number = 1;
    public static finalArgumentWhitespace: boolean = true;
    public static optionSpec: OptionSpec = {
        'class': directivesConversions.classOption,
        'name': directivesConversions.unchanged,
        'align': align,
        'width': directivesConversions.lengthOrPercentageOrUnitless,
        'widths': directivesConversions.valueOr(['auto', 'grid'], directivesConversions.positiveIntList)
    }

    public static hasContent: boolean = true;

    public makeTitle(): [nodes.title | null, Systemmessage[]] {
        if (this.arguments.length) {
            const titleText = this.arguments[0];
            const [textNodes, messages] = this.state.inline_text(titleText, this.lineno);
            const title = new nodes.title(titleText, '', textNodes);
            [title.source, title.line] = this.stateMachine.getSourceAndLine(this.lineno);
            return [title, messages];
        } else {
            return [null, []];
        }
    }

    public checkTableDimensions(rows: any[][], headerRows: number, stubColumns: number): void {
        if (rows.length < headerRows) {
            const error = this.reporter.error(`${headerRows} header row(s) specified but only ${rows.length} row(s) of data supplied ("${this.name}" directive).`,
                [new nodes.literal_block(this.blockText, this.blockText)],
                { line: this.lineno });
            throw new SystemMessagePropagation(error.toString(), [error]);
        }
        if (rows.length === headerRows && headerRows > 0) {
            const error = this.reporter.error(`Insufficient data supplied (${rows.length} row(s)); no data remaining for table body, required by "${this.name}" directive.`,
                [new nodes.literal_block(this.blockText, this.blockText)],
                { line: this.lineno });
            throw new SystemMessagePropagation(error.toString(), [error]);
        }
        for (const row of rows) {
            if (row.length < stubColumns) {
                const error = this.reporter.error(`${stubColumns} stub column(s) specified but only ${row.length} columns(s) of data supplied ("${this.name}" directive).`,
                    [new nodes.literal_block(this.blockText, this.blockText)],
                    { line: this.lineno });
                throw new SystemMessagePropagation(error.toString(), [error]);
            }
            if (row.length === stubColumns && stubColumns > 0) {
                const error = this.reporter.error(`Insufficient data supplied (${row.length} columns(s)); no data remaining for table body, required by "${this.name}" directive.`,
                    [new nodes.literal_block(this.blockText, this.blockText)],
                    { line: this.lineno });
                throw new SystemMessagePropagation(error.toString(), [error]);
            }

        }
    }

    public setTableWidth(tableNode: nodes.table): void {
        if ('width' in this.options) {
            tableNode.attributes['width'] = this.options['width'];
        }
    }

    public get widths(): string {
        return this.options['widths'] || '';
    }

    private convertWidthToNumber(width: string | number): number {
        if (typeof width === 'number') {
            return width;
        } else if (width.endsWith('%')) {
            const num = parseFloat(width.slice(0, -1));
            return isNaN(num) ? 0 : num / 100;
        } else {
            const num = parseFloat(width);
            return isNaN(num) ? 0 : num;
        }
    }

    public getColumnWidths(nCols: number): number[] {
        let colWidths: number[];
        if (Array.isArray(this.widths)) {
            if (this.widths.length !== nCols) {
                // TODO: use last value for missing columns?
                const error = this.reporter.error(`"${this.name}" widths do not match the ` +
                    `number of columns in table (${nCols}).`,
                    [new nodes.literal_block(this.blockText, this.blockText)],
                    { line: this.lineno });
                throw new SystemMessagePropagation(error.toString(), [error]);
            }
            colWidths = this.widths.map(width => this.convertWidthToNumber(width));
        } else {
            const width = this.convertWidthToNumber(this.widths);
            colWidths = Array(nCols).fill(width);
        }
        return colWidths;
    }

    public extendShortRowsWithEmptyCells(columns: number, parts: any[][][]): void {
        for (const part of parts) {
            for (const row of part) {
                if (row.length < columns) {
                    row.push(...Array(columns - row.length).fill([0, 0, 0, []]));
                }
            }
        }
    }

}

/**
 * Class for the `"table" directive`__ for formal tables using rST syntax.
 *
 * https://docutils.sourceforge.io/docs/ref/rst/directives.html
 */
export class RSTTable extends Table {
    public run(): any[] {
        console.log("Running RSTTable directive");
        if (!this.content) {
            const warning = this.reporter.warning('Content block expected '
                + `for the "${this.name}" directive; none found.`,
                [new nodes.literal_block(this.blockText, this.blockText)],
                { line: this.lineno });
            return [warning];
        }
        const [title, messages] = this.makeTitle();
        const node = new nodes.Element();          // anonymous container for parsing
        this.state.nestedParse(this.content, this.contentOffset, node);
        if (node.getNumChildren() !== 1 || !(node.getChildren()[0] instanceof nodes.table)) {
            const error = this.reporter.error(`Error parsing content block for the "${this.name}" directive: exactly one table expected.`,
                [new nodes.literal_block(this.blockText, this.blockText)],
                { line: this.lineno });
            return [error];
        }
        const tableNode = node.getChildren()[0] as nodes.table;
        tableNode.attributes['classes'] += this.options.get('class', []);
        this.setTableWidth(tableNode);
        if ('align' in this.options) {
            tableNode.attributes['align'] = this.options.get('align');
        }
        if (Array.isArray(this.widths)) {
            const tgroup = tableNode.children[0];
            let colWidths: number[];
            try {
                colWidths = this.getColumnWidths(tgroup.attributes["cols"]);
            } catch (detail) {
                if (Array.isArray((detail as SystemMessagePropagation).args)) {
                    if ((detail as any).args.length) {
                        return [(detail as any).args[0]];
                    }
                }
                throw detail;
            }
            const colspecs = tgroup.children.filter(child => child.tagname === 'colspec');
            for (let i = 0; i < Math.min(colspecs.length, colWidths.length); i++) {
                colspecs[i].attributes['colwidth'] = colWidths[i];
            }
        }
        if (this.widths === 'auto') {
            tableNode.attributes['classes'] += ['colwidths-auto'];
        } else if (this.widths) {  // "grid" or list of integers
            tableNode.attributes['classes'] += ['colwidths-given'];
        }
        this.addName(tableNode);
        if (title) {
            tableNode.children.unshift(title);
        }
        return [tableNode, ...messages];
    }
}

export class CSVTable extends Table {

    public static optionSpec: OptionSpec = {
        'class': directivesConversions.classOption,
        'name': directivesConversions.unchanged,
        'align': align,
        'width': directivesConversions.lengthOrPercentageOrUnitless,
        'widths': directivesConversions.valueOr(['auto'], directivesConversions.positiveIntList),
        'file': directivesConversions.path,
        'header-rows': directivesConversions.nonnegativeInt,
        'stub-columns': directivesConversions.nonnegativeInt,
        'header': directivesConversions.unchanged,
        'url': directivesConversions.uri,
        'encoding': directivesConversions.encoding,
        // field delimiter char
        'delim': directivesConversions.singleCharOrWhitespaceOrUnicode,
        // treat whitespace after delimiter as significant
        'keepspace': directivesConversions.flag,
        // text field quote/unquote char:
        'quote': directivesConversions.singleCharOrWhitespaceOrUnicode,
        // char used to escape delim & quote as-needed:
        'escape': directivesConversions.singleCharOrWhitespaceOrUnicode
    };

    public static checkRequirements(): void {
        console.warn('CSVTable.checkRequirements() is not required with JavaScript/TypeScript and will be removed in future versions.');
    }

    public processHeaderOption(): [any[][], number] {
        const source = this.stateMachine.getSourceAndLine(this.lineno - 1)[0];
        const tableHead: any[][] = [];
        let maxHeaderCols = 0;

        if (this.options['header']) {
            const headerRows = this.options['header'].split('\n');
            for (const row of headerRows) {
                const cols = row.split(this.options['delim']);
                tableHead.push(cols);
                maxHeaderCols = Math.max(maxHeaderCols, cols.length);
            }
        }

        return [tableHead, maxHeaderCols];
    }

    public run(): any[] {
        console.log("Running CSVTable directive");
        let colWidths: number[] = [];
        let tableHead: RowData[];
        let tableBody: RowData[];
        let maxHeaderCols: number;
        let stubColumns: number = this.options['stub-columns'] || 0;
        let title: nodes.title | null;
        let messages: Systemmessage[];
        try {
            if (!this.state.document!.settings.fileInsertionEnabled &&
                (this.options['file'] || this.options['url'])) {
                const warning = this.reporter.warning('File and URL access '
                    + `deactivated; ignoring "${this.name}" directive.`,
                    [new nodes.literal_block(this.blockText, this.blockText)],
                    { line: this.lineno });
                return [warning];
            }
            [title, messages] = this.makeTitle();
            const [csvData, source] = this.getCSVData();
            [tableHead, maxHeaderCols] = this.processHeaderOption();
            let [rows, maxCols] = this.parseCSVDataIntoRows(
                csvData,
                new DocutilsDialect(this.options),
                source
            );
            maxCols = Math.max(maxCols, maxHeaderCols);
            const headerRows = this.options['header-rows'] || 0;
            this.checkTableDimensions(rows, headerRows, stubColumns);
            tableHead.push(...rows.slice(0, headerRows));
            tableBody = rows.slice(headerRows);
            colWidths = [];
            this.extendShortRowsWithEmptyCells(maxCols, [tableHead, tableBody]);
        } catch (detail) {
            if (detail instanceof SystemMessagePropagation) {
                if (Array.isArray((detail as SystemMessagePropagation).args)) {
                    if ((detail as any).args.length) {
                        return [(detail as any).args[0]];
                    }
                }
                throw detail;
            } else if (detail instanceof Error) {
                const error = this.reporter.error(`Error with CSV data in "${this.name}" directive:\n${detail.message}`,
                    [new nodes.literal_block(this.blockText, this.blockText)],
                    { line: this.lineno });
                return [error];
            } else {
                throw detail;
            }

        }
        const table: TableData = [colWidths, tableHead, tableBody];
        const tableNode = this.state.build_table(table, this.contentOffset,
            stubColumns, this.widths);
        tableNode.attributes['classes'] += this.options.get('class', []);
        if ('align' in this.options) {
            tableNode.attributes['align'] = this.options.get('align');
        }
        this.setTableWidth(tableNode);
        this.addName(tableNode);
        if (title) {
            tableNode.children.unshift(title);
        }
        return [tableNode, ...messages];
    }

    public getCSVData(): [string[], string] {
        const settings = this.state.document!.settings;
        const encoding = this.options['encoding'] || settings.inputEncoding;
        const errorHandler = settings.inputEncodingErrorHandler;
        let csvData: string[] = [];
        let source: string = '';

        if (this.content && this.content.length > 0) {
            // CSV data is from directive content.
            if (this.options['file'] || this.options['url']) {
                const error = this.reporter.error(`"${this.name}" directive may not both specify an external file and have content.`,
                    [new nodes.literal_block(this.blockText, this.blockText)],
                    { line: this.lineno });
                throw new SystemMessagePropagation(error.toString(), [error]);
            }
            source = this.content.source(0);
            csvData = this.content.lines;
        } else if (this.options['file']) {
            // CSV data is from an external file.
            if (this.options['url']) {

                const error = this.reporter.error(`"${this.name}" directive may not both specify an external file and a URL.`,
                    [new nodes.literal_block(this.blockText, this.blockText)],
                    { line: this.lineno });
                throw new SystemMessagePropagation(error.toString(), [error]);
            }
            const filePath = this.options['file'];

            // TODO : synchronous file read
            // const fileContent = await fileSystem.readFile(filePath, { encoding: encoding });
            const fileContent = ''; // placeholder

            if (fileContent !== null) {
                source = filePath;
                csvData = fileContent.split('\n');
            }

        } else if (this.options['url']) {
            const url = this.options['url'];
            // TODO : fetch CSV data from URL
            // const response = await fetch(url);
            // const text = await response.text();
            const text = ''; // placeholder
            csvData = text.split('\n');
        }

        return [csvData, source];
    }

    // public parseCSVDataIntoRows(csvData: string[], dialect: any, source: string): [RowData[], number] {
    /**
      * parse_csv_data_into_rows
      * - csv_data: array of lines (strings)
      * - dialect: instance of DocutilsDialect-like class (has toPapaConfig or dialect props)
      * - source: string identifying source (file/path/url)
      *
      * Returns { rows: TableRows, max_cols: number }
      */
    parseCSVDataIntoRows(
        csvData: string[],
        dialect: CSVDialect,
        source: string
    ): [RowData[], number] {
        // PapaParse likes the full text; join with '\n' (lines already have no trailing newline)
        const text = csvData.join('\n') + '\n';

        // Produce Papa config - the dialect class may expose a toPapaConfig() helper,
        // otherwise map fields manually.
        let papaConfig: ParseConfig<string[]> = {};
        if (typeof (dialect as any).toPapaConfig === 'function') {
            papaConfig = (dialect as any).toPapaConfig();
        } else {
            papaConfig = {
                delimiter: (dialect as any).delimiter ?? ',',
                quoteChar: (dialect as any).quotechar ?? '"',
                escapeChar: (dialect as any).escapechar ?? undefined,
                skipEmptyLines: !!(dialect as any).skipinitialspace,
            };
        }

        const parsed = Papa.parse(text, {
            ...papaConfig,
            dynamicTyping: false,
            skipEmptyLines: false,
            download: false,
            worker: false,
        });

        if (parsed.errors && parsed.errors.length > 0) {
            // Wrap the first Papa error to mimic csv.Error in Python.
            const errMsg = parsed.errors.map((e: any) => e.message).join('; ');
            throw new Error(`CSV parse error: ${errMsg}`);
        }

        const rows = [];
        let maxCols = 0;

        // parsed.data is array of rows (each row: array of strings)
        for (const row of (parsed.data as string[][])) {
            const rowData: TableEntryData[] = [];
            for (const cell of row) {
                // In the Python version they create cell_data like:
                // (0, 0, 0, statemachine.StringList(cell.splitlines(), source=source))
                const stringList = new StringList((cell ?? '').split(/\r?\n/), source);
                const cellTuple: TableEntryData = [0, 0, 0, stringList];
                rowData.push(cellTuple);
            }
            rows.push(rowData);
            maxCols = Math.max(maxCols, (row ?? []).length);
        }

        return [rows, maxCols];
    }


}

/* Original Code:



class ListTable(Table):

    """
    Implement tables whose data is encoded as a uniform two-level bullet list.
    For further ideas, see
    https://docutils.sourceforge.io/docs/dev/rst/alternatives.html#list-driven-tables
    """

    option_spec = {'header-rows': directives.nonnegative_int,
                   'stub-columns': directives.nonnegative_int,
                   'width': directives.length_or_percentage_or_unitless,
                   'widths': directives.value_or(('auto', ),
                                                 directives.positive_int_list),
                   'class': directives.class_option,
                   'name': directives.unchanged,
                   'align': align}

    def run(self):
        if not self.content:
            error = self.reporter.error('The "%s" directive is empty; '
                'content required.' % self.name,
                nodes.literal_block(self.block_text, self.block_text),
                line=self.lineno)
            return [error]
        title, messages = self.make_title()
        node = nodes.Element()          # anonymous container for parsing
        self.state.nested_parse(self.content, self.content_offset, node)
        try:
            _num_cols, col_widths = self.check_list_content(node)
            table_data = [[item.children for item in row_list[0]]
                          for row_list in node[0]]
            header_rows = self.options.get('header-rows', 0)
            stub_columns = self.options.get('stub-columns', 0)
            self.check_table_dimensions(table_data, header_rows, stub_columns)
        except SystemMessagePropagation as detail:
            return [detail.args[0]]
        table_node = self.build_table_from_list(table_data, col_widths,
                                                header_rows, stub_columns)
        if 'align' in self.options:
            table_node['align'] = self.options.get('align')
        table_node['classes'] += self.options.get('class', [])
        self.set_table_width(table_node)
        self.add_name(table_node)
        if title:
            table_node.insert(0, title)
        return [table_node] + messages

    def check_list_content(self, node):
        if len(node) != 1 or not isinstance(node[0], nodes.bullet_list):
            error = self.reporter.error(
                'Error parsing content block for the "%s" directive: '
                'exactly one bullet list expected.' % self.name,
                nodes.literal_block(self.block_text, self.block_text),
                line=self.lineno)
            raise SystemMessagePropagation(error)
        list_node = node[0]
        num_cols = 0
        # Check for a uniform two-level bullet list:
        for item_index in range(len(list_node)):
            item = list_node[item_index]
            if len(item) != 1 or not isinstance(item[0], nodes.bullet_list):
                error = self.reporter.error(
                    'Error parsing content block for the "%s" directive: '
                    'two-level bullet list expected, but row %s does not '
                    'contain a second-level bullet list.'
                    % (self.name, item_index + 1),
                    nodes.literal_block(self.block_text, self.block_text),
                    line=self.lineno)
                raise SystemMessagePropagation(error)
            elif item_index:
                if len(item[0]) != num_cols:
                    error = self.reporter.error(
                        'Error parsing content block for the "%s" directive: '
                        'uniform two-level bullet list expected, but row %s '
                        'does not contain the same number of items as row 1 '
                        '(%s vs %s).'
                        % (self.name, item_index + 1, len(item[0]), num_cols),
                        nodes.literal_block(self.block_text, self.block_text),
                        line=self.lineno)
                    raise SystemMessagePropagation(error)
            else:
                num_cols = len(item[0])
        col_widths = self.get_column_widths(num_cols)
        return num_cols, col_widths

    def build_table_from_list(self, table_data,
                              col_widths, header_rows, stub_columns):
        table = nodes.table()
        if self.widths == 'auto':
            table['classes'].push('colwidths-auto')
        elif self.widths:  # explicitly set column widths
            table['classes'] += ['colwidths-given']
        tgroup = nodes.tgroup(cols=len(col_widths))
        table += tgroup
        for col_width in col_widths:
            colspec = nodes.colspec()
            if col_width is not None:
                colspec.attributes['colwidth'] = col_width
            if stub_columns:
                colspec.attributes['stub'] = True
                stub_columns -= 1
            tgroup += colspec
        rows = []
        for row in table_data:
            row_node = nodes.row()
            for cell in row:
                entry = nodes.entry()
                entry += cell
                row_node += entry
            rows.append(row_node)
        if header_rows:
            thead = nodes.thead()
            thead.extend(rows[:header_rows])
            tgroup += thead
        tbody = nodes.tbody()
        tbody.extend(rows[header_rows:])
        tgroup += tbody
        return table

*/

/**
 * Implement tables whose data is encoded as a uniform two-level bullet list.
 * For further ideas, see
 * https://docutils.sourceforge.io/docs/dev/rst/alternatives.html#list-driven-tables
 */
export class ListTable extends Table {
    public static optionSpec: OptionSpec = {
        'header-rows': directivesConversions.nonnegativeInt,
        'stub-columns': directivesConversions.nonnegativeInt,
        'width': directivesConversions.lengthOrPercentageOrUnitless,
        'widths': directivesConversions.valueOr(['auto'], directivesConversions.positiveIntList),
        'class': directivesConversions.classOption,
        'name': directivesConversions.unchanged,
        'align': align
    }

    public run(): any[] {
        if (!this.content) {
            const error = this.reporter.error(
                `The "${this.name}" directive is empty; content required.`,
                [new nodes.literal_block(this.blockText, this.blockText)],
                { line: this.lineno });
            return [error];
        }
        let title: nodes.title | null;
        let messages: Systemmessage[];
        [title, messages] = this.makeTitle();
        const node = new nodes.Element();
        this.state.nestedParse(this.content, this.contentOffset, node);
        let numCols: number;
        let colWidths: number[];
        let tableData: NodeInterface[][];

        try {
            [numCols, colWidths] = this.checkListContent(node);
            tableData = node.children[0].children.map((rowList: any) => rowList.children.map((item: any) => item.children));
            const headerRows = this.options['header-rows'] || 0;
            const stubColumns = this.options['stub-columns'] || 0;
            this.checkTableDimensions(tableData, headerRows, stubColumns);
        } catch (detail) {
            if (detail instanceof SystemMessagePropagation) {
                return detail.args as any[];
            }
            throw detail;
        }
        const tableNode = this.buildTableFromList(tableData, colWidths,
            this.options['header-rows'] || 0,
            this.options['stub-columns'] || 0);
        if ('align' in this.options) {
            tableNode.attributes['align'] = this.options.get('align');
        }
        tableNode.attributes['classes'] += this.options.get('class', []);
        this.setTableWidth(tableNode);
        this.addName(tableNode);
        if (title) {
            tableNode.children.unshift(title);
        }
        return [tableNode, ...messages];
    }

    public checkListContent(node: nodes.Element): [number, number[]] {
        if (node.children.length !== 1 || !(node.children[0] instanceof nodes.bullet_list)) {
            const error = this.reporter.error(
                `Error parsing content block for the "${this.name}" directive: exactly one bullet list expected.`,
                [new nodes.literal_block(this.blockText, this.blockText)],
                { line: this.lineno }
            );
            throw new SystemMessagePropagation(error.toString(), [error]);
        }
        const listNode = node.children[0];
        let numCols = 0;
        // Check for a uniform two-level bullet list:
        for (let itemIndex = 0; itemIndex < listNode.children.length; itemIndex++) {
            const item = listNode.children[itemIndex];
            if (item.children.length !== 1 || !(item.children[0] instanceof nodes.bullet_list)) {
                const error = this.reporter.error(
                    `Error parsing content block for the "${this.name}" directive: exactly one bullet list expected.`,
                    [new nodes.literal_block(this.blockText, this.blockText)],
                    { line: this.lineno }
                );
                throw new SystemMessagePropagation(error.toString(), [error]);
            } else if (itemIndex) {
                if (item.children[0].children.length !== numCols) {
                    const error = this.reporter.error(
                        `Error parsing content block for the "${this.name}" directive: uniform two-level bullet list expected, but row ${itemIndex + 1} does not contain the same number of items as row 1 (${item.children[0].children.length} vs ${numCols}).`,
                        [new nodes.literal_block(this.blockText, this.blockText)],
                        { line: this.lineno }
                    );
                    throw new SystemMessagePropagation(error.toString(), [error]);
                }
            } else {
                numCols = item.children[0].children.length;
            }
        }
        const colWidths = this.getColumnWidths(numCols);
        return [numCols, colWidths];
    }

    public buildTableFromList(
        tableData: NodeInterface[][],
        colWidths: number[],
        headerRows: number,
        stubColumns: number
    ): nodes.table {
        const table = new nodes.table();
        if (this.widths === 'auto') {
            table.attributes['classes'].push('colwidths-auto');
        } else if (this.widths) {  // explicitly set column widths
            table.attributes['classes'].push('colwidths-given');
        }
        const tgroup = new nodes.tgroup(undefined, undefined, { cols: colWidths.length });
        table.append(tgroup);
        for (const colWidth of colWidths) {
            const colspec = new nodes.colspec();
            if (colWidth !== undefined) {
                colspec.attributes['colwidth'] = colWidth;
            }
            if (stubColumns) {
                colspec.attributes['stub'] = true;
                stubColumns -= 1;
            }
            tgroup.append(colspec);
        }
        const rows: nodes.row[] = [];
        for (const row of tableData) {
            const rowNode = new nodes.row();
            for (const cell of row) {
                const entry = new nodes.entry();
                entry.append(cell);
                rowNode.append(entry);
            }
            rows.push(rowNode);
        }
        if (headerRows) {
            const thead = new nodes.thead();
            thead.children = rows.slice(0, headerRows);
            tgroup.append(thead);
        }
        const tbody = new nodes.tbody();
        tbody.extend(...rows.slice(headerRows));
        tgroup.append(tbody);
        return table;
    }
}