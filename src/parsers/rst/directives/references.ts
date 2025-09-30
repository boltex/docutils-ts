import * as nodes from '../../../nodes.js';
import Directive from '../directive.js';
import * as references from '../../../transforms/references.js';
import * as directives from "../directiveConversions.js";

// Original python code
/*
"""
Directives for references and targets.
"""

__docformat__ = 'reStructuredText'

from docutils import nodes
from docutils.transforms import references
from docutils.parsers.rst import Directive
from docutils.parsers.rst import directives


class TargetNotes(Directive):

    """Target footnote generation."""

    option_spec = {'class': directives.class_option}

    def run(self):
        pending = nodes.pending(references.TargetNotes)
        self.add_name(pending)
        pending.details.update(self.options)
        self.state_machine.document.note_pending(pending)
        return [pending]

*/

// class TargetNotes extends Directive {

//     public static optionSpec = {
//         'class': directives.classOption
//     };

//     public run(): nodes.Node[] {
//         const pending = new nodes.pending(references.TargetNotes);
//         this.addName(pending);
//         pending.details.update(this.options);
//         this.stateMachine!.document!.notePending(pending);
//         return [pending];
//     }

// }
