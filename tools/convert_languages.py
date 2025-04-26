# Place this in the original python docutils languages folder to generate the typescript files for docutils-ts.
# This script converts Python language files to TypeScript files.

import os
import ast
import json
import sys
import re # Import the regex module

# Regex to check if a string is a valid JavaScript identifier
# Allows letters, numbers, underscore, dollar sign. Cannot start with a number.
JS_IDENTIFIER_REGEX = re.compile(r"^[a-zA-Z_$][a-zA-Z0-9_$]*$")

def format_dict_as_ts_object(d, indent_level=0):
    """Formats a Python dictionary into a TypeScript object literal string.

    Keys are quoted only if they are not valid JavaScript identifiers.
    Keys are sorted alphabetically.
    Handles nested dictionaries recursively.
    Uses json.dumps for string values to handle escaping.
    """
    if not isinstance(d, dict):
        # Handle non-dict inputs gracefully, though the script expects dicts
        return json.dumps(d, ensure_ascii=False)

    items = []
    indent = '    ' * (indent_level + 1) # Indentation for items
    outer_indent = '  ' * indent_level # Indentation for braces

    # Sort keys for consistent output
    # sorted_keys = sorted(d.keys())
    sorted_keys = d.keys() # Do not sort keys to preserve order

    for key in sorted_keys:
        value = d[key]
        # Quote keys if they are not valid JS identifiers
        formatted_key = key if JS_IDENTIFIER_REGEX.match(key) else json.dumps(key, ensure_ascii=False)

        if isinstance(value, dict):
            # Recursively format nested dictionaries
            formatted_value = format_dict_as_ts_object(value, indent_level + 1)
        elif isinstance(value, list):
             # Use json.dumps for lists (arrays in TS)
             formatted_value = json.dumps(value, ensure_ascii=False, indent=2*(indent_level+2)) # Pretty print arrays
             # Adjust indentation produced by json.dumps
             formatted_value = formatted_value.replace('\\n', '\\n' + indent)
        else:
            # Use json.dumps for strings, numbers, booleans, None
            formatted_value = json.dumps(value, ensure_ascii=False)

        items.append(f"{indent}{formatted_key}: {formatted_value}")

    if not items:
        return "{}"

    # Make sur a comma is also added after the last one

    result = f"{{\\n" + ",\\n".join(items) + "," + f"\\n{outer_indent}}}"

    # replace double quotes with single quotes for TypeScript compatibility
    result = result.replace('"', "'")

    return result.replace('\\n', '\n')  # Replace escaped newlines with actual newlines


def parse_python_literal(node):
    """Safely parse Python literals (dict, list, str, etc.) from AST nodes."""
    if isinstance(node, ast.Dict):
        # Ensure keys are strings before parsing
        keys = []
        for k in node.keys:
            if isinstance(k, ast.Constant) and isinstance(k.value, str):
                 keys.append(k.value)
            elif isinstance(k, ast.Str): # Python < 3.8
                 keys.append(k.s)
            else:
                 raise ValueError(f"Unsupported key type in dict: {type(k)}")
        return {k: parse_python_literal(v) for k, v in zip(keys, node.values)}
    elif isinstance(node, ast.List):
        return [parse_python_literal(el) for el in node.elts]
    elif isinstance(node, ast.Constant): # Handles strings, numbers, None, bools in Python 3.8+
        return node.value
    # Compatibility for older Python versions < 3.8
    elif isinstance(node, ast.Str):
         return node.s
    elif isinstance(node, ast.Num):
         return node.n
    elif isinstance(node, ast.NameConstant): # None, True, False in Python < 3.8
         return node.value
    else:
        # Attempt to evaluate simple expressions if needed, but be cautious
        # For this specific case, we only expect literals.
        raise ValueError(f"Unsupported AST node type for literal parsing: {type(node)}")


# Directory containing this script and the Python language files
py_dir = os.path.dirname(__file__)
# Directory where the TypeScript files will be created

# Assumes the target 'languages-ts' directory is one level up from 'languages'
ts_dir = os.path.abspath(os.path.join(py_dir, '..', 'languages-ts'))

print(f"Source Python directory: {py_dir}")
print(f"Target TypeScript directory: {ts_dir}")

# Ensure the output directory exists
try:
    os.makedirs(ts_dir, exist_ok=True)
    print(f"Ensured target directory exists: {ts_dir}")
except OSError as e:
    print(f"Error creating target directory {ts_dir}: {e}", file=sys.stderr)
    sys.exit(1)


# Iterate over files in the Python language directory
processed_files = 0
error_files = 0
for filename in os.listdir(py_dir):
    # Process only .py files, excluding this script itself
    if filename.endswith('.py') and filename != os.path.basename(__file__):
        py_filepath = os.path.join(py_dir, filename)
        # Construct the output filename and path
        ts_filename = filename.replace('.py', '.ts')
        ts_filepath = os.path.join(ts_dir, ts_filename)

        print(f"Processing {py_filepath} -> {ts_filepath}")

        try:
            with open(py_filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Parse the Python code using AST
            tree = ast.parse(content, filename=filename)
            local_scope = {}

            # Find assignments to the target variables
            for node in ast.walk(tree):
                if isinstance(node, ast.Assign):
                    # Handle assignments like 'labels = {...}'
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            var_name = target.id
                            # Check if it's one of the variables we care about
                            if var_name in ['labels', 'bibliographic_fields', 'author_separators']:
                                try:
                                    # Parse the assigned value (should be a literal dict or list)
                                    local_scope[var_name] = parse_python_literal(node.value)
                                except ValueError as parse_error:
                                     print(f"  Warning: Could not parse literal for '{var_name}' in {filename}: {parse_error}", file=sys.stderr)
                                except Exception as e:
                                     print(f"  Warning: Unexpected error parsing '{var_name}' in {filename}: {e}", file=sys.stderr)


            # Get the parsed data, defaulting to empty if not found or parsing failed
            labels = local_scope.get('labels', {})
            bibliographic_fields = local_scope.get('bibliographic_fields', {})
            author_separators = local_scope.get('author_separators', [])

            # Check if we actually found the expected variables
            if not labels and not bibliographic_fields and not author_separators:
                 print(f"  Warning: No expected variables (labels, bibliographic_fields, author_separators) found or parsed in {filename}. Skipping TS file generation.", file=sys.stderr)
                 error_files += 1
                 continue # Skip writing the TS file if no data was extracted


            # Format the data as TypeScript code
            # Use custom formatter for dicts, json.dumps for the array
            # Sort keys for consistent output is handled within the formatter
            ts_labels = format_dict_as_ts_object(labels, indent_level=0)
            ts_bib_fields = format_dict_as_ts_object(bibliographic_fields, indent_level=0)
            # Keep json.dumps for the array as it's standard
            ts_separators = json.dumps(author_separators, ensure_ascii=False)

            # Replace double quotes with single quotes for TypeScript compatibility in ts_separators
            ts_separators = ts_separators.replace('"', "'")

            # Construct the TypeScript file content
            ts_content = f"""export const labels = {ts_labels};

export const bibliographic_fields = {ts_bib_fields};

export const author_separators = {ts_separators};
"""

            # Write the TypeScript file
            try:
                with open(ts_filepath, 'w', encoding='utf-8') as f:
                    f.write(ts_content)
                print(f"  Successfully converted {filename} to {ts_filename}")
                processed_files += 1
            except IOError as e:
                print(f"  Error writing TypeScript file {ts_filepath}: {e}", file=sys.stderr)
                error_files += 1

        except FileNotFoundError:
            print(f"  Error: Python file not found: {py_filepath}", file=sys.stderr)
            error_files += 1
        except SyntaxError as e:
            print(f"  Error parsing Python syntax in {py_filepath}: {e}", file=sys.stderr)
            error_files += 1
        except Exception as e:
            print(f"  An unexpected error occurred processing {filename}: {e}", file=sys.stderr)
            error_files += 1

    # break so we do just one file for testing
    # if processed_files > 0:
    #     break


print("\nConversion summary:")
print(f"  Processed files: {processed_files}")
print(f"  Files with errors/skipped: {error_files}")
print("Conversion attempt complete.")
