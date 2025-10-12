import * as directivesConversions from '../directiveConversions.js';
import Directive from '../directive.js';
import * as nodes from '../../../nodes.js';
import { Systemmessage } from '../../../types.js';

/* Original code:

def align(argument):
    return directives.choice(argument, ('left', 'center', 'right'))
*/

function align(argument: string) {
    return directivesConversions.choice(argument, ['left', 'center', 'right']);
}

// Original python:
/*

class Table(Directive):

    """
    Generic table base class.
    """

    optional_arguments = 1
    final_argument_whitespace = True
    option_spec = {'class': directives.class_option,
                   'name': directives.unchanged,
                   'align': align,
                   'width': directives.length_or_percentage_or_unitless,
                   'widths': directives.value_or(('auto', 'grid'),
                                                 directives.positive_int_list)}
    has_content = True

    def make_title(self):
        if self.arguments:
            title_text = self.arguments[0]
            text_nodes, messages = self.state.inline_text(title_text,
                                                          self.lineno)
            title = nodes.title(title_text, '', *text_nodes)
            (title.source,
             title.line) = self.state_machine.get_source_and_line(self.lineno)
        else:
            title = None
            messages = []
        return title, messages

    def check_table_dimensions(self, rows, header_rows, stub_columns):
        if len(rows) < header_rows:
            error = self.reporter.error('%s header row(s) specified but '
                'only %s row(s) of data supplied ("%s" directive).'
                % (header_rows, len(rows), self.name),
                nodes.literal_block(self.block_text, self.block_text),
                line=self.lineno)
            raise SystemMessagePropagation(error)
        if len(rows) == header_rows > 0:
            error = self.reporter.error(
                f'Insufficient data supplied ({len(rows)} row(s)); '
                'no data remaining for table body, '
                f'required by "{self.name}" directive.',
                nodes.literal_block(self.block_text, self.block_text),
                line=self.lineno)
            raise SystemMessagePropagation(error)
        for row in rows:
            if len(row) < stub_columns:
                error = self.reporter.error(
                    f'{stub_columns} stub column(s) specified '
                    f'but only {len(row)} columns(s) of data supplied '
                    f'("{self.name}" directive).',
                    nodes.literal_block(self.block_text, self.block_text),
                    line=self.lineno)
                raise SystemMessagePropagation(error)
            if len(row) == stub_columns > 0:
                error = self.reporter.error(
                    'Insufficient data supplied (%s columns(s)); '
                    'no data remaining for table body, required '
                    'by "%s" directive.' % (len(row), self.name),
                    nodes.literal_block(self.block_text, self.block_text),
                    line=self.lineno)
                raise SystemMessagePropagation(error)

    def set_table_width(self, table_node) -> None:
        if 'width' in self.options:
            table_node['width'] = self.options.get('width')

    @property
    def widths(self):
        return self.options.get('widths', '')

    def get_column_widths(self, n_cols):
        if isinstance(self.widths, list):
            if len(self.widths) != n_cols:
                # TODO: use last value for missing columns?
                error = self.reporter.error('"%s" widths do not match the '
                    'number of columns in table (%s).' % (self.name, n_cols),
                    nodes.literal_block(self.block_text, self.block_text),
                    line=self.lineno)
                raise SystemMessagePropagation(error)
            col_widths = self.widths
        elif n_cols:
            col_widths = [100 // n_cols] * n_cols
        else:
            error = self.reporter.error('No table data detected in CSV file.',
                nodes.literal_block(self.block_text, self.block_text),
                line=self.lineno)
            raise SystemMessagePropagation(error)
        return col_widths

    def extend_short_rows_with_empty_cells(self, columns, parts) -> None:
        for part in parts:
            for row in part:
                if len(row) < columns:
                    row.extend([(0, 0, 0, [])] * (columns - len(row)))
*/

/**
 * Generic table base class.
 */
export class Table extends Directive {

    public static optionalArguments: number = 1;
    public static finalArgumentWhitespace: boolean = true;
    public static optionSpec = {
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








}



