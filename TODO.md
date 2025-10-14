# TODO

Remaining: 2967 lines

## Directives

#### Admonitions

- [x] `attention` → `admonitions.Attention`
- [x] `caution` → `admonitions.Caution`
- [x] `danger` → `admonitions.Danger`
- [x] `error` → `admonitions.Error`
- [x] `important` → `admonitions.Important`
- [x] `note` → `admonitions.Note`
- [x] `tip` → `admonitions.Tip`
- [x] `hint` → `admonitions.Hint`
- [x] `warning` → `admonitions.Warning`
- [x] `admonition` → `admonitions.Admonition`

#### Body

- [ ] `code` → `body.CodeBlock`
- [x] `sidebar` → `body.Sidebar`
- [x] `topic` → `body.Topic`
- [x] `line-block` → `body.LineBlock`
- [x] `parsed-literal` → `body.ParsedLiteral`
- [x] `math` → `body.MathBlock`
- [x] `rubric` → `body.Rubric`
- [x] `epigraph` → `body.Epigraph`
- [x] `highlights` → `body.Highlights`
- [x] `pull-quote` → `body.PullQuote`
- [x] `compound` → `body.Compound`
- [x] `container` → `body.Container`
<!-- - [ ] `questions` → `body.question_list` (commented in source) -->

#### Tables (524 lines)

- [x] `table` → `tables.RSTTable`
- [ ] `csv-table` → `tables.CSVTable`
- [ ] `list-table` → `tables.ListTable`

#### Images

- [x] `image` → `images.Image`
- [x] `figure` → `images.Figure`

#### Parts

- [x] `contents` → `parts.Contents`
- [x] `sectnum` → `parts.Sectnum`
- [x] `header` → `parts.Header`
- [x] `footer` → `parts.Footer`
  <!-- - [ ] `footnotes` → `parts.footnotes` (commented in source) -->
  <!-- - [ ] `citations` → `parts.citations` (commented in source) -->

#### References (28 lines)

- [ ] `target-notes` → `references.TargetNotes`

#### Misc (690 lines)

- [ ] `meta` → `misc.Meta`
- [ ] `raw` → `misc.Raw`
- [ ] `include` → `misc.Include`
- [ ] `replace` → `misc.Replace`
- [ ] `unicode` → `misc.Unicode`
- [ ] `class` → `misc.Class`
- [ ] `role` → `misc.Role`
- [ ] `default-role` → `misc.DefaultRole`
- [x] `title` → `misc.Title`
- [ ] `date` → `misc.Date`
- [ ] `restructuredtext-test-directive` → `misc.TestDirective`

<!-- HTML-specific -->
<!-- - [ ] `imagemap` → `html.imagemap` (commented in source) -->

## Transforms

#### frontmatter (~200 lines)

- [x] `frontmatter.DocTitle`
- [ ] `frontmatter.DocInfo`
- [x] `frontmatter.SectSubTitle`

#### references (990 lines)

- [ ] `references.Substitutions`
- [ ] `references.PropagateTargets`
- [ ] `references.AnonymousHyperlinks`
- [ ] `references.IndirectHyperlinks`
- [ ] `references.Footnotes`
- [ ] `references.ExternalTargets`
- [ ] `references.InternalTargets`
- [ ] `references.DanglingReferences`
- [ ] `references.TargetNotes`
- [ ] `references.CitationReferences`

#### parts

- [x] `parts.SectNum`
- [x] `parts.Contents`

#### peps (315 lines)

- [ ] `peps.Headers`
- [ ] `peps.Contents`
- [ ] `peps.TargetNotes`
- [ ] `peps.PEPZero`

#### misc

- [x] `misc.ClassAttribute`
- [x] `misc.Transitions`
- [x] `misc.CallBack`

#### universal (~200 lines)

- [x] `universal.Decorations`
- [ ] `universal.ExposeInternals`
- [ ] `universal.StripComments`
- [ ] `universal.StripClassesAndElements`
- [x] `universal.FilterMessages`
- [x] `universal.Messages`
- [x] `universal.TestMessages`
- [ ] `universal.SmartQuotes`
- [ ] `universal.Validate`

#### writer_aux (~20 lines)

- [ ] `writer_aux.Admonitions`
- [ ] `writer_aux.Compound`

#### components

- [x] `components.Filter`
