# About this project

This project is a translation of the docutils python library into TypeScript. It is designed to provide a similar functionality for processing reStructuredText documents in a TypeScript environment.

# Assigning values to nodes

When assigning values to nodes with square brackets, if the key is a number, we are replacing a child. If the key is a string, we are setting a property on the node's 'attributes' member.

The original python overrided the `__setitem__` method to handle both cases. In TypeScript, we use a method called `replaceAt` for replacing children and directly set properties on the `attributes` object for setting properties.

If assigning values to nodes with a dot, then it needs to be a real property of the node, not a key in the attributes object. (See enumerated_list object from node.ts for an example of this that interacts with its properties "prefix", "suffix", "enumtype", etc, in rst/states/body.ts.)

## examples of assigning values

```python
# Replacing a child
node[0] = newValue
```

would become

```typescript
// Replacing a child
node.replaceAt(0, newValue);
```

```python
# Setting a property
node['property'] = newValue
```

```typescript
// Setting a property
node.attributes[key] = newValue;
```

## Adding node(s) to nodes

When adding nodes to nodes with the `+=` operator, we are extending the children of the node. The original python overrided the `__iadd__` method to handle this. In TypeScript, we use a method called `extend` for this purpose.

```python
# Adding a child
node += newValue
```

```typescript
// Adding a child
node.extend([newValue]);
```

For convenience, the `append` method can also take a single node as an argument and will wrap it in an array internally.

```typescript
// Adding a child
node.append(newValue);
```

Also an 'add' method exists that can take either a single node or an array of nodes. Here is its implementation:

```typescript
public add(item: NodeInterface[] | NodeInterface): void {
    if (Array.isArray(item)) {
        this.extend(...item);
    } else {
        this.append(item);
    }
}
```

# Converting from Python to Typescript

## Useful tricks and common pitfalls

### Standard Dict

They are falsy when empty in python, also, if an undefined key is referenced, it returns an empty dict instead of 'undefined'.

### Raw String

Raw String (prefixed with an 'r') do not exist in js. Except for regex defined with slashes.

Those regex defined with slashes are equivalent to raw strings being compiled into a regex in python.

If raw strings are needed for strings OTHER THAN regex, then the have to be escaped. (\\r, \\n, etc.)

This applies for regular strings and multiline strings.

### Multiline string

Multiline strings can be made with back-ticks "`" .

### Regex 'match' methods

The regexp 'match' method exists in python, but it only matches at the start of the string.

This implies that when the 'match' method is used in js, a caret "^" has to be prefixed onto the regex to match at the start of the string.

### Regex 'end-of-line' and 'm' switch

If a regex uses the '\$' character to match an end-of-line, it needs the 'm' switch if the tested string has '\n' at the end. (is considered multiline)

No need for 'm' switch for a '\$' match if the tested string has no newlines at all.

### For 'in/of' loops

A "for in" loop in python loops over the values which is equivalent to a "for of" loop in js.

Although legal in js, it is NOT equivalent: A "for in" loop in js loops over the keys, not the values.

### Arrays of strings from **spitlines** VS **split('\n')**

Splitlines outputs one less entry if the last one was an empty string!
